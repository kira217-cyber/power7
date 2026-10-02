import crypto from "node:crypto";
import express from "express";
import mongoose from "mongoose";

import upload from "../config/multer.js";
import AutoWithdrawSetting from "../models/AutoWithdrawSetting.js";
import AutoWithdraw from "../models/AutoWithdraw.js";
import EWallet from "../models/EWallet.js";
import User from "../models/User.js";

import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requireMother, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num, money } from "../utils/money.js";
import { isOtpRequired, isVerified, clearOtp } from "../utils/otp.js";
import { checkTxPassword } from "../utils/txPassword.js";
import { creditUser, writeLogs } from "../utils/wallet.js";
import { gatewayPost } from "../utils/oraclePay.js";
import { checkEligibility } from "./withdrawRequestRoutes.js";
import { lockWithdraw, unlockWithdraw } from "../utils/withdrawLock.js";

/**
 * অটো উইথড্র (OraclePay) — `/api/auto-withdraw`।
 *
 * ধাপ (models/AutoWithdraw.js):
 *   খেলোয়াড়ের আবেদন → PENDING (ব্যালেন্স থেকে টাকা আটকে রাখা, গেটওয়েতে নয়)
 *   admin Approve → OraclePay তে পাঠানো → PROCESSING
 *   OraclePay webhook → COMPLETED (Trx ID, প্রমাণ লেখা ও ছবি) বা REJECTED (টাকা ফেরত)
 *   admin Reject (শুধু PENDING এ) → টাকা ফেরত
 *
 * POWER7 এ যা আলাদা:
 *   - নম্বর হাতে লেখা নয় — ম্যানুয়াল উত্তোলনের **একই বাঁধা ই-ওয়ালেট**
 *   - ম্যানুয়ালের একই শর্ত (পরিচয়, ঝুলে থাকা আবেদন — দুই ধরন মিলিয়ে,
 *     দিনের সীমা, টার্নওভার) আর একই লেনদেন পাসওয়ার্ড
 *   - webhook ঠিকানায় প্রতিটা আবেদনের গোপন চাবি, টাকা ফেরত এক ধাপে, খাতায় সারি
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));
const langText = (input = {}) => ({ bn: text(input?.bn), en: text(input?.en) });
const sameKey = (a, b) => {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** গেটওয়ে শুধু এই চারটা মোবাইল ওয়ালেটে টাকা পাঠায় */
const ALLOWED = ["bkash", "nagad", "rocket", "upay"];

// ডাকার সময় পড়া হয় — মডিউল লোডের সময় .env তখনো বসেনি
const gatewayUrl = () => process.env.OPAY_WITHDRAW_URL || "https://api.oraclepay.org/api/opay-business/auto-withdraw";

const cleanMethods = (list) => {
  if (!Array.isArray(list)) return null;
  return list
    .map((item, index) => ({
      ...(isId(item?._id) ? { _id: item._id } : {}),
      code: text(item?.code).toLowerCase(),
      name: langText(item?.name),
      logoUrl: text(item?.logoUrl),
      active: item?.active !== false,
      order: Math.max(0, num(item?.order ?? index)),
      minAmount: Math.max(0, num(item?.minAmount)),
      maxAmount: Math.max(0, num(item?.maxAmount)),
    }))
    .filter((item) => ALLOWED.includes(item.code));
};

export const autoWithdrawStatus = async () => {
  const setting = await AutoWithdrawSetting.current();
  const ready = setting.active && Boolean(setting.businessToken);
  return {
    active: ready,
    minAmount: setting.minAmount,
    maxAmount: setting.maxAmount,
    methods: ready
      ? (setting.methods || [])
          .filter((m) => m.active !== false)
          .sort((a, b) => num(a.order) - num(b.order))
          .map((m) => ({ code: m.code, name: m.name, logoUrl: m.logoUrl, minAmount: m.minAmount, maxAmount: m.maxAmount }))
      : [],
  };
};

