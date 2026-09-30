import User from "../models/User.js";
import GameHistory from "../models/GameHistory.js";
import VipLevel from "../models/VipLevel.js";
import VipSetting from "../models/VipSetting.js";
import VipTransaction from "../models/VipTransaction.js";
import { money, num } from "./money.js";
import { creditUser, writeLogs } from "./wallet.js";

/**
 * VIP ধাপ আর ম্যানুয়াল রিবেট।
 *
 * BetChokkor থেকে যা বদলানো:
 *   - ধাপে ওঠা আগে পড়ে তারপর লিখত — একসাথে দুটো বাজিতে বোনাস দুবার।
 *     এখানে "এখনকার ধাপ < নতুন ধাপ" শর্তে এক ধাপে বদল, আর প্রতিটা ধাপের
 *     বোনাসের সারিতে unique index — দ্বিতীয়বার বসতেই পারে না।
 *   - বোনাস `$inc` দিয়ে গোল ছাড়া, খাতার বাইরে — এখানে `creditUser` + খাতা।
 *   - ধাপ ১ থেকে শুরু হতো; মূল সাইটের মতো এখানে VIP0।
 */

let cache = { setting: null, levels: null, at: 0 };

const load = async () => {
  if (cache.setting && Date.now() - cache.at < 30000) return cache;
  const [setting, levels] = await Promise.all([VipSetting.current(), VipLevel.ladder()]);
  cache = { setting: setting.toObject(), levels, at: Date.now() };
  return cache;
};

export const vipConfig = load;

export const forgetVipCache = () => {
  cache = { setting: null, levels: null, at: 0 };
};

/** এই XP তে কোন ধাপ — না মিললে VIP0 */
export const levelForXp = (levels, xp) =>
  levels.reduce((best, l) => (xp >= num(l.xpRequired) && l.lv > best.lv ? l : best), levels[0] || { lv: 0 });

export const levelOf = (levels, lv) => levels.find((l) => l.lv === lv) || levels[0] || null;

/**
 * বাজির পরে — XP যোগ, দরকারে ধাপে ওঠা আর বোনাস।
 * কয়েক ধাপ একসাথে টপকালে প্রতিটার বোনাস আলাদা সারিতে।
 */
export const onVipBet = async ({ userId, betAmount }) => {
  if (!(betAmount > 0)) return;
  const { setting, levels } = await load();
  if (!setting.active || !levels.length) return;

  const xp = money(betAmount * num(setting.xpPerTurnover));
  if (xp <= 0) return;

  const after = await User.findOneAndUpdate(
    { _id: userId },
    [{ $set: { vipXP: { $round: [{ $add: [{ $ifNull: ["$vipXP", 0] }, xp] }, 2] } } }],
    { returnDocument: "after", projection: "userId vipXP vipLevel" },
  ).lean();
  if (!after) return;

  const target = levelForXp(levels, num(after.vipXP));
  if (target.lv <= num(after.vipLevel)) return;

  await promote(after, target.lv, levels);
};

/**
 * ধাপ বসানো — শর্তসাপেক্ষে, তাই একসাথে দুজন ডাকলে একজনই পারেন।
 * ফেরত দেয় আগের ধাপ (`from`) — না বদলালে null।
 */
const promote = async (user, toLv, levels, { by = null } = {}) => {
  const before = await User.findOneAndUpdate(
    { _id: user._id, vipLevel: { $lt: toLv } },
    { $set: { vipLevel: toLv } },
    { returnDocument: "before", projection: "userId vipLevel" },
  ).lean();
  if (!before) return null;

  const from = num(before.vipLevel);
  for (const level of levels) {
    if (level.lv <= from || level.lv > toLv) continue;
    const bonus = money(level.upgradeBonus);
    try {
      await VipTransaction.create({
        user: user._id,
        userIdText: user.userId,
        type: "upgrade",
        levelFrom: from,
        levelTo: level.lv,
        amount: bonus,
        reviewedBy: by,
        note: by ? "Set by admin" : "",
      });
    } catch (error) {
      if (error?.code === 11000) continue; // এই ধাপের বোনাস আগেই দেওয়া
      throw error;
    }
    if (bonus > 0) {
      const credited = await creditUser(user._id, bonus);
      await writeLogs(user._id, credited?.balance, [
        { type: "vip", amount: bonus, refType: "VipLevel", note: `${level.name || `VIP${level.lv}`} upgrade bonus` },
      ]);
    }
  }
  return from;
};

/** admin হাতে ধাপ বসানো — উপরে তুললে বোনাস যায়, নামালে যায় না */
export const setVipLevel = async (userId, lv, adminId) => {
  const { levels } = await load();
  const user = await User.findById(userId).select("userId vipLevel").lean();
  if (!user) return null;
  if (lv > num(user.vipLevel)) {
    await promote(user, lv, levels, { by: adminId });
  } else if (lv < num(user.vipLevel)) {
    await User.updateOne({ _id: userId }, { $set: { vipLevel: lv } });
    await VipTransaction.create({
      user: userId,
      userIdText: user.userId,
      type: "adjust",
      levelFrom: user.vipLevel,
      levelTo: lv,
      reviewedBy: adminId,
      note: "Lowered by admin",
    });
  }
  return User.findById(userId).lean();
};

