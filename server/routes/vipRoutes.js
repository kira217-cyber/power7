import express from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import VipLevel from "../models/VipLevel.js";
import VipSetting from "../models/VipSetting.js";
import VipTransaction from "../models/VipTransaction.js";
import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requireMother, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { money, num } from "../utils/money.js";
import { REBATE_KINDS, claimRebate, forgetVipCache, levelOf, rebatePreview, setVipLevel, vipConfig } from "../utils/vip.js";

/**
 * VIP ধাপ আর "ম্যানুয়াল রিবেট" — খেলোয়াড় আর admin দুদিকের রুট।
 * হিসাবের আসল কাজ `utils/vip.js` এ।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(value);

const publicLevel = (l) => ({
  lv: l.lv,
  name: l.name || `VIP${l.lv}`,
  xpRequired: l.xpRequired,
  upgradeBonus: l.upgradeBonus,
  rebate: l.rebate,
  color: l.color,
});

/* =========================
   খেলোয়াড়
   ========================= */

router.get("/my", protectUser, async (req, res) => {
  try {
    const { setting, levels } = await vipConfig();
    const lv = num(req.user.vipLevel);
    const current = levelOf(levels, lv);
    const next = levels.find((l) => l.lv > lv) || null;
    const xp = num(req.user.vipXP);
    const base = num(current?.xpRequired);
    const progress = next ? Math.min(100, Math.max(0, ((xp - base) / Math.max(1, num(next.xpRequired) - base)) * 100)) : 100;

    return successResponse(res, "VIP loaded", {
      active: setting.active,
      level: current ? publicLevel(current) : { lv, name: `VIP${lv}` },
      next: next ? publicLevel(next) : null,
      xp: money(xp),
      progress: Math.round(progress * 10) / 10,
      levels: levels.map(publicLevel),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** দাবি-না-করা রিবেট — `tz` = ডিভাইসের সময়ের পার্থক্য (মিনিট, UTC থেকে) */
router.get("/rebate", protectUser, async (req, res) => {
  try {
    const tz = Math.max(-720, Math.min(840, Math.trunc(num(req.query.tz ?? 360))));
    const data = await rebatePreview(req.user, { tzOffset: tz });
    return successResponse(res, "Rebate loaded", data);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/rebate/claim", protectUser, async (req, res) => {
  try {
    const result = await claimRebate(req.user._id);
    if (!result.ok) {
      const messages = {
        rebateOff: "Rebate is turned off",
        rebateTooLow: `Minimum rebate to claim is ${result.minClaim}`,
        rebateBusy: "Please try again",
        notFound: "User not found",
      };
      return errorResponse(res, messages[result.code] || "Could not claim", 400, result.code);
    }
    return successResponse(res, "Rebate claimed", result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   admin — ধাপ
   ========================= */

const cleanLevel = (body = {}) => {
  const out = {};
  if (body.lv !== undefined) out.lv = Math.max(0, Math.trunc(num(body.lv)));
  if (body.name !== undefined) out.name = text(body.name).slice(0, 40);
  if (body.xpRequired !== undefined) out.xpRequired = Math.max(0, money(body.xpRequired));
  if (body.upgradeBonus !== undefined) out.upgradeBonus = Math.max(0, money(body.upgradeBonus));
  if (body.color !== undefined) out.color = text(body.color).slice(0, 20);
  if (typeof body.isActive === "boolean") out.isActive = body.isActive;
  if (body.rebate) {
    REBATE_KINDS.forEach((k) => {
      if (body.rebate[k] !== undefined) out[`rebate.${k}`] = Math.min(5, Math.max(0, Math.round(num(body.rebate[k]) * 100) / 100));
    });
  }
  return out;
};

router.get("/admin/levels", protectAdmin, requireMother, async (req, res) => {
  try {
    await VipLevel.ladder(); // প্রথমবার ডিফল্ট বসানো
    const levels = await VipLevel.find().sort({ lv: 1 }).lean();
    const counts = await User.aggregate([{ $match: { role: "user" } }, { $group: { _id: "$vipLevel", n: { $sum: 1 } } }]);
    const byLv = Object.fromEntries(counts.map((c) => [c._id ?? 0, c.n]));
    return successResponse(res, "VIP levels loaded", { levels: levels.map((l) => ({ ...l, members: byLv[l.lv] || 0 })) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/admin/levels", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const data = cleanLevel(req.body);
    if (data.lv === undefined) return errorResponse(res, "Level number is required", 400);
    if (await VipLevel.exists({ lv: data.lv })) return errorResponse(res, `VIP${data.lv} already exists`, 400);
    const plain = {};
    Object.entries(data).forEach(([k, v]) => {
      if (k.startsWith("rebate.")) {
        plain.rebate = plain.rebate || {};
        plain.rebate[k.slice(7)] = v;
      } else plain[k] = v;
    });
    if (!plain.name) plain.name = `VIP${plain.lv}`;
    const level = await VipLevel.create(plain);
    forgetVipCache();
    return successResponse(res, "VIP level added", { level }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/levels/:id", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const data = cleanLevel(req.body);
    delete data.lv; // ধাপের নম্বর বদলালে খেলোয়াড়দের ধাপ এলোমেলো হতো
    const current = await VipLevel.findById(req.params.id).lean();
    if (!current) return errorResponse(res, "Level not found", 404);
    // VIP0 সবার শুরু — বন্ধ বা XP শর্ত দেওয়া যায় না
    if (current.lv === 0) {
      data.xpRequired = 0;
      delete data.isActive;
    }
    const level = await VipLevel.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: "after", runValidators: true });
    forgetVipCache();
    return successResponse(res, "VIP level saved", { level });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.delete("/admin/levels/:id", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const level = await VipLevel.findById(req.params.id).lean();
    if (!level) return errorResponse(res, "Level not found", 404);
    if (level.lv === 0) return errorResponse(res, "VIP0 cannot be deleted", 400);
    if (await User.exists({ vipLevel: level.lv })) {
      return errorResponse(res, "Players are on this level — turn it off instead", 400);
    }
    await VipLevel.deleteOne({ _id: level._id });
    forgetVipCache();
    return successResponse(res, "VIP level deleted", {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   admin — সেটিং, ইতিহাস, খেলোয়াড়ের ধাপ
   ========================= */

router.get("/admin/setting", protectAdmin, requireMother, async (req, res) => {
  try {
    return successResponse(res, "VIP setting loaded", { setting: await VipSetting.current() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/setting", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const body = req.body || {};
    const setting = await VipSetting.current();
    ["active", "rebateEnabled"].forEach((k) => {
      if (typeof body[k] === "boolean") setting[k] = body[k];
    });
    if (body.xpPerTurnover !== undefined) setting.xpPerTurnover = Math.max(0, num(body.xpPerTurnover));
    if (body.rebateMinClaim !== undefined) setting.rebateMinClaim = Math.max(0, money(body.rebateMinClaim));
    if (body.rebateMaxDays !== undefined) setting.rebateMaxDays = Math.min(60, Math.max(1, Math.trunc(num(body.rebateMaxDays))));
    await setting.save();
    forgetVipCache();
    return successResponse(res, "VIP setting saved", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/admin/history", protectAdmin, requirePermission("vip-history"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    const type = text(req.query.type);
    if (["upgrade", "adjust", "rebate"].includes(type)) filter.type = type;
    else filter.type = { $in: ["upgrade", "adjust", "rebate"] };
    const q = text(req.query.q);
    if (q) filter.userIdText = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [rows, total, sums] = await Promise.all([
      VipTransaction.find(filter).populate("reviewedBy", "email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      VipTransaction.countDocuments(filter),
      VipTransaction.aggregate([{ $match: filter }, { $group: { _id: "$type", amount: { $sum: "$amount" }, n: { $sum: 1 } } }]),
    ]);

    const summary = Object.fromEntries(sums.map((s) => [s._id, { amount: money(s.amount), count: s.n }]));
    return successResponse(res, "VIP history loaded", {
      history: rows,
      summary,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** একজন খেলোয়াড়ের ধাপ হাতে বসানো (Users › বিস্তারিত) */
router.put("/admin/user/:id/level", protectAdmin, requirePermission("users"), requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const lv = Math.trunc(num(req.body?.lv));
    if (!(await VipLevel.exists({ lv }))) return errorResponse(res, "Level not found", 400);
    const user = await setVipLevel(req.params.id, lv, req.admin._id);
    if (!user) return errorResponse(res, "User not found", 404);
    return successResponse(res, "VIP level updated", { vipLevel: user.vipLevel, vipXP: user.vipXP, balance: user.balance });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
