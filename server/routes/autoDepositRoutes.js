import crypto from "node:crypto";
import express from "express";
import mongoose from "mongoose";

import upload from "../config/multer.js";
import AutoDepositToken from "../models/AutoDepositToken.js";
import AutoDeposit from "../models/AutoDeposit.js";
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
import { gatewayPost } from "../utils/oraclePay.js";

/**
 * অটো ডিপোজিট (OraclePay) — `/api/auto-deposit`।
 *
 * BetChokkor এর মতোই: খেলোয়াড় পরিমাণ (আর চাইলে একটা বোনাস) বেছে নেন,
 * আমরা PENDING লেনদেন বসিয়ে গেটওয়ে থেকে পেমেন্ট পাতার ঠিকানা আনি, গেটওয়ে
 * টাকা পেলে webhook এ COMPLETED পাঠায় আর তখন টাকা ঢোকে।
 *
 * BetChokkor থেকে যা আলাদা:
 *   - webhook এর ঠিকানায় প্রতিটা লেনদেনের নিজের গোপন চাবি — নকল webhook
 *     দিয়ে টাকা ঢোকানো যায় না (গেটওয়ে কোনো সই পাঠায় না)
 *   - টাকা এক ধাপে (`creditUser`), মোট জমাও বাড়ে, খাতায় সারি পড়ে
 *   - ম্যানুয়ালের মতো রেফারেল রিবেট আর টেমু টাস্ক
 *   - ইতিহাস ও নিশ্চিত/বাতিল admin এর পারমিশন দেখে
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

const cleanProviders = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({
      providerCode: text(item?.providerCode).toUpperCase(),
      percent: Math.min(100, Math.max(0, num(item?.percent ?? 100))),
    }))
    .filter((item) => item.providerCode);

/** অ্যাডমিন থেকে পাঠানো পেমেন্ট মাধ্যমের তালিকা পরিষ্কার করা */
const cleanMethods = (list) => {
  if (!Array.isArray(list)) return null;
  return list
    .map((item, index) => ({
      ...(isId(item?._id) ? { _id: item._id } : {}),
      code: text(item?.code).toLowerCase().replace(/[^a-z0-9_]/g, ""),
      name: langText(item?.name),
      logoUrl: text(item?.logoUrl),
      active: item?.active !== false,
      manual: Boolean(item?.manual),
      order: Math.max(0, num(item?.order ?? index)),
      minAmount: Math.max(0, num(item?.minAmount)),
      maxAmount: Math.max(0, num(item?.maxAmount)),
    }))
    .filter((item) => item.code);
};

/** বেছে নেওয়া বোনাস থেকে টাকার হিসাব */
const computeBonus = ({ amount, bonus }) => {
  if (!bonus) {
    return {
      selectedBonus: {},
      calc: { depositAmount: amount, bonusAmount: 0, creditedAmount: amount, turnoverMultiplier: 0, targetTurnover: 0 },
    };
  }

  const bonusAmount = bonus.bonusType === "percent" ? money((amount * num(bonus.bonusValue)) / 100) : money(bonus.bonusValue);
  const creditedAmount = money(amount + bonusAmount);
  const multiplier = num(bonus.turnoverMultiplier ?? 1);

  return {
    selectedBonus: {
      bonusId: String(bonus._id),
      title: bonus.title,
      bonusType: bonus.bonusType,
      bonusScope: bonus.bonusScope,
      bonusValue: bonus.bonusValue,
      bonusAmount,
      turnoverMultiplier: multiplier,
      eligibleProviders: bonus.eligibleProviders || [],
    },
    calc: {
      depositAmount: amount,
      bonusAmount,
      creditedAmount,
      turnoverMultiplier: multiplier,
      targetTurnover: money(creditedAmount * multiplier),
    },
  };
};

