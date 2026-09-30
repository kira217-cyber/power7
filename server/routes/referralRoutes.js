import express from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import ReferralReward from "../models/ReferralReward.js";
import ReferralSetting from "../models/ReferralSetting.js";
import DepositRequest from "../models/DepositRequest.js";
import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requireMother, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { money, num } from "../utils/money.js";
import {
  ACHIEVEMENT_PERIOD,
  claimReferralRewards,
  dayKey,
  dayStart,
  forgetReferralSetting,
  monthStart,
  syncMilestones,
} from "../utils/referral.js";

/**
 * "বন্ধুদের আমন্ত্রণ করুন" — মূল সাইটের পাঁচ ট্যাব: সারসংক্ষেপ, পুরস্কার,
 * আয়, রেকর্ড, আমন্ত্রিতদের তালিকা। নিয়মের হিসাব `utils/referral.js` এ।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(value);
const TYPES = ["invitation", "achievement", "deposit", "betting"];

/** "ab*******8" — মূল সাইটের মতো মাঝখান ঢাকা */
const mask = (value) => {
  const s = text(value);
  if (s.length <= 3) return `${s.slice(0, 1)}**`;
  return `${s.slice(0, 2)}${"*".repeat(s.length - 3)}${s.slice(-1)}`;
};

/**
 * "প্রাপ্ত পুরস্কার" কার্ড — পুরো সাইটে কোন ধরনে কত টাকা আর কতজন পেলেন।
 * সব সারি যোগ করা ভারী, তাই ৫ মিনিট মনে রাখা।
 */
let siteCache = { value: null, at: 0 };
const siteTotals = async () => {
  if (siteCache.value && Date.now() - siteCache.at < 300000) return siteCache.value;
  const rows = await ReferralReward.aggregate([
    { $match: { status: "claimed" } },
    { $group: { _id: { type: "$type", user: "$user" }, amount: { $sum: "$amount" } } },
    { $group: { _id: "$_id.type", amount: { $sum: "$amount" }, members: { $sum: 1 } } },
  ]);
  const value = Object.fromEntries(TYPES.map((t) => [t, { amount: 0, members: 0 }]));
  rows.forEach((r) => {
    value[r._id] = { amount: money(r.amount), members: r.members };
  });
  siteCache = { value, at: Date.now() };
  return value;
};

/** আমন্ত্রিতদের মধ্যে কতজন জমা দিয়েছেন — `since` দিলে সেই সময়ের পরে */
const depositorsOf = async (me, since = null) => {
  if (!since) return User.countDocuments({ referredBy: me, totalDeposit: { $gt: 0 } });
  const ids = await User.find({ referredBy: me }).distinct("_id");
  if (!ids.length) return 0;
  const found = await DepositRequest.distinct("user", { user: { $in: ids }, status: "approved", approvedAt: { $gte: since } });
  return found.length;
};

