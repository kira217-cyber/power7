import express from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import DepositRequest from "../models/DepositRequest.js";
import GameHistory from "../models/GameHistory.js";
import { AffSettlement } from "../models/AffWithdraw.js";

import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num, money } from "../utils/money.js";
import { creditUser, writeLogs } from "../utils/wallet.js";
import { monthStart } from "../utils/referral.js";

/**
 * অ্যাফিলিয়েটের নিজের পাতা — `/api/affiliate`।
 *
 * খেলোয়াড় আর অ্যাফিলিয়েট একই `User` কালেকশনে, শুধু `role` আলাদা —
 * তাই টোকেন একই মিডলওয়্যারে যাচাই হয়, আর ভূমিকাটা এখানে দেখা হয়।
 * শেষে admin এর "কমিশন মেলানো" (settle)।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const onlyAffiliate = (req, res, next) => {
  if (req.user?.role !== "aff-user") return errorResponse(res, "This area is for affiliates", 403, "notAffiliate");
  return next();
};

/**
 * কমিশনের চার ভাগ ও শেষ হিসাব — রেফার, ডিপোজিট আর খেলোয়াড়ের হারের ভাগ
 * পাওনা; খেলোয়াড় জিতলে সেই ভাগ দেনা। net = (refer + deposit + gameLoss) − gameWin।
 */
export const commissionOf = (user) => {
  const refer = num(user.referCommissionBalance);
  const deposit = num(user.depositCommissionBalance);
  const gameLoss = num(user.gameLossCommissionBalance);
  const gameWin = num(user.gameWinCommissionBalance);
  const gross = refer + deposit + gameLoss;
  return {
    balances: { refer: money(refer), deposit: money(deposit), gameLoss: money(gameLoss), gameWin: money(gameWin) },
    rates: {
      refer: num(user.referCommission),
      deposit: num(user.depositCommission),
      gameLoss: num(user.gameLossCommission),
      gameWin: num(user.gameWinCommission),
    },
    gross: money(gross),
    net: money(gross - gameWin),
  };
};

/* ─────────────────── অ্যাফিলিয়েট ─────────────────── */

