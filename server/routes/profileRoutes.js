import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

import User from "../models/User.js";
import EWallet from "../models/EWallet.js";
import DepositRequest from "../models/DepositRequest.js";
import WithdrawRequest from "../models/WithdrawRequest.js";
import Verification from "../models/Verification.js";

import { protectUser } from "../middleware/protectUser.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { isOtpRequired, sendOtp, verifyOtp, clearOtp } from "../utils/otp.js";
import { normalizePhone, displayPhone } from "../utils/phone.js";
import generateToken from "../utils/generateToken.js";

/**
 * খেলোয়াড়ের প্রোফাইল — "আমার অ্যাকাউন্ট" আর "সুরক্ষা কেন্দ্র"।
 *
 * BetChokkor থেকে নেওয়া (নাম ও জন্ম তারিখ একবারই, ইমেইল, ফোন OTP সহ,
 * পাসওয়ার্ড), সাথে:
 *   - `/overview` — প্রোফাইল কার্ড আর নিরাপত্তা স্কোর একবারে
 *   - আগে থেকে ফোন থাকলে বদলাতে লগইন পাসওয়ার্ড লাগে — BetChokkor এ শুধু
 *     নতুন নম্বরের OTP দিয়েই বদলানো যেত, তারপর "পাসওয়ার্ড ভুলে গেছি"
 *     দিয়ে পুরো অ্যাকাউন্ট দখল করা যেত
 *   - পাসওয়ার্ড বদলালে অন্য সব লগইন বন্ধ (`passwordChangedAt`), এই
 *     ডিভাইস নতুন টোকেন পায়
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();

const BCRYPT_ROUNDS = 12;
const COUNTRY_CODE = "+880";

const tightLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please wait", code: "tooMany" },
});

/** নিবন্ধনের একই নিয়ম — ৬–২০ অক্ষর */
const passwordOk = (value) => value.length >= 6 && value.length <= 20;

const isBdMobile = (value) => /^1[3-9]\d{8}$/.test(value);

/* =========================
   এক নজরে
   ========================= */