/** খেলোয়াড়কে যা দেখানো যায় — চালু থাকলে মাধ্যম আর বোনাস */
export const autoDepositStatus = async () => {
  const setting = await AutoDepositToken.current();
  const ready = setting.active && Boolean(setting.businessToken);
  return {
    active: ready,
    minAmount: setting.minAmount,
    maxAmount: setting.maxAmount,
    methods: ready
      ? (setting.methods || [])
          .filter((m) => m.active !== false)
          .sort((a, b) => num(a.order) - num(b.order))
          .map((m) => ({ code: m.code, name: m.name, logoUrl: m.logoUrl, manual: m.manual, minAmount: m.minAmount, maxAmount: m.maxAmount }))
      : [],
    bonuses: ready ? (setting.bonuses || []).filter((b) => b.isActive !== false).sort((a, b) => num(a.order) - num(b.order)) : [],
  };
};

/* =========================
   ক্লায়েন্ট
   ========================= */

router.get("/status", async (req, res) => {
  try {
    return successResponse(res, "Auto deposit status", await autoDepositStatus());
  } catch {
    // জানা না গেলে অটো বন্ধ ধরে নেওয়া হয় — ম্যানুয়াল দিয়ে কাজ চলে
    return successResponse(res, "Auto deposit unavailable", { active: false, methods: [], bonuses: [] });
  }
});

