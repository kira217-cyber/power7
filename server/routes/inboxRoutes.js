import express from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import { InboxMessage, InboxState } from "../models/InboxMessage.js";
import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num } from "../utils/money.js";

/**
 * "অভ্যন্তরীণ বার্তা" — খেলোয়াড়ের ইনবক্স আর admin থেকে বার্তা পাঠানো।
 * প্রতিটা বার্তা আলাদা করে পড়া/মোছা যায় (`InboxState`)।
 */
const router = express.Router();

const text = (value, max) => String(value ?? "").trim().slice(0, max);
const isId = (value) => mongoose.Types.ObjectId.isValid(value);
const lang = (input, max) => ({ bn: text(input?.bn, max), en: text(input?.en, max) });

/** এই খেলোয়াড় কোন বার্তাগুলো দেখতে পারেন */
const visibleTo = (user) => ({
  isActive: true,
  $or: [
    { audience: "all", createdAt: { $gte: user.createdAt || new Date(0) } },
    { audience: "users", users: user._id },
  ],
});

/** খেলোয়াড়ের নিজের অবস্থা — মোছা আর পড়া বার্তার আইডি */
const statesOf = async (userId) => {
  const rows = await InboxState.find({ user: userId }).select("message readAt deletedAt").lean();
  const deleted = [];
  const read = new Set();
  rows.forEach((r) => {
    if (r.deletedAt) deleted.push(r.message);
    else if (r.readAt) read.add(String(r.message));
  });
  return { deleted, read };
};

const unreadOf = async (user) => {
  const { deleted, read } = await statesOf(user._id);
  const ids = await InboxMessage.find({ ...visibleTo(user), _id: { $nin: deleted } }).distinct("_id");
  return ids.filter((id) => !read.has(String(id))).length;
};

/* =========================
   খেলোয়াড়
   ========================= */

router.get("/", protectUser, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, num(req.query.limit) || 20));
    const order = req.query.sort === "asc" ? 1 : -1;
    const { deleted, read } = await statesOf(req.user._id);
    const filter = { ...visibleTo(req.user), _id: { $nin: deleted } };

    const [rows, total] = await Promise.all([
      InboxMessage.find(filter).sort({ createdAt: order }).skip((page - 1) * limit).limit(limit).select("title body createdAt").lean(),
      InboxMessage.countDocuments(filter),
    ]);
    const all = await InboxMessage.find(filter).distinct("_id");
    const unread = all.filter((id) => !read.has(String(id))).length;

    return successResponse(res, "Inbox loaded", {
      messages: rows.map((m) => ({ ...m, read: read.has(String(m._id)) })),
      unread,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/unread-count", protectUser, async (req, res) => {
  try {
    return successResponse(res, "Unread count", { unread: await unreadOf(req.user) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/**
 * পড়া / মোছা — `ids` দিলে সেগুলো, `all: true` দিলে দেখা যায় এমন সব।
 * খেলোয়াড় শুধু নিজের দেখার মতো বার্তাতেই হাত দিতে পারেন।
 */
const mark = (field) => async (req, res) => {
  try {
    const filter = visibleTo(req.user);
    if (!req.body?.all) {
      const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isId).slice(0, 200);
      if (!ids.length) return errorResponse(res, "Choose a message", 400);
      filter._id = { $in: ids };
    }
    const ids = await InboxMessage.find(filter).distinct("_id");
    const now = new Date();
    if (ids.length) {
      await InboxState.bulkWrite(
        ids.map((message) => ({
          updateOne: {
            filter: { user: req.user._id, message },
            update: { $set: { [field]: now } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }
    return successResponse(res, "Updated", { count: ids.length, unread: await unreadOf(req.user) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

router.post("/read", protectUser, mark("readAt"));
router.post("/delete", protectUser, mark("deletedAt"));

/* =========================
   admin
   ========================= */

router.get("/admin", protectAdmin, requirePermission("notifications"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const [rows, total] = await Promise.all([
      InboxMessage.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("users", "userId").populate("createdBy", "email").lean(),
      InboxMessage.countDocuments(),
    ]);
    const reads = await InboxState.aggregate([
      { $match: { message: { $in: rows.map((r) => r._id) }, readAt: { $ne: null } } },
      { $group: { _id: "$message", n: { $sum: 1 } } },
    ]);
    const readBy = Object.fromEntries(reads.map((r) => [String(r._id), r.n]));
    return successResponse(res, "Messages loaded", {
      messages: rows.map((m) => ({ ...m, readCount: readBy[String(m._id)] || 0 })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** প্রাপকদের ইউজারনেম (কমা/লাইন দিয়ে আলাদা) → আইডি; না মিললে কোনগুলো তা জানানো */
const resolveUsers = async (input) => {
  const names = [...new Set(String(input || "").split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))].slice(0, 500);
  const found = await User.find({ userId: { $in: names }, role: "user" }).select("userId").lean();
  const have = new Set(found.map((u) => u.userId));
  return { ids: found.map((u) => u._id), missing: names.filter((n) => !have.has(n)) };
};

const buildMessage = async (body, current) => {
  const out = {};
  if (body.title !== undefined || !current) {
    out.title = lang(body.title, 150);
    if (!out.title.bn && !out.title.en) return { error: "Write a title" };
  }
  if (body.body !== undefined || !current) {
    out.body = lang(body.body, 5000);
    if (!out.body.bn && !out.body.en) return { error: "Write the message" };
  }
  if (body.audience !== undefined || !current) {
    out.audience = body.audience === "users" ? "users" : "all";
    if (out.audience === "users") {
      const { ids, missing } = await resolveUsers(body.userIds);
      if (missing.length) return { error: `Not found: ${missing.slice(0, 10).join(", ")}` };
      if (!ids.length) return { error: "Add at least one username" };
      out.users = ids;
    } else out.users = [];
  }
  if (typeof body.isActive === "boolean") out.isActive = body.isActive;
  return out;
};

router.post("/admin", protectAdmin, requirePermission("notifications"), requireWrite, async (req, res) => {
  try {
    const data = await buildMessage(req.body || {}, null);
    if (data.error) return errorResponse(res, data.error, 400);
    const message = await InboxMessage.create({ ...data, createdBy: req.admin._id });
    return successResponse(res, "Message sent", { message }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/:id", protectAdmin, requirePermission("notifications"), requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const current = await InboxMessage.findById(req.params.id);
    if (!current) return errorResponse(res, "Not found", 404);
    const data = await buildMessage(req.body || {}, current);
    if (data.error) return errorResponse(res, data.error, 400);
    current.set(data);
    await current.save();
    return successResponse(res, "Message saved", { message: current });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.delete("/admin/:id", protectAdmin, requirePermission("notifications"), requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const message = await InboxMessage.findByIdAndDelete(req.params.id);
    if (!message) return errorResponse(res, "Not found", 404);
    await InboxState.deleteMany({ message: message._id });
    return successResponse(res, "Message deleted", {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
