import express from "express";

import { protectAdmin } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import DepositRequest from "../models/DepositRequest.js";
import WithdrawRequest from "../models/WithdrawRequest.js";
import AutoDeposit from "../models/AutoDeposit.js";
import MfsDeposit from "../models/MfsDeposit.js";
import AutoWithdraw from "../models/AutoWithdraw.js";
import { AffWithdrawRequest } from "../models/AffWithdraw.js";
import Verification from "../models/Verification.js";
import Feedback from "../models/Feedback.js";

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
  // পার্সোনাল অটো ডিপোজিট (MFSWallet)
  mfsDeposit: { Model: MfsDeposit, match: { status: "PAID" }, at: "paidAt" },
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

    const today0 = today;
    const [
      mfToday,
      pendingMfsDeposit,
      mf,
      mfDays,
      adToday,
      awToday,
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
      totalOf(DONE.mfsDeposit, { $gte: today0 }),
      // শুধু যেগুলো গেটওয়ে নিজে মেলাতে পারেনি — admin এর যাচাইয়ের অপেক্ষায়
      MfsDeposit.countDocuments({ status: "PENDING", needsReview: true }),
      totalOf(DONE.mfsDeposit),
      byDay(DONE.mfsDeposit, since),
      totalOf(DONE.autoDeposit, { $gte: today0 }),
      totalOf(DONE.autoWithdraw, { $gte: today0 }),
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
        deposit: money((mdDays[key] || 0) + (adDays[key] || 0) + (mfDays[key] || 0)),
        withdraw: money((mwDays[key] || 0) + (awDays[key] || 0)),
      };
    });

    return successResponse(res, "Dashboard summary loaded", {
      // ম্যানুয়াল আর অটো আলাদা — অটোর নিজের কার্ড (`auto`)
      cards: {
        allUsers,
        activeUsers,
        allAffiliateUsers,
        allDepositBalances: md.total,
        pendingDepositRequest: pendingDeposit,
        allWithdrawBalances: mw.total,
        pendingWithdrawRequest: pendingWithdraw,
        totalUserBalance: money(balanceRows[0]?.total),
        totalAdmins,
      },
      auto: {
        deposit: { total: ad.total, count: ad.n, today: adToday.total, todayCount: adToday.n, pending: pendingAutoDeposit },
        withdraw: { total: aw.total, count: aw.n, today: awToday.total, todayCount: awToday.n, pending: pendingAutoWithdraw },
      },
      // পার্সোনাল অটো ডিপোজিট (MFSWallet) — নিজের কার্ড
      mfs: {
        deposit: { total: mf.total, count: mf.n, today: mfToday.total, todayCount: mfToday.n, pending: pendingMfsDeposit },
      },
      // কোন ধরনে কত — প্যানেল চাইলে আলাদা করে দেখাতে পারে
      split: {
        manualDeposit: md.total,
        autoDeposit: ad.total,
        mfsDeposit: mf.total,
        manualWithdraw: mw.total,
        autoWithdraw: aw.total,
      },
      chart,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * অপেক্ষমাণ কাজ — সাইডবার আর ড্যাশবোর্ডের লাল ব্যাজ। key = admin এর মেনুর key।
 * অটো জমা: শুধু যেগুলোয় গেটওয়ে তথ্য পাঠিয়েছে (admin এর নিশ্চিতের অপেক্ষায়)।
 */
router.get("/pending", protectAdmin, async (req, res) => {
  try {
    const [mfsDeposit, deposit, autoDeposit, withdraw, autoWithdraw, affWithdraw, verifyUser, verifyAff, affiliates, feedback] = await Promise.all([
      MfsDeposit.countDocuments({ status: "PENDING", needsReview: true }),
      DepositRequest.countDocuments({ status: "pending" }),
      AutoDeposit.countDocuments({ status: "PENDING", transactionId: { $ne: "" } }),
      WithdrawRequest.countDocuments({ status: "pending" }),
      AutoWithdraw.countDocuments({ status: { $in: ["PENDING", "PROCESSING"] } }),
      AffWithdrawRequest.countDocuments({ status: "pending" }),
      Verification.countDocuments({ role: "user", status: "pending" }),
      Verification.countDocuments({ role: "aff-user", status: "pending" }),
      User.countDocuments({ role: "aff-user", affiliateStatus: "pending" }),
      Feedback.countDocuments({ status: "new" }),
    ]);
    res.set("Cache-Control", "no-store");
    return successResponse(res, "Pending counts", {
      counts: {
        "deposit-requests": deposit,
        "auto-deposit-history": autoDeposit,
        "mfs-deposit-history": mfsDeposit,
        "withdraw-requests": withdraw,
        "auto-withdraw-history": autoWithdraw,
        "aff-withdraw-requests": affWithdraw,
        verification: verifyUser,
        "affiliate-verification": verifyAff,
        affiliates,
        feedback,
      },
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

    const [mf, pendingMfsDeposit, newUsers, newAffiliates, md, ad, mw, aw, pendingDeposit, pendingAutoDeposit, pendingWithdraw, pendingAutoWithdraw] = await Promise.all([
      totalOf(DONE.mfsDeposit, range),
      MfsDeposit.countDocuments({ status: "PENDING", needsReview: true, createdAt: range }),
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
        // ম্যানুয়াল — অটোর দিনের হিসাব `auto` এ আলাদা
        deposit: md.total,
        withdraw: mw.total,
        depositCount: md.n,
        withdrawCount: mw.n,
        pendingDeposit,
        pendingWithdraw,
      },
      auto: {
        deposit: { total: ad.total, count: ad.n, pending: pendingAutoDeposit },
        withdraw: { total: aw.total, count: aw.n, pending: pendingAutoWithdraw },
      },
      mfs: {
        deposit: { total: mf.total, count: mf.n, pending: pendingMfsDeposit },
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