router.get("/overview", protectUser, async (req, res) => {
  try {
    const user = req.user;
    const [walletCount, pendingDeposits, pendingWithdraws, kyc] = await Promise.all([
      EWallet.countDocuments({ user: user._id, isActive: true }),
      DepositRequest.countDocuments({ user: user._id, status: "pending" }),
      WithdrawRequest.countDocuments({ user: user._id, status: "pending" }),
      Verification.findOne({ user: user._id }).select("status reviewNote").lean(),
    ]);

    // নিরাপত্তা স্কোর — মূল সাইটের করণীয়গুলো কতটা করা হয়েছে
    const items = {
      profile: Boolean(user.fullName && (user.email || user.phone)),
      phone: Boolean(user.phone),
      wallet: walletCount > 0,
      payPassword: Boolean(user.txPasswordSetAt),
      verification: kyc?.status === "approved",
    };
    const done = Object.values(items).filter(Boolean).length;
    const percent = Math.round((done / Object.keys(items).length) * 100);

    return successResponse(res, "Overview loaded", {
      user: user.toSafeJSON(),
      security: { items, percent, level: percent >= 80 ? "high" : percent >= 40 ? "medium" : "low" },
      walletCount,
      pendingDeposits,
      pendingWithdraws,
      kycStatus: kyc?.status || "none",
      kycNote: kyc?.status === "rejected" ? kyc.reviewNote || "" : "",
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   ব্যক্তিগত তথ্য — নাম ও জন্ম তারিখ একবারই, ইমেইল যখন খুশি
   ========================= */

/**
 * একবারে যা যা বদলাতে চান — ফাঁকা ঘর ছেড়ে দেওয়া হয়। নাম ও জন্ম তারিখ
 * আগে বসানো থাকলে আর বদলায় না (টাকা তোলার সময় এগুলো দিয়েই পরিচয়
 * মেলানো হয়; বদলাতে গ্রাহক সেবা)।
 */
router.put("/info", protectUser, async (req, res) => {
  try {
    const user = req.user;
    const fullName = text(req.body?.fullName).replace(/\s+/g, " ");
    const birthday = text(req.body?.dateOfBirth);
    const email = text(req.body?.email).toLowerCase();

    if (fullName && !user.fullName) {
      if (fullName.length < 3 || fullName.length > 60 || !/^[A-Za-z. ]+$/.test(fullName)) {
        return errorResponse(res, "Write your full name in English letters", 400, "badFullName");
      }
      user.fullName = fullName;
    }

    if (birthday && !user.dateOfBirth) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return errorResponse(res, "Use YYYY-MM-DD", 400, "badBirthday");
      const date = new Date(`${birthday}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1920) {
        return errorResponse(res, "That date is not valid", 400, "badBirthday");
      }
      // দিন ধরে ১৮ — বছর বিয়োগ করলে জন্মদিনের আগেই পাশ করে যেত
      const eighteen = new Date(date);
      eighteen.setUTCFullYear(eighteen.getUTCFullYear() + 18);
      if (eighteen > new Date()) return errorResponse(res, "You must be at least 18", 400, "tooYoung");
      user.dateOfBirth = date;
    }

    if (email && email !== user.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return errorResponse(res, "That email is not valid", 400, "badEmail");
      if (await User.exists({ email, _id: { $ne: user._id } })) {
        return errorResponse(res, "This email is already used", 409, "emailTaken");
      }
      user.email = email;
      user.isEmailVerified = false;
    }

    await user.save();
    return successResponse(res, "Saved", { user: user.toSafeJSON() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   ফোন নম্বর
   ========================= */

/** আগে থেকে নম্বর থাকলে লগইন পাসওয়ার্ড মিলিয়ে দেখা */
const checkPasswordForPhoneChange = async (user, loginPassword) => {
  if (!user.phone) return true;
  const withPassword = await User.findById(user._id).select("+password");
  return bcrypt.compare(text(loginPassword), withPassword.password);
};

router.post("/phone/send-otp", protectUser, tightLimiter, async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone, COUNTRY_CODE);
    if (!isBdMobile(phone)) return errorResponse(res, "Enter a valid phone number", 400, "badPhone");

    if (await User.exists({ countryCode: COUNTRY_CODE, phone, _id: { $ne: req.user._id } })) {
      return errorResponse(res, "This number already has an account", 409, "phoneTaken");
    }

    if (!(await checkPasswordForPhoneChange(req.user, req.body?.loginPassword))) {
      return errorResponse(res, "Login password is not correct", 400, "loginPasswordWrong");
    }

    if (!(await isOtpRequired("client", "profileVerify"))) {
      return successResponse(res, "OTP is not needed for this step", { required: false });
    }

    const result = await sendOtp({ site: "client", flow: "profileVerify", countryCode: COUNTRY_CODE, phone });
    if (!result.ok) return errorResponse(res, result.message, 400, result.code);

    return successResponse(res, result.message, { required: true });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/phone", protectUser, tightLimiter, async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone, COUNTRY_CODE);
    if (!isBdMobile(phone)) return errorResponse(res, "Enter a valid phone number", 400, "badPhone");

    if (await User.exists({ countryCode: COUNTRY_CODE, phone, _id: { $ne: req.user._id } })) {
      return errorResponse(res, "This number already has an account", 409, "phoneTaken");
    }

    if (!(await checkPasswordForPhoneChange(req.user, req.body?.loginPassword))) {
      return errorResponse(res, "Login password is not correct", 400, "loginPasswordWrong");
    }

    const needsOtp = await isOtpRequired("client", "profileVerify");
    if (needsOtp) {
      const result = verifyOtp({ flow: "profileVerify", countryCode: COUNTRY_CODE, phone, otp: text(req.body?.otp) });
      if (!result.ok) return errorResponse(res, result.message, 400, result.code);
      clearOtp({ flow: "profileVerify", countryCode: COUNTRY_CODE, phone });
    }

    req.user.countryCode = COUNTRY_CODE;
    req.user.phone = phone;
    req.user.isPhoneVerified = needsOtp;
    await req.user.save();

    return successResponse(res, "Phone number saved", {
      user: req.user.toSafeJSON(),
      phone: displayPhone(phone, COUNTRY_CODE),
    });
  } catch (error) {
    if (error?.code === 11000) return errorResponse(res, "This number already has an account", 409, "phoneTaken");
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   লগইন পাসওয়ার্ড
   ========================= */

router.put("/password", protectUser, tightLimiter, async (req, res) => {
  try {
    const currentPassword = text(req.body?.currentPassword);
    const newPassword = text(req.body?.newPassword);

    if (!currentPassword || !newPassword) return errorResponse(res, "Both passwords are required", 400, "missingFields");
    if (!passwordOk(newPassword)) return errorResponse(res, "Password must be 6–20 characters", 400, "passwordTooShort");
    if (currentPassword === newPassword) return errorResponse(res, "The new password must be different", 400, "samePassword");

    const user = await User.findById(req.user._id).select("+password +txPassword");
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return errorResponse(res, "Your current password is not correct", 400, "loginPasswordWrong");
    }
    // লেনদেন পাসওয়ার্ড আর লগইন পাসওয়ার্ড এক হলে দুটো আলাদা রাখার মানে থাকে না
    if (user.txPassword && (await bcrypt.compare(newPassword, user.txPassword))) {
      return errorResponse(res, "Use a different password from your transaction password", 400, "txSameAsLogin");
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.passwordChangedAt = new Date();
    await user.save();

    // অন্য সব লগইন বন্ধ; এই ডিভাইস নতুন টোকেনে চলতে থাকে
    return successResponse(res, "Password changed", {
      token: generateToken({ id: user._id, kind: "user", role: user.role }),
      user: user.toSafeJSON(),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
