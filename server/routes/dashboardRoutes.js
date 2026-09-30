import express from "express";

import { protectAdmin } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import DepositRequest from "../models/DepositRequest.js";
import WithdrawRequest from "../models/WithdrawRequest.js";
import AutoDeposit from "../models/AutoDeposit.js";
import AutoWithdraw from "../models/AutoWithdraw.js";

/**
 * ড্যাশবোর্ড — `/api/dashboard`। সব সংখ্যা আসল ডেটাবেস থেকে, ম্যানুয়াল আর
 * অটো দুই ধরনের ডিপোজিট/উত্তোলন মিলিয়ে (BetChokkor এর মতো)।
 *
 * BetChokkor থেকে যা আলাদা:
 *   - দিন মানে **বাংলাদেশের দিন** (UTC+6) — সার্ভারের ঘড়ি যে অঞ্চলেই থাকুক
 *   - টাকা গোনা হয় যেদিন সত্যিই এল/গেল (অনুমোদন, পরিশোধ, সম্পন্ন) সেদিন,
 *     আবেদনের দিন নয়
 *   - দিনের গণনায় অটোও আছে; চার্ট প্রতি কালেকশনে একটা aggregate
 */
const router = express.Router();

const money = (v) => Math.round((Number(v) || 0) * 100) / 100;
const BD_MS = 6 * 3600 * 1000;
const TZ = "+06:00";

/** "YYYY-MM-DD" (বাংলাদেশের দিন) → সেই দিনের শুরু, UTC তে */
const bdDayStart = (dateStr) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ""));
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - BD_MS);
  const now = new Date(Date.now() + BD_MS);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - BD_MS);
};
const bdKey = (date) => new Date(date.getTime() + BD_MS).toISOString().slice(0, 10);

/** টাকার কালেকশনগুলো — কোন অবস্থা মানে "হয়ে গেছে", আর কোন তারিখে */
const DONE = {
  manualDeposit: { Model: DepositRequest, match: { status: "approved" }, at: "approvedAt" },
  autoDeposit: { Model: AutoDeposit, match: { status: "PAID" }, at: "paidAt" },
  manualWithdraw: { Model: WithdrawRequest, match: { status: "approved" }, at: "approvedAt" },
  autoWithdraw: { Model: AutoWithdraw, match: { status: "COMPLETED" }, at: "completedAt" },
};

/** মোট অঙ্ক আর সংখ্যা — `range` দিলে শুধু সেই সময়ের */
const totalOf = async ({ Model, match, at }, range) => {
  const rows = await Model.aggregate([
    { $match: { ...match, ...(range ? { [at]: range } : {}) } },
    { $group: { _id: null, total: { $sum: "$amount" }, n: { $sum: 1 } } },
  ]);
  return { total: money(rows[0]?.total), n: rows[0]?.n || 0 };
};

