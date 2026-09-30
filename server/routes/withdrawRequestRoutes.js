import express from "express";
import mongoose from "mongoose";

import WithdrawRequest from "../models/WithdrawRequest.js";
import WithdrawMethod from "../models/WithdrawMethod.js";
import EWallet from "../models/EWallet.js";
import TurnOver from "../models/TurnOver.js";
import User from "../models/User.js";
import WithdrawSetting from "../models/WithdrawSetting.js";
import AutoWithdraw from "../models/AutoWithdraw.js";

import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num, money } from "../utils/money.js";
import { isOtpRequired, isVerified, clearOtp } from "../utils/otp.js";
import { verificationGate } from "../utils/verificationGate.js";
import { checkTxPassword } from "../utils/txPassword.js";
import { creditUser, writeLogs } from "../utils/wallet.js";
import { dayStart } from "../utils/referral.js";
import { lockWithdraw, unlockWithdraw } from "../utils/withdrawLock.js";

const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));

/**
 * এখন টাকা তোলা যাবে কিনা।
 *
 * দুটো কারণে আটকায় — আগের একটা আবেদন এখনো ঝুলে আছে, অথবা টার্নওভারের
 * শর্ত বাকি। দুটোই আলাদা করে বলা হয়, যাতে ব্যবহারকারী বুঝতে পারেন কী
 * করতে হবে।
 */
/** আজ (বাংলাদেশের দিন) আর কতবার তোলা যাবে — `null` মানে সীমা নেই */
// ম্যানুয়াল আর অটো দুটো মিলিয়েই গোনা — একটায় সীমা শেষ হলে অন্যটায় আবার শুরু হয় না
export const remainingToday = async (userId) => {
  const { dailyCount } = await WithdrawSetting.current();
  if (!dailyCount) return { limit: 0, remaining: null };
  const since = { $gte: dayStart() };
  const [manual, auto] = await Promise.all([
    WithdrawRequest.countDocuments({ user: userId, createdAt: since, status: { $ne: "rejected" } }),
    AutoWithdraw.countDocuments({ user: userId, createdAt: since, status: { $ne: "REJECTED" } }),
  ]);
  return { limit: dailyCount, remaining: Math.max(0, dailyCount - manual - auto) };
};

export const checkEligibility = async (userId) => {
  // পরিচয় যাচাই সবার আগে — টার্নওভার বা ঝুলে থাকা আবেদনের কথা বলার
  // আগে এটাই বলা উচিত, কারণ এটা না হলে বাকিগুলো মিটিয়েও লাভ নেই
  const gate = await verificationGate(userId, "withdraw", "user");

  if (!gate.ok) {
    return {
      eligible: false,
      reason: "verification",
      verificationStatus: gate.status,
      remaining: 0,
    };
  }

  // ঝুলে থাকা আবেদন — ম্যানুয়াল বা অটো, যেকোনোটা থাকলেই নতুনটা নয়
  const pending =
    (await WithdrawRequest.findOne({ user: userId, status: "pending" }).sort({ createdAt: -1 })) ||
    (await AutoWithdraw.findOne({ user: userId, status: { $in: ["PENDING", "PROCESSING"] } }).sort({ createdAt: -1 }));

  if (pending) {
    return {
      eligible: false,
      reason: "pendingWithdraw",
      pendingId: String(pending._id),
      pendingAmount: pending.amount,
      remaining: 0,
    };
  }

  // দিনের সীমা (admin এর "Withdraw Methods → দিনে সর্বোচ্চ")
  const today = await remainingToday(userId);
  if (today.remaining === 0) {
    return { eligible: false, reason: "dailyLimit", limit: today.limit, remaining: 0 };
  }

  const running = await TurnOver.find({ user: userId, status: "running" })
    .sort({ createdAt: 1 })
    .lean();

  if (!running.length) {
    return { eligible: true, reason: "", remaining: 0, turnovers: [] };
  }

  const remaining = running.reduce(
    (sum, item) => sum + Math.max(0, money(num(item.required) - num(item.progress))),
    0,
  );

  return {
    eligible: false,
    reason: "turnover",
    remaining: money(remaining),
    turnovers: running.map((item) => ({
      title: item.title || item.sourceType,
      required: item.required,
      progress: item.progress,
      remaining: Math.max(0, money(num(item.required) - num(item.progress))),
      percent: item.required
        ? Math.min(100, Math.round((num(item.progress) / num(item.required)) * 100))
        : 100,
    })),
  };
};