/** পেমেন্ট শুরু — লেনদেনটা PENDING হয়ে বসে থাকে */
router.post("/create", protectUser, async (req, res) => {
  try {
    const setting = await AutoDepositToken.current();
    if (!setting.active || !setting.businessToken) {
      return errorResponse(res, "Auto deposit is off right now", 400, "autoOff");
    }

    const amount = money(num(req.body?.amount));
    if (!(amount > 0)) return errorResponse(res, "Enter a valid amount", 400, "missingFields");
    if (amount < num(setting.minAmount)) return errorResponse(res, `Minimum deposit amount is ${setting.minAmount}`, 400, "belowMin");
    if (setting.maxAmount > 0 && amount > num(setting.maxAmount)) {
      return errorResponse(res, `Maximum deposit amount is ${setting.maxAmount}`, 400, "aboveMax");
    }

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
        const paid = await AutoDeposit.exists({ user: user._id, status: "PAID", balanceAdded: true });
        if (paid) return errorResponse(res, "This bonus is only for the first auto deposit", 400, "firstOnly");
      }
    }

    const { selectedBonus, calc } = computeBonus({ amount, bonus });
    const commission = await getAffiliateDepositCommission({ user, amount });

    const invoiceNumber = `TB${Date.now()}${crypto.randomInt(100, 1000)}`;
    const callbackKey = crypto.randomBytes(24).toString("hex");

    await AutoDeposit.create({
      user: user._id,
      userIdText: user.userId,
      amount,
      invoiceNumber,
      callbackKey,
      status: "PENDING",
      selectedBonus,
      calc: { ...calc, affiliateDepositCommission: commission },
    });

    const server = text(process.env.PUBLIC_SERVER_URL).replace(/\/+$/, "");
    const client = text(process.env.PUBLIC_CLIENT_URL).replace(/\/+$/, "");
    const fail = async (message) => {
      await AutoDeposit.updateOne({ invoiceNumber }, { $set: { status: "FAILED" } });
      setting.lastError = String(message || "").slice(0, 300);
      await setting.save();
    };

    try {
      const data = await gatewayPost(
        process.env.OPAY_URL,
        setting.businessToken,
        {
          payment_amount: amount,
          user_identity_address: String(user._id),
          callback_url: `${server}/api/auto-deposit/webhook/${callbackKey}`,
          success_redirect_url: `${client}/?deposit=${invoiceNumber}`,
          invoice_number: invoiceNumber,
          checkout_items: {
            userId: user.userId,
            selectedBonusId: selectedBonus.bonusId || "",
            selectedBonusTitleBn: selectedBonus.title?.bn || "",
            selectedBonusTitleEn: selectedBonus.title?.en || "",
          },
        },
      );

      if (!data?.success || !data?.payment_page_url) {
        await fail(data?.message || "Gateway did not return a page");
        return errorResponse(res, "Could not start the payment", 400, "gateway");
      }

      if (setting.lastError) {
        setting.lastError = "";
        await setting.save();
      }

      return successResponse(res, "Auto deposit started", { invoiceNumber, amount, paymentUrl: data.payment_page_url });
    } catch (gatewayError) {
      await fail(gatewayError.message);
      return errorResponse(res, "Could not reach the payment gateway", 502, "gateway");
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** নিজের অটো ডিপোজিটের ইতিহাস */
router.get("/history/my", protectUser, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 10));
    const filter = { user: req.user._id };
    const status = text(req.query.status).toUpperCase();
    if (["PENDING", "PAID", "FAILED"].includes(status)) filter.status = status;

    const [deposits, total] = await Promise.all([
      AutoDeposit.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-calc.affiliateDepositCommission")
        .lean(),
      AutoDeposit.countDocuments(filter),
    ]);

    return successResponse(res, "Auto deposits loaded", {
      deposits,
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
    const setting = await AutoDepositToken.current();
    return successResponse(res, "Auto deposit setting loaded", { setting: setting.toSafeJSON() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const setting = await AutoDepositToken.current();
    const body = req.body || {};

    // খালি পাঠালে আগের টোকেনটাই থাকে — নইলে ভুল করে মুছে যেত
    if (text(body.businessToken)) setting.businessToken = text(body.businessToken);
    if (typeof body.active === "boolean") setting.active = body.active;
    if (body.minAmount !== undefined) setting.minAmount = Math.max(1, num(body.minAmount));
    if (body.maxAmount !== undefined) setting.maxAmount = Math.max(0, num(body.maxAmount));

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

    await setting.save();
    return successResponse(res, "Auto deposit setting saved", { setting: setting.toSafeJSON() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** মাধ্যমের লোগো আপলোড — ফেরত আসা `/uploads/...` পথ মাধ্যমের logoUrl এ বসে */
router.post("/upload-logo", protectAdmin, requireMother, requireWrite, upload.single("logo"), (req, res) => {
  if (!req.file) return errorResponse(res, "Choose an image", 400);
  return successResponse(res, "Logo uploaded", { logoUrl: `/uploads/${req.file.filename}` });
});

router.get("/deposits/admin", protectAdmin, requirePermission("auto-deposit-history"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    const status = text(req.query.status).toUpperCase();
    if (["PENDING", "PAID", "FAILED"].includes(status)) filter.status = status;

    const search = text(req.query.q).slice(0, 60);
    if (search) filter.userIdText = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const [deposits, total, counts] = await Promise.all([
      AutoDeposit.find(filter)
        .populate("user", "userId phone balance role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AutoDeposit.countDocuments(filter),
      AutoDeposit.aggregate([{ $group: { _id: "$status", n: { $sum: 1 }, amt: { $sum: "$amount" } } }]),
    ]);

    const summary = { PENDING: 0, PAID: 0, FAILED: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0, paidCount: 0, pendingCount: 0, failedCount: 0 };
    counts.forEach((row) => {
      const st = String(row._id || "").toUpperCase();
      summary[st] = row.n;
      const key = { PAID: "paid", FAILED: "failed", PENDING: "pending" }[st];
      if (key) {
        summary[`${key}Amount`] = money(row.amt);
        summary[`${key}Count`] = row.n;
      }
    });

    return successResponse(res, "Auto deposits loaded", {
      deposits,
      summary,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * একটা ডিপোজিটের টাকা ঢোকানো — webhook আর admin এর নিশ্চিত, দুই জায়গা থেকেই।
 *
 * `balanceAdded: false` শর্তে এক ধাপে দখল, তাই webhook দুবার এলেও বা
 * webhook + admin একসাথে হলেও টাকা একবারই যায়। PENDING/FAILED দুটোই দখল
 * করা যায় — গেটওয়ে দেরিতে COMPLETED পাঠালে টাকা আটকে থাকে না।
 */
const creditDeposit = async (invoiceNumber, patch = {}, by = null) => {
  const deposit = await AutoDeposit.findOneAndUpdate(
    { invoiceNumber, balanceAdded: false },
    { $set: { status: "PAID", balanceAdded: true, paidAt: new Date(), ...patch } },
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
      { user: deposit.user, sourceType: "auto-deposit", sourceId: deposit._id },
      {
        user: deposit.user,
        sourceType: "auto-deposit",
        sourceId: deposit._id,
        title: `Auto deposit ${deposit.amount}`,
        required: targetTurnover,
        creditedAmount,
        status: "running",
        eligibleProviders: deposit.selectedBonus?.eligibleProviders || [],
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  await writeLogs(
    deposit.user,
    credited?.balance,
    [
      { type: "deposit", amount: money(creditedAmount - bonus), refType: "AutoDeposit", refId: deposit._id, note: `Auto deposit ${deposit.bank || ""}`.trim() },
      { type: "promotion", amount: bonus, refType: "AutoDeposit", refId: deposit._id, note: deposit.selectedBonus?.title?.en || "Auto deposit bonus" },
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
 * গেটওয়ের নিশ্চিতকরণ — `callback_url` এ বসানো চাবি সহ।
 *
 * payload: `status` (COMPLETED / PENDING / REJECTED), `invoice_number`,
 * `transaction_id`, `session_code`, `bank`, `footprint`, `amount`।
 * চাবি না মিললে বা অঙ্ক না মিললে বাতিল।
 */
router.post("/webhook/:key", async (req, res) => {
  try {
    const invoiceNumber = text(req.body?.invoice_number);
    const status = text(req.body?.status).toUpperCase();
    if (!invoiceNumber) return errorResponse(res, "invoice_number is required", 400);

    const existing = await AutoDeposit.findOne({ invoiceNumber }).select("+callbackKey");
    if (!existing || !sameKey(existing.callbackKey, req.params.key)) return errorResponse(res, "Unknown invoice", 404);

    const webhookAmount = money(num(req.body?.amount));
    if (webhookAmount > 0 && webhookAmount !== money(existing.amount)) return errorResponse(res, "Amount mismatch", 400);

    const info = {
      transactionId: text(req.body?.transaction_id).slice(0, 120),
      bank: text(req.body?.bank).slice(0, 40),
      sessionCode: text(req.body?.session_code).slice(0, 120),
      footprint: text(req.body?.footprint).slice(0, 500),
    };

    if (status === "REJECTED") {
      await AutoDeposit.updateOne({ invoiceNumber, status: "PENDING" }, { $set: { status: "FAILED", ...info } });
      return successResponse(res, "Marked failed");
    }
    if (status === "PENDING") {
      // Bank/Crypto — টাকা এখনো ঢুকবে না, admin যাচাই করে নিশ্চিত করবেন
      await AutoDeposit.updateOne({ invoiceNumber, status: "PENDING" }, { $set: info });
      return successResponse(res, "Pending recorded");
    }
    if (status !== "COMPLETED") return errorResponse(res, "Unknown status", 400);

    const deposit = await creditDeposit(invoiceNumber, info);
    return successResponse(res, deposit ? "Deposit credited" : "Already handled");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** Bank/Crypto — admin প্রমাণ দেখে নিশ্চিত বা বাতিল করেন */
router.post("/deposits/:id/confirm", protectAdmin, requireWrite, requirePermission("auto-deposit-history"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const deposit = await AutoDeposit.findById(req.params.id);
    if (!deposit) return errorResponse(res, "Deposit not found", 404);
    if (deposit.status !== "PENDING") return errorResponse(res, "Only a pending deposit can be confirmed", 400);

    const credited = await creditDeposit(
      deposit.invoiceNumber,
      { reviewedBy: req.admin._id, reviewNote: text(req.body?.note).slice(0, 300) },
      req.admin._id,
    );
    if (!credited) return errorResponse(res, "Already handled", 400);
    return successResponse(res, "Deposit confirmed and credited");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/deposits/:id/reject", protectAdmin, requireWrite, requirePermission("auto-deposit-history"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const deposit = await AutoDeposit.findOneAndUpdate(
      { _id: req.params.id, status: "PENDING", balanceAdded: false },
      { $set: { status: "FAILED", reviewedBy: req.admin._id, reviewNote: text(req.body?.note).slice(0, 300) } },
      { returnDocument: "after" },
    );
    if (!deposit) return errorResponse(res, "Only a pending deposit can be rejected", 400);
    return successResponse(res, "Deposit rejected");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
