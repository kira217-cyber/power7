import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";

import Feedback, { FEEDBACK_TYPES } from "../models/Feedback.js";
import { InboxMessage } from "../models/InboxMessage.js";
import kycUpload from "../config/kycUpload.js";
import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { checkCaptcha } from "../utils/captcha.js";
import { removeKycFile, signedKycUrl } from "../utils/kycFiles.js";
import { num } from "../utils/money.js";

/**
 * "অভিযোগ / পরামর্শ" — খেলোয়াড় পাঠান (ধরন, লেখা, ঐচ্ছিক ছবি, ক্যাপচা),
 * admin তালিকায় দেখে উত্তর দেন; উত্তর খেলোয়াড়ের ইনবক্সে যায়।
 */
const router = express.Router();

const text = (value, max) => String(value ?? "").trim().slice(0, max);
const isId = (value) => mongoose.Types.ObjectId.isValid(value);

// একজন ১০ মিনিটে ৫টার বেশি নয় — স্প্যাম আটকাতে
const sendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  // protectUser আগে চলে, তাই আইপিতে পড়ার পথ কার্যত আসে না
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, message: "Too many feedbacks — please try later", code: "tooMany" },
});

router.post("/", protectUser, sendLimiter, kycUpload.single("image"), async (req, res) => {
  const cleanup = () => req.file && removeKycFile(req.file.filename);
  try {
    const type = text(req.body?.type, 20);
    const content = text(req.body?.content, 500);
    if (!FEEDBACK_TYPES.includes(type)) {
      cleanup();
      return errorResponse(res, "Choose the problem type", 400, "badType");
    }
    if (content.length < 5) {
      cleanup();
      return errorResponse(res, "Write a little more", 400, "tooShort");
    }
    const captcha = checkCaptcha(req.body?.captchaId, req.body?.captcha);
    if (!captcha.ok) {
      cleanup();
      return errorResponse(res, "Captcha is not correct", 400, captcha.code);
    }
    const row = await Feedback.create({
      user: req.user._id,
      userIdText: req.user.userId,
      type,
      content,
      image: req.file?.filename || "",
    });
    return successResponse(res, "Feedback sent", { id: row._id }, 201);
  } catch (error) {
    cleanup();
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   admin
   ========================= */

router.get("/admin", protectAdmin, requirePermission("feedback"), async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    if (["new", "replied", "closed"].includes(req.query.status)) filter.status = req.query.status;
    if (FEEDBACK_TYPES.includes(req.query.type)) filter.type = req.query.type;
    const q = text(req.query.q, 40);
    if (q) filter.userIdText = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [rows, total, counts] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("repliedBy", "email").lean(),
      Feedback.countDocuments(filter),
      Feedback.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    return successResponse(res, "Feedback loaded", {
      feedback: rows.map((r) => ({ ...r, image: signedKycUrl(r.image) })),
      summary: Object.fromEntries(counts.map((c) => [c._id, c.n])),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** উত্তর (খেলোয়াড়ের ইনবক্সে যায়) বা শুধু বন্ধ করা */
router.patch("/admin/:id", protectAdmin, requirePermission("feedback"), requireWrite, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const row = await Feedback.findById(req.params.id);
    if (!row) return errorResponse(res, "Not found", 404);
    const reply = text(req.body?.reply, 2000);
    if (reply) {
      row.reply = reply;
      row.status = "replied";
      row.repliedAt = new Date();
      row.repliedBy = req.admin._id;
      await InboxMessage.create({
        title: { bn: "আপনার অভিযোগ / পরামর্শের উত্তর", en: "Reply to your feedback" },
        body: { bn: `আপনি লিখেছিলেন: "${row.content.slice(0, 120)}"\n\n${reply}`, en: `You wrote: "${row.content.slice(0, 120)}"\n\n${reply}` },
        audience: "users",
        users: [row.user],
        createdBy: req.admin._id,
      });
    } else if (req.body?.status === "closed") {
      row.status = "closed";
    } else {
      return errorResponse(res, "Write a reply", 400);
    }
    await row.save();
    return successResponse(res, "Saved", { feedback: { ...row.toObject(), image: signedKycUrl(row.image) } });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