/* =========================
   ক্লায়েন্ট
   ========================= */

router.get("/eligibility", protectUser, async (req, res) => {
  try {
    // উত্তোলনের পাতা একবারেই সব জানে — শর্ত, ব্যালেন্স, লেনদেন পাসওয়ার্ড আছে কিনা
    return successResponse(res, "Eligibility checked", {
      ...(await checkEligibility(req.user._id)),
      today: await remainingToday(req.user._id),
      balance: money(req.user.balance),
      hasTxPassword: Boolean(req.user.txPasswordSetAt),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * টাকা তোলার আবেদন।
 *
 * জমা দেওয়ার সাথে সাথেই ব্যালেন্স থেকে কেটে রাখা হয় — নইলে আবেদন ঝুলে
 * থাকা অবস্থায় সেই টাকা দিয়েই খেলে ফেলা যেত, আর অনুমোদনের সময় দেখা
 * যেত ব্যালেন্স নেই।
 */
router.post("/", protectUser, async (req, res) => {
  // ম্যানুয়াল আর অটো মিলিয়ে একসাথে একটাই আবেদন (utils/withdrawLock.js)
  if (!(await lockWithdraw(req.user._id))) {
    return errorResponse(res, "You already have a withdraw waiting for review", 409, "pendingWithdraw");
  }
  try {
    const walletId = text(req.body?.walletId);
    const amount = money(num(req.body?.amount));

    if ((await WithdrawSetting.current()).manualEnabled === false) {
      return errorResponse(res, "Manual withdraw is off right now", 400, "manualOff");
    }
    if (!isId(walletId)) return errorResponse(res, "Choose an e-wallet", 400, "chooseWallet");
    if (amount <= 0) return errorResponse(res, "Enter a valid amount", 400, "missingFields");

    const eligibility = await checkEligibility(req.user._id);

    if (!eligibility.eligible) {
      const messages = {
        verification: "Please complete identity verification first",
        pendingWithdraw: "You already have a withdraw waiting for review",
        dailyLimit: "You reached today's withdraw limit",
      };

      const codes = {
        verification: "needVerification",
        pendingWithdraw: "pendingWithdraw",
        dailyLimit: "dailyLimit",
      };

      return errorResponse(
        res,
        messages[eligibility.reason] ||
          `Turnover is not finished — ${eligibility.remaining} left`,
        400,
        codes[eligibility.reason] || "turnoverLeft",
      );
    }

    const wallet = await EWallet.findOne({
      _id: walletId,
      user: req.user._id,
      isActive: true,
    });

    if (!wallet) return errorResponse(res, "This e-wallet was not found", 404, "chooseWallet");

    // মেথড ওয়ালেটের সাথেই বাঁধা (মূল সাইটের মতো)
    const methodId = wallet.methodId;
    const method = await WithdrawMethod.findOne({ methodId, isActive: true });

    if (!method) return errorResponse(res, "This method is not available", 404, "methodOff");

    const min = num(method.minimumWithdrawAmount);
    const max = num(method.maximumWithdrawAmount);

    if (min > 0 && amount < min) {
      return errorResponse(res, `Minimum withdraw amount is ${min}`, 400, "belowMin");
    }

    if (max > 0 && amount > max) {
      return errorResponse(res, `Maximum withdraw amount is ${max}`, 400, "aboveMax");
    }

    // ব্যালেন্স আগে দেখা হয়, OTP এর পরে নয় — নইলে টাকা না থাকলেও
    // একটা OTP খরচ হয়ে যেত, আর তারপর "টাকা নেই" শুনতে হতো
    if (money(num(req.user.balance)) < amount) {
      return errorResponse(res, "Not enough balance", 400, "lowBalance");
    }

    // লেনদেন পাসওয়ার্ড — মূল সাইটের মতো প্রতিটা উত্তোলনে
    const tx = await checkTxPassword(req.user._id, req.body?.txPassword);
    if (!tx.ok) return errorResponse(res, tx.message, tx.status, tx.code);

    if (req.user.phone && (await isOtpRequired("client", "withdraw"))) {
      const target = {
        flow: "withdraw",
        countryCode: req.user.countryCode,
        phone: req.user.phone,
      };

      if (!isVerified(target)) {
        return errorResponse(res, "Please verify the OTP first", 400, "otpNotVerified");
      }

      clearOtp(target);
    }

    // ব্যালেন্স atomic ভাবে কাটা — যথেষ্ট না থাকলে কিছুই ঘটে না, তাই
    // দুই ট্যাব থেকে একসাথে চেষ্টা করলেও একটার বেশি যাবে না
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: amount } },
      [{ $set: { balance: { $round: [{ $subtract: ["$balance", amount] }, 2] } } }],
      { returnDocument: "after" },
    );

    if (!user) {
      return errorResponse(res, "Not enough balance", 400, "lowBalance");
    }

    const balanceBefore = money(num(user.balance) + amount);

    try {
      const request = await WithdrawRequest.create({
        user: user._id,
        userIdText: user.userId,
        methodId,
        wallet: wallet._id,
        walletSnapshot: {
          methodId,
          methodName: method.name,
          walletType: wallet.walletType,
          walletNumber: wallet.walletNumber,
          label: wallet.accountName || wallet.label,
        },
        amount,
        currency: user.currency || "BDT",
        balanceBefore,
        balanceAfter: money(user.balance),
        status: "pending",
      });

      await writeLogs(user._id, user.balance, [
        { type: "withdraw", amount: -amount, refType: "WithdrawRequest", refId: request._id, note: `${method.name?.en || methodId} ${wallet.walletNumber}` },
      ]);

      return successResponse(
        res,
        "Withdraw request submitted",
        { request, balance: money(user.balance) },
        201,
      );
    } catch (error) {
      // রেকর্ড না বসলে কাটা টাকাটা ফিরিয়ে দেওয়া
      await creditUser(user._id, amount);
      // একই মুহূর্তে দুটো আবেদন — ডেটাবেসের unique সূচক দ্বিতীয়টা আটকায়
      if (error?.code === 11000) {
        return errorResponse(res, "You already have a withdraw waiting for review", 409, "pendingWithdraw");
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  } finally {
    await unlockWithdraw(req.user._id);
  }
});

router.get("/my", protectUser, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));

    const filter = { user: req.user._id };
    const status = text(req.query.status);

    if (["pending", "approved", "rejected"].includes(status)) filter.status = status;

    const [requests, total] = await Promise.all([
      WithdrawRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WithdrawRequest.countDocuments(filter),
    ]);

    return successResponse(res, "Withdraws loaded", {
      requests,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   অ্যাডমিন
   ========================= */

/** দিনে সর্বোচ্চ কতবার উত্তোলন — admin (mother) */
router.get("/admin/setting", protectAdmin, async (req, res) => {
  try {
    return successResponse(res, "Withdraw setting", { setting: await WithdrawSetting.current() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/setting", protectAdmin, requireWrite, async (req, res) => {
  try {
    if (req.admin?.role !== "mother") return errorResponse(res, "Only the main admin can change this", 403);
    const set = {};
    if (req.body?.dailyCount !== undefined) set.dailyCount = Math.min(1000, Math.max(0, Math.floor(num(req.body.dailyCount))));
    if (typeof req.body?.manualEnabled === "boolean") set.manualEnabled = req.body.manualEnabled;
    const setting = await WithdrawSetting.findOneAndUpdate({ key: "main" }, { $set: set }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    return successResponse(res, "Saved", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/admin", protectAdmin, requirePermission("withdraw-requests"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));

    const filter = {};
    const status = text(req.query.status);

    if (["pending", "approved", "rejected"].includes(status)) filter.status = status;

    const search = text(req.query.q);

    if (search) {
      const users = await User.find({
        $or: [
          { userId: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      filter.user = {
        $in: users.length ? users.map((u) => u._id) : [new mongoose.Types.ObjectId()],
      };
    }

    const [requests, total, counts] = await Promise.all([
      WithdrawRequest.find(filter)
        .populate("user", "userId phone balance isActive role")
        .populate("reviewedBy", "email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WithdrawRequest.countDocuments(filter),
      WithdrawRequest.aggregate([
        {
          $group: {
            _id: "$status",
            n: { $sum: 1 },
            amt: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // গণনা + টাকার অঙ্ক (Bajiman এর সারাংশ কার্ডের মতো)
    const summary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      rejectedAmount: 0,
    };

    counts.forEach((row) => {
      const st = String(row._id || "").toLowerCase();
      summary[st] = row.n;

      if (st === "pending") summary.pendingAmount = row.amt || 0;
      else if (st === "approved") summary.approvedAmount = row.amt || 0;
      else if (st === "rejected") summary.rejectedAmount = row.amt || 0;
    });

    return successResponse(res, "Requests loaded", {
      requests,
      summary,
      meta: { page, limit, total },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * অনুমোদন।
 *
 * টাকা আগেই কেটে রাখা হয়েছিল, তাই এখানে ব্যালেন্সে কিছু করার নেই —
 * শুধু অবস্থাটা বদলায়। atomic দখল দিয়ে, যাতে দুবার চললেও একবারই হয়।
 */
router.patch("/admin/:id/approve", protectAdmin, requireWrite, requirePermission("withdraw-requests"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

    const request = await WithdrawRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      {
        $set: {
          status: "approved",
          adminNote: text(req.body?.adminNote),
          reviewedBy: req.admin._id,
          approvedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).populate("user", "userId phone balance role");

    if (!request) {
      const exists = await WithdrawRequest.exists({ _id: req.params.id });

      return errorResponse(
        res,
        exists ? "Only a pending request can be approved" : "Request not found",
        exists ? 400 : 404,
      );
    }

    return successResponse(res, "Withdraw approved", { request });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * বাতিল — কেটে রাখা টাকাটা ব্যালেন্সে ফিরিয়ে দেওয়া হয়।
 */
router.patch("/admin/:id/reject", protectAdmin, requireWrite, requirePermission("withdraw-requests"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

    const note = text(req.body?.adminNote);

    if (!note) {
      return errorResponse(res, "Write why it is rejected", 400);
    }

    const request = await WithdrawRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      {
        $set: {
          status: "rejected",
          adminNote: note,
          reviewedBy: req.admin._id,
          rejectedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!request) {
      const exists = await WithdrawRequest.exists({ _id: req.params.id });

      return errorResponse(
        res,
        exists ? "Only a pending request can be rejected" : "Request not found",
        exists ? 400 : 404,
      );
    }

    // কেটে রাখা টাকা ফেরত — এক ধাপে, খেলার callback এর সাথে ধাক্কা না লাগে
    const user = await creditUser(request.user, request.amount);
    await writeLogs(
      request.user,
      user?.balance,
      [{ type: "withdraw-refund", amount: request.amount, refType: "WithdrawRequest", refId: request._id, note }],
      { by: req.admin._id },
    );

    return successResponse(res, "Withdraw rejected, money returned", {
      request,
      balance: money(user?.balance),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
