import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import DepositRequest from "../models/DepositRequest.js";
import AutoDeposit from "../models/AutoDeposit.js";
import GameHistory from "../models/GameHistory.js";
import TurnOver from "../models/TurnOver.js";
import WithdrawRequest from "../models/WithdrawRequest.js";
import AutoWithdraw from "../models/AutoWithdraw.js";
import VipTransaction from "../models/VipTransaction.js";

import {
  protectAdmin,
  requireMother,
  requirePermission,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num, money } from "../utils/money.js";
import { normalizeCountryCode, normalizePhone } from "../utils/phone.js";
import { creditUser, writeLogs } from "../utils/wallet.js";

/**
 * admin এর Users / Affiliates পেজ — তালিকা, বিস্তারিত, ইতিহাস, বদলানো।
 *
 * BetChokkor থেকে নেওয়া, তবে সেখানকার কয়েকটা ফাঁক এখানে বন্ধ:
 *   - sub admin এর পারমিশন (`users` / `affiliates`) server এ যাচাই হয় —
 *     BetChokkor এ শুধু সাইডবারে লুকানো থাকত, রুট সবার জন্য খোলা ছিল
 *   - খেলোয়াড়কে অ্যাফিলিয়েট বানালে "অপেক্ষায়" থাকে, হার বসিয়ে অনুমোদন
 *     দিতে হয় (আগে শূন্য হার নিয়েই সরাসরি অনুমোদিত হয়ে যেত)
 *   - ফোন নম্বর যাচাই হয়, আর ০ সহ লিখেও খোঁজা যায়
 */
const router = express.Router();

/** যে ধরনের অ্যাকাউন্ট, তার পারমিশন — খেলোয়াড় `users`, অ্যাফিলিয়েট `affiliates` */
const PERM_OF_ROLE = { user: "users", "aff-user": "affiliates" };

/**
 * `/:id/...` রুটে আগে দেখা হয় অ্যাকাউন্টটা কোন ধরনের, তারপর সেই পেজের
 * পারমিশন। নইলে শুধু "Users" পারমিশনের sub admin অ্যাফিলিয়েটের
 * ইতিহাস বা তথ্যও বদলাতে পারতেন।
 */
const requireAccountPermission = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) {
    return errorResponse(res, "Invalid id", 400);
  }
  const found = await User.findById(req.params.id).select("role").lean();
  if (!found) return errorResponse(res, "User not found", 404);
  return requirePermission(PERM_OF_ROLE[found.role] || "users")(req, res, next);
};

/** বাংলাদেশের মোবাইল নম্বর — নিবন্ধনের একই নিয়ম */
const isValidPhone = (countryCode, phone) =>
  countryCode === "+880" ? /^1[3-9]\d{8}$/.test(phone) : /^\d{6,14}$/.test(phone);

const BCRYPT_ROUNDS = 12;

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));

/** খোঁজার শব্দটা regex এ বসানোর আগে নিরাপদ করা */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * তালিকার ফিল্টার।
 *
 * সাধারণ প্লেয়ার আর অ্যাফিলিয়েট একই কালেকশনে, শুধু `role` আলাদা —
 * তাই দুটো পেজেই এই একই ফাংশন কাজে লাগে।
 */
const buildFilter = ({ role, q, status }) => {
  const filter = { role };

  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  // অ্যাফিলিয়েটের আবেদনের অবস্থা — কারা এখনো অপেক্ষায় সেটা খুঁজতে
  if (["pending", "approved", "rejected"].includes(status)) {
    filter.affiliateStatus = status;
  }

  const keyword = text(q);

  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), "i");

    // নম্বর শূন্য ছাড়া রাখা থাকে (1755...), admin লেখেন 01755... — দুটোই মেলে
    const phoneDigits = normalizePhone(keyword);
    const phoneRegex = phoneDigits ? new RegExp(escapeRegex(phoneDigits), "i") : regex;

    filter.$or = [
      { userId: regex },
      { phone: phoneRegex },
      { email: regex },
      { referralCode: regex },
      { firstName: regex },
      { lastName: regex },
    ];
  }

  return filter;
};

const listUsers = async (req, res, role) => {
  const page = Math.max(1, num(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));

  const filter = buildFilter({
    role,
    q: req.query.q,
    status: text(req.query.status),
  });

  const [users, total, active, inactive, pending] = await Promise.all([
    User.find(filter)
      .populate("referredBy", "userId phone referralCode")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
    User.countDocuments({ role, isActive: true }),
    User.countDocuments({ role, isActive: false }),

    // কতজন অ্যাফিলিয়েট এখনো অনুমোদনের অপেক্ষায় — তালিকার উপরেই দেখা যায়
    role === "aff-user"
      ? User.countDocuments({ role, affiliateStatus: "pending" })
      : 0,
  ]);

  return successResponse(res, "Users loaded", {
    users,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    stats: { total: active + inactive, active, inactive, pending },
  });
};

