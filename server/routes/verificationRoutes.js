import express from "express";
import mongoose from "mongoose";

import Verification from "../models/Verification.js";
import VerificationSetting from "../models/VerificationSetting.js";
import User from "../models/User.js";

import kycUpload from "../config/kycUpload.js";
import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requireMother, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { isOtpRequired, isVerified, clearOtp } from "../utils/otp.js";
import { removeKycFile, resolveSignedFile, withSignedImages } from "../utils/kycFiles.js";

/**
 * পরিচয় যাচাই (KYC) — খেলোয়াড় ও অ্যাফিলিয়েট কাগজ জমা দেন, admin দেখে
 * অনুমোদন/বাতিল করেন; admin চাইলে ডিপোজিট/উত্তোলনের আগে এটা বাধ্যতামূলক।
 *
 * BetChokkor থেকে নেওয়া, তবে ছবিগুলো আর `/uploads` এ নয় — গোপন ফোল্ডারে,
 * দেখা যায় শুধু ১০ মিনিটের সই করা লিংকে। admin তালিকা পারমিশন দেখে
 * (`verification` / `affiliate-verification`) — BetChokkor এ যেকোনো admin দেখতে পারত।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));

const DOCUMENT_TYPES = ["nid", "passport", "driving"];

const siteOf = (user) => (user?.role === "aff-user" ? "affiliate" : "client");
const permOf = (role) => (role === "aff-user" ? "affiliate-verification" : "verification");

/** সংরক্ষিত ফাইলের নাম (লিংক নয়) */
const savedName = (file) => (file ? file.filename : "");

/* =========================
   ছবি — সই করা লিংকে
   ========================= */

router.get("/file/:name", (req, res) => {
  const file = resolveSignedFile(req.params.name, req.query.exp, req.query.sig);
  if (!file) return res.status(403).json({ success: false, message: "Link expired or not valid" });
  res.set("Cache-Control", "private, max-age=300");
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  return res.sendFile(file);
});

/* =========================
   খেলোয়াড় / অ্যাফিলিয়েট
   ========================= */

