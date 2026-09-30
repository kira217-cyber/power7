import express from "express";
import mongoose from "mongoose";

import User from "../models/User.js";

import { protectAdmin, requireMother, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { money } from "../utils/money.js";
import { commissionOf, settleAffiliate } from "./affiliateRoutes.js";

/**
 * অ্যাফিলিয়েটের কমিশন একসাথে মেলানো — `/api/admin/bulk-adjustment` (শুধু mother)।
 *
 * প্রতিটা মেলানো `settleAffiliate` দিয়ে — একক settle এর মতোই atomic দাবি,
 * গোল করা টাকা, লেজারে "commission" লাইন আর AffSettlement রেকর্ড। নেট
 * ঋণাত্মক হলে ব্যালেন্স শূন্যের নিচে নামে না, বাকি দেনা জিতের ঘরে থাকে।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const COMMISSION_FIELDS = ["referCommissionBalance", "depositCommissionBalance", "gameLossCommissionBalance", "gameWinCommissionBalance"];
const PENDING = { $or: COMMISSION_FIELDS.map((f) => ({ [f]: { $ne: 0 } })) };

const filterOf = (q) => {
  const filter = { role: "aff-user" };
  const term = text(q).slice(0, 60);
  if (term) {
    const rx = new RegExp(escapeRegex(term), "i");
    filter.$or = [{ userId: rx }, { username: rx }, { phone: rx }, { email: rx }];
  }
  return filter;
};

const previewOf = (user) => {
  const c = commissionOf(user);
  return { ...c.balances, gross: c.gross, net: c.net };
};

router.use(protectAdmin, requireMother);

router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = filterOf(req.query.q);

    const [users, total, agg] = await Promise.all([
      User.find(filter)
        .select(`userId username phone balance ${COMMISSION_FIELDS.join(" ")}`)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      // মোট হিসাব সার্ভারেই — সব অ্যাফিলিয়েট মেমরিতে না তুলে
      User.aggregate([
        { $match: { $and: [filter, PENDING] } },
        {
          $group: {
            _id: null,
            pending: { $sum: 1 },
            gross: { $sum: { $add: ["$referCommissionBalance", "$depositCommissionBalance", "$gameLossCommissionBalance"].map((f) => ({ $ifNull: [f, 0] })) } },
            gameWin: { $sum: { $ifNull: ["$gameWinCommissionBalance", 0] } },
          },
        },
      ]),
    ]);

    const t = agg[0] || { pending: 0, gross: 0, gameWin: 0 };
    return successResponse(res, "Affiliates", {
      users: users.map((u) => ({ _id: u._id, userId: u.userId, username: u.username, phone: u.phone, balance: money(u.balance), preview: previewOf(u) })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      totals: { pending: t.pending, gross: money(t.gross), net: money(t.gross - t.gameWin) },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/adjust/:id", requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
    const user = await User.findOne({ _id: req.params.id, role: "aff-user" });
    if (!user) return errorResponse(res, "Affiliate not found", 404);

    const r = await settleAffiliate(user, { by: req.admin._id, note: "Bulk adjustment" });
    if (!r.ok) return errorResponse(res, r.message, r.status);
    const { applied, carried } = r.settlement;
    const msg = carried > 0 ? `Settled ${applied} — ${carried} owed carried forward` : `Settled ${applied}`;
    return successResponse(res, msg, { settlement: r.settlement, balance: r.balance });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// শুধু খোঁজার সাথে মেলা আর যাদের কিছু বাকি আছে — একজন একজন করে, যাতে কারোটা ব্যর্থ হলে বাকিরা আটকে না যায়
router.post("/adjust-all", requireWrite, async (req, res) => {
  try {
    const users = await User.find({ $and: [filterOf(req.body?.q), PENDING] }).limit(5000);
    let settled = 0;
    let failed = 0;
    let applied = 0;
    let carried = 0;
    for (const user of users) {
      try {
        const r = await settleAffiliate(user, { by: req.admin._id, note: "Bulk adjustment" });
        if (r.ok) {
          settled += 1;
          applied += r.settlement.applied;
          carried += r.settlement.carried;
        } else failed += 1;
      } catch {
        failed += 1;
      }
    }
    return successResponse(res, `Settled ${settled}`, { settled, failed, skipped: failed, applied: money(applied), carried: money(carried) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
