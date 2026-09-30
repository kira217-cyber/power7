import DepositBonusTurnover from "../models/DepositBonusTurnover.js";
import DepositRequest from "../models/DepositRequest.js";
import User from "../models/User.js";

export const num = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const money = (value) => Math.round(num(value) * 100) / 100;

export const pickText = (input = {}) => ({
  bn: input?.bn || "",
  en: input?.en || "",
});

/**
 * চ্যানেলের বোনাসের হার।
 *
 * `bonusPercent` না থাকলে ব্যাজের লেখা ("+৫%") থেকেই পড়ে নেওয়া হয় —
 * পুরোনো সেটআপে দুটো আলাদা হয়ে গেলেও যেন হিসাব ঠিক থাকে।
 */
export const getChannelPercent = (channel = {}) => {
  const direct = num(channel?.bonusPercent);
  if (direct > 0) return direct;

  const tagText = String(channel?.tagText || "");
  if (!tagText.includes("%")) return 0;

  const parsed = parseFloat(tagText.replace("+", "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calcPromoBonus = ({ amount, promo }) => {
  if (!promo || promo.id === "none") return 0;

  if (promo.bonusType === "percent") return (amount * num(promo.bonusValue)) / 100;

  return num(promo.bonusValue);
};

export const normalizePromoScope = (value) =>
  value === "first-deposit" ? "first-deposit" : "all-time";

/**
 * কোন প্রোভাইডার তালিকাটা চলবে।
 *
 * প্রোমোর নিজের তালিকা থাকলে সেটাই মেথডের তালিকাকে বদলে দেয়; প্রোমোর
 * তালিকা খালি মানে "কোনো বাধা নেই" নয় — মেথডেরটাই চলে, তাই প্রোমোতে
 * বসাতে ভুলে গেলে বাধাটা চুপচাপ উঠে যায় না।
 */
export const resolveEligibleProviders = ({ config, promo }) => {
  if (promo?.eligibleProviders?.length) return promo.eligibleProviders;

  return Array.isArray(config?.eligibleProviders) ? config.eligibleProviders : [];
};

export const sumPercent = (list) =>
  (Array.isArray(list) ? list : []).reduce(
    (total, item) => total + num(item?.percent),
    0,
  );

const emptyCommission = (amount) => ({
  affiliatorId: "",
  affiliatorUserId: "",
  percent: 0,
  baseAmount: amount,
  commissionAmount: 0,
});

/**
 * রেফারকারী অ্যাফিলিয়েটের কমিশন।
 *
 * জমা দেওয়ার সময়েই হিসাব হয়ে রেকর্ডে বসে যায় — অনুমোদনের সময় হার
 * বদলে গেলেও ব্যবহারকারী যা দেখেছিলেন সেটাই বহাল থাকে।
 */
export const getAffiliateDepositCommission = async ({ user, amount }) => {
  if (!user?.referredBy) return emptyCommission(amount);

  const affiliator = await User.findById(user.referredBy);

  // অনুমোদন না থাকলে কমিশন জমে না — বাতিল হওয়া অ্যাফিলিয়েটও নয়
  if (
    !affiliator ||
    affiliator.role !== "aff-user" ||
    affiliator.affiliateStatus !== "approved"
  ) {
    return emptyCommission(amount);
  }

  const percent = num(affiliator.depositCommission);

  return {
    affiliatorId: String(affiliator._id),
    affiliatorUserId: affiliator.userId || "",
    percent,
    baseAmount: amount,
    commissionAmount: money((amount * percent) / 100),
  };
};

/**
 * একটা ডিপোজিটের পুরো হিসাব বানায়।
 *
 * ব্যবহারকারীর নিজের জমা আর অ্যাডমিনের সরাসরি জমা — দুটোই এই একই
 * জায়গা দিয়ে যায়, তাই দুই পথের নিয়ম কখনো আলাদা হয়ে যেতে পারে না।
 *
 * ভুল থাকলে `{ error }` ফেরত আসে; কল করার জায়গা সেটাকেই বার্তা বানায়।
 */
export const buildDepositCalc = async ({
  user,
  method,
  channelId,
  promoId = "none",
  amount,
}) => {
  const config = await DepositBonusTurnover.findOne({
    depositMethod: method._id,
  }).lean();

  const channels = Array.isArray(config?.channels) ? config.channels : [];

  const channel = channels.find(
    (item) =>
      String(item?.id || "").trim() === String(channelId || "").trim() &&
      item?.isActive !== false,
  );

  if (!channel) return { error: "Deposit channel not found or inactive" };

  const promotions = Array.isArray(config?.promotions) ? config.promotions : [];

  let promo = null;

  if (promoId && promoId !== "none") {
    promo = promotions.find(
      (item) =>
        String(item?.id || "").toLowerCase() ===
          String(promoId || "").toLowerCase() && item?.isActive !== false,
    );

    if (!promo) return { error: "Promotion not found or inactive" };

    if (normalizePromoScope(promo?.bonusScope) === "first-deposit") {
      const used = await DepositRequest.exists({
        user: user._id,
        status: "approved",
      });

      if (used) return { error: "First deposit promotion already used" };
    }
  }

  const channelPercent = getChannelPercent(channel);
  const percentBonus = money((amount * channelPercent) / 100);
  const promoBonus = money(calcPromoBonus({ amount, promo }));
  const totalBonus = money(percentBonus + promoBonus);

  // প্রোমো বেছে নিলে মেথডের সাধারণ গুণকের বদলে প্রোমোরটাই চলে
  const turnoverMultiplier =
    promo && promoId !== "none"
      ? num(promo?.turnoverMultiplier ?? 1)
      : num(config?.turnoverMultiplier ?? 1);

  const creditedAmount = money(amount + totalBonus);

  const activeContacts = Array.isArray(method.contacts)
    ? method.contacts
        .filter((item) => item?.isActive !== false)
        .sort((a, b) => num(a?.sort) - num(b?.sort))
    : [];

  const contact = activeContacts[0] || null;

  return {
    channel,
    promo,
    contact,
    calc: {
      channelPercent,
      percentBonus,
      promoBonus,
      totalBonus,
      turnoverMultiplier,
      targetTurnover: money(creditedAmount * turnoverMultiplier),
      creditedAmount,
      eligibleProviders: resolveEligibleProviders({ config, promo }),
      affiliateDepositCommission: await getAffiliateDepositCommission({
        user,
        amount,
      }),
    },
    display: {
      methodName: pickText(method.methodName),
      channelName: pickText(channel.name),
      channelTagText: channel?.tagText || "",
      contactLabel: pickText(contact?.label),
      channelNumber: contact?.number || "",
      promoName: promo ? pickText(promo.name) : { bn: "", en: "" },
    },
  };
};
