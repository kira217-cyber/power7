import express from "express";

import BalanceLog from "../models/BalanceLog.js";
import GameHistory from "../models/GameHistory.js";
import DepositRequest from "../models/DepositRequest.js";
import WithdrawRequest from "../models/WithdrawRequest.js";
import { protectUser } from "../middleware/protectUser.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num, money } from "../utils/money.js";

/**
 * খেলোয়াড়ের "অ্যাকাউন্ট রেকর্ড" আর "লাভ ও ক্ষতি" (মূল সাইটের মতো)।
 *
 *   /my          — টাকার খাতা (BalanceLog): অর্ডার নম্বর, সময়, পরিমাণ,
 *                  পরের ব্যালেন্স, বিবরণ; ট্যাব: সব / জমা / উত্তোলন / রিবেট / প্রমোশন
 *   /profit-loss/my — দিন ধরে: জমা, উত্তোলন, ব্যয় (বাজি), আয় (জয়), রিবেট,
 *                  প্রমোশন, লাভ ও হার; ট্যাব দিলে শুধু সেই ধরনের খেলা
 *
 * দিন গোনা হয় খেলোয়াড়ের নিজের সময় অঞ্চলে (`tz` = UTC থেকে মিনিট,
 * বাংলাদেশে 360) — নইলে রাত ১২টার পরের খেলা আগের দিনে পড়ত।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();

const MAX_RANGE_DAYS = 92;

const rangeOf = (query) => {
  const to = query.to ? new Date(query.to) : new Date();
  let from = query.from ? new Date(query.from) : new Date(to.getTime() - 7 * 86400000);
  if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime())) return null;
  if (to - from > MAX_RANGE_DAYS * 86400000) from = new Date(to.getTime() - MAX_RANGE_DAYS * 86400000);
  return { $gte: from, $lte: to };
};

/** ট্যাব → খাতার ধরন */
const TYPE_TABS = {
  deposit: ["deposit"],
  withdraw: ["withdraw", "withdraw-refund"],
  rebate: ["rebate"],
  // রেফারেল পুরস্কার আর VIP বোনাসও প্রমোশনের টাকা
  promotion: ["promotion", "referral", "vip", "reward"],
};

/** বেটিং রেকর্ডের একই ট্যাব → খেলার ক্যাটাগরি */
const GAME_TABS = {
  RNG: ["slot", "crash", "jili", "", null],
  FISH: ["fishing"],
  LIVE: ["live"],
  PVP: ["poker"],
  SPORTS: ["sports"],
};

router.get("/my", protectUser, async (req, res) => {
  try {
    const range = rangeOf(req.query);
    if (!range) return errorResponse(res, "Invalid date range", 400);

    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));

    const filter = { user: req.user._id, createdAt: range };
    const types = TYPE_TABS[text(req.query.type)];
    if (types) filter.type = { $in: types };

    const [rows, total, sums] = await Promise.all([
      BalanceLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("type amount balanceAfter orderNo note createdAt")
        .lean(),
      BalanceLog.countDocuments(filter),
      BalanceLog.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
    ]);

    return successResponse(res, "Account records loaded", {
      rows,
      totals: { amount: money(sums[0]?.amount), count: total },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/profit-loss/my", protectUser, async (req, res) => {
  try {
    const range = rangeOf(req.query);
    if (!range) return errorResponse(res, "Invalid date range", 400);

    // UTC থেকে মিনিট → "+06:00"
    const tzMin = Math.max(-720, Math.min(840, Math.round(num(req.query.tz))));
    const sign = tzMin < 0 ? "-" : "+";
    const abs = Math.abs(tzMin);
    const timezone = `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
    const dayOf = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone } });

    const tab = text(req.query.tab).toUpperCase();
    const gameFilter = { user: req.user._id, createdAt: range };
    if (GAME_TABS[tab]) gameFilter.gameCategory = { $in: GAME_TABS[tab] };

    // জমা/উত্তোলন/প্রমোশন খেলার ধরনের নয় — শুধু "সব" ট্যাবে
    const allTab = !GAME_TABS[tab];

    const [games, deposits, withdraws, rebates] = await Promise.all([
      GameHistory.aggregate([
        { $match: gameFilter },
        { $group: { _id: dayOf("createdAt"), bet: { $sum: "$betAmount" }, win: { $sum: "$winAmount" } } },
      ]),
      allTab
        ? DepositRequest.aggregate([
            { $match: { user: req.user._id, status: "approved", approvedAt: range } },
            { $group: { _id: dayOf("approvedAt"), deposit: { $sum: "$amount" } } },
          ])
        : [],
      allTab
        ? WithdrawRequest.aggregate([
            { $match: { user: req.user._id, status: "approved", approvedAt: range } },
            { $group: { _id: dayOf("approvedAt"), withdraw: { $sum: "$amount" } } },
          ])
        : [],
      allTab
        ? BalanceLog.aggregate([
            // রিবেট আর প্রমোশন খাতা থেকে — ডিপোজিট বোনাস, রেফারেল, VIP বোনাস সব
            { $match: { user: req.user._id, type: { $in: ["rebate", "promotion", "referral", "vip", "reward"] }, createdAt: range } },
            {
              $group: {
                _id: dayOf("createdAt"),
                rebate: { $sum: { $cond: [{ $eq: ["$type", "rebate"] }, "$amount", 0] } },
                promotion: { $sum: { $cond: [{ $eq: ["$type", "rebate"] }, 0, "$amount"] } },
              },
            },
          ])
        : [],
    ]);

    const days = new Map();
    const row = (day) => {
      if (!days.has(day)) days.set(day, { date: day, deposit: 0, withdraw: 0, bet: 0, win: 0, rebate: 0, promotion: 0 });
      return days.get(day);
    };
    games.forEach((g) => Object.assign(row(g._id), { bet: g.bet, win: g.win }));
    deposits.forEach((d) => Object.assign(row(d._id), { deposit: d.deposit }));
    withdraws.forEach((w) => Object.assign(row(w._id), { withdraw: w.withdraw }));
    rebates.forEach((r) => Object.assign(row(r._id), { rebate: r.rebate, promotion: r.promotion }));

    // লাভ ও হার = আয় − ব্যয় + রিবেট + প্রমোশন (জমা-উত্তোলন নিজের টাকা, লাভ নয়)
    const rows = [...days.values()]
      .map((d) => {
        const r = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, k === "date" ? v : money(v)]));
        return { ...r, profit: money(r.win - r.bet + r.rebate + r.promotion) };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const totals = rows.reduce(
      (acc, r) => {
        ["deposit", "withdraw", "bet", "win", "rebate", "promotion", "profit"].forEach((k) => {
          acc[k] = money(acc[k] + r[k]);
        });
        return acc;
      },
      { deposit: 0, withdraw: 0, bet: 0, win: 0, rebate: 0, promotion: 0, profit: 0 },
    );

    return successResponse(res, "Profit and loss loaded", { rows, totals });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
