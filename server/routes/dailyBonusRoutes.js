import express from "express";
import rateLimit from "express-rate-limit";

import { DAILY_BONUS_DAYS, DailyBonusClaim, DailyBonusSetting } from "../models/DailyBonus.js";
import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { money, num } from "../utils/money.js";
import { claimDailyBonus, dailyBonusSetting, dailyBonusState, dayKeyOf } from "../utils/dailyBonus.js";

/**
 * ডেইলি বোনাস — `/api/daily-bonus`।
 * খেলোয়াড়: আজকের অবস্থা আর দাবি ("দাবি করা" পাতায়, মোবাইল ও ডেস্কটপ)।
 * admin (perm `rewards`): ৭ দিনের টাকা, নিয়ম, আর কে কবে কত পেল।
 */
const router = express.Router();

const text = (value, max = 200) => String(value ?? "").trim().slice(0, max);
const both = (value, max = 200) => ({ bn: text(value?.bn, max), en: text(value?.en, max) });
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, num(value)));

// দাবি — এক মিনিটে ১০টার বেশি নয়
const claimLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, message: "Too many requests", code: "tooMany" },
});

/* ─────────────────── খেলোয়াড় ─────────────────── */

router.get("/", protectUser, async (req, res) => {
  try {
    return successResponse(res, "Daily bonus", await dailyBonusState(req.user));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/claim", protectUser, claimLimiter, async (req, res) => {
  try {
    const result = await claimDailyBonus(req.user);
    if (!result.ok) return errorResponse(res, result.code, 400, result.code);
    return successResponse(res, "Daily bonus claimed", result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ─────────────────── admin ─────────────────── */

const admin = [protectAdmin, requirePermission("rewards")];
const write = [...admin, requireWrite];

router.get("/admin/setting", ...admin, async (req, res) => {
  try {
    const today = dayKeyOf();
    const [setting, todayStats, allStats] = await Promise.all([
      dailyBonusSetting(),
      DailyBonusClaim.aggregate([{ $match: { dayKey: today } }, { $group: { _id: null, n: { $sum: 1 }, paid: { $sum: "$amount" } } }]),
      DailyBonusClaim.aggregate([{ $group: { _id: null, n: { $sum: 1 }, paid: { $sum: "$amount" }, players: { $addToSet: "$user" } } }]),
    ]);
    return successResponse(res, "Daily bonus setting", {
      setting,
      stats: {
        todayClaims: todayStats[0]?.n || 0,
        todayPaid: money(todayStats[0]?.paid),
        totalClaims: allStats[0]?.n || 0,
        totalPaid: money(allStats[0]?.paid),
        players: allStats[0]?.players?.length || 0,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/setting", ...write, async (req, res) => {
  try {
    const b = req.body || {};
    const days = Array.from({ length: DAILY_BONUS_DAYS }, (_, i) => money(clamp(b.days?.[i], 0, 1e7)));
    const setting = await DailyBonusSetting.findOneAndUpdate(
      { key: "main" },
      {
        $set: {
          enabled: b.enabled === true,
          title: both(b.title, 120),
          rules: both(b.rules, 5000),
          days,
          turnoverMultiplier: clamp(b.turnoverMultiplier, 0, 100),
          minTotalDeposit: money(clamp(b.minTotalDeposit, 0, 1e8)),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    return successResponse(res, "Daily bonus saved", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** কে কবে কত পেল — ইউজারনেম আর দিন ধরে ছাঁকা */
router.get("/admin/claims", ...admin, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    const q = text(req.query.q, 40).toLowerCase();
    if (q) filter.userIdText = q;
    const dayNo = Math.trunc(num(req.query.dayNo));
    if (dayNo >= 1 && dayNo <= DAILY_BONUS_DAYS) filter.dayNo = dayNo;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text(req.query.date))) filter.dayKey = text(req.query.date);

    const [rows, total, paid] = await Promise.all([
      DailyBonusClaim.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      DailyBonusClaim.countDocuments(filter),
      DailyBonusClaim.aggregate([{ $match: filter }, { $group: { _id: null, n: { $sum: "$amount" } } }]),
    ]);
    return successResponse(res, "Daily bonus claims", {
      claims: rows,
      paid: money(paid[0]?.n),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
