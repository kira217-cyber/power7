import User from "../models/User.js";
import ReferralReward from "../models/ReferralReward.js";
import ReferralSetting from "../models/ReferralSetting.js";
import { money, num } from "./money.js";
import { onTemuTask } from "./reward.js";
import { creditUser, writeLogs } from "./wallet.js";

/**
 * খেলোয়াড়ের রেফারেল প্রোগ্রাম — কে কখন কত পাবেন।
 *
 * BetChokkor থেকে যা বদলানো:
 *   - টাকা সরাসরি `$inc` দিয়ে বসত, গোল ছাড়া আর খাতায় চিহ্ন ছাড়া —
 *     এখানে সব `claimable` সারিতে জমে, দাবির সময় `creditUser` + খাতা।
 *   - অ্যাফিলিয়েটের আনা খেলোয়াড়ের বাজি থেকে অ্যাফিলিয়েট কমিশনও পেতেন
 *     আবার প্রোগ্রাম থেকেও (দুবার) — এখানে শিকল অ্যাফিলিয়েটে থামে।
 *   - প্রতিটা বাজিতে একটা সারি — এখানে দিনে একটা সারি।
 */

/* ── সেটিং — প্রতি বাজিতে ডেটাবেস না পড়ে ৩০ সেকেন্ড মনে রাখা ── */

let cache = { value: null, at: 0 };

export const referralSetting = async () => {
  if (cache.value && Date.now() - cache.at < 30000) return cache.value;
  const doc = await ReferralSetting.current();
  cache = { value: doc.toObject(), at: Date.now() };
  return cache.value;
};

export const forgetReferralSetting = () => {
  cache = { value: null, at: 0 };
};

const pad = (n) => String(n).padStart(2, "0");

/** বাংলাদেশের দিন/মাস ধরে হিসাব (UTC+6) — মাসের মাইলফলক, দিনের সারি */
const BD_OFFSET = 6 * 3600000;
const bdDate = (at = new Date()) => new Date(at.getTime() + BD_OFFSET);
export const dayKey = (at = new Date()) => {
  const d = bdDate(at);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
export const monthKey = (at = new Date()) => dayKey(at).slice(0, 7);

/** বাংলাদেশের মাসের শুরু (UTC সময়ে) */
export const monthStart = (at = new Date()) => {
  const d = bdDate(at);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - BD_OFFSET);
};

/** বাংলাদেশের দিনের শুরু, `back` দিন আগে */
export const dayStart = (back = 0, at = new Date()) => {
  const d = bdDate(at);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back) - BD_OFFSET);
};

/**
 * উপরের রেফারকারীরা — `[{ tier, user }]`, সবচেয়ে কাছেরটা আগে।
 *
 * শুধু সক্রিয় খেলোয়াড় (`role: "user"`); অ্যাফিলিয়েটে পৌঁছালে থামে।
 * ভুলে বৃত্ত তৈরি হলেও (ক → খ → ক) আটকে না যেতে দেখা আইডি মনে রাখা।
 */
export const uplinesOf = async (referredBy, maxTier = 3) => {
  const out = [];
  const seen = new Set();
  let next = referredBy;

  for (let tier = 1; tier <= maxTier && next; tier += 1) {
    const key = String(next);
    if (seen.has(key)) break;
    seen.add(key);

    const up = await User.findById(next).select("userId role isActive referredBy").lean();
    if (!up || up.role !== "user") break;
    if (up.isActive) out.push({ tier, user: up });
    next = up.referredBy;
  }

  return out;
};

/** মাইলফলক সারাজীবনের — মূল সাইটে "মোট N জন বৈধ আমন্ত্রিত" */
export const ACHIEVEMENT_PERIOD = "all";

const percentOf = (tiers = [], tier) => num(tiers.find((t) => t.tier === tier)?.percent);

/* =========================
   বাজির কমিশন — callback থেকে
   ========================= */

/** দিনের খোলা সারিতে যোগ — একসাথে দুটো বাজিতে দুটো সারি হলে একবার আবার চেষ্টা */
const addToDay = async ({ user, userIdText, amount, wager, percent, tier }) => {
  const key = dayKey();
  const filter = { user: user._id, type: "betting", periodKey: key, status: "claimable" };
  const update = {
    $inc: { amount, base: wager },
    $setOnInsert: { userIdText, tier, percent },
  };
  try {
    await ReferralReward.updateOne(filter, update, { upsert: true });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    await ReferralReward.updateOne(filter, update, { upsert: true });
  }
};