/** দিন ধরে অঙ্ক — `{ "2026-09-28": 1200, … }` */
const byDay = async ({ Model, match, at }, since) => {
  const rows = await Model.aggregate([
    { $match: { ...match, [at]: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${at}`, timezone: TZ } }, total: { $sum: "$amount" } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, money(r.total)]));
};

router.get("/summary", protectAdmin, async (req, res) => {
  try {
    const today = bdDayStart();
    const since = new Date(today.getTime() - 6 * 24 * 3600 * 1000);

    const [
      allUsers,
      activeUsers,
      allAffiliateUsers,
      pendingDeposit,
      pendingAutoDeposit,
      pendingWithdraw,
      pendingAutoWithdraw,
      totalAdmins,
      balanceRows,
      md,
      ad,
      mw,
      aw,
      mdDays,
      adDays,
      mwDays,
      awDays,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", isActive: true }),
      User.countDocuments({ role: "aff-user" }),
      DepositRequest.countDocuments({ status: "pending" }),
      // অটোর PENDING বেশিরভাগই খুলে ফেলে রাখা পেমেন্ট পাতা — শুধু যেগুলোয় গেটওয়ে
      // তথ্য পাঠিয়েছে (ব্যাংক/ক্রিপ্টো, admin এর নিশ্চিতের অপেক্ষায়) সেগুলো গোনা
      AutoDeposit.countDocuments({ status: "PENDING", transactionId: { $ne: "" } }),
      WithdrawRequest.countDocuments({ status: "pending" }),
      AutoWithdraw.countDocuments({ status: { $in: ["PENDING", "PROCESSING"] } }),
      Admin.countDocuments(),
      User.aggregate([{ $match: { role: "user" } }, { $group: { _id: null, total: { $sum: "$balance" } } }]),
      totalOf(DONE.manualDeposit),
      totalOf(DONE.autoDeposit),
      totalOf(DONE.manualWithdraw),
      totalOf(DONE.autoWithdraw),
      byDay(DONE.manualDeposit, since),
      byDay(DONE.autoDeposit, since),
      byDay(DONE.manualWithdraw, since),
      byDay(DONE.autoWithdraw, since),
    ]);

    // শেষ ৭ দিন (বাংলাদেশের দিন), পুরোনো থেকে নতুন
    const chart = Array.from({ length: 7 }, (_, i) => {
      const start = new Date(since.getTime() + i * 24 * 3600 * 1000);
      const key = bdKey(start);
      return {
        day: new Date(start.getTime() + BD_MS).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        date: key,
        deposit: money((mdDays[key] || 0) + (adDays[key] || 0)),
        withdraw: money((mwDays[key] || 0) + (awDays[key] || 0)),
      };
    });

    return successResponse(res, "Dashboard summary loaded", {
      cards: {
        allUsers,
        activeUsers,
        allAffiliateUsers,
        allDepositBalances: money(md.total + ad.total),
        pendingDepositRequest: pendingDeposit + pendingAutoDeposit,
        allWithdrawBalances: money(mw.total + aw.total),
        pendingWithdrawRequest: pendingWithdraw + pendingAutoWithdraw,
        totalUserBalance: money(balanceRows[0]?.total),
        totalAdmins,
      },
      // কোন ধরনে কত — প্যানেল চাইলে আলাদা করে দেখাতে পারে
      split: {
        manualDeposit: md.total,
        autoDeposit: ad.total,
        manualWithdraw: mw.total,
        autoWithdraw: aw.total,
      },
      chart,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** একটা দিনের হিসাব — তারিখ "YYYY-MM-DD" (বাংলাদেশের দিন); না দিলে আজ */
router.get("/today", protectAdmin, async (req, res) => {
  try {
    const dateStr = String(req.query.date || "").trim();
    if (dateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return errorResponse(res, "Invalid date", 400);

    const start = bdDayStart(dateStr);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    const range = { $gte: start, $lt: end };

    const [newUsers, newAffiliates, md, ad, mw, aw, pendingDeposit, pendingAutoDeposit, pendingWithdraw, pendingAutoWithdraw] = await Promise.all([
      User.countDocuments({ role: "user", createdAt: range }),
      User.countDocuments({ role: "aff-user", createdAt: range }),
      totalOf(DONE.manualDeposit, range),
      totalOf(DONE.autoDeposit, range),
      totalOf(DONE.manualWithdraw, range),
      totalOf(DONE.autoWithdraw, range),
      DepositRequest.countDocuments({ status: "pending", createdAt: range }),
      AutoDeposit.countDocuments({ status: "PENDING", transactionId: { $ne: "" }, createdAt: range }),
      WithdrawRequest.countDocuments({ status: "pending", createdAt: range }),
      AutoWithdraw.countDocuments({ status: { $in: ["PENDING", "PROCESSING"] }, createdAt: range }),
    ]);

    return successResponse(res, "Day summary loaded", {
      date: bdKey(start),
      cards: {
        newUsers,
        newAffiliates,
        deposit: money(md.total + ad.total),
        withdraw: money(mw.total + aw.total),
        depositCount: md.n + ad.n,
        withdrawCount: mw.n + aw.n,
        pendingDeposit: pendingDeposit + pendingAutoDeposit,
        pendingWithdraw: pendingWithdraw + pendingAutoWithdraw,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
