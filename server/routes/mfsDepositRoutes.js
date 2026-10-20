import crypto from "node:crypto";
import express from "express";
import mongoose from "mongoose";

import upload from "../config/multer.js";
import MfsSetting, { MFS_METHODS, MFS_DEFAULT_URL } from "../models/MfsSetting.js";
import MfsDeposit from "../models/MfsDeposit.js";
import TurnOver from "../models/TurnOver.js";
import User from "../models/User.js";

import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requireMother, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { verificationGate } from "../utils/verificationGate.js";
import { num, money, sumPercent, getAffiliateDepositCommission } from "../utils/depositCalc.js";
import { addCommission, creditUser, writeLogs } from "../utils/wallet.js";
import { onReferralDeposit } from "../utils/referral.js";
import { onTemuTask } from "../utils/reward.js";
import { amountsOf, cleanProviders, computeBonus, sameKey } from "./autoDepositRoutes.js";

/**
 * পার্সোনাল অটো ডিপোজিট (MFSWallet) — `/api/mfs-deposit`।
 *
 * খেলোয়াড় মাধ্যম (bKash/Nagad/Rocket/Upay) আর পরিমাণ বাছেন → আমরা PENDING
 * লেনদেন বসিয়ে MFSWallet এর `create-link` থেকে পেমেন্ট পাতার ঠিকানা আনি →
 * খেলোয়াড় সেখানে টাকা পাঠান → MFSWallet এর অ্যাপ SMS মিলিয়ে তিনটা webhook এর
 * একটা পাঠায়: সফল (টাকা ঢোকে), পেন্ডিং (admin যাচাই করেন), বাতিল।
 *
 * নিরাপত্তা — MFSWallet সই পাঠায় না, অবস্থা যাচাইয়ের API ও নেই, তাই:
 *   - প্রতিটা লেনদেনের webhook ঠিকানায় নিজের গোপন চাবি (না মিললে বাতিল)
 *   - `short_code`, অঙ্ক আর মাধ্যম আমাদের রেকর্ডের সাথে মিলতে হবে
 *   - টাকা একবারই (`balanceAdded` শর্তে এক ধাপে দখল)
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));
const langText = (input = {}) => ({ bn: text(input?.bn), en: text(input?.en) });
const base = (url) => text(url).replace(/\/+$/, "");

/** admin থেকে আসা মাধ্যমের তালিকা — শুধু MFSWallet এর চারটা */
const cleanMethods = (list) => {
  if (!Array.isArray(list)) return null;
  const seen = new Set();
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
    .filter((item) => MFS_METHODS.includes(item.code) && !seen.has(item.code) && seen.add(item.code));
};

/** মাধ্যমের নিজের সীমা থাকলে সেটা, নইলে সাধারণ সীমা */
const limitsOf = (setting, method) => ({
  min: num(method?.minAmount) > 0 ? num(method.minAmount) : num(setting.minAmount),
  max: num(method?.maxAmount) > 0 ? num(method.maxAmount) : num(setting.maxAmount),
});

/** খেলোয়াড়কে যা দেখানো যায় */
export const mfsDepositStatus = async () => {
  const setting = await MfsSetting.current();
  const ready = setting.active && Boolean(setting.apiKey);
  const methods = ready
    ? (setting.methods || [])
        .filter((m) => m.active !== false)
        .sort((a, b) => num(a.order) - num(b.order))
        .map((m) => ({ code: m.code, name: m.name, logoUrl: m.logoUrl, ...(({ min, max }) => ({ minAmount: min, maxAmount: max }))(limitsOf(setting, m)) }))
    : [];
  return {
    active: ready && methods.length > 0,
    displayName: setting.displayName,
    minAmount: setting.minAmount,
    maxAmount: setting.maxAmount,
    quickAmounts: setting.quickAmounts || [],
    methods,
    bonuses: ready ? (setting.bonuses || []).filter((b) => b.isActive !== false).sort((a, b) => num(a.order) - num(b.order)) : [],
  };
};

