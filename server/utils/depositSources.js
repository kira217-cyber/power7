import mongoose from "mongoose";

import DepositRequest from "../models/DepositRequest.js";
import AutoDeposit from "../models/AutoDeposit.js";
import MfsDeposit from "../models/MfsDeposit.js";
import { money } from "./depositCalc.js";

/**
 * "সফল জমা" কোথায় কোথায় থাকে — ম্যানুয়াল (DepositRequest), অটো (OraclePay,
 * AutoDeposit) আর পার্সোনাল অটো (MFSWallet, MfsDeposit)।
 *
 * VIP বেতনের শর্ত, পুরস্কারের টিকিট খোলা, উদ্ধার তহবিল, রেফারেল, অ্যাফিলিয়েট,
 * লাভ-ক্ষতির হিসাব — সব জায়গায় তিনটাই গোনা হয়, তাই একটা নতুন জমার পথ এলে
 * শুধু এই তালিকায় যোগ করলেই হয়।
 */
export const DEPOSIT_SOURCES = [
  { Model: DepositRequest, done: { status: "approved" }, at: "approvedAt", credited: "calc.creditedAmount" },
  { Model: AutoDeposit, done: { status: "PAID", balanceAdded: true }, at: "paidAt", credited: "calc.creditedAmount" },
  { Model: MfsDeposit, done: { status: "PAID", balanceAdded: true }, at: "paidAt", credited: "calc.creditedAmount" },
];

const oid = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)));

/** সময়ের সীমা — `to` না দিলে খোলা */
const rangeOf = (from, to) => ({ ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) });

/**
 * এক বা একাধিক খেলোয়াড়ের সফল জমা — `{ amount, count, credited }`।
 * `user` একটা আইডি বা আইডির তালিকা; `from`/`to` দিলে সেই সময়ের মধ্যে।
 */
export const sumDeposits = async (user, { from = null, to = null } = {}) => {
  const users = Array.isArray(user) ? { $in: user.map(oid) } : oid(user);
  const rows = await Promise.all(
    DEPOSIT_SOURCES.map(({ Model, done, at, credited }) =>
      Model.aggregate([
        { $match: { user: users, ...done, ...(from || to ? { [at]: rangeOf(from, to) } : {}) } },
        { $group: { _id: null, amount: { $sum: "$amount" }, credited: { $sum: `$${credited}` }, count: { $sum: 1 } } },
      ]),
    ),
  );
  return rows.reduce(
    (total, [row]) => ({
      amount: money(total.amount + (row?.amount || 0)),
      credited: money(total.credited + (row?.credited || 0)),
      count: total.count + (row?.count || 0),
    }),
    { amount: 0, credited: 0, count: 0 },
  );
};

/** এই খেলোয়াড়দের মধ্যে কারা `since` এর পরে জমা দিয়েছেন — আইডির তালিকা */
export const depositorsSince = async (userIds, since) => {
  const ids = userIds.map(oid);
  const lists = await Promise.all(
    DEPOSIT_SOURCES.map(({ Model, done, at }) => Model.distinct("user", { user: { $in: ids }, ...done, [at]: { $gte: since } })),
  );
  return [...new Set(lists.flat().map(String))];
};

/**
 * দিনভিত্তিক জমা — `dayOf(field)` হলো ডাকা জায়গার নিজের "দিন" বানানোর expression।
 * ফেরত `[{ _id: day, deposit }]`, তিন উৎস যোগ করে।
 */
export const depositsByDay = async (userId, range, dayOf) => {
  const rows = await Promise.all(
    DEPOSIT_SOURCES.map(({ Model, done, at }) =>
      Model.aggregate([{ $match: { user: oid(userId), ...done, [at]: range } }, { $group: { _id: dayOf(at), deposit: { $sum: "$amount" } } }]),
    ),
  );
  const byDay = new Map();
  rows.flat().forEach((r) => byDay.set(r._id, money((byDay.get(r._id) || 0) + r.deposit)));
  return [...byDay].map(([_id, deposit]) => ({ _id, deposit }));
};
