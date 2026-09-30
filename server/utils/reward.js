import crypto from "node:crypto";

import User from "../models/User.js";
import BalanceLog from "../models/BalanceLog.js";
import GameHistory from "../models/GameHistory.js";
import TurnOver from "../models/TurnOver.js";
import { RewardTemplate, RewardTicket, SignInRecord, SignInSetting } from "../models/Reward.js";
import { creditUser, writeLogs } from "./wallet.js";
import { money, num } from "./money.js";

// বাংলাদেশের দিন (UTC+6) — referral.js এর মতোই; ওটা এই ফাইল import করে বলে এখানে আলাদা
const BD_OFFSET = 6 * 3600000;
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (at = new Date()) => {
  const d = new Date(at.getTime() + BD_OFFSET);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const dayStart = (at = new Date()) => {
  const d = new Date(at.getTime() + BD_OFFSET);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - BD_OFFSET);
};

/**
 * পুরস্কার কেন্দ্রের সব হিসাব — টিকিট দেওয়া, খোলা, টেমুর অগ্রগতি, সাইন-ইন।
 *
 * টাকা সবসময় টিকিটের অবস্থা এক ধাপে (available → claimed) বদলানোর পরেই
 * যায়, তাই একই টিকিট দুই ট্যাব থেকে একসাথে খুললেও টাকা একবারই আসে।
 */

/** [min, max] এর মধ্যে এলোমেলো, দুই দশমিকে */
const randomBetween = (min, max) => {
  const lo = Math.min(num(min), num(max));
  const hi = Math.max(num(min), num(max));
  return money(lo + (crypto.randomInt(0, 1_000_001) / 1_000_000) * (hi - lo));
};

/** ওজন অনুযায়ী চাকার একটা ঘর — ঘরের সূচক */
const pickSegment = (segments) => {
  const total = segments.reduce((sum, s) => sum + Math.max(0, num(s.weight)), 0);
  if (total <= 0) return crypto.randomInt(0, segments.length);
  let roll = (crypto.randomInt(0, 1_000_000) / 1_000_000) * total;
  for (let i = 0; i < segments.length; i += 1) {
    roll -= Math.max(0, num(segments[i].weight));
    if (roll < 0) return i;
  }
  return segments.length - 1;
};

/** টেমপ্লেট থেকে টিকিটে যায় শুধু পুরস্কারের নিয়মটুকু */
const prizeOf = (tpl) => {
  if (tpl.kind === "redPacket") return { min: num(tpl.redPacket?.min), max: num(tpl.redPacket?.max) };
  if (tpl.kind === "wheel") return { segments: (tpl.wheel?.segments || []).map((s) => ({ amount: num(s.amount), weight: num(s.weight) })) };
  const t = tpl.temu || {};
  return {
    target: num(t.target),
    stepMinPct: num(t.stepMinPct),
    stepMaxPct: num(t.stepMaxPct),
    finishBelow: num(t.finishBelow),
    tasks: t.tasks || [],
    maxInvites: num(t.maxInvites),
  };
};

/**
 * একজন খেলোয়াড়কে একটা টিকিট। `sourceKey` দিলে একই উৎস থেকে দ্বিতীয়টা
 * তৈরি হয় না (unique index) — তখন আগেরটাই ফেরত।
 */
export const issueTicket = async (user, tpl, { source = "admin", sourceKey = null, by = null } = {}) => {
  const now = new Date();
  const doc = {
    user: user._id,
    userIdText: user.userId,
    template: tpl._id,
    kind: tpl.kind,
    name: tpl.name,
    label: tpl.label,
    description: tpl.description,
    source,
    sourceKey,
    startAt: now,
    endAt: new Date(now.getTime() + num(tpl.validDays || 7) * 86400000),
    turnoverMultiplier: num(tpl.turnoverMultiplier),
    prize: prizeOf(tpl),
    issuedBy: by,
  };
  if (tpl.kind === "temu") {
    const target = money(tpl.temu?.target);
    const init = money((target * randomBetween(tpl.temu?.initMinPct, tpl.temu?.initMaxPct)) / 100);
    doc.temu = { target, score: init, history: [{ condition: "claimInitScore", score: init, at: now }] };
  }
  try {
    return await RewardTicket.create(doc);
  } catch (error) {
    if (error?.code === 11000 && sourceKey) return RewardTicket.findOne({ user: user._id, sourceKey });
    throw error;
  }
};