/** MFSWallet এর create-link — Bearer API Key, ২০ সেকেন্ডে সাড়া না এলে বাদ */
const createLink = async (setting, body) => {
  const res = await fetch(setting.apiUrl || MFS_DEFAULT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${String(setting.apiKey || "").trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new Error(data?.message || data?.error || `Gateway answered ${res.status}`);
  return data;
};

/* =========================
   খেলোয়াড়
   ========================= */

router.get("/status", async (req, res) => {
  try {
    return successResponse(res, "MFS deposit status", await mfsDepositStatus());
  } catch {
    return successResponse(res, "MFS deposit unavailable", { active: false, methods: [], bonuses: [] });
  }
});

router.post("/create", protectUser, async (req, res) => {
  try {
    const setting = await MfsSetting.current();
    if (!setting.active || !setting.apiKey) return errorResponse(res, "Personal auto deposit is off right now", 400, "autoOff");

    const method = (setting.methods || []).find((m) => m.code === text(req.body?.method).toLowerCase() && m.active !== false);
    if (!method) return errorResponse(res, "Choose a payment method", 400, "chooseMethod");

    const amount = money(num(req.body?.amount));
    const { min, max } = limitsOf(setting, method);
    if (!(amount > 0)) return errorResponse(res, "Enter a valid amount", 400, "missingFields");
    if (amount < min) return errorResponse(res, `Minimum deposit amount is ${min}`, 400, "belowMin");
    if (max > 0 && amount > max) return errorResponse(res, `Maximum deposit amount is ${max}`, 400, "aboveMax");

    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, "User not found", 404);
    if (!user.isActive) return errorResponse(res, "This account is disabled", 403);

    const gate = await verificationGate(user._id, "deposit");
    if (!gate.ok) return errorResponse(res, gate.message, 400, "needVerification");

    let bonus = null;
    const bonusId = text(req.body?.bonusId);
    if (bonusId) {
      bonus = isId(bonusId) ? setting.bonuses.id(bonusId) : null;
      if (!bonus || bonus.isActive === false) return errorResponse(res, "This bonus is not available", 400, "bonusOff");
      if (bonus.bonusScope === "first-deposit") {
        const paid = await MfsDeposit.exists({ user: user._id, status: "PAID", balanceAdded: true });
        if (paid) return errorResponse(res, "This bonus is only for the first deposit here", 400, "firstOnly");
      }
    }

    const { selectedBonus, calc } = computeBonus({ amount, bonus });
    const commission = await getAffiliateDepositCommission({ user, amount });

    const invoiceNumber = `MF${Date.now()}${crypto.randomInt(100, 1000)}`;
    const callbackKey = crypto.randomBytes(24).toString("hex");
    const deposit = await MfsDeposit.create({
      user: user._id,
      userIdText: user.userId,
      amount,
      method: method.code,
      invoiceNumber,
      callbackKey,
      selectedBonus,
      calc: { ...calc, affiliateDepositCommission: commission },
    });

    const server = base(process.env.PUBLIC_SERVER_URL) || `${req.protocol}://${req.get("host")}`;
    const client = base(process.env.PUBLIC_CLIENT_URL);
    let domain = "";
    try {
      domain = new URL(client).hostname;
    } catch {
      domain = req.hostname;
    }
    const back = (result) => `${client}/?mfs=${invoiceNumber}&result=${result}`;
    const hook = (kind) => `${server}/api/mfs-deposit/webhook/${kind}/${callbackKey}`;

    const fail = async (message) => {
      await MfsDeposit.updateOne({ _id: deposit._id }, { $set: { status: "FAILED", gatewayMessage: String(message || "").slice(0, 300) } });
      setting.lastError = String(message || "").slice(0, 300);
      await setting.save();
    };

    try {
      const data = await createLink(setting, {
        amount,
        method: method.code,
        user_identyfy_address: user.phone || user.userId,
        domain,
        success_redirect_url: back("success"),
        fail_redirect_url: back("fail"),
        pending_redirect_url: back("pending"),
        call_back_url: hook("success"),
        pending_call_back: hook("pending"),
        reject_call_back: hook("reject"),
        checkout_items: { invoice: invoiceNumber, userId: user.userId },
      });

      if (!data?.success || !data?.payment_page_url || !data?.short_code) {
        await fail(data?.message || "Gateway did not return a payment page");
        return errorResponse(res, "Could not start the payment", 400, "gateway");
      }

      await MfsDeposit.updateOne({ _id: deposit._id }, { $set: { shortCode: text(data.short_code).slice(0, 120) } });
      if (setting.lastError) {
        setting.lastError = "";
        await setting.save();
      }
      return successResponse(res, "Payment started", { invoiceNumber, amount, paymentUrl: data.payment_page_url });
    } catch (gatewayError) {
      await fail(gatewayError.message);
      return errorResponse(res, "Could not reach the payment gateway", 502, "gateway");
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** নিজের ইতিহাস — ডিপোজিট রেকর্ডে ম্যানুয়াল/অটোর সাথে মেশে */
router.get("/history/my", protectUser, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 10));
    const filter = { user: req.user._id };
    const status = text(req.query.status).toUpperCase();
    if (["PENDING", "PAID", "FAILED"].includes(status)) filter.status = status;
    const [deposits, total] = await Promise.all([
      MfsDeposit.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("-calc.affiliateDepositCommission").lean(),
      MfsDeposit.countDocuments(filter),
    ]);
    return successResponse(res, "MFS deposits loaded", { deposits, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** ফেরত এসে খেলোয়াড় নিজের লেনদেনের অবস্থা দেখেন (`?mfs=` ঠিকানা থেকে) */
router.get("/my/:invoice", protectUser, async (req, res) => {
  try {
    const deposit = await MfsDeposit.findOne({ user: req.user._id, invoiceNumber: text(req.params.invoice) })
      .select("invoiceNumber amount method status needsReview paidAt calc.creditedAmount")
      .lean();
    if (!deposit) return errorResponse(res, "Not found", 404);
    return successResponse(res, "MFS deposit", { deposit });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   admin
   ========================= */

router.get("/admin", protectAdmin, requireMother, async (req, res) => {
  try {
    const setting = await MfsSetting.current();
    const server = base(process.env.PUBLIC_SERVER_URL) || `${req.protocol}://${req.get("host")}`;
    return successResponse(res, "MFS setting loaded", { setting: setting.toSafeJSON(), webhookBase: `${server}/api/mfs-deposit/webhook` });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const setting = await MfsSetting.current();
    const body = req.body || {};

    // খালি পাঠালে আগের Key টাই থাকে
    if (text(body.apiKey)) setting.apiKey = text(body.apiKey);
    // Key মুছে ফেলা — তখন বন্ধও হয়ে যায়
    if (body.clearKey === true) {
      setting.apiKey = "";
      setting.active = false;
    }
    if (typeof body.active === "boolean" && body.clearKey !== true) setting.active = body.active;
    if (body.apiUrl !== undefined) {
      const url = text(body.apiUrl) || MFS_DEFAULT_URL;
      // https ছাড়া চলবে না — শুধু লোকাল পরীক্ষার জন্য http://localhost
      if (!/^https:\/\/[^\s]+$/i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^\s]*$/i.test(url)) {
        return errorResponse(res, "API URL must start with https://", 400);
      }
      setting.apiUrl = url;
    }
    if (body.displayName) setting.displayName = langText(body.displayName);
    if (body.minAmount !== undefined) setting.minAmount = Math.max(1, num(body.minAmount));
    if (body.maxAmount !== undefined) setting.maxAmount = Math.max(0, num(body.maxAmount));
    if (body.quickAmounts !== undefined) setting.quickAmounts = amountsOf(body.quickAmounts);

    const methods = cleanMethods(body.methods);
    if (methods) setting.methods = methods;

    if (Array.isArray(body.bonuses)) {
      const bonuses = body.bonuses.map((item, index) => ({
        ...(isId(item?._id) ? { _id: item._id } : {}),
        title: langText(item?.title),
        bonusType: item?.bonusType === "percent" ? "percent" : "fixed",
        bonusValue: Math.max(0, num(item?.bonusValue)),
        turnoverMultiplier: Math.max(0, num(item?.turnoverMultiplier ?? 1)),
        bonusScope: item?.bonusScope === "first-deposit" ? "first-deposit" : "all-time",
        isActive: item?.isActive !== false,
        order: Math.max(0, num(item?.order ?? index)),
        eligibleProviders: cleanProviders(item?.eligibleProviders),
      }));
      for (const bonus of bonuses) {
        if (sumPercent(bonus.eligibleProviders) > 100) {
          return errorResponse(res, `Bonus "${bonus.title.en || bonus.title.bn}" eligible providers add up to more than 100%`, 400);
        }
      }
      setting.bonuses = bonuses;
    }

    if (setting.active && !setting.apiKey) return errorResponse(res, "Add the API key before turning it on", 400);

    await setting.save();
    return successResponse(res, "MFS setting saved", { setting: setting.toSafeJSON() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/upload-logo", protectAdmin, requireMother, requireWrite, upload.single("logo"), (req, res) => {
  if (!req.file) return errorResponse(res, "Choose an image", 400);
  return successResponse(res, "Logo uploaded", { logoUrl: `/uploads/${req.file.filename}` });
});

router.get("/deposits/admin", protectAdmin, requirePermission("mfs-deposit-history"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    const status = text(req.query.status).toUpperCase();
    if (status === "REVIEW") Object.assign(filter, { status: "PENDING", needsReview: true });
    else if (["PENDING", "PAID", "FAILED"].includes(status)) filter.status = status;
    const method = text(req.query.method).toLowerCase();
    if (MFS_METHODS.includes(method)) filter.method = method;

    const search = text(req.query.q).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (search) {
      filter.$or = [
        { userIdText: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
        { shortCode: { $regex: search, $options: "i" } },
        { transactionId: { $regex: search, $options: "i" } },
        { senderNumber: { $regex: search, $options: "i" } },
      ];
    }

    const [deposits, total, counts, review] = await Promise.all([
      MfsDeposit.find(filter).populate("user", "userId phone balance role").populate("reviewedBy", "email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      MfsDeposit.countDocuments(filter),
      MfsDeposit.aggregate([{ $group: { _id: "$status", n: { $sum: 1 }, amt: { $sum: "$amount" } } }]),
      MfsDeposit.countDocuments({ status: "PENDING", needsReview: true }),
    ]);

    const summary = { paidAmount: 0, pendingAmount: 0, failedAmount: 0, paidCount: 0, pendingCount: 0, failedCount: 0, reviewCount: review };
    counts.forEach((row) => {
      const key = { PAID: "paid", FAILED: "failed", PENDING: "pending" }[String(row._id || "").toUpperCase()];
      if (key) {
        summary[`${key}Amount`] = money(row.amt);
        summary[`${key}Count`] = row.n;
      }
    });

    return successResponse(res, "MFS deposits loaded", { deposits, summary, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * টাকা ঢোকানো — webhook আর admin এর নিশ্চিত, দুই জায়গা থেকেই।
 * `balanceAdded: false` শর্তে এক ধাপে দখল, তাই একই লেনদেনে দুবার টাকা যায় না
 * (webhook দুবার এলেও, বা webhook আর admin একসাথে হলেও)।
 */
const creditDeposit = async (filter, patch = {}, by = null) => {
  const deposit = await MfsDeposit.findOneAndUpdate(
    { ...filter, balanceAdded: false },
    { $set: { status: "PAID", needsReview: false, balanceAdded: true, paidAt: new Date(), ...patch } },
    { returnDocument: "after" },
  );
  if (!deposit) return null;

  const creditedAmount = money(deposit.calc?.creditedAmount);
  const bonus = money(deposit.calc?.bonusAmount);
  const credited = await creditUser(deposit.user, creditedAmount, { deposit: num(deposit.amount) });

  const commission = deposit.calc?.affiliateDepositCommission || {};
  const commissionAmount = money(commission.commissionAmount);
  if (commissionAmount > 0 && commission.affiliatorId) {
    await addCommission(commission.affiliatorId, "depositCommissionBalance", commissionAmount).catch(() => {});
  }

  const targetTurnover = money(deposit.calc?.targetTurnover);
  if (targetTurnover > 0) {
    await TurnOver.findOneAndUpdate(
      { user: deposit.user, sourceType: "mfs-deposit", sourceId: deposit._id },
      {
        user: deposit.user,
        sourceType: "mfs-deposit",
        sourceId: deposit._id,
        title: `Personal auto deposit ${deposit.amount}`,
        required: targetTurnover,
        creditedAmount,
        status: "running",
        eligibleProviders: deposit.selectedBonus?.eligibleProviders || [],
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  const methodName = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", upay: "Upay" }[deposit.method] || deposit.method;
  const methodBn = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", upay: "উপায়" }[deposit.method] || deposit.method;
  await writeLogs(
    deposit.user,
    credited?.balance,
    [
      {
        type: "deposit",
        amount: money(creditedAmount - bonus),
        refType: "MfsDeposit",
        refId: deposit._id,
        note: `Personal auto deposit ${methodName}`,
        noteBn: `পার্সোনাল অটো ডিপোজিট ${methodBn}`,
      },
      {
        type: "promotion",
        amount: bonus,
        refType: "MfsDeposit",
        refId: deposit._id,
        note: deposit.selectedBonus?.title?.en || "Personal auto deposit bonus",
        noteBn: deposit.selectedBonus?.title?.bn || "পার্সোনাল অটো ডিপোজিট বোনাস",
      },
    ],
    { by },
  );

  await onTemuTask(deposit.user, "deposit").catch((error) => console.error("TEMU deposit failed:", error.message));
  await onReferralDeposit({ userId: deposit.user, amount: num(deposit.amount), requestId: deposit._id }).catch((error) =>
    console.error("Referral deposit rebate failed:", error.message),
  );
  return deposit;
};

/**
 * MFSWallet এর webhook — `/webhook/success|pending|reject/:key`।
 * payload: `status`, `transaction_id`, `short_code`, `amount`, `method`,
 * `sender_number` / `message` / `reason`, `user_identyfy_address`, `checkout_items`।
 */
const WEBHOOK_STATUS = { success: "COMPLETED", pending: "PENDING", reject: "FAILED" };

router.post("/webhook/:kind/:key", async (req, res) => {
  try {
    const expected = WEBHOOK_STATUS[req.params.kind];
    if (!expected) return errorResponse(res, "Unknown webhook", 404);

    const b = req.body || {};
    const shortCode = text(b.short_code);
    const invoice = text(b.checkout_items?.invoice);
    if (!shortCode && !invoice) return errorResponse(res, "short_code is required", 400);

    const existing = await MfsDeposit.findOne(shortCode ? { shortCode } : { invoiceNumber: invoice }).select("+callbackKey");
    if (!existing || !sameKey(existing.callbackKey, req.params.key)) return errorResponse(res, "Unknown payment", 404);

    const status = text(b.status).toUpperCase() || expected;
    if (status !== expected) return errorResponse(res, "Status does not match this webhook", 400);

    // অঙ্ক আর মাধ্যম আমাদের রেকর্ডের সাথে মিলতেই হবে (সফলে অঙ্ক বাধ্যতামূলক)
    const amount = money(num(b.amount));
    if (expected === "COMPLETED" && !(amount > 0)) return errorResponse(res, "amount is required", 400);
    if (amount > 0 && amount !== money(existing.amount)) return errorResponse(res, "Amount mismatch", 400);
    const method = text(b.method).toLowerCase();
    if (method && method !== existing.method) return errorResponse(res, "Method mismatch", 400);

    const transactionId = text(b.transaction_id).slice(0, 120);
    const info = {
      transactionId: /^(PENDING_VERIFICATION|INVALID)$/i.test(transactionId) ? "" : transactionId,
      senderNumber: text(b.sender_number).slice(0, 40),
      gatewayMessage: text(b.reason || b.message).slice(0, 300),
    };
    const set = (patch) => Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== ""));

    if (expected === "FAILED") {
      await MfsDeposit.updateOne({ _id: existing._id, status: "PENDING", balanceAdded: false }, { $set: { status: "FAILED", needsReview: false, ...set(info) } });
      return successResponse(res, "Marked failed");
    }
    if (expected === "PENDING") {
      // গেটওয়ে নিজে মেলাতে পারেনি — admin যাচাই করে নিশ্চিত বা বাতিল করবেন
      await MfsDeposit.updateOne({ _id: existing._id, status: "PENDING", balanceAdded: false }, { $set: { needsReview: true, ...set(info) } });
      return successResponse(res, "Pending recorded");
    }

    const deposit = await creditDeposit({ _id: existing._id }, set(info));
    return successResponse(res, deposit ? "Deposit credited" : "Already handled");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** admin হাতে নিশ্চিত — গেটওয়ের পেন্ডিং বা আটকে থাকা লেনদেন */
router.post("/deposits/:id/confirm", protectAdmin, requireWrite, requirePermission("mfs-deposit-history"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const deposit = await MfsDeposit.findById(req.params.id);
    if (!deposit) return errorResponse(res, "Deposit not found", 404);
    if (deposit.status !== "PENDING") return errorResponse(res, "Only a pending deposit can be confirmed", 400);
    const patch = { reviewedBy: req.admin._id, reviewNote: text(req.body?.note).slice(0, 300) };
    const trx = text(req.body?.transactionId).slice(0, 120);
    if (trx) patch.transactionId = trx;
    const credited = await creditDeposit({ _id: deposit._id, status: "PENDING" }, patch, req.admin._id);
    if (!credited) return errorResponse(res, "Already handled", 400);
    return successResponse(res, "Deposit confirmed and credited");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/deposits/:id/reject", protectAdmin, requireWrite, requirePermission("mfs-deposit-history"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const deposit = await MfsDeposit.findOneAndUpdate(
      { _id: req.params.id, status: "PENDING", balanceAdded: false },
      { $set: { status: "FAILED", needsReview: false, reviewedBy: req.admin._id, reviewNote: text(req.body?.note).slice(0, 300) } },
      { returnDocument: "after" },
    );
    if (!deposit) return errorResponse(res, "Only a pending deposit can be rejected", 400);
    return successResponse(res, "Deposit rejected");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
