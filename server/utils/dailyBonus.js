import { DAILY_BONUS_DAYS, DailyBonusClaim, DailyBonusSetting } from "../models/DailyBonus.js";
import TurnOver from "../models/TurnOver.js";
import { money, num } from "./money.js";
import { creditUser, writeLogs } from "./wallet.js";

/**
 * ডেইলি বোনাসের হিসাব।
 *
 * দিন = বাংলাদেশের দিন (UTC+6, রাত ১২টায় বদলায়) — প্রত্যেকের নিজের "শেষ দাবির
 * ২৪ ঘণ্টা পরে" ধরলে সময়টা প্রতিদিন পিছোতে থাকত আর কে কখন পাবে বোঝা কঠিন
 * হতো; এখানে সবার জন্য একই সময়ে নতুন দিন।
 *
 * চক্র: প্রথম দাবির দিন = দিন ১। তারপর যত দিনই যাক, আজ = (আজ − দিন ১) + ১।
 * কোনো দিন দাবি না করলে সেই দিনেরটা চলে যায় ("missed"), কিন্তু চক্র এগোয় —
 * পরের দিন পরের দিনেরটাই পাওয়া যায়। ৭ দিন পেরোলে পরের দাবির দিনটা নতুন দিন ১।
 * চক্রের হিসাব দাবির সারি থেকেই — আলাদা কোনো অবস্থা রাখতে হয় না।
 */

const BD_OFFSET = 6 * 3600000;
const DAY_MS = 24 * 3600000;
const pad = (n) => String(n).padStart(2, "0");

export const dayKeyOf = (at = new Date()) => {
  const d = new Date(at.getTime() + BD_OFFSET);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** `YYYY-MM-DD` → সেই দিনের শুরু (UTC সময়ে) */
const startOfKey = (key) => {
  const [y, mo, d] = key.split("-").map(Number);
  return Date.UTC(y, mo - 1, d) - BD_OFFSET;
};

const daysBetween = (fromKey, toKey) => Math.round((startOfKey(toKey) - startOfKey(fromKey)) / DAY_MS);
const addDays = (key, n) => dayKeyOf(new Date(startOfKey(key) + n * DAY_MS));

/** পরের নতুন দিন কখন (ঘড়ি দেখাতে) */
const nextDayAt = (todayKey) => new Date(startOfKey(todayKey) + DAY_MS);

const amountsOf = (setting) =>
  Array.from({ length: DAILY_BONUS_DAYS }, (_, i) => money(Math.max(0, num(setting?.days?.[i]))));

export const dailyBonusSetting = async () => (await DailyBonusSetting.current()).toObject();

/** আজ চক্রের কোন দিন — `{ cycleStart, todayNo, claims }` */
const cycleOf = async (userId, todayKey) => {
  const last = await DailyBonusClaim.findOne({ user: userId }).sort({ createdAt: -1 }).select("cycleStart").lean();
  // শেষ চক্র এখনো চলছে (৭ দিনের ভিতরে) — নইলে আজ থেকে নতুন চক্র
  const running = last && daysBetween(last.cycleStart, todayKey) < DAILY_BONUS_DAYS;
  const cycleStart = running ? last.cycleStart : todayKey;
  const claims = running ? await DailyBonusClaim.find({ user: userId, cycleStart }).select("dayNo amount createdAt").lean() : [];
  return { cycleStart, todayNo: daysBetween(cycleStart, todayKey) + 1, claims };
};

/**
 * খেলোয়াড়ের পাতার জন্য পুরো অবস্থা।
 * দিনের `status`: claimed | missed | today (আজ, দাবি বাকি) | upcoming
 */
export const dailyBonusState = async (user) => {
  const setting = await dailyBonusSetting();
  const todayKey = dayKeyOf();
  const { cycleStart, todayNo, claims } = await cycleOf(user._id, todayKey);
  const amounts = amountsOf(setting);
  const claimedByDay = new Map(claims.map((c) => [c.dayNo, c]));

  const days = amounts.map((amount, i) => {
    const dayNo = i + 1;
    const claim = claimedByDay.get(dayNo);
    let status = "upcoming";
    if (claim) status = "claimed";
    else if (dayNo < todayNo) status = "missed";
    else if (dayNo === todayNo) status = "today";
    return { dayNo, amount: claim ? money(claim.amount) : amount, status, date: addDays(cycleStart, i) };
  });

  const today = days[todayNo - 1];
  const needDeposit = money(num(setting.minTotalDeposit));
  const depositOk = needDeposit <= 0 || money(num(user.totalDeposit)) >= needDeposit;

  return {
    enabled: Boolean(setting.enabled),
    title: setting.title,
    rules: setting.rules,
    turnoverMultiplier: num(setting.turnoverMultiplier),
    minTotalDeposit: needDeposit,
    depositOk,
    days,
    todayNo,
    claimedToday: today.status === "claimed",
    canClaim: Boolean(setting.enabled) && today.status === "today" && today.amount > 0 && depositOk,
    nextAt: nextDayAt(todayKey),
    serverTime: new Date(),
  };
};

/** আজকের টাকা দাবি — `{ ok, amount, dayNo, balance }` অথবা `{ ok: false, code }` */
export const claimDailyBonus = async (user) => {
  const setting = await dailyBonusSetting();
  if (!setting.enabled) return { ok: false, code: "dailyOff" };

  const needDeposit = money(num(setting.minTotalDeposit));
  if (needDeposit > 0 && money(num(user.totalDeposit)) < needDeposit) return { ok: false, code: "dailyNeedDeposit", need: needDeposit };

  const todayKey = dayKeyOf();
  const { cycleStart, todayNo, claims } = await cycleOf(user._id, todayKey);
  if (claims.some((c) => c.dayNo === todayNo)) return { ok: false, code: "dailyClaimed" };

  const amount = amountsOf(setting)[todayNo - 1];
  if (amount <= 0) return { ok: false, code: "dailyNothing" };

  const turnoverRequired = money(amount * Math.max(0, num(setting.turnoverMultiplier)));

  // আগে সারি, তারপর টাকা — একই দিনের দ্বিতীয় অনুরোধ unique এ আটকায়
  let claim;
  try {
    claim = await DailyBonusClaim.create({
      user: user._id,
      userIdText: String(user.userId || "").toLowerCase(),
      dayKey: todayKey,
      cycleStart,
      dayNo: todayNo,
      amount,
      turnoverRequired,
    });
  } catch (error) {
    if (error?.code === 11000) return { ok: false, code: "dailyClaimed" };
    throw error;
  }

  const note = `Daily bonus — day ${todayNo}`;
  const credited = await creditUser(user._id, amount);
  const balance = money(credited?.balance);
  await DailyBonusClaim.updateOne({ _id: claim._id }, { $set: { balanceAfter: balance } });
  await writeLogs(user._id, balance, [{ type: "reward", amount, refType: "DailyBonus", refId: claim._id, note }]);

  if (turnoverRequired > 0) {
    await TurnOver.create({
      user: user._id,
      sourceType: "reward",
      sourceId: claim._id,
      title: note,
      required: turnoverRequired,
      creditedAmount: 0,
      status: "running",
    }).catch((error) => console.error("Daily bonus turnover failed:", error.message));
  }

  return { ok: true, amount, dayNo: todayNo, balance };
};

/** পুরস্কার কেন্দ্রের ব্যাজ — আজ দাবি করার মতো কিছু আছে কিনা */
export const dailyBonusReady = async (user) => {
  try {
    const state = await dailyBonusState(user);
    return state.canClaim;
  } catch {
    return false;
  }
};
