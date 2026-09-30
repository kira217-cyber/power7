import crypto from "node:crypto";

import User from "../models/User.js";
import BalanceLog from "../models/BalanceLog.js";
import { money } from "./money.js";

/**
 * ব্যালেন্সে টাকা যোগ/বাদ — সবসময় এক ধাপে (atomic), দুই দশমিকে গোল।
 *
 * BetChokkor ব্যালেন্স আগে পড়ে তারপর `user.save()` করত; খেলোয়াড় তখন
 * খেলতে থাকলে callback এর বদলটা মুছে যেত (বা উল্টোটা)। এখানে ডেটাবেস
 * নিজেই যোগ করে, তাই একই মুহূর্তে যত বদলই আসুক কোনোটা হারায় না।
 */
const addField = (field, amount) => ({
  [field]: { $round: [{ $add: [{ $ifNull: [`$${field}`, 0] }, amount] }, 2] },
});

/**
 * খেলোয়াড়ের ব্যালেন্সে জমা। `deposit` দিলে মোট ডিপোজিটেও যোগ হয়
 * (বোনাস বাদে আসল জমাটুকু — রেফারেলের ধাপ এটা দেখে)।
 * ফেরত দেয় নতুন ডকুমেন্ট (না পেলে null)।
 */
export const creditUser = (userId, amount, { deposit = 0 } = {}) =>
  User.findOneAndUpdate(
    { _id: userId },
    [{ $set: { ...addField("balance", money(amount)), ...(deposit ? addField("totalDeposit", money(deposit)) : {}) } }],
    { returnDocument: "after" },
  );

/** ভুলে জমা হলে ফিরিয়ে নেওয়া (rollback) */
export const debitUser = (userId, amount, { deposit = 0 } = {}) =>
  creditUser(userId, -money(amount), { deposit: -money(deposit) });

/** অ্যাফিলিয়েটের কমিশনের ঘরে যোগ (`depositCommissionBalance` …) */
export const addCommission = (userId, field, amount) =>
  User.updateOne({ _id: userId }, [{ $set: addField(field, money(amount)) }]);

/* ── খাতা (অ্যাকাউন্ট রেকর্ড) ── */

const PREFIX = {
  deposit: "D",
  promotion: "P",
  withdraw: "W",
  "withdraw-refund": "R",
  rebate: "B",
  referral: "F",
  vip: "V",
  reward: "G",
  commission: "C",
  "admin-adjust": "A",
};

/** পড়ার মতো অর্ডার নম্বর — ধরন + YYMMDDHHmmss + ৪ অঙ্ক (যেমন D2609251612304821) */
const orderNoOf = (type, at = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${String(at.getUTCFullYear()).slice(2)}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}`;
  return `${PREFIX[type] || "X"}${stamp}${crypto.randomInt(1000, 10000)}`;
};

/**
 * একটা টাকার কাজ শেষ হলে খাতায় লেখা।
 *
 * `balanceAfter` = পুরো কাজের পরের ব্যালেন্স; একাধিক সারি হলে (যেমন
 * ডিপোজিট + বোনাস) পেছন থেকে হিসাব করে প্রতিটার নিজের "পরের ব্যালেন্স"।
 * খাতা লিখতে না পারলেও টাকার কাজ বাতিল হয় না — তাই ভুল শুধু লগে।
 */
export const writeLogs = async (userId, balanceAfter, entries = [], { by = null } = {}) => {
  const list = entries.filter((e) => money(e.amount) !== 0);
  if (!list.length) return;

  let running = money(balanceAfter) - list.reduce((sum, e) => sum + money(e.amount), 0);
  const docs = list.map((e) => {
    running = money(running + money(e.amount));
    return {
      user: userId,
      type: e.type,
      amount: money(e.amount),
      balanceAfter: running,
      orderNo: orderNoOf(e.type),
      refType: e.refType || "",
      refId: e.refId || null,
      note: e.note || "",
      by,
    };
  });

  try {
    await BalanceLog.insertMany(docs, { ordered: false });
  } catch (error) {
    console.error("Balance log write failed:", error.message);
  }
};