/**
 * একজনের বিস্তারিত — সাথে টাকার ইতিহাসের সারসংক্ষেপ।
 *
 * অ্যাডমিন কাউকে খুলে দেখলে সাধারণত জানতে চান কত জমা দিয়েছেন আর কোন
 * শর্ত এখনো চলছে, তাই সেটুকু একসাথেই আসে।
 */
const oneUser = async (req, res, role) => {
  if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

  const user = await User.findOne({ _id: req.params.id, role })
    .populate("referredBy", "userId phone referralCode")
    .lean();

  if (!user) return errorResponse(res, "User not found", 404);

  const [deposits, turnovers, totals] = await Promise.all([
    DepositRequest.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    TurnOver.find({ user: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    DepositRequest.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(user._id), status: "approved" } },
      { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: "$calc.creditedAmount" } } },
    ]),
  ]);

  return successResponse(res, "User loaded", {
    user,
    deposits,
    turnovers,
    summary: {
      depositCount: totals[0]?.n || 0,
      depositTotal: money(totals[0]?.sum || 0),
    },
  });
};

/* =========================
   সাধারণ প্লেয়ার
   ========================= */

router.get("/users", protectAdmin, requirePermission("users"), async (req, res) => {
  try {
    return await listUsers(req, res, "user");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/users/:id", protectAdmin, requirePermission("users"), async (req, res) => {
  try {
    return await oneUser(req, res, "user");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   অ্যাফিলিয়েট
   ========================= */

router.get("/affiliates", protectAdmin, requirePermission("affiliates"), async (req, res) => {
  try {
    return await listUsers(req, res, "aff-user");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/affiliates/:id", protectAdmin, requirePermission("affiliates"), async (req, res) => {
  try {
    return await oneUser(req, res, "aff-user");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** একজন অ্যাফিলিয়েটের নিচে যারা আছে */
router.get("/affiliates/:id/referrals", protectAdmin, requirePermission("affiliates"), async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

    const referrals = await User.find({ referredBy: req.params.id })
      .select("userId phone balance isActive createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return successResponse(res, "Referrals loaded", { referrals });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   একজনের ইতিহাস — প্রতিটা অংশ আলাদা করে আনা হয়
   ========================= */

/**
 * ইতিহাসের এক পাতা।
 *
 * বিস্তারিত পেজে চার-পাঁচটা ইতিহাস থাকে; একসাথে সব আনলে ভারী হয়ে যেত,
 * তাই প্রতিটা নিজের মতো করে পাতা ঘোরায়।
 */
/**
 * একজনের একটা ইতিহাস — পাতা, ছাঁকনি, খোঁজা আর সারাংশ।
 *
 * `searchFields` এ যে ঘরগুলো দেওয়া হবে সেগুলোতেই খোঁজা হয়; `totals` এ
 * `{ নাম: ঘর }` দিলে সেই ঘরগুলোর যোগফল আসে। সারাংশটা **ছাঁকনি সহ**
 * হিসাব হয়, তাই "শুধু অনুমোদিতগুলো" বাছলে অঙ্কগুলোও সেটারই হয়।
 *
 * স্ট্যাটাস অনুযায়ী গোনাটা ছাঁকনি ছাড়াই হয় — নইলে "পেন্ডিং ৩টা" এর
 * মতো তথ্য ছাঁকনি বদলালেই হারিয়ে যেত।
 */
const historyPage = async (
  req,
  res,
  Model,
  {
    extra = {},
    statusField = "status",
    searchFields = [],
    searchObjects = [],
    totals = {},
  } = {},
) => {
  if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

  const page = Math.max(1, num(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, num(req.query.limit) || 10));

  const base = { user: new mongoose.Types.ObjectId(req.params.id), ...extra };
  const filter = { ...base };

  const status = text(req.query.status);
  if (status && status !== "all") filter[statusField] = status;

  const search = text(req.query.q);

  if (search && (searchFields.length || searchObjects.length)) {
    const safe = escapeRegex(search);
    const regex = new RegExp(safe, "i");

    const clauses = searchFields.map((field) => ({ [field]: regex }));

    /*
     * যে ঘরগুলোর কী অ্যাডমিন নিজে ঠিক করেন (ডিপোজিট ফর্মের `fields`)
     * সেখানে নাম ধরে খোঁজা যায় না — একটা মেথডে `trxId`, আরেকটায়
     * `transactionId` হতে পারে। তাই পুরো অবজেক্টটা জোড়ায় ভেঙে যেকোনো
     * মানের সাথে মেলানো হয়।
     */
    searchObjects.forEach((field) => {
      clauses.push({
        $expr: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: { $objectToArray: { $ifNull: [`$${field}`, {}] } },
                  cond: {
                    $regexMatch: {
                      input: { $toString: "$$this.v" },
                      regex: safe,
                      options: "i",
                    },
                  },
                },
              },
            },
            0,
          ],
        },
      });
    });

    filter.$or = clauses;
  }

  const sumStage = Object.entries(totals).reduce(
    (acc, [key, field]) => ({ ...acc, [key]: { $sum: `$${field}` } }),
    {},
  );

  const [rows, total, sums, byStatus] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter),
    Object.keys(sumStage).length
      ? Model.aggregate([{ $match: filter }, { $group: { _id: null, ...sumStage } }])
      : Promise.resolve([]),
    Model.aggregate([
      { $match: base },
      { $group: { _id: `$${statusField}`, count: { $sum: 1 } } },
    ]),
  ]);

  const summary = Object.keys(totals).reduce(
    (acc, key) => ({ ...acc, [key]: money(sums[0]?.[key] || 0) }),
    { count: total },
  );

  return successResponse(res, "History loaded", {
    rows,
    summary,
    counts: byStatus.reduce(
      (acc, item) => ({ ...acc, [item._id]: item.count }),
      {},
    ),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });
};

router.get("/:id/history/deposits", protectAdmin, requireAccountPermission, async (req, res) => {
  try {
    return await historyPage(req, res, DepositRequest, {
      searchFields: ["methodId", "channelId"],
      searchObjects: ["fields"],
      totals: {
        amount: "amount",
        bonus: "calc.totalBonus",
        credited: "calc.creditedAmount",
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/:id/history/auto-deposits", protectAdmin, requireAccountPermission, async (req, res) => {
  try {
    return await historyPage(req, res, AutoDeposit, {
      searchFields: ["invoiceNumber"],
      totals: {
        amount: "amount",
        bonus: "calc.bonusAmount",
        credited: "calc.creditedAmount",
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/:id/history/withdraws", protectAdmin, requireAccountPermission, async (req, res) => {
  try {
    return await historyPage(req, res, WithdrawRequest, {
      searchFields: ["methodId", "walletSnapshot.walletNumber"],
      totals: { amount: "amount" },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/:id/history/auto-withdraws", protectAdmin, requireAccountPermission, async (req, res) => {
  try {
    return await historyPage(req, res, AutoWithdraw, {
      searchFields: ["paymentMethod", "accountNumber", "withdrawalId"],
      totals: {
        amount: "amount",
        fee: "feeAmount",
        deducted: "deductedAmount",
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/:id/history/vip", protectAdmin, requireAccountPermission, async (req, res) => {
  try {
    return await historyPage(req, res, VipTransaction, {
      statusField: "type",
      searchFields: ["note"],
      totals: { xp: "xp", points: "points", amount: "amount" },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/:id/history/games", protectAdmin, requireAccountPermission, async (req, res) => {
  try {
    return await historyPage(req, res, GameHistory, {
      statusField: "resultType",
      searchFields: ["gameName", "gameUId", "gameRound", "serialNumber"],
      totals: { bet: "betAmount", win: "winAmount", net: "netAmount" },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/:id/history/turnovers", protectAdmin, requireAccountPermission, async (req, res) => {
  try {
    return await historyPage(req, res, TurnOver, {
      searchFields: ["sourceType", "title"],
      totals: {
        credited: "creditedAmount",
        required: "required",
        progress: "progress",
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   বদলানো — দুই ধরনের জন্যই একই রুট
   ========================= */

/** চালু / বন্ধ */
router.patch(
  "/:id/status",
  protectAdmin,
  requireWrite,
  requireAccountPermission,
  async (req, res) => {
    try {
      if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

      if (typeof req.body?.isActive !== "boolean") {
        return errorResponse(res, "isActive must be true or false", 400);
      }

      const user = await User.findById(req.params.id);

      if (!user) return errorResponse(res, "User not found", 404);

      user.isActive = req.body.isActive;
      await user.save();

      return successResponse(
        res,
        user.isActive ? "Account activated" : "Account disabled",
        { user: user.toSafeJSON() },
      );
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

/**
 * অ্যাফিলিয়েটের আবেদন — অনুমোদন বা বাতিল।
 *
 * অনুমোদনের সাথেই কমিশনের হারগুলো বসানো যায়, আর চারটে হারই শূন্য
 * থাকলে অনুমোদন আটকে যায়। নইলে হার না বসিয়েই অনুমোদন দেওয়া যেত,
 * আর অ্যাফিলিয়েট খেলোয়াড় এনে দেখতেন কিছুই জমছে না।
 *
 * বাতিল করলে কারণ লেখা বাধ্যতামূলক — লেখাটা তিনি লগইনের সময় দেখেন,
 * তাই "পারবেন না" বলে ছেড়ে দেওয়া হয় না।
 */
const COMMISSION_KEYS = [
  "referCommission",
  "depositCommission",
  "gameWinCommission",
  "gameLossCommission",
];

router.patch(
  "/:id/affiliate-status",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

      const status = text(req.body?.status);

      if (!["approved", "rejected", "pending"].includes(status)) {
        return errorResponse(res, "Status must be approved, rejected or pending", 400);
      }

      const user = await User.findOne({ _id: req.params.id, role: "aff-user" });

      if (!user) return errorResponse(res, "Affiliate not found", 404);

      const note = text(req.body?.note);

      if (status === "rejected" && !note) {
        return errorResponse(res, "Please say why it was rejected", 400, "noteRequired");
      }

      if (status === "approved") {
        COMMISSION_KEYS.forEach((key) => {
          if (req.body?.[key] !== undefined) {
            user[key] = Math.min(100, Math.max(0, num(req.body[key])));
          }
        });

        const anyRate = COMMISSION_KEYS.some((key) => num(user[key]) > 0);

        if (!anyRate) {
          return errorResponse(
            res,
            "Set at least one commission rate before approving",
            400,
            "commissionNotSet",
          );
        }
      }

      user.affiliateStatus = status;
      user.affiliateNote = note;
      user.affiliateReviewedAt = new Date();
      user.affiliateReviewedBy = req.admin._id;

      await user.save();

      return successResponse(res, `Affiliate ${status}`, {
        user: user.toSafeJSON(),
      });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

/**
 * তথ্য বদলানো।
 *
 * ব্যালেন্স ও কমিশনের জমা টাকাও এখান থেকে ঠিক করা যায় — হিসাব ভুল
 * হয়ে গেলে বা হাতে শুধরে দেওয়ার দরকার পড়লে। সাধারণ জমা-খরচ Manual
 * Deposit দিয়েই করা উচিত, কারণ তাতে রেকর্ড থেকে যায়; এটা শোধরানোর
 * জন্য, তাই শুধু mother অ্যাডমিন পারেন।
 */
router.patch(
  "/:id",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

      const user = await User.findById(req.params.id);

      if (!user) return errorResponse(res, "User not found", 404);

      const body = req.body || {};

      const userId = text(body.userId).toLowerCase();

      if (userId && userId !== user.userId) {
        if (userId.length < 4 || userId.length > 15) {
          return errorResponse(res, "Username must be 4 to 15 characters", 400);
        }

        if (!/^[a-z0-9]+$/.test(userId)) {
          return errorResponse(res, "Username allows only letters and numbers", 400);
        }

        if (await User.exists({ _id: { $ne: user._id }, userId })) {
          return errorResponse(res, "This username is taken", 409);
        }

        user.userId = userId;
      }

      // দেশের কোড আগে — নম্বরটা নতুন কোড ধরেই মেলানো হয়
      if (body.countryCode !== undefined) {
        user.countryCode = normalizeCountryCode(body.countryCode);
      }

      if (body.phone !== undefined) {
        const phone = normalizePhone(body.phone, user.countryCode);

        // খেলোয়াড়ের নম্বর মুছে দেওয়া যায় (নিবন্ধনে ঐচ্ছিক); অ্যাফিলিয়েটের লাগবেই
        if (!phone && user.role === "aff-user") {
          return errorResponse(res, "Affiliate needs a phone number", 400);
        }

        if (phone && !isValidPhone(user.countryCode, phone)) {
          return errorResponse(res, "Phone number is not valid", 400);
        }

        if (phone && phone !== user.phone) {
          const taken = await User.exists({
            _id: { $ne: user._id },
            countryCode: user.countryCode,
            phone,
          });

          if (taken) {
            return errorResponse(res, "This number already has an account", 409);
          }
        }

        if (phone !== user.phone) user.isPhoneVerified = false;
        user.phone = phone;
      }

      if (body.email !== undefined) user.email = text(body.email).toLowerCase();
      if (body.firstName !== undefined) user.firstName = text(body.firstName);
      if (body.lastName !== undefined) user.lastName = text(body.lastName);

      // খালি পাঠালে পাসওয়ার্ড আগেরটাই থাকে
      const password = text(body.password);

      if (password) {
        if (password.length < 6) {
          return errorResponse(res, "Password must be at least 6 characters", 400);
        }

        user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.passwordChangedAt = new Date();
      }

      if (body.currency !== undefined) {
        user.currency = text(body.currency).toUpperCase() || "BDT";
      }

      /*
       * ব্যালেন্স — নতুন মান সরাসরি বসানো নয়, পার্থক্যটুকু এক ধাপে যোগ,
       * আর খাতায় "admin-adjust" সারি (কে, কত)। সরাসরি বসালে খেলোয়াড় তখন
       * খেললে callback এর বদল মুছে যেত, আর BetChokkor এ কোনো চিহ্নই থাকত না।
       */
      const balanceDelta =
        body.balance !== undefined ? money(Math.max(0, num(body.balance)) - num(user.balance)) : 0;

      // কমিশনের হার ও জমা টাকা শুধু অ্যাফিলিয়েটের জন্যই অর্থবহ
      if (user.role === "aff-user") {
        [
          "referCommission",
          "depositCommission",
          "gameWinCommission",
          "gameLossCommission",
        ].forEach((key) => {
          if (body[key] !== undefined) {
            user[key] = Math.min(100, Math.max(0, num(body[key])));
          }
        });

        [
          "referCommissionBalance",
          "depositCommissionBalance",
          "gameWinCommissionBalance",
          "gameLossCommissionBalance",
        ].forEach((key) => {
          if (body[key] !== undefined) {
            user[key] = money(Math.max(0, num(body[key])));
          }
        });
      }

      await user.save();

      if (balanceDelta !== 0) {
        const updated = await creditUser(user._id, balanceDelta);
        user.balance = updated?.balance;
        await writeLogs(
          user._id,
          updated?.balance,
          [{ type: "admin-adjust", amount: balanceDelta, note: text(body.balanceNote) || "Balance edited by admin" }],
          { by: req.admin._id },
        );
      }

      return successResponse(res, "Saved", { user: user.toSafeJSON() });
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(res, "This account already exists", 409);
      }

      return errorResponse(res, error.message, 500);
    }
  },
);

/**
 * লেনদেন পাসওয়ার্ড রিসেট — খেলোয়াড় ভুলে গেলে (বা লক হয়ে গেলে)। পরে
 * তিনি লগইন পাসওয়ার্ড দিয়ে নতুনটা বসান।
 */
router.patch(
  "/:id/tx-password/reset",
  protectAdmin,
  requireWrite,
  requireAccountPermission,
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { txPassword: "", txPasswordSetAt: null, failedTxAttempts: 0, txLockedUntil: null } },
        { returnDocument: "after" },
      );
      if (!user) return errorResponse(res, "User not found", 404);
      return successResponse(res, "Transaction password reset", { user: user.toSafeJSON() });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

/**
 * প্লেয়ার ↔ অ্যাফিলিয়েট বদল।
 *
 * অ্যাফিলিয়েট থেকে সাধারণে নামানোর সময় জমে থাকা কমিশন থাকলে আটকানো
 * হয় — নইলে টাকাটা কোথাও না গিয়েই হারিয়ে যেত।
 */
router.patch(
  "/:id/role",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);

      const role = req.body?.role === "aff-user" ? "aff-user" : "user";

      const user = await User.findById(req.params.id);

      if (!user) return errorResponse(res, "User not found", 404);

      if (user.role === role) {
        return errorResponse(res, `Already ${role}`, 400);
      }

      if (role === "user" && user.totalCommissionBalance() > 0) {
        return errorResponse(
          res,
          "Settle the commission balance first (Bulk Adjustment)",
          400,
        );
      }

      if (role === "aff-user") {
        /*
         * অ্যাফিলিয়েট হলে লাগে ফোন নম্বর আর admin এর অনুমোদন (হার সহ) —
         * নিজে নিবন্ধন করা অ্যাফিলিয়েটের মতোই। শূন্য হার নিয়ে সরাসরি
         * অনুমোদিত করে দিলে খেলোয়াড় আনলেও কোনো কমিশন জমত না।
         */
        if (!user.phone) {
          return errorResponse(res, "Add a phone number first — affiliates need one", 400);
        }
        const anyRate = COMMISSION_KEYS.some((key) => num(user[key]) > 0);
        if (!anyRate) {
          user.affiliateStatus = "pending";
          user.affiliateNote = "";
        }
      }

      user.role = role;
      await user.save();

      return successResponse(res, "Role changed", { user: user.toSafeJSON() });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
