import express from "express";
import mongoose from "mongoose";

import DepositRequest from "../models/DepositRequest.js";
import DepositMethod from "../models/DepositMethod.js";
import DepositFieldConfig from "../models/DepositFieldConfig.js";
import DepositBonusTurnover from "../models/DepositBonusTurnover.js";
import TurnOver from "../models/TurnOver.js";
import User from "../models/User.js";
import DepositSetting from "../models/DepositSetting.js";

import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { verificationGate } from "../utils/verificationGate.js";
import { buildDepositCalc, normalizePromoScope, num, money } from "../utils/depositCalc.js";
import { addCommission, creditUser, debitUser, writeLogs } from "../utils/wallet.js";
import { onReferralDeposit } from "../utils/referral.js";
import { onTemuTask } from "../utils/reward.js";

const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));

/* =========================
   ক্লায়েন্ট
   ========================= */

/** ডিপোজিট রিকোয়েস্ট জমা */
router.post("/", protectUser, async (req, res) => {
  try {
    if ((await DepositSetting.current()).manualEnabled === false) {
      return errorResponse(res, "Manual deposit is off right now", 400, "manualOff");
    }
    const methodId = text(req.body?.methodId).toLowerCase();
    const channelId = text(req.body?.channelId);
    const promoId = text(req.body?.promoId) || "none";
    const amount = money(num(req.body?.amount));

    if (!methodId || !channelId) {
      return errorResponse(res, "Please choose a method and a channel", 400);
    }

    if (amount <= 0) return errorResponse(res, "Enter a valid amount", 400);

    const user = await User.findById(req.user._id);

    if (!user) return errorResponse(res, "User not found", 404);
    if (!user.isActive) return errorResponse(res, "This account is disabled", 403);

    // অ্যাডমিন চাইলে ডিপোজিটও পরিচয় যাচাইয়ের পেছনে রাখতে পারেন
    const gate = await verificationGate(user._id, "deposit");

    if (!gate.ok) {
      return errorResponse(res, gate.message, 400, "needVerification");
    }

    const method = await DepositMethod.findOne({ methodId, isActive: true });

    if (!method) return errorResponse(res, "This method is not available", 404);

    const min = num(method.minDepositAmount);
    const max = num(method.maxDepositAmount);

    if (min > 0 && amount < min) {
      return errorResponse(res, `Minimum deposit amount is ${min}`, 400, "belowMin");
    }

    if (max > 0 && amount > max) {
      return errorResponse(res, `Maximum deposit amount is ${max}`, 400, "aboveMax");
    }

    // মেথডের ফর্মে যে ঘরগুলো আবশ্যক বলা আছে, সেগুলো থাকতে হবে
    const fieldConfig = await DepositFieldConfig.findOne({
      depositMethod: method._id,
    }).lean();

    const fields = req.body?.fields || {};

    const missing = (fieldConfig?.inputs || [])
      .filter((input) => input.required && !text(fields[input.key]))
      .map((input) => input.label?.en || input.key);

    if (missing.length) {
      return errorResponse(res, `Please fill: ${missing.join(", ")}`, 400, "missingFields");
    }

    // শুধু admin এর ফর্মের ঘরগুলো রাখা — বাইরের কিছু রেকর্ডে ঢুকতে পারে না
    const cleanFields = {};
    (fieldConfig?.inputs || []).forEach((input) => {
      const value = text(fields[input.key]).slice(0, 200);
      if (value) cleanFields[input.key] = value;
    });

    // "একবারই চলবে" ঘর (যেমন TrxID) — আগের কোনো রিকোয়েস্টে থাকলে নয়
    for (const input of fieldConfig?.inputs || []) {
      if (!input.uniqueValue || !cleanFields[input.key]) continue;
      const used = await DepositRequest.exists({
        methodId: method.methodId,
        status: { $in: ["pending", "approved"] },
        [`fields.${input.key}`]: cleanFields[input.key],
      });
      if (used) {
        return errorResponse(
          res,
          `This ${input.label?.en || input.key} was already used`,
          409,
          "duplicateField",
        );
      }
    }

    // একই ব্যবহারকারীর একটাই অপেক্ষমাণ রিকোয়েস্ট — নইলে একই টাকা
    // একাধিকবার জমা দেওয়ার সুযোগ থাকে
    if (await DepositRequest.exists({ user: user._id, status: "pending" })) {
      return errorResponse(
        res,
        "You already have a deposit waiting for review",
        409,
        "pendingDeposit",
      );
    }

    const built = await buildDepositCalc({
      user,
      method,
      channelId,
      promoId,
      amount,
    });

    if (built.error) return errorResponse(res, built.error, 400);

    let request;
    try {
      request = await DepositRequest.create({
        user: user._id,
        methodId: method.methodId,
        channelId,
        promoId,
        amount,
        fields: cleanFields,
        calc: built.calc,
        status: "pending",
        display: {
          ...built.display,
          userId: user.userId,
          source: "User Deposit",
        },
      });
    } catch (error) {
      // একই মুহূর্তে দুটো জমা — ডেটাবেসের unique সূচক দ্বিতীয়টা আটকায়
      if (error?.code === 11000) {
        return errorResponse(res, "You already have a deposit waiting for review", 409, "pendingDeposit");
      }
      throw error;
    }

    // খেলোয়াড়কে অ্যাফিলিয়েটের কমিশন দেখানো হয় না
    const safe = request.toObject();
    if (safe.calc) delete safe.calc.affiliateDepositCommission;

    return successResponse(res, "Deposit request submitted", { request: safe }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** নিজের ডিপোজিটের ইতিহাস */
router.get("/my", protectUser, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));

    const filter = { user: req.user._id };
    const status = text(req.query.status);

    if (["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      DepositRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        // অ্যাফিলিয়েটের কমিশন ব্যবহারকারীর দেখার কথা নয়
        .select("-calc.affiliateDepositCommission")
        .lean(),
      DepositRequest.countDocuments(filter),
    ]);

    return successResponse(res, "Deposits loaded", {
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

router.get("/admin", protectAdmin, requirePermission("deposit-requests"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));

    const filter = {};
    const status = text(req.query.status);

    if (["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const search = text(req.query.q);

    if (search) {
      const users = await User.find({
        $or: [
          { userId: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      // কেউ না মিললে খালি তালিকা — ফিল্টার ছাড়া সব দেখানো নয়
      filter.user = {
        $in: users.length ? users.map((u) => u._id) : [new mongoose.Types.ObjectId()],
      };
    }

    const [requests, total, counts] = await Promise.all([
      DepositRequest.find(filter)
        .populate("user", "userId phone balance isActive role")
        .populate("approvedBy", "email role")
        .populate("rejectedBy", "email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DepositRequest.countDocuments(filter),
      DepositRequest.aggregate([
        {
          $group: {
            _id: "$status",
            n: { $sum: 1 },
            amt: { $sum: "$amount" },
            credited: { $sum: "$calc.creditedAmount" },
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
      approvedCredited: 0,
    };

    counts.forEach((row) => {
      const st = String(row._id || "").toLowerCase();
      summary[st] = row.n;

      if (st === "pending") summary.pendingAmount = row.amt || 0;
      else if (st === "approved") {
        summary.approvedAmount = row.amt || 0;
        summary.approvedCredited = row.credited || 0;
      } else if (st === "rejected") summary.rejectedAmount = row.amt || 0;
    });

    return successResponse(res, "Requests loaded", {
      requests,
      summary,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/admin/:id", protectAdmin, requirePermission("deposit-requests"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

    const request = await DepositRequest.findById(req.params.id)
      .populate("user", "userId phone balance isActive role")
      .populate("approvedBy", "email role")
      .populate("rejectedBy", "email role")
      .lean();

    if (!request) return errorResponse(res, "Request not found", 404);

    return successResponse(res, "Request loaded", { request });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * অনুমোদন।
 *
 * এই Mongo standalone, তাই একাধিক ডকুমেন্টের transaction নেই। বদলে
 * রিকোয়েস্টটা প্রথমেই একটামাত্র atomic লেখায় pending → approved করে
 * "দখল" করা হয় — দুটো ট্যাব বা দুবার ক্লিকে দুবার টাকা যেতে পারে না।
 * এরপরের ধাপে কিছু ভাঙলে catch এ হাতে হাতে সব ফিরিয়ে দেওয়া হয়।
 */
router.patch("/admin/:id/approve", protectAdmin, requireWrite, requirePermission("deposit-requests"), async (req, res) => {
  let claimed = null;
  let creditedUserId = null;
  let creditedAmount = 0;
  let affiliateId = null;
  let affiliateAmount = 0;
  let turnoverCreated = false;

  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

    claimed = await DepositRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      {
        $set: {
          status: "approved",
          adminNote: text(req.body?.adminNote),
          approvedBy: req.admin._id,
          approvedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!claimed) {
      const exists = await DepositRequest.exists({ _id: req.params.id });

      return errorResponse(
        res,
        exists ? "Only a pending request can be approved" : "Request not found",
        exists ? 400 : 404,
      );
    }

    const user = await User.findById(claimed.user).select("isActive").lean();

    if (!user) throw new Error("User not found");
    if (!user.isActive) throw new Error("This account is disabled");

    /*
     * "প্রথম ডিপোজিট" প্রোমো জমার সময় যাচাই হয়েছিল, কিন্তু মাঝে অন্য
     * একটা অনুমোদিত হয়ে গিয়ে থাকলে দুটোই বোনাস পেত — তাই আবার দেখা।
     */
    if (claimed.promoId && claimed.promoId !== "none" && claimed.calc?.promoBonus > 0) {
      const method = await DepositMethod.findOne({ methodId: claimed.methodId }).select("_id").lean();
      const config = method ? await DepositBonusTurnover.findOne({ depositMethod: method._id }).lean() : null;
      const promo = (config?.promotions || []).find((item) => String(item.id) === String(claimed.promoId));
      if (promo && normalizePromoScope(promo.bonusScope) === "first-deposit") {
        const earlier = await DepositRequest.exists({ user: claimed.user, status: "approved", _id: { $ne: claimed._id } });
        if (earlier) throw new Error("First deposit promotion was already used by an earlier deposit — reject this one and ask the player to deposit again without the promotion");
      }
    }

    creditedAmount = money(claimed.calc?.creditedAmount);
    const targetTurnover = money(claimed.calc?.targetTurnover);

    // এক ধাপে জমা — খেলার callback একই সময়ে এলেও কোনোটা হারায় না।
    // মোট জমায় বোনাস বাদে আসল টাকাটুকু (রেফারেলের ধাপ এটা দেখে)
    const credited = await creditUser(claimed.user, creditedAmount, { deposit: num(claimed.amount) });
    creditedUserId = claimed.user;
    user.balance = credited?.balance;

    // রেফারকারী অ্যাফিলিয়েটের কমিশন — জমার সময়েই হিসাব হয়ে ছিল
    const commission = claimed.calc?.affiliateDepositCommission || {};
    const commissionAmount = money(commission.commissionAmount);

    if (commissionAmount > 0 && commission.affiliatorId) {
      const done = await addCommission(commission.affiliatorId, "depositCommissionBalance", commissionAmount);
      if (done.modifiedCount) {
        affiliateId = commission.affiliatorId;
        affiliateAmount = commissionAmount;
      }
    }

    if (targetTurnover > 0) {
      const existing = await TurnOver.exists({
        user: claimed.user,
        sourceType: "deposit",
        sourceId: claimed._id,
      });

      // upsert, তাই অনুমোদন কোনোভাবে দুবার চললেও শর্ত একটাই থাকে
      await TurnOver.findOneAndUpdate(
        { user: claimed.user, sourceType: "deposit", sourceId: claimed._id },
        {
          user: claimed.user,
          sourceType: "deposit",
          sourceId: claimed._id,
          title: `Deposit ${claimed.amount}`,
          required: targetTurnover,
          creditedAmount,
          status: "running",
          eligibleProviders: claimed.calc?.eligibleProviders || [],
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );

      turnoverCreated = !existing;
    }

    // খাতায় — আসল জমা আর বোনাস আলাদা সারিতে (মূল সাইটের জমা/প্রমোশন ট্যাব)
    const bonus = money(claimed.calc?.totalBonus);
    await writeLogs(
      claimed.user,
      credited?.balance,
      [
        { type: "deposit", amount: money(creditedAmount - bonus), refType: "DepositRequest", refId: claimed._id, note: claimed.display?.methodName?.en || claimed.methodId },
        { type: "promotion", amount: bonus, refType: "DepositRequest", refId: claimed._id, note: claimed.display?.promoName?.en || "Deposit bonus" },
      ],
      { by: req.admin._id },
    );

    // বন্ধুদের আমন্ত্রণ — উপরের রেফারকারীদের জমার রিবেট আর "যোগ্য বন্ধু" যাচাই
    // (শুধু আসল জমা, বোনাস নয়); ব্যর্থ হলেও জমার অনুমোদন টিকে থাকে
    await onTemuTask(claimed.user, "deposit").catch((error) => console.error("TEMU deposit failed:", error.message));
    await onReferralDeposit({ userId: claimed.user, amount: num(claimed.amount), requestId: claimed._id }).catch((error) =>
      console.error("Referral deposit rebate failed:", error.message),
    );

    const request = await DepositRequest.findById(claimed._id)
      .populate("user", "userId phone balance isActive role")
      .lean();

    return successResponse(res, "Deposit approved", {
      request,
      balance: user.balance,
    });
  } catch (error) {
    // দখলের পর যা যা হয়েছিল, উল্টো ক্রমে ফিরিয়ে দেওয়া
    if (affiliateId && affiliateAmount > 0) {
      await addCommission(affiliateId, "depositCommissionBalance", -affiliateAmount).catch(() => {});
    }

    if (creditedUserId && creditedAmount > 0) {
      await debitUser(creditedUserId, creditedAmount, { deposit: num(claimed?.amount) }).catch(() => {});
    }

    if (turnoverCreated && claimed) {
      await TurnOver.deleteOne({
        user: creditedUserId,
        sourceType: "deposit",
        sourceId: claimed._id,
      }).catch(() => {});
    }

    if (claimed) {
      await DepositRequest.updateOne(
        { _id: claimed._id, status: "approved" },
        {
          $set: {
            status: "pending",
            adminNote: "",
            approvedBy: null,
            approvedAt: null,
          },
        },
      ).catch(() => {});
    }

    return errorResponse(res, error.message || "Approve failed", 400);
  }
});

router.patch("/admin/:id/reject", protectAdmin, requireWrite, requirePermission("deposit-requests"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

    const request = await DepositRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      {
        $set: {
          status: "rejected",
          adminNote: text(req.body?.adminNote),
          rejectedBy: req.admin._id,
          rejectedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!request) {
      const exists = await DepositRequest.exists({ _id: req.params.id });

      return errorResponse(
        res,
        exists ? "Only a pending request can be rejected" : "Request not found",
        exists ? 400 : 404,
      );
    }

    return successResponse(res, "Deposit rejected", { request });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