/** মেয়াদ পেরোনো টিকিট "expired" — পড়ার আগে ডাকা হয় */
export const expireTickets = (userId) =>
  RewardTicket.updateMany({ user: userId, status: "available", endAt: { $lt: new Date() } }, { $set: { status: "expired" } });

/** পাওয়া টাকা ব্যালেন্সে, খাতায়, আর দরকার হলে টার্নওভারের শর্ত */
const payTicket = async (ticket, amount, note) => {
  const credited = await creditUser(ticket.user, amount);
  await writeLogs(ticket.user, credited?.balance, [
    { type: "reward", amount, refType: "RewardTicket", refId: ticket._id, note },
  ]);
  const required = money(amount * num(ticket.turnoverMultiplier));
  if (required > 0) {
    await TurnOver.findOneAndUpdate(
      { user: ticket.user, sourceType: "reward", sourceId: ticket._id },
      { user: ticket.user, sourceType: "reward", sourceId: ticket._id, title: note, required, creditedAmount: 0, status: "running" },
      { upsert: true, setDefaultsOnInsert: true },
    ).catch((error) => console.error("Reward turnover failed:", error.message));
  }
  return credited?.balance ?? null;
};

/** লাল প্যাকেট বা চাকা খোলা — `{ ok, amount, segment?, balance }` */
export const openTicket = async (userId, ticketId) => {
  const ticket = await RewardTicket.findOne({ _id: ticketId, user: userId }).lean();
  if (!ticket) return { ok: false, code: "notFound" };
  if (ticket.kind === "temu") return { ok: false, code: "wrongKind" };
  if (ticket.status !== "available") return { ok: false, code: ticket.status === "claimed" ? "alreadyClaimed" : "expired" };
  if (ticket.endAt < new Date()) return { ok: false, code: "expired" };

  let amount;
  let segment = null;
  if (ticket.kind === "redPacket") {
    amount = randomBetween(ticket.prize?.min, ticket.prize?.max);
  } else {
    const segments = ticket.prize?.segments || [];
    if (!segments.length) return { ok: false, code: "noPrize" };
    segment = pickSegment(segments);
    amount = money(segments[segment].amount);
  }

  const claimed = await RewardTicket.findOneAndUpdate(
    { _id: ticket._id, status: "available", endAt: { $gte: new Date() } },
    { $set: { status: "claimed", amount, claimedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!claimed) return { ok: false, code: "alreadyClaimed" };

  const balance = amount > 0 ? await payTicket(claimed, amount, `${ticket.kind === "wheel" ? "Wheel" : "Red packet"}: ${ticket.name?.en || ticket.name?.bn}`) : null;
  return { ok: true, amount, segment, balance };
};

/** টেমুর লক্ষ্যে পৌঁছালে পুরো টাকা দাবি */
export const claimTemu = async (userId, ticketId) => {
  const ticket = await RewardTicket.findOne({ _id: ticketId, user: userId, kind: "temu" }).lean();
  if (!ticket) return { ok: false, code: "notFound" };
  if (ticket.status !== "available") return { ok: false, code: ticket.status === "claimed" ? "alreadyClaimed" : "expired" };
  if (num(ticket.temu?.score) < num(ticket.temu?.target)) return { ok: false, code: "notReached" };

  const amount = money(ticket.temu.target);
  const claimed = await RewardTicket.findOneAndUpdate(
    { _id: ticket._id, status: "available", endAt: { $gte: new Date() }, "temu.score": { $gte: ticket.temu.target } },
    { $set: { status: "claimed", amount, claimedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!claimed) return { ok: false, code: "alreadyClaimed" };
  const balance = await payTicket(claimed, amount, `TEMU: ${ticket.name?.en || ticket.name?.bn}`);
  return { ok: true, amount, balance };
};

/**
 * টেমুর একটা কাজ হলো — খেলোয়াড়ের চালু সব টেমু টিকিটে বাকি অংশের
 * এলোমেলো একটা ভাগ যোগ। বাকি `finishBelow` এর নিচে নামলে পুরোটা পূরণ —
 * তাই "আর মাত্র ০.০১" করে কখনো আটকে থাকে না।
 *
 * task: "wallet" | "deposit" (একবার) | "invite" (প্রতি বন্ধুতে, maxInvites পর্যন্ত)
 */
export const onTemuTask = async (userId, task) => {
  const tickets = await RewardTicket.find({
    user: userId,
    kind: "temu",
    status: "available",
    endAt: { $gte: new Date() },
    "prize.tasks": task,
  }).lean();

  for (const ticket of tickets) {
    const t = ticket.temu || {};
    const p = ticket.prize || {};
    const remaining = money(num(t.target) - num(t.score));
    if (remaining <= 0) continue;

    const guard = { _id: ticket._id, status: "available" };
    const set = {};
    if (task === "wallet") {
      if (t.walletDone) continue;
      guard["temu.walletDone"] = { $ne: true };
      set["temu.walletDone"] = true;
    } else if (task === "deposit") {
      if (t.depositDone) continue;
      guard["temu.depositDone"] = { $ne: true };
      set["temu.depositDone"] = true;
    } else {
      const done = num(t.invites);
      if (done >= num(p.maxInvites)) continue;
      guard["temu.invites"] = t.invites ?? { $exists: false };
      set["temu.invites"] = done + 1;
    }

    let step = money((remaining * randomBetween(p.stepMinPct, p.stepMaxPct)) / 100);
    if (remaining - step <= num(p.finishBelow) || step <= 0) step = remaining;
    set["temu.score"] = money(num(t.score) + step);

    await RewardTicket.updateOne(guard, {
      $set: set,
      $push: { "temu.history": { condition: task, score: step, at: new Date() } },
    });
  }
};

/* ─────────────────── সাইন-ইন ─────────────────── */

const DEFAULT_DAYS = [
  { bn: "১ম দিন ব্রোঞ্জ হুইল", en: "Day 1 bronze wheel" },
  { bn: "২য় দিন সিলভার হুইল", en: "Day 2 silver wheel" },
  { bn: "৩য় দিন গোল্ড হুইল", en: "Day 3 gold wheel" },
  { bn: "৪র্থ দিনের লগ-ইন পুরস্কার", en: "Day 4 login reward" },
  { bn: "৫ম দিন ডায়মন্ড হুইল", en: "Day 5 diamond wheel" },
];

export const signInSetting = async () => {
  const found = await SignInSetting.findOne({ key: "main" }).lean();
  if (found) return found;
  return SignInSetting.findOneAndUpdate(
    { key: "main" },
    {
      $setOnInsert: {
        key: "main",
        title: { bn: "POWER7 প্রতিদিন লগ-ইন ইভেন্ট: বিশেষ সুবিধা আনলক করুন!", en: "POWER7 daily login event: unlock special benefits!" },
        days: DEFAULT_DAYS.map((name) => ({ name, template: null })),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, lean: true },
  );
};

/** আজকের (বাংলাদেশের দিন) জমা আর বাজি */
const todayTotals = async (userId) => {
  const from = dayStart();
  const [dep, bet] = await Promise.all([
    BalanceLog.aggregate([
      { $match: { user: userId, type: "deposit", createdAt: { $gte: from } } },
      { $group: { _id: null, n: { $sum: "$amount" } } },
    ]),
    GameHistory.aggregate([
      { $match: { user: userId, createdAt: { $gte: from } } },
      { $group: { _id: null, n: { $sum: "$betAmount" } } },
    ]),
  ]);
  return { deposit: money(dep[0]?.n), bet: money(bet[0]?.n) };
};

/**
 * ধারা: শেষ দাবি আজ হলে আজকেরটা হয়ে গেছে; গতকাল হলে পরের দিন; তার আগে
 * হলে ১ম দিন থেকে আবার (মূল সাইটের "এক দিন বাদ পড়লে আবার শুরু")। শেষ দিনের
 * পরে ধারা আবার ১ থেকে।
 */
const streakOf = async (userId, total) => {
  const last = await SignInRecord.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (last?.dayKey === today) return { claimedToday: true, todayNo: last.dayNo, doneInStreak: last.dayNo };
  if (last?.dayKey === yesterday && last.dayNo < total) return { claimedToday: false, todayNo: last.dayNo + 1, doneInStreak: last.dayNo };
  return { claimedToday: false, todayNo: 1, doneInStreak: 0 };
};

export const signInState = async (userId) => {
  const setting = await signInSetting();
  const days = setting.days || [];
  const [streak, totals, rewardSum] = await Promise.all([
    streakOf(userId, days.length),
    todayTotals(userId),
    RewardTicket.aggregate([
      { $match: { user: userId, source: "signin", status: "claimed" } },
      { $group: { _id: null, n: { $sum: "$amount" } } },
    ]),
  ]);
  const templates = await RewardTemplate.find({ _id: { $in: days.map((d) => d.template).filter(Boolean) } })
    .select("kind")
    .lean();
  const kindOf = Object.fromEntries(templates.map((t) => [String(t._id), t.kind]));

  return {
    enabled: setting.enabled,
    title: setting.title,
    rules: setting.rules,
    depositReq: num(setting.depositReq),
    betReq: num(setting.betReq),
    today: totals,
    met: totals.deposit >= num(setting.depositReq) && totals.bet >= num(setting.betReq),
    claimedToday: streak.claimedToday,
    streak: streak.doneInStreak,
    totalReward: money(rewardSum[0]?.n),
    days: days.map((d, i) => ({
      dayNo: i + 1,
      name: d.name,
      kind: kindOf[String(d.template)] || null,
      state: i + 1 <= streak.doneInStreak ? "claimed" : i + 1 === streak.todayNo && !streak.claimedToday ? "today" : "locked",
    })),
  };
};

/** আজকের দিনের পুরস্কার — শর্ত পূরণ হলে সেদিনের টিকিট */
export const claimSignIn = async (user) => {
  const setting = await signInSetting();
  if (!setting.enabled) return { ok: false, code: "signInOff" };
  const days = setting.days || [];
  if (!days.length) return { ok: false, code: "signInOff" };

  const streak = await streakOf(user._id, days.length);
  if (streak.claimedToday) return { ok: false, code: "signedToday" };
  const totals = await todayTotals(user._id);
  if (totals.deposit < num(setting.depositReq) || totals.bet < num(setting.betReq)) {
    return { ok: false, code: "signInNotMet", need: { deposit: num(setting.depositReq), bet: num(setting.betReq) }, today: totals };
  }

  const today = dayKey();
  let record;
  try {
    record = await SignInRecord.create({ user: user._id, dayKey: today, dayNo: streak.todayNo });
  } catch (error) {
    if (error?.code === 11000) return { ok: false, code: "signedToday" };
    throw error;
  }

  const day = days[streak.todayNo - 1];
  const tpl = day?.template ? await RewardTemplate.findById(day.template).lean() : null;
  let ticket = null;
  if (tpl) {
    ticket = await issueTicket(user, { ...tpl, name: day.name?.bn ? day.name : tpl.name }, { source: "signin", sourceKey: `signin:${today}` });
    await SignInRecord.updateOne({ _id: record._id }, { $set: { ticket: ticket._id } });
  }
  return { ok: true, dayNo: streak.todayNo, ticket };
};

/** নিবন্ধনে টিকিট (admin যদি সেট করে থাকেন) */
export const onRegisterReward = async (user) => {
  const setting = await signInSetting();
  if (!setting.registerTemplate) return;
  const tpl = await RewardTemplate.findOne({ _id: setting.registerTemplate, isActive: true }).lean();
  if (tpl) await issueTicket(user, tpl, { source: "register", sourceKey: "register" });
};

/** খেলোয়াড়কে দেখানোর মতো টিকিট — পুরস্কারের গোপন নিয়ম (ওজন) বাদে */
export const publicTicket = (t) => ({
  id: t._id,
  kind: t.kind,
  name: t.name,
  label: t.label,
  description: t.description,
  source: t.source,
  startAt: t.startAt,
  endAt: t.endAt,
  status: t.status,
  amount: t.amount,
  claimedAt: t.claimedAt,
  wheel: t.kind === "wheel" ? (t.prize?.segments || []).map((s) => s.amount) : undefined,
  temu:
    t.kind === "temu"
      ? {
          target: t.temu?.target,
          score: t.temu?.score,
          tasks: (t.prize?.tasks || []).map((key) => ({
            key,
            done: key === "wallet" ? Boolean(t.temu?.walletDone) : key === "deposit" ? Boolean(t.temu?.depositDone) : num(t.temu?.invites),
            max: key === "invite" ? num(t.prize?.maxInvites) : 1,
          })),
        }
      : undefined,
});

/** খেলোয়াড়ের আইডি সহ user — খোঁজার সুবিধায় */
export const findUsersByIds = (ids) => User.find({ userId: { $in: ids }, role: "user" }).select("userId").lean();
