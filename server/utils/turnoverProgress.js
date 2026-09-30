import TurnOver from "../models/TurnOver.js";
import { resolveProviderCode } from "./gameInfo.js";

const num = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** পয়সার ঘর দুটো — ভগ্নাংশ জমে জমে হিসাব সরে যাওয়া ঠেকাতে */
const money = (value) => Math.trunc(num(value) * 100) / 100;

/**
 * খেলার বাজি দিয়ে টার্নওভারের অগ্রগতি।
 *
 * প্রোভাইডারের শর্ত সাইটজুড়ে নয়, প্রতিটা টার্নওভারের নিজের — তৈরির
 * সময় যে কনফিগ থেকে এসেছে সেখান থেকেই `eligibleProviders` তুলে রাখা
 * হয়েছিল।
 *
 * তালিকা খালি মানে কোনো বাধা নেই, যে কোনো প্রোভাইডার ১:১ গোনে।
 *
 * তালিকা থাকলে প্রতিটা প্রোভাইডারের `percent` তার জন্য **বাঁধা
 * ন্যূনতম অংশ** — যেমন দুই প্রোভাইডারে ৫০%+৫০% দিলে পুরো শর্তটা দুই
 * ভাগে ভাগ হয়ে যায়, একটাতেই খেলে কখনো শেষ হবে না। যোগফল ১০০ এর কম
 * হলে বাকি অংশটা খোলা — সেখানে যে কেউ (নিজের কোটা ভরে যাওয়া
 * প্রোভাইডারসহ) জমা দিতে পারে। যোগফল ঠিক ১০০ হলে খোলা অংশ নেই, তাই
 * তালিকার বাইরের প্রোভাইডারে খেললে ওই টার্নওভারে কিছুই গোনে না।
 *
 * একাধিক টার্নওভার চললে পুরোনোটা আগে ভরে — নইলে নতুন বোনাস নিতে
 * থাকলে পুরোনোটা কখনো শেষ হতো না।
 */
export const applyTurnoverProgress = async ({ userId, gameUId, wagerAmount }) => {
  const amount = money(wagerAmount);

  if (amount <= 0) return false;

  const turnovers = await TurnOver.find({
    user: userId,
    status: "running",
  }).sort({ createdAt: 1 });

  if (!turnovers.length) return false;

  // একটাও শর্তওয়ালা টার্নওভার না থাকলে প্রোভাইডার খোঁজার দরকার নেই —
  // ওটা মাস্টারে একটা কল, প্রতি বাজিতে করার মতো সস্তা নয়
  const anyRestricted = turnovers.some(
    (item) => Array.isArray(item.eligibleProviders) && item.eligibleProviders.length,
  );

  const providerCode = anyRestricted ? await resolveProviderCode(gameUId) : null;

  let remaining = amount;
  let applied = false;

  for (const turnover of turnovers) {
    if (remaining <= 0) break;

    const required = money(turnover.required);
    const progress = money(turnover.progress);
    let left = Math.max(0, money(required - progress));

    // আগেই ভরে গেছে অথচ running রয়ে গেছে — গুছিয়ে দেওয়া
    if (left <= 0) {
      await TurnOver.updateOne(
        { _id: turnover._id },
        {
          $set: {
            progress: required,
            status: "completed",
            completedAt: new Date(),
          },
        },
      );

      continue;
    }

    const eligible = Array.isArray(turnover.eligibleProviders)
      ? turnover.eligibleProviders
      : [];

    const match =
      eligible.length && providerCode
        ? eligible.find(
            (item) => String(item.providerCode).toUpperCase() === providerCode,
          )
        : null;

    const usedPercent = eligible.length
      ? Math.min(
          100,
          eligible.reduce((sum, item) => sum + num(item.percent), 0),
        )
      : 0;

    const openPercent = eligible.length ? Math.max(0, 100 - usedPercent) : 100;

    let dedicatedAdd = 0;
    let openAdd = 0;

    if (!eligible.length) {
      openAdd = money(Math.min(left, remaining));
    } else if (match || openPercent > 0) {
      const providerProgress = turnover.providerProgress || [];

      const usedByProviders = money(
        providerProgress.reduce((sum, item) => sum + money(item.progress), 0),
      );

      const openProgress = money(Math.max(0, progress - usedByProviders));

      let pool = remaining;

      if (match) {
        const entry = providerProgress.find(
          (item) => item.providerCode === providerCode,
        );

        const quota = money((required * num(match.percent)) / 100);
        const room = Math.max(0, money(quota - money(entry?.progress)));

        dedicatedAdd = money(Math.min(room, pool, left));
        pool = money(pool - dedicatedAdd);
        left = money(left - dedicatedAdd);
      }

      if (pool > 0 && openPercent > 0 && left > 0) {
        const quota = money((required * openPercent) / 100);
        const room = Math.max(0, money(quota - openProgress));

        openAdd = money(Math.min(room, pool, left));
      }
    }

    const add = money(dedicatedAdd + openAdd);

    if (add <= 0) continue;

    const completed = money(progress + add) >= required;

    const finish = completed
      ? { status: "completed", completedAt: new Date() }
      : null;

    if (dedicatedAdd > 0 && providerCode) {
      const hasEntry = (turnover.providerProgress || []).some(
        (item) => item.providerCode === providerCode,
      );

      await TurnOver.updateOne(
        hasEntry
          ? { _id: turnover._id, "providerProgress.providerCode": providerCode }
          : { _id: turnover._id },
        {
          $inc: hasEntry
            ? { progress: add, "providerProgress.$.progress": dedicatedAdd }
            : { progress: add },
          ...(hasEntry
            ? {}
            : {
                $push: {
                  providerProgress: { providerCode, progress: dedicatedAdd },
                },
              }),
          ...(finish ? { $set: finish } : {}),
        },
      );
    } else {
      await TurnOver.updateOne(
        { _id: turnover._id },
        { $inc: { progress: add }, ...(finish ? { $set: finish } : {}) },
      );
    }

    /*
     * একসাথে দুটো বাজির callback এলে দুটোই পুরোনো `progress` পড়ে — কোনোটাই
     * "শেষ" ধরত না, অথচ যোগফলে শর্ত পূরণ হয়ে যেত, আর টার্নওভারটা running
     * থেকে উত্তোলন আটকে রাখত। তাই ডেটাবেসের আসল মান দেখে শেষ চিহ্নিত করা।
     */
    if (!finish) {
      await TurnOver.updateOne(
        { _id: turnover._id, status: "running", $expr: { $gte: ["$progress", "$required"] } },
        { $set: { status: "completed", completedAt: new Date() } },
      );
    }

    applied = true;
    remaining = money(remaining - add);
  }

  return applied;
};

export default applyTurnoverProgress;
