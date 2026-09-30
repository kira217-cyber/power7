import User from "../models/User.js";

/**
 * একজন খেলোয়াড়ের উত্তোলনের আবেদন একসাথে একটাই — ম্যানুয়াল আর অটো মিলিয়ে।
 *
 * শর্ত দেখা ("ঝুলে থাকা আবেদন আছে কি?") আর আবেদন বসানোর মাঝে একটু সময়
 * যায়; দুটো ট্যাব থেকে একসাথে চাপলে দুটোই শর্ত পেরিয়ে যেত। তাই আগে
 * ইউজারের ডকুমেন্টে এক ধাপে একটা ছোট তালা, কাজ শেষে খোলা। কিছু ভেঙে
 * তালা না খুললেও ৩০ সেকেন্ড পরে নিজে থেকেই খুলে যায়।
 */
const HOLD_MS = 30 * 1000;

export const lockWithdraw = async (userId) => {
  const now = new Date();
  const res = await User.updateOne(
    { _id: userId, $or: [{ withdrawBusyUntil: null }, { withdrawBusyUntil: { $lt: now } }] },
    { $set: { withdrawBusyUntil: new Date(now.getTime() + HOLD_MS) } },
  );
  return res.modifiedCount === 1;
};

export const unlockWithdraw = (userId) => User.updateOne({ _id: userId }, { $set: { withdrawBusyUntil: null } }).catch(() => {});