const pageOf = (query) => {
  const page = Math.max(1, num(query.page) || 1);
  const limit = Math.min(50, Math.max(1, num(query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

/* =========================
   খেলোয়াড়
   ========================= */

/** সারসংক্ষেপ — কোড, নিয়ম, আজ/গতকালের আয়, বন্ধুর সংখ্যা, কারা পেলেন */
router.get("/my", protectUser, async (req, res) => {
  try {
    if (req.user.role !== "user") return errorResponse(res, "Only players can invite friends", 403, "notPlayer");

    const setting = await ReferralSetting.current();
    const me = req.user._id;
    const today = dayStart(0);
    const yesterday = dayStart(1);

    const [sums, members, qualified, monthQualified, winners, todayMembers, todayQualified, depositors, todayDepositors, site, achievedNow] = await Promise.all([
      ReferralReward.aggregate([
        { $match: { user: me } },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            claimable: { $sum: { $cond: [{ $eq: ["$status", "claimable"] }, "$amount", 0] } },
            today: { $sum: { $cond: [{ $gte: ["$createdAt", today] }, "$amount", 0] } },
            yesterday: {
              $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", yesterday] }, { $lt: ["$createdAt", today] }] }, "$amount", 0] },
            },
          },
        },
      ]),
      User.countDocuments({ referredBy: me }),
      User.countDocuments({ referredBy: me, referralQualifiedAt: { $ne: null } }),
      User.countDocuments({ referredBy: me, referralQualifiedAt: { $gte: monthStart() } }),
      ReferralReward.find({ type: "invitation" }).sort({ createdAt: -1 }).limit(10).select("userIdText amount").lean(),
      User.countDocuments({ referredBy: me, createdAt: { $gte: today } }),
      User.countDocuments({ referredBy: me, referralQualifiedAt: { $gte: today } }),
      depositorsOf(me),
      depositorsOf(me, today),
      siteTotals(),
      ReferralReward.find({ user: me, type: "achievement", periodKey: ACHIEVEMENT_PERIOD }).select("milestoneCount status amount").lean(),
    ]);

    const totals = Object.fromEntries(TYPES.map((t) => [t, 0]));
    const todayByType = Object.fromEntries(TYPES.map((t) => [t, 0]));
    let claimable = 0;
    let todayIncome = 0;
    let yesterdayIncome = 0;
    sums.forEach((row) => {
      totals[row._id] = money(row.total);
      todayByType[row._id] = money(row.today);
      claimable += row.claimable;
      todayIncome += row.today;
      yesterdayIncome += row.yesterday;
    });

    // "পুরস্কার" ট্যাব — প্রতিটা মাইলফলকের অবস্থা। পৌঁছানো অথচ সারি নেই
    // (admin পরে ধাপ বদলেছেন) — তাহলে এখনই বসিয়ে আবার পড়া
    const clientSetting = setting.toClientJSON();
    let achieved = achievedNow;
    const has = new Set(achieved.map((a) => a.milestoneCount));
    if (clientSetting.achievement.enabled && clientSetting.achievement.milestones.some((m) => m.count <= qualified && !has.has(m.count))) {
      await syncMilestones(req.user);
      achieved = await ReferralReward.find({ user: me, type: "achievement", periodKey: ACHIEVEMENT_PERIOD }).select("milestoneCount status amount").lean();
    }
    const byCount = new Map(achieved.map((a) => [a.milestoneCount, a]));
    const milestones = clientSetting.achievement.milestones.map((m) => {
      const row = byCount.get(m.count);
      return {
        count: m.count,
        amount: money(m.amount),
        progress: Math.min(qualified, m.count),
        state: row ? (row.status === "claimed" ? "claimed" : "claimable") : "locked",
        rewardId: row && row.status !== "claimed" ? row._id : null,
      };
    });

    return successResponse(res, "Referral loaded", {
      referralCode: req.user.referralCode,
      setting: clientSetting,
      milestones,
      site,
      overview: {
        todayIncome: money(todayIncome),
        yesterdayIncome: money(yesterdayIncome),
        memberCount: members,
        qualifiedCount: qualified,
        monthQualifiedCount: monthQualified,
        claimable: money(claimable),
        totals,
        totalEarned: money(Object.values(totals).reduce((s, v) => s + v, 0)),
        todayByType,
        todayMemberCount: todayMembers,
        todayQualifiedCount: todayQualified,
        depositorCount: depositors,
        todayDepositorCount: todayDepositors,
      },
      winners: winners.map((w) => ({ user: mask(w.userIdText), amount: money(w.amount) })),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** পুরস্কার (claimable) বা রেকর্ড (claimed) */
router.get("/rewards", protectUser, async (req, res) => {
  try {
    const { page, limit, skip } = pageOf(req.query);
    const filter = { user: req.user._id };
    const status = text(req.query.status);
    if (["claimable", "claimed"].includes(status)) filter.status = status;
    const type = text(req.query.type);
    if (TYPES.includes(type)) filter.type = type;
    const from = new Date(text(req.query.from));
    const to = new Date(text(req.query.to));
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) filter.createdAt = { $gte: from, $lte: to };
    // এক পয়সার কম জমা বাজি-কমিশন দেখিয়ে লাভ নেই
    if (filter.status === "claimable") filter.amount = { $gte: 0.005 };

    const [rows, total, sum] = await Promise.all([
      ReferralReward.find(filter)
        .sort({ [status === "claimed" ? "claimedAt" : "createdAt"]: -1 })
        .skip(skip)
        .limit(limit)
        .select("type amount status fromUserIdText tier base percent periodKey milestoneCount createdAt claimedAt")
        .lean(),
      ReferralReward.countDocuments(filter),
      ReferralReward.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
    ]);

    return successResponse(res, "Rewards loaded", {
      rewards: rows.map((r) => ({ ...r, amount: money(r.amount), base: money(r.base), fromUser: r.fromUserIdText ? mask(r.fromUserIdText) : "" })),
      totalAmount: money(sum[0]?.amount),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** দাবি — `ids` না দিলে সব */
router.post("/claim", protectUser, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(isId).slice(0, 200) : null;
    const result = await claimReferralRewards(req.user, ids);
    if (!result.total) return errorResponse(res, "Nothing to claim", 400, "nothingToClaim");
    return successResponse(res, "Rewards claimed", result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** আয় — দিন অনুযায়ী, ধরন অনুযায়ী ভাগ (শেষ `days` দিন) */
router.get("/income", protectUser, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, num(req.query.days) || 30));
    const rows = await ReferralReward.aggregate([
      { $match: { user: req.user._id, createdAt: { $gte: dayStart(days - 1) } } },
      {
        $group: {
          _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+06:00" } }, type: "$type" },
          amount: { $sum: "$amount" },
        },
      },
    ]);

    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r._id.day)) map.set(r._id.day, { date: r._id.day, ...Object.fromEntries(TYPES.map((t) => [t, 0])) });
      map.get(r._id.day)[r._id.type] += r.amount;
    });
    const list = [...map.values()]
      .map((d) => {
        TYPES.forEach((t) => {
          d[t] = money(d[t]);
        });
        return { ...d, total: money(TYPES.reduce((s, t) => s + d[t], 0)) };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    return successResponse(res, "Income loaded", { rows: list, today: dayKey() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** আমন্ত্রিতদের তালিকা — আজ / গতকাল / ৭ দিন / সব / নিজের তারিখ */
router.get("/invitees", protectUser, async (req, res) => {
  try {
    const { page, limit, skip } = pageOf(req.query);
    const range = text(req.query.range) || "all";
    const filter = { referredBy: req.user._id };

    if (range === "today") filter.createdAt = { $gte: dayStart(0) };
    else if (range === "yesterday") filter.createdAt = { $gte: dayStart(1), $lt: dayStart(0) };
    else if (range === "7d") filter.createdAt = { $gte: dayStart(6) };
    else if (range === "custom") {
      const from = new Date(text(req.query.from));
      const to = new Date(text(req.query.to));
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return errorResponse(res, "Invalid date range", 400);
      filter.createdAt = { $gte: from, $lte: to };
    }

    const status = text(req.query.status);
    if (status === "qualified") filter.referralQualifiedAt = { $ne: null };
    else if (status === "unqualified") filter.referralQualifiedAt = null;

    const me = req.user._id;
    const [rows, total, allCount, qualified, todayQ, yesterdayQ, monthQ] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("userId createdAt referralQualifiedAt").lean(),
      User.countDocuments(filter),
      User.countDocuments({ referredBy: me }),
      User.countDocuments({ referredBy: me, referralQualifiedAt: { $ne: null } }),
      User.countDocuments({ referredBy: me, referralQualifiedAt: { $gte: dayStart(0) } }),
      User.countDocuments({ referredBy: me, referralQualifiedAt: { $gte: dayStart(1), $lt: dayStart(0) } }),
      User.countDocuments({ referredBy: me, referralQualifiedAt: { $gte: monthStart() } }),
    ]);

    return successResponse(res, "Invitees loaded", {
      invitees: rows.map((u) => ({
        user: mask(u.userId),
        registeredAt: u.createdAt,
        qualified: Boolean(u.referralQualifiedAt),
        qualifiedAt: u.referralQualifiedAt,
      })),
      footer: {
        totalInviteeCount: allCount,
        totalQualifiedCount: qualified,
        currentDayQualifiedCount: todayQ,
        previousDayQualifiedCount: yesterdayQ,
        currentMonthQualifiedCount: monthQ,
      },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   admin
   ========================= */

router.get("/admin/setting", protectAdmin, requireMother, async (req, res) => {
  try {
    const setting = await ReferralSetting.current();
    return successResponse(res, "Referral setting loaded", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

const cleanTiers = (list) =>
  (Array.isArray(list) ? list : [])
    .map((t) => ({ tier: Math.trunc(num(t.tier)), percent: money(num(t.percent) * 100) / 100 }))
    .filter((t) => t.tier >= 1 && t.tier <= 3 && t.percent >= 0 && t.percent <= 10)
    .filter((t, i, arr) => arr.findIndex((x) => x.tier === t.tier) === i)
    .sort((a, b) => a.tier - b.tier);

router.put("/admin/setting", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const body = req.body || {};
    const setting = await ReferralSetting.current();
    const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback);
    const pos = (v, fallback) => (v === undefined ? fallback : Math.max(0, money(v)));

    setting.isActive = bool(body.isActive, setting.isActive);

    if (body.invitation) {
      setting.invitation.enabled = bool(body.invitation.enabled, setting.invitation.enabled);
      setting.invitation.amount = pos(body.invitation.amount, setting.invitation.amount);
      setting.invitation.requireDeposit = pos(body.invitation.requireDeposit, setting.invitation.requireDeposit);
      setting.invitation.requireTurnover = pos(body.invitation.requireTurnover, setting.invitation.requireTurnover);
    }

    if (body.achievement) {
      setting.achievement.enabled = bool(body.achievement.enabled, setting.achievement.enabled);
      if (Array.isArray(body.achievement.milestones)) {
        const seen = new Set();
        setting.achievement.milestones = body.achievement.milestones
          .map((m) => ({ count: Math.trunc(num(m.count)), amount: money(m.amount) }))
          .filter((m) => m.count >= 1 && m.amount >= 0 && !seen.has(m.count) && seen.add(m.count))
          .sort((a, b) => a.count - b.count);
      }
    }

    ["depositRebate", "bettingRebate"].forEach((key) => {
      if (!body[key]) return;
      setting[key].enabled = bool(body[key].enabled, setting[key].enabled);
      if (Array.isArray(body[key].tiers)) setting[key].tiers = cleanTiers(body[key].tiers);
    });

    if (body.estimatePerInvitee !== undefined) setting.estimatePerInvitee = pos(body.estimatePerInvitee, setting.estimatePerInvitee);
    if (body.inviteDomain !== undefined) setting.inviteDomain = text(body.inviteDomain).slice(0, 200);
    if (body.agentLink !== undefined) setting.agentLink = text(body.agentLink).slice(0, 300);
    if (body.rules) {
      setting.rules = { bn: text(body.rules.bn).slice(0, 5000), en: text(body.rules.en).slice(0, 5000) };
    }

    await setting.save();
    forgetReferralSetting();
    return successResponse(res, "Referral setting saved", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** সব রেফারেল পুরস্কার — কে কোনটা পেলেন, দাবি করলেন কিনা */
router.get("/admin/rewards", protectAdmin, requirePermission("referral-rewards"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    const type = text(req.query.type);
    if (TYPES.includes(type)) filter.type = type;
    const status = text(req.query.status);
    if (["claimable", "claimed"].includes(status)) filter.status = status;
    const q = text(req.query.q);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ userIdText: rx }, { fromUserIdText: rx }];
    }

    const [rows, total, summary] = await Promise.all([
      ReferralReward.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ReferralReward.countDocuments(filter),
      ReferralReward.aggregate([{ $match: filter }, { $group: { _id: "$status", amount: { $sum: "$amount" }, n: { $sum: 1 } } }]),
    ]);

    const sum = { claimable: 0, claimed: 0, claimableCount: 0, claimedCount: 0 };
    summary.forEach((s) => {
      sum[s._id] = money(s.amount);
      sum[`${s._id}Count`] = s.n;
    });

    return successResponse(res, "Referral rewards loaded", {
      rewards: rows.map((r) => ({ ...r, amount: money(r.amount), base: money(r.base) })),
      summary: sum,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