/* =========================
   ম্যানুয়াল রিবেট
   ========================= */

/** খেলার ক্যাটাগরি → রিবেটের ঘর (বেটিং রেকর্ডের ট্যাবের মতোই) */
export const REBATE_KINDS = ["slot", "fishing", "live", "poker", "sports"];
const kindExpr = {
  $switch: {
    branches: [
      { case: { $eq: ["$gameCategory", "fishing"] }, then: "fishing" },
      { case: { $eq: ["$gameCategory", "live"] }, then: "live" },
      { case: { $eq: ["$gameCategory", "poker"] }, then: "poker" },
      { case: { $eq: ["$gameCategory", "sports"] }, then: "sports" },
    ],
    default: "slot",
  },
};

/** রিবেটের সময়সীমা — শেষ দাবির পর থেকে, তবে `rebateMaxDays` এর বেশি পেছনে নয় */
const windowOf = (user, setting, now) => {
  const oldest = new Date(now.getTime() - num(setting.rebateMaxDays || 7) * 86400000);
  const from = user.rebateFrom && user.rebateFrom > oldest ? user.rebateFrom : oldest;
  return { from, to: now };
};

/**
 * দাবি-না-করা রিবেট — দিন অনুযায়ী সারি, প্রতিটায় পাঁচ ঘর আর মোট।
 * হার খেলোয়াড়ের এখনকার VIP ধাপ থেকে।
 */
export const rebatePreview = async (user, { now = new Date(), tzOffset = 360 } = {}) => {
  const { setting, levels } = await load();
  const level = levelOf(levels, num(user.vipLevel));
  const rates = Object.fromEntries(REBATE_KINDS.map((k) => [k, num(level?.rebate?.[k])]));
  const { from, to } = windowOf(user, setting, now);

  const abs = Math.abs(tzOffset);
  const timezone = `${tzOffset < 0 ? "-" : "+"}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;

  const rows = await GameHistory.aggregate([
    { $match: { user: user._id, createdAt: { $gt: from, $lte: to }, betAmount: { $gt: 0 } } },
    {
      $group: {
        _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone } }, kind: kindExpr },
        bet: { $sum: "$betAmount" },
      },
    },
  ]);

  const days = new Map();
  rows.forEach((r) => {
    const day = r._id.day;
    if (!days.has(day)) days.set(day, { date: day, ...Object.fromEntries(REBATE_KINDS.map((k) => [k, 0])), bet: 0 });
    const d = days.get(day);
    d[r._id.kind] += (r.bet * rates[r._id.kind]) / 100;
    d.bet += r.bet;
  });

  const list = [...days.values()]
    .map((d) => {
      const out = { date: d.date, bet: money(d.bet) };
      REBATE_KINDS.forEach((k) => {
        out[k] = money(d[k]);
      });
      out.total = money(REBATE_KINDS.reduce((s, k) => s + out[k], 0));
      return out;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const totals = { bet: 0, total: 0 };
  REBATE_KINDS.forEach((k) => {
    totals[k] = money(list.reduce((s, d) => s + d[k], 0));
  });
  totals.bet = money(list.reduce((s, d) => s + d.bet, 0));
  totals.total = money(REBATE_KINDS.reduce((s, k) => s + totals[k], 0));

  return {
    enabled: Boolean(setting.active && setting.rebateEnabled),
    minClaim: num(setting.rebateMinClaim),
    maxDays: num(setting.rebateMaxDays),
    level: level ? { lv: level.lv, name: level.name } : null,
    rates,
    from,
    to,
    rows: list,
    totals,
  };
};

/**
 * দাবি — আগে হিসাব, তারপর `rebateFrom` কে "আগের মান → এখন" শর্তে সরানো।
 * একসাথে দুবার চাপলে দ্বিতীয়টার শর্ত আর মেলে না, তাই টাকা একবারই।
 */
export const claimRebate = async (userId) => {
  const user = await User.findById(userId).select("userId vipLevel rebateFrom").lean();
  if (!user) return { ok: false, code: "notFound" };

  const now = new Date();
  const preview = await rebatePreview(user, { now });
  if (!preview.enabled) return { ok: false, code: "rebateOff" };
  if (preview.totals.total <= 0 || preview.totals.total < preview.minClaim) {
    return { ok: false, code: "rebateTooLow", minClaim: preview.minClaim };
  }

  const moved = await User.updateOne(
    { _id: userId, rebateFrom: user.rebateFrom ?? null },
    { $set: { rebateFrom: now } },
  );
  if (!moved.modifiedCount) return { ok: false, code: "rebateBusy" };

  const amount = preview.totals.total;
  const credited = await creditUser(userId, amount);
  await writeLogs(userId, credited?.balance, [
    { type: "rebate", amount, refType: "Rebate", note: `Manual rebate (${preview.level?.name || "VIP"})` },
  ]);
  await VipTransaction.create({
    user: userId,
    userIdText: user.userId,
    type: "rebate",
    amount,
    levelFrom: num(user.vipLevel),
    levelTo: num(user.vipLevel),
    note: REBATE_KINDS.map((k) => `${k}:${preview.totals[k]}`).join(" "),
  }).catch(() => {});

  return { ok: true, amount, balance: credited?.balance ?? null, totals: preview.totals };
};