export const onReferralBet = async ({ referredBy, betAmount }) => {
  if (!referredBy || !(betAmount > 0)) return;
  const setting = await referralSetting();
  if (!setting.isActive || !setting.bettingRebate?.enabled) return;

  const ups = await uplinesOf(referredBy, 3);
  for (const { tier, user } of ups) {
    const percent = percentOf(setting.bettingRebate.tiers, tier);
    if (percent <= 0) continue;
    // ভগ্নাংশ রেখে দেওয়া (৪ দশমিক) — ছোট বাজির কমিশন হারিয়ে না যায়
    const amount = Math.round(betAmount * percent * 100) / 10000;
    if (amount <= 0) continue;
    await addToDay({ user, userIdText: user.userId, amount, wager: betAmount, percent, tier });
  }
};

/* =========================
   যোগ্য বন্ধু + মাইলফলক
   ========================= */

/**
 * পুরস্কারের সারি বসানো — আগেই থাকলে (unique index) চুপচাপ বাদ।
 * `pay` হলে সাথে সাথে ব্যালেন্সে (মূল সাইটে আমন্ত্রণ আর জমার রিবেট
 * নিজে থেকেই যায়; শুধু মাইলফলক দাবি করতে হয়)।
 */
const grant = async (doc, { pay = false } = {}) => {
  let row;
  try {
    row = await ReferralReward.create(doc);
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
  // eslint-disable-next-line no-use-before-define
  if (pay) await claimReferralRewards({ _id: doc.user }, [row._id]);
  return row;
};

/** মোট কতজন যোগ্য বন্ধু — তার সমান বা কম সব মাইলফলক (একবারই, দাবি করতে হয়) */
const checkMilestones = async (referrer, setting) => {
  if (!setting.achievement?.enabled) return;
  const milestones = setting.achievement.milestones || [];
  if (!milestones.length) return;

  const count = await User.countDocuments({ referredBy: referrer._id, referralQualifiedAt: { $ne: null } });

  for (const m of milestones) {
    if (m.count > count || !(m.amount > 0)) continue;
    await grant({
      user: referrer._id,
      userIdText: referrer.userId,
      type: "achievement",
      amount: money(m.amount),
      periodKey: ACHIEVEMENT_PERIOD,
      milestoneCount: m.count,
    });
  }
};

/**
 * মাইলফলক আবার মেলানো — admin নতুন/ছোট ধাপ বসালে যাঁরা আগেই সেখানে
 * পৌঁছেছেন তাঁরাও পান (পরের বন্ধু যোগ্য হওয়া পর্যন্ত অপেক্ষা নয়)।
 */
export const syncMilestones = async (user) => {
  const setting = await referralSetting();
  if (!setting.isActive) return;
  await checkMilestones(user, setting);
};

/**
 * বন্ধু যোগ্য হলেন কিনা দেখা — জমা অনুমোদন আর বাজির পরে ডাকা হয়।
 * যোগ্যতার তারিখ null থেকে বসানো এক ধাপে, তাই পুরস্কার একবারই।
 */
export const checkQualified = async (userId) => {
  const setting = await referralSetting();
  if (!setting.isActive) return;

  const inv = setting.invitation || {};
  const invitee = await User.findOne({
    _id: userId,
    referralQualifiedAt: null,
    referredBy: { $ne: null },
    totalDeposit: { $gte: num(inv.requireDeposit) },
    totalTurnover: { $gte: num(inv.requireTurnover) },
  })
    .select("userId referredBy")
    .lean();
  if (!invitee) return;

  const referrer = await User.findOne({ _id: invitee.referredBy, role: "user" }).select("userId isActive").lean();
  // অ্যাফিলিয়েটের খেলোয়াড় — প্রোগ্রামের বাইরে
  if (!referrer) return;

  const marked = await User.updateOne(
    { _id: invitee._id, referralQualifiedAt: null },
    { $set: { referralQualifiedAt: new Date() } },
  );
  if (!marked.modifiedCount || !referrer.isActive) return;

  // টেমু টিকিটের "বন্ধু আমন্ত্রণ" কাজ
  await onTemuTask(referrer._id, "invite").catch((error) => console.error("TEMU invite failed:", error.message));

  if (inv.enabled && inv.amount > 0) {
    await grant(
      {
        user: referrer._id,
        userIdText: referrer.userId,
        type: "invitation",
        amount: money(inv.amount),
        fromUser: invitee._id,
        fromUserIdText: invitee.userId,
        tier: 1,
      },
      { pay: true },
    );
  }

  await checkMilestones(referrer, setting);
};

/* =========================
   জমার রিবেট — জমা অনুমোদনের পরে
   ========================= */

export const onReferralDeposit = async ({ userId, amount, requestId }) => {
  const setting = await referralSetting();
  if (!setting.isActive) return;

  const player = await User.findById(userId).select("userId referredBy").lean();
  if (!player?.referredBy) return;

  if (setting.depositRebate?.enabled && amount > 0) {
    const ups = await uplinesOf(player.referredBy, 3);
    for (const { tier, user } of ups) {
      const percent = percentOf(setting.depositRebate.tiers, tier);
      const reward = money((amount * percent) / 100);
      if (reward <= 0) continue;
      await grant(
        {
          user: user._id,
          userIdText: user.userId,
          type: "deposit",
          amount: reward,
          fromUser: player._id,
          fromUserIdText: player.userId,
          tier,
          base: money(amount),
          percent,
          refId: requestId,
        },
        { pay: true },
      );
    }
  }

  await checkQualified(userId);
};

/* =========================
   দাবি
   ========================= */

/**
 * দাবি — প্রতিটা সারি আলাদা করে `claimable → claimed` (এক ধাপে), যেটা
 * সত্যিই এই অনুরোধে বদলাল শুধু সেটার টাকা; তারপর একবারে ব্যালেন্সে।
 * একসাথে দুবার চাপলেও একই সারি দুবার গোনা হয় না।
 */
export const claimReferralRewards = async (user, ids = null) => {
  const filter = { user: user._id, status: "claimable", amount: { $gte: 0.005 } };
  if (Array.isArray(ids) && ids.length) filter._id = { $in: ids };

  const rows = await ReferralReward.find(filter).select("_id").limit(500).lean();
  const now = new Date();
  const taken = [];

  for (const row of rows) {
    const doc = await ReferralReward.findOneAndUpdate(
      { _id: row._id, status: "claimable" },
      { $set: { status: "claimed", claimedAt: now } },
      { returnDocument: "after" },
    ).lean();
    if (doc) taken.push(doc);
  }

  // ধরন অনুযায়ী যোগ — খাতায় আলাদা সারি, আর মোট = সারিগুলোর যোগফল (পয়সা মেলে)
  const byType = {};
  taken.forEach((r) => {
    byType[r.type] = (byType[r.type] || 0) + num(r.amount);
  });
  Object.keys(byType).forEach((type) => {
    byType[type] = money(byType[type]);
  });
  const total = money(Object.values(byType).reduce((sum, v) => sum + v, 0));
  if (total <= 0) return { total: 0, count: 0, balance: null };

  let credited;
  try {
    credited = await creditUser(user._id, total);
  } catch (error) {
    // ব্যালেন্সে না গেলে সারিগুলো আবার খোলা
    await ReferralReward.updateMany({ _id: { $in: taken.map((r) => r._id) } }, { $set: { status: "claimable", claimedAt: null } });
    throw error;
  }

  await writeLogs(
    user._id,
    credited?.balance,
    Object.entries(byType).map(([type, amount]) => ({
      type: "referral",
      amount,
      refType: "ReferralReward",
      note: `Referral ${type}`,
    })),
  );

  return { total, count: taken.length, balance: credited?.balance ?? null };
};

/* =========================
   বাজির কমিশন — ১৫ মিনিট পরপর ব্যালেন্সে
   ========================= */

/**
 * সবার জমে থাকা বাজির কমিশন একবারে ব্যালেন্সে (মূল সাইটের মতো "১৫
 * মিনিটে আপডেট")। প্রতিটা বাজিতে আলাদা করে দিলে খাতা ভরে যেত।
 * একই সময়ে দুটো server চললেও দাবিটা সারি ধরে শর্তসাপেক্ষ, তাই দুবার নয়।
 */
export const payBettingCommissions = async () => {
  const rows = await ReferralReward.aggregate([
    { $match: { type: "betting", status: "claimable", amount: { $gte: 0.005 } } },
    { $group: { _id: "$user", ids: { $push: "$_id" } } },
    { $limit: 5000 },
  ]);
  let paid = 0;
  for (const row of rows) {
    try {
      const result = await claimReferralRewards({ _id: row._id }, row.ids);
      if (result.total > 0) paid += 1;
    } catch (error) {
      console.error("Betting commission payout failed:", error.message);
    }
  }
  return paid;
};

let timer = null;
export const startReferralPayouts = (everyMs = 15 * 60 * 1000) => {
  if (timer) return;
  timer = setInterval(() => {
    payBettingCommissions().catch((error) => console.error("Referral payout:", error.message));
  }, everyMs);
  timer.unref?.();
};
