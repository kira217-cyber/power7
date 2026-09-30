import fs from "node:fs";
import path from "node:path";
import express from "express";
import mongoose from "mongoose";

import { AffWithdrawMethod, AffWithdrawRequest, AffWithdrawSetting } from "../models/AffWithdraw.js";
import User from "../models/User.js";
import upload from "../config/multer.js";
import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requireMother, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { verificationGate } from "../utils/verificationGate.js";
import { num, money } from "../utils/money.js";
import { creditUser, writeLogs } from "../utils/wallet.js";
import { onlyAffiliate } from "./affiliateRoutes.js";

/**
 * অ্যাফিলিয়েটের উত্তোলন — `/api/aff-withdraw`।
 *
 * BetChokkor থেকে আনা, তবে তিনটে ভুল ছাড়া: admin এর তালিকা আর অনুমোদনে
 * পারমিশন দেখা হতো না (দেখার-admin ও টাকা ছাড়তে পারতেন), টাকা কাটা/ফেরত
 * খাতায় উঠত না, আর `$inc` এ দশমিক গোল হতো না।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));
const both = (input = {}) => ({ bn: text(input?.bn), en: text(input?.en) });
const parseMaybeJSON = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const removeLogo = (url) => {
  if (!url || !url.startsWith("/uploads/")) return;
  fs.promises.unlink(path.join("uploads", path.basename(url))).catch(() => {});
};

/** admin এর দেওয়া ঘরগুলো পরিষ্কার */
const cleanFields = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({
      key: text(item?.key).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30),
      label: both(item?.label),
      placeholder: both(item?.placeholder),
      type: ["text", "number", "tel", "email"].includes(item?.type) ? item.type : "text",
      required: item?.required !== false,
    }))
    .filter((item) => item.key && (item.label.bn || item.label.en))
    .slice(0, 10);

/** অ্যাফিলিয়েটের ভরা ঘর — admin যেগুলো চেয়েছেন শুধু সেগুলো থাকে */
const collectFields = (method, input = {}) => {
  const values = {};
  const problems = [];
  for (const field of method.fields || []) {
    const value = text(input?.[field.key]).slice(0, 120);
    if (!value) {
      if (field.required) problems.push(field.label.en || field.label.bn || field.key);
      continue;
    }
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      problems.push(`${field.label.en || field.key} is not a valid email`);
      continue;
    }
    values[field.key] = value;
  }
  return { values, problems };
};

/* ─────────────────── সবাই ─────────────────── */