router.get("/me", protectUser, onlyAffiliate, async (req, res) => {
  try {
    const user = req.user;
    const since = monthStart();
    const mine = { referredBy: user._id, role: "user" };

    const [total, active, joinedThisMonth, deposits, rounds, month] = await Promise.all([
      User.countDocuments(mine),
      User.countDocuments({ ...mine, isActive: true }),
      User.countDocuments({ ...mine, createdAt: { $gte: since } }),
      // রেফার করা খেলোয়াড়দের অনুমোদিত জমা — প্রথমে তাঁদের আইডি, তারপর জমা
      // (BetChokkor সব অনুমোদিত জমা ঘেঁটে $lookup করত — বড় হলে খুব ধীর)
      User.find(mine)
        .select("_id")
        .lean()
        .then((rows) =>
          DepositRequest.aggregate([
            { $match: { status: "approved", user: { $in: rows.map((r) => r._id) } } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
          ]),
        ),
      GameHistory.aggregate([
        { $match: { affiliateUser: user._id } },
        { $group: { _id: null, bet: { $sum: "$betAmount" }, commission: { $sum: "$affiliateCommissionAmount" }, count: { $sum: 1 } } },
      ]),
      GameHistory.aggregate([
        { $match: { affiliateUser: user._id, createdAt: { $gte: since } } },
        { $group: { _id: null, commission: { $sum: "$affiliateCommissionAmount" } } },
      ]),
    ]);

    return successResponse(res, "Affiliate loaded", {
      user: user.toSafeJSON(),
      referralCode: user.referralCode,
      commission: commissionOf(user),
      players: {
        total,
        active,
        joinedThisMonth,
        depositTotal: money(deposits[0]?.total || 0),
        depositCount: deposits[0]?.count || 0,
      },
      games: {
        rounds: rounds[0]?.count || 0,
        turnover: money(rounds[0]?.bet || 0),
        commission: money(rounds[0]?.commission || 0),
      },
      thisMonthCommission: money(month[0]?.commission || 0),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/commission-status", protectUser, onlyAffiliate, async (req, res) => {
  try {
    return successResponse(res, "Commission loaded", {
      currency: req.user.currency,
      balance: money(req.user.balance),
      commission: commissionOf(req.user),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** নিজের আনা খেলোয়াড়েরা — কত জমা, কত খেলা */
router.get("/my-users", protectUser, onlyAffiliate, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = { referredBy: req.user._id, role: "user" };
    const search = text(req.query.q).slice(0, 40);
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ userId: regex }, { phone: regex }];
    }
    const status = text(req.query.status);
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const [rows, total, sums] = await Promise.all([
      User.find(filter)
        .select("userId phone isActive createdAt totalDeposit totalTurnover lastLoginAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      User.aggregate([{ $match: filter }, { $group: { _id: null, deposit: { $sum: "$totalDeposit" }, turnover: { $sum: "$totalTurnover" } } }]),
    ]);

    return successResponse(res, "Players loaded", {
      // ফোন নম্বরের মাঝখান লুকানো — অ্যাফিলিয়েট পুরো নম্বর দেখেন না
      rows: rows.map((r) => ({ ...r, phone: r.phone ? `${r.phone.slice(0, 5)}****${r.phone.slice(-3)}` : "" })),
      summary: { count: total, deposit: money(sums[0]?.deposit || 0), turnover: money(sums[0]?.turnover || 0) },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** কোন খেলোয়াড়ের কোন খেলা থেকে কত কমিশন এসেছে */
router.get("/commission-history", protectUser, onlyAffiliate, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = { affiliateUser: req.user._id, affiliateCommissionType: { $ne: "none" } };
    const type = text(req.query.type);
    if (["game-win", "game-loss"].includes(type)) filter.affiliateCommissionType = type;

    const [rows, total] = await Promise.all([
      GameHistory.find(filter)
        .select("userId gameName gameUId providerCode betAmount winAmount netAmount resultType affiliateCommissionAmount affiliateCommissionType createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      GameHistory.countDocuments(filter),
    ]);

    return successResponse(res, "Commission history loaded", {
      rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ─────────────────── admin — কমিশন মেলানো ─────────────────── */

/**
 * চার ভাগের জমা শূন্য করে নেট টাকাটা ব্যালেন্সে।
 *
 * জমাগুলো আগে এক ধাপে "দাবি" করা হয় (যে মান পড়া হয়েছিল ঠিক সেটা থাকলেই
 * শূন্য হয়) — দুই admin একসাথে চাপলে বা মাঝখানে নতুন কমিশন এলেও দুবার
 * টাকা যায় না, আর নতুনটা হারায় না। নেট ঋণাত্মক হলে ব্যালেন্স যতটুকু আছে
 * ততটুকুই কাটে, বাকি দেনা জিতের ঘরে থেকে যায়।
 */
export const settleAffiliate = async (user, { by, note = "" } = {}) => {
  const c = commissionOf(user);
  const b = c.balances;
  if (!b.refer && !b.deposit && !b.gameLoss && !b.gameWin) return { ok: false, status: 400, message: "Nothing to settle" };

  const claimed = await User.updateOne(
    {
      _id: user._id,
      referCommissionBalance: user.referCommissionBalance,
      depositCommissionBalance: user.depositCommissionBalance,
      gameLossCommissionBalance: user.gameLossCommissionBalance,
      gameWinCommissionBalance: user.gameWinCommissionBalance,
    },
    { $set: { referCommissionBalance: 0, depositCommissionBalance: 0, gameLossCommissionBalance: 0, gameWinCommissionBalance: 0 } },
  );
  if (!claimed.modifiedCount) return { ok: false, status: 409, message: "The commission just changed — refresh and try again" };

  let applied = c.net;
  let carried = 0;
  if (c.net < 0) {
    const fresh = await User.findById(user._id).select("balance").lean();
    applied = -Math.min(Math.max(0, money(fresh?.balance)), -c.net);
    carried = money(-c.net + applied);
    if (carried > 0) await User.updateOne({ _id: user._id }, { $inc: { gameWinCommissionBalance: carried } });
  }

  let balance = null;
  if (applied !== 0) {
    const credited = await creditUser(user._id, applied);
    balance = credited?.balance ?? null;
    await writeLogs(user._id, balance, [{ type: "commission", amount: applied, refType: "AffSettlement", note: note || "Affiliate commission settled" }], { by });
  }

  const settlement = await AffSettlement.create({
    user: user._id,
    userIdText: user.userId,
    refer: b.refer,
    deposit: b.deposit,
    gameLoss: b.gameLoss,
    gameWin: b.gameWin,
    net: c.net,
    applied: money(applied),
    carried,
    by,
    note: note.slice(0, 200),
  });
  return { ok: true, settlement, balance };
};

router.post("/admin/:id/settle", protectAdmin, requirePermission("affiliates"), requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const user = await User.findOne({ _id: req.params.id, role: "aff-user" });
    if (!user) return errorResponse(res, "Affiliate not found", 404);

    const r = await settleAffiliate(user, { by: req.admin._id, note: text(req.body?.note) });
    if (!r.ok) return errorResponse(res, r.message, r.status);
    return successResponse(res, "Commission settled", { settlement: r.settlement, balance: r.balance });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/admin/:id/settlements", protectAdmin, requirePermission("affiliates"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const rows = await AffSettlement.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(50).populate("by", "email").lean();
    return successResponse(res, "Settlements", { rows });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
