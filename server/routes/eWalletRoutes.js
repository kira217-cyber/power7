import express from "express";
import mongoose from "mongoose";

import EWallet from "../models/EWallet.js";
import WithdrawMethod from "../models/WithdrawMethod.js";
import { protectUser } from "../middleware/protectUser.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { onTemuTask } from "../utils/reward.js";
import { normalizePhone } from "../utils/phone.js";
import { checkTxPassword } from "../utils/txPassword.js";

/**
 * খেলোয়াড়ের ই-ওয়ালেট — উত্তোলনের টাকা যে নম্বরে যাবে।
 *
 * মূল সাইটের মতো: মেথড (বিকাশ/নগদ…) + নম্বর, সর্বোচ্চ ২টা
 * ("আবদ্ধ E wallet (0/2)")। BetChokkor এর মতো নিবন্ধনের নম্বর নিজে থেকে
 * ওয়ালেট হয় না — এখানে নিবন্ধনে ফোন ঐচ্ছিক, আর মেথড ছাড়া ওয়ালেট অর্থহীন।
 *
 * যোগ আর মোছা দুটোতেই লেনদেন পাসওয়ার্ড লাগে — কেউ অ্যাকাউন্টে ঢুকে
 * গেলেও নিজের নম্বর বসিয়ে টাকা সরাতে পারবে না।
 */
const router = express.Router();

export const WALLET_CAP = 2;

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));

/** বাংলাদেশের মোবাইল নম্বর — ০ ছাড়া ১০ অঙ্ক */
const isBdMobile = (value) => /^1[3-9]\d{8}$/.test(value);

const listOf = async (userId) => {
  const wallets = await EWallet.find({ user: userId, isActive: true }).sort({ isDefault: -1, createdAt: 1 }).lean();
  const methods = await WithdrawMethod.find({ methodId: { $in: wallets.map((w) => w.methodId) } })
    .select("methodId name logoUrl isActive")
    .lean();
  const byId = new Map(methods.map((m) => [m.methodId, m]));
  return wallets.map((w) => ({
    ...w,
    method: byId.get(w.methodId) || null,
  }));
};

router.get("/", protectUser, async (req, res) => {
  try {
    const wallets = await listOf(req.user._id);
    return successResponse(res, "Wallets loaded", { wallets, cap: WALLET_CAP, count: wallets.length });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/", protectUser, async (req, res) => {
  try {
    const methodId = text(req.body?.methodId).toUpperCase();
    const walletNumber = normalizePhone(req.body?.walletNumber, "+880");
    const accountName = text(req.body?.accountName).slice(0, 60);

    const method = await WithdrawMethod.findOne({ methodId, isActive: true }).lean();
    if (!method) return errorResponse(res, "Choose a withdraw method", 400, "chooseMethod");

    if (!isBdMobile(walletNumber)) {
      return errorResponse(res, "Enter a valid number", 400, "badWalletNumber");
    }

    const check = await checkTxPassword(req.user._id, req.body?.txPassword);
    if (!check.ok) return errorResponse(res, check.message, check.status, check.code);

    const count = await EWallet.countDocuments({ user: req.user._id, isActive: true });
    if (count >= WALLET_CAP) {
      return errorResponse(res, `You can bind at most ${WALLET_CAP} e-wallets`, 400, "walletCap");
    }

    const wallet = await EWallet.create({
      user: req.user._id,
      methodId,
      walletNumber,
      accountName,
      walletType: "personal",
      isDefault: count === 0,
    });

    // একসাথে দুটো যোগ হয়ে সীমা পেরোলে নতুনটা সরিয়ে দেওয়া
    if ((await EWallet.countDocuments({ user: req.user._id, isActive: true })) > WALLET_CAP) {
      await EWallet.deleteOne({ _id: wallet._id });
      return errorResponse(res, `You can bind at most ${WALLET_CAP} e-wallets`, 400, "walletCap");
    }

    // টেমু টিকিটের "উত্তোলনের তথ্য আবদ্ধ করুন" কাজ
    await onTemuTask(req.user._id, "wallet").catch((error) => console.error("TEMU wallet failed:", error.message));
    return successResponse(res, "E-wallet added", { wallets: await listOf(req.user._id) }, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return errorResponse(res, "This number is already added", 409, "walletExists");
    }
    return errorResponse(res, error.message, 500);
  }
});

/** মোছা — লেনদেন পাসওয়ার্ড লাগে; পুরোনো উত্তোলনে নম্বরের কপি থাকে, তাই ইতিহাস ভাঙে না */
router.delete("/:id", protectUser, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

    const check = await checkTxPassword(req.user._id, req.body?.txPassword);
    if (!check.ok) return errorResponse(res, check.message, check.status, check.code);

    const removed = await EWallet.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!removed) return errorResponse(res, "E-wallet not found", 404);

    if (removed.isDefault) {
      await EWallet.findOneAndUpdate({ user: req.user._id, isActive: true }, { $set: { isDefault: true } }, { sort: { createdAt: 1 } });
    }

    return successResponse(res, "E-wallet removed", { wallets: await listOf(req.user._id) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