router.get("/methods/public", async (req, res) => {
  try {
    const [methods, setting] = await Promise.all([AffWithdrawMethod.find({ isActive: true }).sort({ sort: 1, createdAt: 1 }).lean(), AffWithdrawSetting.current()]);
    return successResponse(res, "Methods loaded", {
      methods,
      setting: { requiredActiveReferrals: setting.requiredActiveReferrals, requireSettledCommission: setting.requireSettledCommission, note: setting.note },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ─────────────────── অ্যাফিলিয়েট ─────────────────── */

/** এখন তোলা যাবে কিনা — প্রথম যে শর্তে আটকায় সেটাই বলা হয় */
const checkEligibility = async (user) => {
  const gate = await verificationGate(user._id, "withdraw", "aff-user");
  if (!gate.ok) return { eligible: false, reason: "verification", verificationStatus: gate.status, balance: money(user.balance) };

  const setting = await AffWithdrawSetting.current();
  const needed = num(setting.requiredActiveReferrals);
  const activeReferrals = await User.countDocuments({ referredBy: user._id, role: "user", isActive: true });
  const base = { requiredActiveReferrals: needed, activeReferrals, balance: money(user.balance) };

  if (activeReferrals < needed) return { ...base, eligible: false, reason: "referrals", remainingReferrals: needed - activeReferrals };

  if (setting.requireSettledCommission) {
    const unsettled = num(user.referCommissionBalance) + num(user.depositCommissionBalance) + num(user.gameWinCommissionBalance) + num(user.gameLossCommissionBalance);
    if (unsettled > 0) return { ...base, eligible: false, reason: "unsettled", unsettled: money(unsettled) };
  }

  if (await AffWithdrawRequest.exists({ user: user._id, status: "pending" })) return { ...base, eligible: false, reason: "pending" };
  if (money(user.balance) <= 0) return { ...base, eligible: false, reason: "noBalance" };
  return { ...base, eligible: true, reason: "" };
};

router.get("/eligibility", protectUser, onlyAffiliate, async (req, res) => {
  try {
    return successResponse(res, "Eligibility checked", await checkEligibility(req.user));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/", protectUser, onlyAffiliate, async (req, res) => {
  try {
    const methodId = text(req.body?.methodId).toUpperCase();
    const amount = money(num(req.body?.amount));
    if (!methodId) return errorResponse(res, "Choose a method", 400, "missingFields");
    if (amount <= 0) return errorResponse(res, "Enter a valid amount", 400, "missingFields");

    const eligibility = await checkEligibility(req.user);
    if (!eligibility.eligible) {
      const messages = {
        verification: "Please complete identity verification first",
        referrals: `You need ${eligibility.remainingReferrals} more active player(s)`,
        unsettled: "Your commission has to be settled by an admin first",
        pending: "You already have a withdraw waiting for review",
        noBalance: "Not enough balance",
      };
      return errorResponse(res, messages[eligibility.reason] || "You cannot withdraw right now", 400, eligibility.reason === "pending" ? "pendingWithdraw" : "notEligible");
    }

    const method = await AffWithdrawMethod.findOne({ methodId, isActive: true });
    if (!method) return errorResponse(res, "This method is not available", 404);
    const min = num(method.minimumWithdrawAmount);
    const max = num(method.maximumWithdrawAmount);
    if (min > 0 && amount < min) return errorResponse(res, `Minimum withdraw amount is ${min}`, 400, "belowMin");
    if (max > 0 && amount > max) return errorResponse(res, `Maximum withdraw amount is ${max}`, 400, "aboveMax");

    const { values, problems } = collectFields(method, req.body?.fields);
    if (problems.length) return errorResponse(res, `Please fill in: ${problems.join(", ")}`, 400, "missingFields");

    // শর্ত সহ এক ধাপে কাটা — দুটো আবেদন একসাথে এলেও ব্যালেন্সের বেশি বেরোয় না
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: amount } },
      [{ $set: { balance: { $round: [{ $subtract: ["$balance", amount] }, 2] } } }],
      { returnDocument: "after" },
    );
    if (!user) return errorResponse(res, "Not enough balance", 400, "lowBalance");

    let request;
    try {
      request = await AffWithdrawRequest.create({
        user: user._id,
        userIdText: user.userId,
        methodId,
        methodSnapshot: { name: method.name, fields: method.fields },
        fields: values,
        amount,
        balanceBefore: money(user.balance + amount),
        balanceAfter: money(user.balance),
      });
    } catch (error) {
      // সারি বসাতে না পারলে টাকা ফেরত — নইলে টাকাটা কোথাও না গিয়েই উধাও
      await creditUser(user._id, amount);
      if (error?.code === 11000) return errorResponse(res, "You already have a withdraw waiting for review", 400, "pendingWithdraw");
      throw error;
    }
    await writeLogs(user._id, user.balance, [{ type: "withdraw", amount: -amount, refType: "AffWithdrawRequest", refId: request._id, note: `Affiliate withdraw (${methodId})` }]);
    return successResponse(res, "Withdraw submitted", { request }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/my", protectUser, onlyAffiliate, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 10));
    const filter = { user: req.user._id };
    const status = text(req.query.status);
    if (["pending", "approved", "rejected"].includes(status)) filter.status = status;
    const [requests, total] = await Promise.all([
      AffWithdrawRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AffWithdrawRequest.countDocuments(filter),
    ]);
    return successResponse(res, "Withdraws loaded", { requests, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ─────────────────── admin — উপায় ও নিয়ম (mother) ─────────────────── */

router.get("/admin/methods", protectAdmin, requireMother, async (req, res) => {
  try {
    return successResponse(res, "Methods loaded", { methods: await AffWithdrawMethod.find().sort({ sort: 1, createdAt: 1 }).lean() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

const saveMethod = async (req, res, existing) => {
  const body = req.body || {};
  const methodId = text(body.methodId).toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 30);
  const name = both(parseMaybeJSON(body.name, {}));
  if (!existing && !methodId) return errorResponse(res, "Method id is required", 400);
  if (!name.bn && !name.en) return errorResponse(res, "Name is required", 400);
  const fields = cleanFields(parseMaybeJSON(body.fields, []));
  if (!fields.length) return errorResponse(res, "Add at least one field to fill in", 400);

  const method = existing || new AffWithdrawMethod({ methodId });
  if (methodId) method.methodId = methodId;
  method.name = name;
  method.minimumWithdrawAmount = Math.max(0, num(body.minimumWithdrawAmount));
  method.maximumWithdrawAmount = Math.max(0, num(body.maximumWithdrawAmount));
  method.sort = num(body.sort);
  if (body.isActive !== undefined) method.isActive = body.isActive === true || body.isActive === "true";
  method.fields = fields;
  if (req.file) {
    removeLogo(method.logoUrl);
    method.logoUrl = `/uploads/${req.file.filename}`;
  }
  await method.save();
  return successResponse(res, existing ? "Method updated" : "Method added", { method });
};

router.post("/admin/methods", protectAdmin, requireMother, requireWrite, upload.single("logo"), async (req, res) => {
  try {
    const methodId = text(req.body?.methodId).toUpperCase();
    if (methodId && (await AffWithdrawMethod.exists({ methodId }))) return errorResponse(res, "This method id already exists", 409);
    return await saveMethod(req, res, null);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/methods/:id", protectAdmin, requireMother, requireWrite, upload.single("logo"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const method = await AffWithdrawMethod.findById(req.params.id);
    if (!method) return errorResponse(res, "Method not found", 404);
    return await saveMethod(req, res, method);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.delete("/admin/methods/:id", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const method = await AffWithdrawMethod.findByIdAndDelete(req.params.id);
    if (!method) return errorResponse(res, "Method not found", 404);
    removeLogo(method.logoUrl);
    return successResponse(res, "Method removed", {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/admin/setting", protectAdmin, requireMother, async (req, res) => {
  try {
    return successResponse(res, "Setting loaded", { setting: await AffWithdrawSetting.current() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/setting", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const setting = await AffWithdrawSetting.current();
    if (req.body?.requiredActiveReferrals !== undefined) setting.requiredActiveReferrals = Math.max(0, Math.floor(num(req.body.requiredActiveReferrals)));
    if (req.body?.requireSettledCommission !== undefined) setting.requireSettledCommission = Boolean(req.body.requireSettledCommission);
    if (req.body?.note) setting.note = both(req.body.note);
    await setting.save();
    return successResponse(res, "Setting saved", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ─────────────────── admin — আবেদন (perm aff-withdraw-requests) ─────────────────── */

router.get("/admin", protectAdmin, requirePermission("aff-withdraw-requests"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    const status = text(req.query.status);
    if (["pending", "approved", "rejected"].includes(status)) filter.status = status;
    const search = text(req.query.q).slice(0, 40);
    if (search) filter.userIdText = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const [requests, total, counts, sums] = await Promise.all([
      AffWithdrawRequest.find(filter).populate("user", "userId phone balance role").populate("reviewedBy", "email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AffWithdrawRequest.countDocuments(filter),
      AffWithdrawRequest.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      AffWithdrawRequest.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    return successResponse(res, "Withdraws loaded", {
      requests,
      summary: { amount: money(sums[0]?.total || 0), ...counts.reduce((acc, item) => ({ ...acc, [item._id]: item.n }), { pending: 0, approved: 0, rejected: 0 }) },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * অনুমোদন বা বাতিল — ঝুলে থাকা আবেদনটাই এক ধাপে দাবি করা হয়, তাই দুজন
 * admin একসাথে চাপলেও টাকা দুবার ফেরত যায় না।
 */
const review = (nextStatus) => async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const note = text(req.body?.note).slice(0, 300);
    if (nextStatus === "rejected" && !note) return errorResponse(res, "Please say why it was rejected", 400);

    const claimed = await AffWithdrawRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: { status: nextStatus, adminNote: note, reviewedBy: req.admin._id, ...(nextStatus === "approved" ? { approvedAt: new Date() } : { rejectedAt: new Date() }) } },
      { returnDocument: "after" },
    );
    if (!claimed) return errorResponse(res, "Already reviewed or not found", 409);

    if (nextStatus === "rejected") {
      const credited = await creditUser(claimed.user, claimed.amount);
      await writeLogs(claimed.user, credited?.balance, [{ type: "withdraw-refund", amount: claimed.amount, refType: "AffWithdrawRequest", refId: claimed._id, note: `Affiliate withdraw rejected: ${note}` }], { by: req.admin._id });
    }
    return successResponse(res, `Withdraw ${nextStatus}`, { request: claimed });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

router.patch("/admin/:id/approve", protectAdmin, requirePermission("aff-withdraw-requests"), requireWrite, review("approved"));
router.patch("/admin/:id/reject", protectAdmin, requirePermission("aff-withdraw-requests"), requireWrite, review("rejected"));

export default router;
