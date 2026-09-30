import bcrypt from "bcryptjs";

import User from "../models/User.js";

/**
 * লেনদেন পাসওয়ার্ড — যাচাই, ভুলে লক।
 *
 * লগইনের মতোই: পরপর ৫ বার ভুল হলে ১৫ মিনিট বন্ধ, যাতে আন্দাজ করে বের
 * করা না যায়। ফেরত দেয় `{ ok }` অথবা `{ ok: false, code, message, status }`।
 */
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export const TX_RULE = /^[A-Za-z0-9]{6,12}$/;

export const hashTxPassword = (plain) => bcrypt.hash(String(plain), 12);

export const checkTxPassword = async (userId, plain) => {
  const user = await User.findById(userId).select("+txPassword +failedTxAttempts +txLockedUntil");

  if (!user?.txPassword) {
    return { ok: false, status: 400, code: "txPasswordNotSet", message: "Set a transaction password first" };
  }

  if (user.txLockedUntil && user.txLockedUntil > new Date()) {
    const minutes = Math.ceil((user.txLockedUntil - Date.now()) / 60000);
    return { ok: false, status: 423, code: "txLocked", message: `Too many wrong tries. Try again in ${minutes} minute(s).` };
  }

  if (!(await bcrypt.compare(String(plain || ""), user.txPassword))) {
    const failed = Number(user.failedTxAttempts || 0) + 1;
    const locked = failed >= MAX_FAILED;
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedTxAttempts: locked ? 0 : failed,
          ...(locked ? { txLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) } : {}),
        },
      },
    );
    return {
      ok: false,
      status: 400,
      code: locked ? "txLocked" : "txPasswordWrong",
      message: locked ? "Too many wrong tries — locked for 15 minutes" : "Transaction password is not correct",
    };
  }

  if (user.failedTxAttempts) await User.updateOne({ _id: user._id }, { $set: { failedTxAttempts: 0 } });
  return { ok: true };
};
