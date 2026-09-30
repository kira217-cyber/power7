import express from "express";
import mongoose from "mongoose";

import GameHistory from "../models/GameHistory.js";
import User from "../models/User.js";

import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requirePermission } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num, money } from "../utils/money.js";

/**
 * খেলার ইতিহাস — খেলোয়াড়ের "বেটিং রেকর্ড" আর admin এর Game History।
 *
 * মূল সাইটের বেটিং রেকর্ড গেম ধরে মিলিয়ে দেখায় (বেট পরিমাণ, বৈধ বেট,
 * পুরস্কার, লাভ ও হার, খেলার নাম, খেলার সংখ্যা) — তারিখ আর গেমের ধরনের
 * ট্যাব (RNG / FISH / LIVE / PVP / SPORTS) দিয়ে ছাঁকা। তাই `/my` এ
 * `group=game` দিলে গেম ধরে যোগফল, না দিলে প্রতিটা রাউন্ড আলাদা।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * মূল সাইটের ট্যাব → White-label এর ক্যাটাগরি key।
 * ক্যাটাগরি জানা না গেলে (ফাঁকা, বা ঘরটাই নেই এমন পুরোনো সারি) RNG তে — হারিয়ে না যায়।
 */
const TAB_CATEGORIES = {
  RNG: ["slot", "crash", "jili", "", null],
  FISH: ["fishing"],
  LIVE: ["live"],
  PVP: ["poker"],
  SPORTS: ["sports"],
};

const MAX_RANGE_DAYS = 92;

/** তারিখের সীমা — ব্রাউজার নিজের সময় অঞ্চলে দিনের শুরু-শেষ হিসাব করে পাঠায় */
const dateFilter = (query) => {
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  const range = {};
  if (from && !Number.isNaN(from.getTime())) range.$gte = from;
  if (to && !Number.isNaN(to.getTime())) range.$lte = to;
  if (range.$gte && range.$lte && range.$lte - range.$gte > MAX_RANGE_DAYS * 86400000) {
    range.$gte = new Date(range.$lte.getTime() - MAX_RANGE_DAYS * 86400000);
  }
  return Object.keys(range).length ? { createdAt: range } : {};
};

const pageOf = (query, fallback) => {
  const page = Math.max(1, num(query.page) || 1);
  const limit = Math.min(100, Math.max(1, num(query.limit) || fallback));
  return { page, limit };
};

// বৈধ বেট — ড্র (push) বাদে, মূল সাইটের মতো
const VALID_BET = { $cond: [{ $eq: ["$resultType", "push"] }, 0, "$betAmount"] };

const sumsStage = {
  count: { $sum: 1 },
  bet: { $sum: "$betAmount" },
  validBet: { $sum: VALID_BET },
  win: { $sum: "$winAmount" },
  net: { $sum: "$netAmount" },
};

const roundSums = (row = {}) => ({
  count: row.count || 0,
  bet: money(row.bet),
  validBet: money(row.validBet),
  win: money(row.win),
  net: money(row.net),
});

/* =========================
   খেলোয়াড় — বেটিং রেকর্ড
   ========================= */

router.get("/my", protectUser, async (req, res) => {
  try {
    const { page, limit } = pageOf(req.query, 20);

    const filter = { user: req.user._id, ...dateFilter(req.query) };

    const tab = text(req.query.tab).toUpperCase();
    if (TAB_CATEGORIES[tab]) filter.gameCategory = { $in: TAB_CATEGORIES[tab] };

    const result = text(req.query.resultType);
    if (["win", "loss", "push"].includes(result)) filter.resultType = result;

    const [totals] = await GameHistory.aggregate([{ $match: filter }, { $group: { _id: null, ...sumsStage } }]);

    if (text(req.query.group) === "game") {
      const grouped = await GameHistory.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$gameUId",
            gameName: { $first: "$gameName" },
            gameNameBn: { $first: "$gameNameBn" },
            providerCode: { $first: "$providerCode" },
            lastPlayedAt: { $first: "$createdAt" },
            ...sumsStage,
          },
        },
        { $sort: { lastPlayedAt: -1 } },
        {
          $facet: {
            rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
            total: [{ $count: "n" }],
          },
        },
      ]);

      const rows = (grouped[0]?.rows || []).map((row) => ({
        gameUId: row._id,
        gameName: row.gameName,
        gameNameBn: row.gameNameBn,
        providerCode: row.providerCode,
        lastPlayedAt: row.lastPlayedAt,
        ...roundSums(row),
      }));
      const total = grouped[0]?.total?.[0]?.n || 0;

      return successResponse(res, "Game history loaded", {
        rows,
        totals: roundSums(totals),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      });
    }

    const [rows, total] = await Promise.all([
      GameHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        // অ্যাফিলিয়েটের কমিশন আর গেমের ভিতরের নাম খেলোয়াড়ের দেখার কথা নয়
        .select("-affiliateUser -affiliateCommissionAmount -affiliateCommissionType -userGamePlayName -memberAccount")
        .lean(),
      GameHistory.countDocuments(filter),
    ]);

    return successResponse(res, "Game history loaded", {
      rows,
      totals: roundSums(totals),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   admin — Game History
   ========================= */

router.get("/admin", protectAdmin, requirePermission("game-history"), async (req, res) => {
  try {
    const { page, limit } = pageOf(req.query, 20);

    const filter = { ...dateFilter(req.query) };
    const result = text(req.query.resultType);
    if (["win", "loss", "push"].includes(result)) filter.resultType = result;

    const provider = text(req.query.provider).toUpperCase();
    if (provider) filter.providerCode = provider;

    const search = text(req.query.q);
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      const users = await User.find({ $or: [{ userId: regex }, { phone: regex }] }).select("_id");

      filter.$or = [
        { userId: regex },
        { gameName: regex },
        { gameUId: regex },
        { gameRound: regex },
        { user: { $in: users.length ? users.map((item) => item._id) : [new mongoose.Types.ObjectId()] } },
      ];
    }

    const [rows, total, totals, byResult] = await Promise.all([
      GameHistory.find(filter)
        .populate("user", "userId phone role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      GameHistory.countDocuments(filter),
      GameHistory.aggregate([{ $match: filter }, { $group: { _id: null, ...sumsStage } }]),
      GameHistory.aggregate([{ $match: filter }, { $group: { _id: "$resultType", count: { $sum: 1 } } }]),
    ]);

    const counts = byResult.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), { win: 0, loss: 0, push: 0 });
    const sums = roundSums(totals[0]);

    return successResponse(res, "Game history loaded", {
      rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      // net ধনাত্মক মানে খেলোয়াড়রা এগিয়ে — সাইটের লাভ ঠিক উল্টো
      totals: { bet: sums.bet, win: sums.win, net: sums.net, siteProfit: money(-sums.net), counts },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