/** গেটওয়ের প্রমাণ ছবি — শুধু http(s), আর OraclePay র http লিংক https এ (https পাতায় mixed content নয়) */
const cleanProofImages = (list) =>
  (Array.isArray(list) ? list : [])
    .map((url) => text(url))
    .filter((url) => /^https?:\/\//i.test(url))
    .map((url) => url.replace(/^http:\/\/((?:[\w-]+\.)*oraclepay\.org)\//i, "https://$1/"))
    .slice(0, 10);

/** গেটওয়েতে পাঠানো হয়েছে কিনা — পাঠানোর পর admin আর বাতিল করতে পারেন না */
const wasSent = (record) => Boolean(record?.withdrawalId || record?.approvedAt);

/** টাকা ফেরত — `refunded: false` শর্তে এক ধাপে দখল, তাই দুবার ফেরত যায় না */
const refundWithdraw = async (filter, patch = {}, by = null) => {
  const record = await AutoWithdraw.findOneAndUpdate(
    { ...filter, refunded: false },
    { $set: { status: "REJECTED", refunded: true, ...patch } },
    { returnDocument: "after" },
  );
  if (!record) return null;

  const credited = await creditUser(record.user, money(record.amount));
  await writeLogs(
    record.user,
    credited?.balance,
    [{ type: "withdraw-refund", amount: money(record.amount), refType: "AutoWithdraw", refId: record._id, note: patch.reason || "Auto withdraw rejected" }],
    { by },
  );
  return record;
};

/* =========================
   ক্লায়েন্ট
   ========================= */

router.get("/status", async (req, res) => {
  try {
    return successResponse(res, "Auto withdraw status", await autoWithdrawStatus());
  } catch {
    return successResponse(res, "Auto withdraw unavailable", { active: false, methods: [] });
  }
});

router.post("/create", protectUser, async (req, res) => {
  if (!(await lockWithdraw(req.user._id))) {
    return errorResponse(res, "You already have a withdraw waiting for review", 409, "pendingWithdraw");
  }
  try {
    const setting = await AutoWithdrawSetting.current();
    if (!setting.active || !setting.businessToken) return errorResponse(res, "Auto withdraw is off right now", 400, "autoOff");

    const walletId = text(req.body?.walletId);
    const amount = money(num(req.body?.amount));
    if (!isId(walletId)) return errorResponse(res, "Choose an e-wallet", 400, "chooseWallet");
    if (!(amount > 0)) return errorResponse(res, "Enter a valid amount", 400, "missingFields");

    const eligibility = await checkEligibility(req.user._id);
    if (!eligibility.eligible) {
      const messages = {
        verification: "Please complete identity verification first",
        pendingWithdraw: "You already have a withdraw waiting for review",
        dailyLimit: "You reached today's withdraw limit",
      };
      const codes = { verification: "needVerification", pendingWithdraw: "pendingWithdraw", dailyLimit: "dailyLimit" };
      return errorResponse(
        res,
        messages[eligibility.reason] || `Turnover is not finished — ${eligibility.remaining} left`,
        400,
        codes[eligibility.reason] || "turnoverLeft",
      );
    }

    // ম্যানুয়ালের একই বাঁধা ওয়ালেট — মেথডটা ওয়ালেটের সাথেই
    const wallet = await EWallet.findOne({ _id: walletId, user: req.user._id, isActive: true });
    if (!wallet) return errorResponse(res, "This e-wallet was not found", 404, "chooseWallet");

    const code = String(wallet.methodId || "").toLowerCase();
    // ওয়ালেট নম্বর শূন্য ছাড়া জমা থাকে (1711…) — গেটওয়ে পুরো ১১ অঙ্ক চায় (01711…)
    const walletNumber = /^1\d{9}$/.test(wallet.walletNumber) ? `0${wallet.walletNumber}` : wallet.walletNumber;
    const method = (setting.methods || []).find((m) => m.code === code && m.active !== false);
    if (!ALLOWED.includes(code) || !method) return errorResponse(res, "Auto withdraw does not support this e-wallet", 400, "autoMethodOff");

    const min = num(method.minAmount) || num(setting.minAmount);
    const max = num(method.maxAmount) || num(setting.maxAmount);
    if (min > 0 && amount < min) return errorResponse(res, `Minimum withdraw amount is ${min}`, 400, "belowMin");
    if (max > 0 && amount > max) return errorResponse(res, `Maximum withdraw amount is ${max}`, 400, "aboveMax");

    if (money(num(req.user.balance)) < amount) return errorResponse(res, "Not enough balance", 400, "lowBalance");

    const tx = await checkTxPassword(req.user._id, req.body?.txPassword);
    if (!tx.ok) return errorResponse(res, tx.message, tx.status, tx.code);

    if (req.user.phone && (await isOtpRequired("client", "withdraw"))) {
      const target = { flow: "withdraw", countryCode: req.user.countryCode, phone: req.user.phone };
      if (!isVerified(target)) return errorResponse(res, "Please verify the OTP first", 400, "otpNotVerified");
      clearOtp(target);
    }

    // ব্যালেন্স এক ধাপে কাটা — যথেষ্ট না থাকলে কিছুই ঘটে না
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: amount } },
      [{ $set: { balance: { $round: [{ $subtract: ["$balance", amount] }, 2] } } }],
      { returnDocument: "after" },
    );
    if (!user) return errorResponse(res, "Not enough balance", 400, "lowBalance");

    const callbackKey = crypto.randomBytes(24).toString("hex");
    let record;
    try {
      record = await AutoWithdraw.create({
        user: user._id,
        userIdText: user.userId,
        amount,
        currency: user.currency || "BDT",
        paymentMethod: code,
        methodName: method.name,
        wallet: wallet._id,
        userIdentityAddress: walletNumber,
        accountNumber: walletNumber,
        callbackKey,
        status: "PENDING",
        balanceBefore: money(num(user.balance) + amount),
        balanceAfter: money(user.balance),
      });
    } catch (error) {
      await creditUser(user._id, amount);
      throw error;
    }

    await writeLogs(user._id, user.balance, [
      { type: "withdraw", amount: -amount, refType: "AutoWithdraw", refId: record._id, note: `Auto ${method.name?.en || code} ${walletNumber}` },
    ]);

    // গেটওয়েতে এখন নয় — admin অনুমোদন দিলে তবেই (POST /withdrawals/:id/approve)
    return successResponse(
      res,
      "Auto withdraw submitted — waiting for approval",
      { id: record._id, amount, balance: money(user.balance), status: "PENDING" },
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  } finally {
    await unlockWithdraw(req.user._id);
  }
});

router.get("/history/my", protectUser, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 10));
    const filter = { user: req.user._id };
    const status = text(req.query.status).toUpperCase();
    if (["PENDING", "PROCESSING", "COMPLETED", "REJECTED"].includes(status)) filter.status = status;

    const [withdrawals, total] = await Promise.all([
      AutoWithdraw.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AutoWithdraw.countDocuments(filter),
    ]);

    return successResponse(res, "Auto withdrawals loaded", {
      withdrawals,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   অ্যাডমিন
   ========================= */

router.get("/admin", protectAdmin, requireMother, async (req, res) => {
  try {
    const setting = await AutoWithdrawSetting.current();
    return successResponse(res, "Auto withdraw setting loaded", { setting: setting.toSafeJSON() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const setting = await AutoWithdrawSetting.current();
    const body = req.body || {};

    if (text(body.businessToken)) setting.businessToken = text(body.businessToken);
    if (typeof body.active === "boolean") setting.active = body.active;
    if (body.minAmount !== undefined) setting.minAmount = Math.max(1, num(body.minAmount));
    if (body.maxAmount !== undefined) setting.maxAmount = Math.max(0, num(body.maxAmount));
    if (body.feePercent !== undefined) setting.feePercent = Math.max(0, num(body.feePercent));

    const methods = cleanMethods(body.methods);
    if (methods) setting.methods = methods;

    await setting.save();
    return successResponse(res, "Auto withdraw setting saved", { setting: setting.toSafeJSON() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/upload-logo", protectAdmin, requireMother, requireWrite, upload.single("logo"), (req, res) => {
  if (!req.file) return errorResponse(res, "Choose an image", 400);
  return successResponse(res, "Logo uploaded", { logoUrl: `/uploads/${req.file.filename}` });
});

router.get("/withdrawals/admin", protectAdmin, requirePermission("auto-withdraw-history"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    const status = text(req.query.status).toUpperCase();
    if (["PENDING", "PROCESSING", "COMPLETED", "REJECTED"].includes(status)) filter.status = status;

    const search = text(req.query.q).slice(0, 60);
    if (search) filter.userIdText = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const [withdrawals, total, counts] = await Promise.all([
      AutoWithdraw.find(filter)
        .populate("user", "userId phone balance role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AutoWithdraw.countDocuments(filter),
      AutoWithdraw.aggregate([{ $group: { _id: "$status", n: { $sum: 1 }, amt: { $sum: "$amount" } } }]),
    ]);

    const summary = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, REJECTED: 0, pendingAmount: 0, processingAmount: 0, completedAmount: 0, rejectedAmount: 0 };
    counts.forEach((row) => {
      const st = String(row._id || "").toUpperCase();
      summary[st] = row.n;
      summary[`${st.toLowerCase()}Amount`] = money(row.amt);
    });

    return successResponse(res, "Auto withdrawals loaded", {
      withdrawals,
      summary,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * admin অনুমোদন — তখনই OraclePay তে পাঠানো, আবেদন PROCESSING।
 *
 * `sendingAt` এক ধাপে দখল করে পাঠানো হয়, তাই দুজন admin একসাথে চাপলেও
 * আবেদন একবারই যায়। গেটওয়ে না নিলে আবেদন PENDING ই থাকে, ভুলটা
 * `gatewayError` এ — admin আবার Approve বা Reject করতে পারেন।
 */
router.post("/withdrawals/:id/approve", protectAdmin, requireWrite, requirePermission("auto-withdraw-history"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);

    const setting = await AutoWithdrawSetting.current();
    if (!setting.businessToken) return errorResponse(res, "Set the OraclePay business token in Auto Withdraw first", 400);

    // আগের নিয়মে আগেই গেটওয়েতে যাওয়া আবেদন — আবার পাঠানো নয়, শুধু PROCESSING
    const old = await AutoWithdraw.findOneAndUpdate(
      { _id: req.params.id, status: "PENDING", withdrawalId: { $ne: "" } },
      { $set: { status: "PROCESSING", approvedBy: req.admin._id, approvedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (old) return successResponse(res, "Already at the gateway — marked processing", { withdrawal: old });

    const staleSend = new Date(Date.now() - 2 * 60 * 1000);
    const record = await AutoWithdraw.findOneAndUpdate(
      { _id: req.params.id, status: "PENDING", refunded: false, $or: [{ sendingAt: null }, { sendingAt: { $lt: staleSend } }] },
      { $set: { sendingAt: new Date() } },
      { returnDocument: "after" },
    ).select("+callbackKey");
    if (!record) return errorResponse(res, "Only a pending withdrawal can be approved", 400);

    // পুরোনো আবেদনে চাবি না থাকলে এখন বানানো
    let callbackKey = record.callbackKey;
    if (!callbackKey) {
      callbackKey = crypto.randomBytes(24).toString("hex");
      await AutoWithdraw.updateOne({ _id: record._id }, { $set: { callbackKey } });
    }

    const server = text(process.env.PUBLIC_SERVER_URL).replace(/\/+$/, "");
    try {
      const data = await gatewayPost(gatewayUrl(), setting.businessToken, {
        amount: money(record.amount),
        payment_method: record.paymentMethod,
        user_identity_address: record.userIdentityAddress,
        account_number: record.accountNumber,
        callback_url: `${server}/api/auto-withdraw/webhook/${callbackKey}`,
        checkout_items: [{ userId: record.userIdText }, { withdrawal_type: "user" }],
      });

      if (!data?.success || !data?.data?.withdrawal_id) throw new Error(data?.message || "Gateway did not accept the request");

      const info = data.data;
      const updated = await AutoWithdraw.findOneAndUpdate(
        { _id: record._id },
        {
          $set: {
            status: "PROCESSING",
            withdrawalId: text(info.withdrawal_id),
            feePercentage: num(info.fee_percentage),
            feeAmount: money(info.fee_amount),
            deductedAmount: money(info.deducted_amount),
            approvedBy: req.admin._id,
            approvedAt: new Date(),
            sendingAt: null,
            gatewayError: "",
          },
        },
        { returnDocument: "after" },
      );

      if (setting.lastError) {
        setting.lastError = "";
        await setting.save();
      }
      return successResponse(res, "Sent to OraclePay — now processing", { withdrawal: updated });
    } catch (gatewayError) {
      const timedOut = /timeout|aborted/i.test(`${gatewayError?.name || ""} ${gatewayError?.message || ""}`);
      const message = timedOut
        ? "No answer from OraclePay in time — check the OraclePay dashboard before approving again"
        : String(gatewayError?.message || "Gateway error").slice(0, 300);
      await AutoWithdraw.updateOne({ _id: record._id }, { $set: { sendingAt: null, gatewayError: message } });
      setting.lastError = message;
      await setting.save();
      return errorResponse(res, `OraclePay did not accept it: ${message}`, 502, "gateway");
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * admin বাতিল — শুধু গেটওয়েতে না যাওয়া (PENDING) আবেদন; টাকা ফেরত।
 * গেটওয়েতে যাওয়ার পর বাতিল OraclePay ই করে (REJECTED webhook), নইলে
 * সে টাকা পাঠিয়ে দিলে খেলোয়াড় দুবার পেতেন।
 */
router.post("/withdrawals/:id/reject", protectAdmin, requireWrite, requirePermission("auto-withdraw-history"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const note = text(req.body?.note).slice(0, 300);
    const refunded = await refundWithdraw(
      { _id: req.params.id, status: "PENDING", withdrawalId: "", approvedAt: null, sendingAt: null },
      { reason: note || "Rejected by administrator", reviewedBy: req.admin._id, reviewNote: note },
      req.admin._id,
    );
    if (!refunded) {
      return errorResponse(res, "Only a pending withdrawal that is not sent to OraclePay can be rejected", 400);
    }
    return successResponse(res, "Withdrawal rejected and refunded");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * OraclePay webhook — `callback_url` এ বসানো এই আবেদনের গোপন চাবি দিয়ে খোঁজা।
 *   PROCESSING — এজেন্ট নিয়েছে (আমাদের দিকে আগেই PROCESSING)
 *   COMPLETED  — transaction_id, proof_text, proof_images, date_and_time
 *   REJECTED   — reason, টাকা ফেরত
 */
router.post("/webhook/:key", async (req, res) => {
  try {
    const key = text(req.params.key);
    const status = text(req.body?.status).toUpperCase();
    const withdrawalId = text(req.body?.withdrawal_id);
    if (!/^[a-f0-9]{48}$/.test(key)) return errorResponse(res, "Unknown withdrawal", 404);

    const existing = await AutoWithdraw.findOne({ callbackKey: key }).select("+callbackKey");
    if (!existing || !sameKey(existing.callbackKey, key)) return errorResponse(res, "Unknown withdrawal", 404);
    if (withdrawalId && existing.withdrawalId && withdrawalId !== existing.withdrawalId) {
      return errorResponse(res, "withdrawal_id does not match", 400);
    }
    if (!wasSent(existing) && !existing.sendingAt) return errorResponse(res, "This withdrawal was not sent to the gateway", 409);

    const open = { _id: existing._id, status: { $in: ["PENDING", "PROCESSING"] } };
    const idPatch = !existing.withdrawalId && withdrawalId ? { withdrawalId } : {};

    if (status === "PROCESSING") {
      await AutoWithdraw.updateOne(open, { $set: { status: "PROCESSING", ...idPatch } });
      return successResponse(res, "Processing recorded");
    }

    if (status === "COMPLETED") {
      const when = new Date(text(req.body?.date_and_time));
      await AutoWithdraw.updateOne(open, {
        $set: {
          status: "COMPLETED",
          transactionId: text(req.body?.transaction_id).slice(0, 120),
          proofText: text(req.body?.proof_text).slice(0, 500),
          proofImages: cleanProofImages(req.body?.proof_images),
          completedAt: Number.isNaN(when.getTime()) ? new Date() : when,
          sendingAt: null,
          ...idPatch,
        },
      });
      return successResponse(res, "Completed recorded");
    }

    if (status === "REJECTED") {
      await refundWithdraw(open, {
        reason: text(req.body?.reason).slice(0, 300) || "Rejected by OraclePay",
        sendingAt: null,
        ...idPatch,
      });
      return successResponse(res, "Rejected and refunded");
    }

    return errorResponse(res, "Unknown status", 400);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