router.get("/my", protectUser, async (req, res) => {
  try {
    const [row, setting] = await Promise.all([
      Verification.findOne({ user: req.user._id }).select("-reviewedBy").lean(),
      VerificationSetting.current(),
    ]);

    return successResponse(res, "Verification loaded", {
      verification: withSignedImages(row) || null,
      setting: {
        requireForDeposit: setting.requireForDeposit,
        requireForWithdraw: setting.requireForWithdraw,
        affiliateRequireForWithdraw: setting.affiliateRequireForWithdraw,
        note: setting.note,
      },
      // নম্বর না থাকলে OTP পাঠানোর জায়গা নেই — তখন চাওয়া হয় না
      otpRequired: Boolean(req.user.phone) && (await isOtpRequired(siteOf(req.user), "profileVerify")),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post(
  "/",
  protectUser,
  kycUpload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files || {};
    const uploaded = ["frontImage", "backImage", "selfieImage"].map((k) => savedName(files[k]?.[0])).filter(Boolean);
    // কোনো কারণে জমা না হলে আপলোড হওয়া ছবি মুছে ফেলা — গোপন ছবি পড়ে না থাকে
    const fail = (...args) => {
      uploaded.forEach(removeKycFile);
      return errorResponse(res, ...args);
    };

    try {
      const existing = await Verification.findOne({ user: req.user._id });

      if (existing?.status === "approved") return fail("Your identity is already verified", 400, "alreadyVerified");

      const fullName = text(req.body?.fullName).slice(0, 80);
      const documentType = text(req.body?.documentType).toLowerCase();
      const documentNumber = text(req.body?.documentNumber).slice(0, 40);

      if (!fullName || !documentNumber) return fail("Please fill in every field", 400, "missingFields");
      if (!DOCUMENT_TYPES.includes(documentType)) return fail("Pick a document type", 400, "missingFields");

      const otpTarget = { flow: "profileVerify", countryCode: req.user.countryCode, phone: req.user.phone };
      if (req.user.phone && (await isOtpRequired(siteOf(req.user), "profileVerify")) && !isVerified(otpTarget)) {
        return fail("Verify the code first", 400, "otpNotVerified");
      }

      const front = savedName(files.frontImage?.[0]);
      const back = savedName(files.backImage?.[0]);
      const selfie = savedName(files.selfieImage?.[0]);

      // প্রথমবার সামনের দিক আর সেলফি লাগবেই; আবার পাঠালে যা দেননি তা আগেরটাই
      if (!existing && (!front || !selfie)) {
        return fail("Front side of the document and a selfie are required", 400, "missingImages");
      }

      const row = existing || new Verification({ user: req.user._id });
      if (front) {
        removeKycFile(row.frontImage);
        row.frontImage = front;
      }
      if (back) {
        removeKycFile(row.backImage);
        row.backImage = back;
      }
      if (selfie) {
        removeKycFile(row.selfieImage);
        row.selfieImage = selfie;
      }

      row.userIdText = req.user.userId;
      row.role = req.user.role === "aff-user" ? "aff-user" : "user";
      row.fullName = fullName;
      row.documentType = documentType;
      row.documentNumber = documentNumber;
      const dob = text(req.body?.dateOfBirth);
      row.dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(`${dob}T00:00:00.000Z`) : null;
      row.status = "pending";
      row.reviewNote = "";
      row.reviewedBy = null;
      row.reviewedAt = null;
      row.submittedAt = new Date();
      await row.save();

      await User.updateOne({ _id: req.user._id }, { $set: { verificationStatus: "pending" } });
      if (req.user.phone) clearOtp(otpTarget);

      return successResponse(res, "Verification submitted", { verification: withSignedImages(row.toObject()) });
    } catch (error) {
      uploaded.forEach(removeKycFile);
      return errorResponse(res, error.message, 500);
    }
  },
);

/* =========================
   অ্যাডমিন
   ========================= */

/** তালিকার ভূমিকা অনুযায়ী পারমিশন — খেলোয়াড় `verification`, অ্যাফিলিয়েট `affiliate-verification` */
const listPermission = (req, res, next) =>
  requirePermission(permOf(req.query.role === "aff-user" ? "aff-user" : "user"))(req, res, next);

router.get("/admin", protectAdmin, listPermission, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const role = req.query.role === "aff-user" ? "aff-user" : "user";
    const filter = { role };

    const status = text(req.query.status);
    if (["pending", "approved", "rejected"].includes(status)) filter.status = status;

    const search = text(req.query.q);
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ userIdText: regex }, { fullName: regex }, { documentNumber: regex }];
    }

    const [rows, total, counts] = await Promise.all([
      Verification.find(filter)
        .populate("user", "userId phone balance role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Verification.countDocuments(filter),
      Verification.aggregate([{ $match: { role } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);

    return successResponse(res, "Verifications loaded", {
      rows: rows.map(withSignedImages),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      counts: counts.reduce((acc, item) => ({ ...acc, [item._id]: item.n }), { pending: 0, approved: 0, rejected: 0 }),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** একটা আবেদনের ভূমিকা দেখে পারমিশন */
const rowPermission = async (req, res, next) => {
  if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);
  const row = await Verification.findById(req.params.id).select("role").lean();
  if (!row) return errorResponse(res, "Not found", 404);
  return requirePermission(permOf(row.role))(req, res, next);
};

const review = (nextStatus) => async (req, res) => {
  try {
    const note = text(req.body?.note);
    if (nextStatus === "rejected" && !note) return errorResponse(res, "Please say why it was rejected", 400);

    // ঝুলে থাকা আবেদনটাই একবারে দাবি — দুজন admin একসাথে চাপলেও একবারই
    const row = await Verification.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: { status: nextStatus, reviewNote: note, reviewedBy: req.admin._id, reviewedAt: new Date() } },
      { returnDocument: "after" },
    )
      .populate("user", "userId phone")
      .lean();

    if (!row) return errorResponse(res, "Already reviewed or not found", 409);

    await User.updateOne({ _id: row.user?._id || row.user }, { $set: { verificationStatus: nextStatus } });

    return successResponse(res, `Verification ${nextStatus}`, { verification: withSignedImages(row) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

router.patch("/admin/:id/approve", protectAdmin, requireWrite, rowPermission, review("approved"));
router.patch("/admin/:id/reject", protectAdmin, requireWrite, rowPermission, review("rejected"));

router.get("/admin/setting", protectAdmin, requireMother, async (req, res) => {
  try {
    return successResponse(res, "Setting loaded", { setting: await VerificationSetting.current() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/setting", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const setting = await VerificationSetting.current();
    ["requireForDeposit", "requireForWithdraw", "affiliateRequireForWithdraw"].forEach((key) => {
      if (req.body?.[key] !== undefined) setting[key] = Boolean(req.body[key]);
    });
    if (req.body?.note) {
      setting.note = {
        bn: text(req.body.note.bn) || setting.note.bn,
        en: text(req.body.note.en) || setting.note.en,
      };
    }
    await setting.save();
    return successResponse(res, "Setting saved", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/admin/user/:userId", protectAdmin, async (req, res) => {
  try {
    if (!isId(req.params.userId)) return errorResponse(res, "Bad id", 400);
    const user = await User.findById(req.params.userId).select("role").lean();
    if (!user) return errorResponse(res, "User not found", 404);
    return requirePermission(user.role === "aff-user" ? "affiliates" : "users")(req, res, async () => {
      const row = await Verification.findOne({ user: req.params.userId }).lean();
      return successResponse(res, "Verification loaded", { verification: withSignedImages(row) || null });
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
