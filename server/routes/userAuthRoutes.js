import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { grantRegisterBonus } from "../utils/registerBonus.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { protectUser } from "../middleware/protectUser.js";
import {
  clearOtp,
  isOtpRequired,
  isVerified,
  sendOtp,
  verifyOtp,
} from "../utils/otp.js";
import { createCaptcha, checkCaptcha } from "../utils/captcha.js";
import { onRegisterReward } from "../utils/reward.js";
import { makeGamePlayName } from "./playGameRoutes.js";
import {
  displayPhone,
  normalizeCountryCode,
  normalizePhone,
} from "../utils/phone.js";

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD = 6;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const text = (value) => String(value ?? "").trim();

/**
 * অনুরোধটা কোন সাইট থেকে — খেলোয়াড়ের, নাকি অ্যাফিলিয়েটের।
 *
 * দুই সাইটে নিয়ম প্রায় একই, শুধু কয়েকটা জায়গায় আলাদা: কী ভূমিকা
 * পাবে, রেজিস্টার বোনাস পাবে কিনা, আর OTP এর সেটিংটা কোনটা। তাই
 * আলাদা রুট না বানিয়ে একই রুটই দুই সাইটের কাজ করে — নইলে একটায় বাগ
 * ঠিক করলে অন্যটা পিছিয়ে থাকত।
 */
const siteOf = (body) => (body?.site === "affiliate" ? "affiliate" : "client");

/** ওই সাইটের ব্যবহারকারীর ভূমিকা */
const roleOf = (site) => (site === "affiliate" ? "aff-user" : "user");

/**
 * বাংলাদেশের মোবাইল নম্বর — শূন্য ছাড়া ১০ অঙ্ক, ১ দিয়ে শুরু
 * (1[3-9]XXXXXXXX)। অন্য দেশের কোড হলে শুধু অঙ্কের সংখ্যা দেখা হয়।
 */
const isValidPhone = (countryCode, phone) => {
  if (countryCode === "+880") return /^1[3-9]\d{8}$/.test(phone);
  return /^\d{6,14}$/.test(phone);
};

/** এক IP থেকে বারবার চেষ্টা ঠেকাতে */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try again later" },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests" },
});

/** ৬ অক্ষরের রেফারেল কোড — সংঘর্ষ হলে আবার চেষ্টা */
const makeReferralCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (!(await User.exists({ referralCode: code }))) return code;
  }

  throw new Error("Could not create a referral code");
};

const issueToken = (user) =>
  generateToken({ id: user._id, kind: "user", role: user.role });

/** ০১৭****৯৮৬২ — ব্যবহারকারী নিজের নম্বর চিনবেন, অন্য কেউ পড়তে পারবে না */
const maskPhone = (phone = "") => {
  // ব্যবহারকারী যেভাবে নম্বরটা চেনেন সেভাবেই — শুরুর শূন্যসহ
  const value = displayPhone(phone);

  if (value.length < 8) return "****";

  return `${value.slice(0, 3)}${"*".repeat(value.length - 7)}${value.slice(-4)}`;
};

/**
 * ফোন নম্বর বের করা — সরাসরি দেওয়া নম্বর, নয়তো ইউজারনেম থেকে।
 *
 * পাসওয়ার্ড ভুলে গেলে মূল সাইট ইউজারনেম চায়, নম্বর নয়। তাই নম্বরটা
 * সার্ভারই খুঁজে নেয় — ক্লায়েন্টে কখনো পুরো নম্বর যায় না।
 */
const resolveTarget = async ({ userId, countryCode, phone }) => {
  if (userId) {
    const user = await User.findOne({ userId });

    if (!user) return null;

    return { user, countryCode: user.countryCode, phone: user.phone };
  }

  if (!phone) return null;

  // লেখার ধরন যাই হোক, খোঁজা হয় একই রূপে
  const code = normalizeCountryCode(countryCode);
  const local = normalizePhone(phone, countryCode);

  const user = await User.findOne({ countryCode: code, phone: local });

  return { user, countryCode: code, phone: local };
};

/* =========================
   ক্যাপচা
   ========================= */

const captchaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests" },
});

/** নিবন্ধনের ক্যাপচা — প্রতিবার নতুন, একবারই চলে */
router.get("/captcha", captchaLimiter, (req, res) => {
  res.set("Cache-Control", "no-store");
  return successResponse(res, "Captcha", createCaptcha());
});

/* =========================
   OTP
   ========================= */

/**
 * OTP চাওয়া। যে ফ্লোতে অ্যাডমিন OTP বন্ধ রেখেছেন, সেখানে
 * `required: false` ফেরত যায় আর SMS পাঠানো হয় না।
 */
router.post("/otp/send", otpLimiter, async (req, res) => {
  try {
    const flow = text(req.body?.flow);
    const site = req.body?.site === "affiliate" ? "affiliate" : "client";
    const userId = text(req.body?.userId);
    const inputCode = normalizeCountryCode(req.body?.countryCode);
    const inputPhone = normalizePhone(req.body?.phone, inputCode);

    if (!flow || (!inputPhone && !userId)) {
      return errorResponse(res, "Flow and phone are required", 400, "missingFields");
    }

    const target = await resolveTarget({
      userId,
      countryCode: inputCode,
      phone: inputPhone,
    });

    // অ্যাকাউন্ট আছে কিনা সেটা OTP চালু-বন্ধের আগেই দেখা হয় — নইলে OTP
    // বন্ধ থাকলে ভুল ইউজারনেমও পরের ধাপে চলে যেত
    if (flow === "register") {
      if (!isValidPhone(inputCode, inputPhone)) {
        return errorResponse(res, "Phone number is not valid", 400, "badPhone");
      }
      if (target?.user) {
        return errorResponse(res, "This number already has an account", 409, "phoneTaken");
      }
    } else if (!target?.user) {
      return errorResponse(res, "No account found", 404, "noAccount");
    } else if (!target.phone) {
      /*
       * নম্বর ছাড়া অ্যাকাউন্ট (মূল সাইটের মতো নিবন্ধনে ফোন ঐচ্ছিক)।
       * কোড পাঠানোর জায়গা নেই — পাসওয়ার্ড ফেরতে গ্রাহক সেবায় যেতে হবে।
       */
      return errorResponse(res, "This account has no phone number", 400, "noPhone");
    }

    const countryCode = target?.countryCode || inputCode;
    const phone = target?.phone || inputPhone;

    if (!(await isOtpRequired(site, flow))) {
      /*
       * BetChokkor এ OTP বন্ধ থাকলে পাসওয়ার্ড ফেরত শুধু ইউজারনেম দিয়েই
       * হয়ে যেত — যে কেউ অন্যের পাসওয়ার্ড বদলে দিতে পারত। এখানে পরিচয়
       * প্রমাণের আর কোনো উপায় নেই বলে তখন এই পথটাই বন্ধ।
       */
      if (flow === "forgotPassword") {
        return errorResponse(res, "Password reset is not available, contact support", 400, "forgotUnavailable");
      }

      return successResponse(res, "OTP is not needed for this step", {
        required: false,
        maskedPhone: maskPhone(phone),
      });
    }

    const result = await sendOtp({ site, flow, countryCode, phone });

    if (!result.ok) {
      return errorResponse(res, result.message, 400, result.code);
    }

    return successResponse(res, result.message, {
      required: true,
      maskedPhone: maskPhone(phone),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/otp/verify", otpLimiter, async (req, res) => {
  try {
    const flow = text(req.body?.flow);
    const userId = text(req.body?.userId);
    const inputCode = normalizeCountryCode(req.body?.countryCode);
    const inputPhone = normalizePhone(req.body?.phone, inputCode);
    const otp = text(req.body?.otp);

    if (!flow || (!inputPhone && !userId) || !otp) {
      return errorResponse(res, "Flow, phone and OTP are required", 400, "missingFields");
    }

    const target = await resolveTarget({
      userId,
      countryCode: inputCode,
      phone: inputPhone,
    });

    const countryCode = target?.countryCode || inputCode;
    const phone = target?.phone || inputPhone;

    const result = verifyOtp({ flow, countryCode, phone, otp });

    if (!result.ok) {
      return errorResponse(res, result.message, 400, result.code);
    }

    return successResponse(res, result.message, { verified: true });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   রেজিস্টার
   ========================= */

router.post("/register", authLimiter, async (req, res) => {
  try {
    const site = siteOf(req.body);
    const userId = text(req.body?.userId).toLowerCase();
    const password = text(req.body?.password);
    const countryCode = normalizeCountryCode(req.body?.countryCode);
    const phone = normalizePhone(req.body?.phone, countryCode);
    const referralCode = text(req.body?.referralCode).toUpperCase();

    /*
     * ফোন কখন লাগবে: অ্যাফিলিয়েটে সবসময় (BetChokkor এর মতো), খেলোয়াড়ের
     * সাইটে শুধু admin নিবন্ধনে OTP চালু রাখলে — মূল সাইটের নিবন্ধনে ফোন নেই।
     */
    const otpOnRegister = await isOtpRequired(site, "register");
    const needPhone = site === "affiliate" || otpOnRegister;

    if (!userId || !password || (needPhone && !phone)) {
      return errorResponse(res, "Please fill in all required fields", 400, "missingFields");
    }

    if (phone && !isValidPhone(countryCode, phone)) {
      return errorResponse(res, "Phone number is not valid", 400, "badPhone");
    }

    if (userId.length < 4 || userId.length > 15) {
      return errorResponse(res, "Username must be 4 to 15 characters", 400, "usernameLength");
    }

    // অ্যাডমিনের এডিট পেজেও ঠিক এই নিয়ম — নইলে এখানে বানানো নাম
    // ওখানে বদলাতে গিয়ে আটকে যেত
    if (!/^[a-z0-9]+$/.test(userId)) {
      return errorResponse(
        res,
        "Username allows only letters and numbers",
        400,
        "usernameChars",
      );
    }

    if (password.length < MIN_PASSWORD) {
      return errorResponse(
        res,
        `Password must be at least ${MIN_PASSWORD} characters`,
        400,
        "passwordTooShort",
      );
    }

    /*
     * খেলোয়াড়ের সাইটে ক্যাপচা (মূল সাইটের মতো); অ্যাফিলিয়েট সাইট
     * BetChokkor এর মতোই, সেখানে ক্যাপচা নেই। বাকি যাচাইয়ের আগে দেখা হয়,
     * যাতে বট দিয়ে কোন ইউজারনেম আছে তা খুঁজে বের করা না যায়।
     */
    if (site === "client") {
      const captcha = checkCaptcha(req.body?.captchaId, req.body?.captcha);
      if (!captcha.ok) {
        return errorResponse(res, "Captcha is not correct", 400, captcha.code);
      }
    }

    if (await User.exists({ userId })) {
      return errorResponse(res, "This username is taken", 409, "usernameTaken");
    }

    if (phone && (await User.exists({ countryCode, phone }))) {
      return errorResponse(res, "This number already has an account", 409, "phoneTaken");
    }

    // OTP চালু থাকলে আগে যাচাই হয়ে থাকতে হবে
    if (otpOnRegister) {
      if (!isVerified({ flow: "register", countryCode, phone })) {
        return errorResponse(res, "Please verify the OTP first", 400, "otpNotVerified");
      }
    }

    let referrer = null;

    if (referralCode) {
      referrer = await User.findOne({ referralCode });

      if (!referrer) {
        return errorResponse(res, "Referral code is not valid", 400, "badReferral");
      }
    }

    const user = await User.create({
      userId,
      role: roleOf(site),
      // অ্যাফিলিয়েট অ্যাডমিনের অনুমোদনের অপেক্ষায় থাকেন
      affiliateStatus: site === "affiliate" ? "pending" : "approved",
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      countryCode,
      phone: phone || "",
      isPhoneVerified: Boolean(phone && otpOnRegister),
      referralCode: await makeReferralCode(),
      userGamePlayName: await makeGamePlayName(),
      referredBy: referrer?._id || null,
      firstName: text(req.body?.firstName),
      lastName: text(req.body?.lastName),
      email: text(req.body?.email).toLowerCase(),
    });

    // নিবন্ধনের টিকিট (admin সেট করলে) — খেলোয়াড়ের সাইটে
    if (user.role === "user") await onRegisterReward(user).catch((error) => console.error("Register reward failed:", error.message));

    if (referrer) {
      referrer.referralCount = Number(referrer.referralCount || 0) + 1;

      /*
       * অ্যাফিলিয়েটের রেফার কমিশন — একজন খেলোয়াড় এলেই একবার।
       *
       * এটা শতাংশ নয়, মাথাপিছু নির্দিষ্ট টাকা (Bajiman এও তাই), তাই
       * হারটা সরাসরি জমার ঘরে যোগ হয়। আগে শুধু `referralCount`
       * বাড়ত, ফলে অ্যাডমিনের বসানো "Refer commission" হারটা কোথাও
       * কাজেই লাগত না।
       *
       * শুধু অনুমোদিত অ্যাফিলিয়েটের বেলায় — খেলোয়াড় খেলোয়াড়কে
       * রেফার করলে সেটা আলাদা রেফারেল প্রোগ্রামের হিসাব।
       */
      if (
        referrer.role === "aff-user" &&
        referrer.affiliateStatus === "approved" &&
        referrer.isActive
      ) {
        const perHead = Math.max(0, Number(referrer.referCommission) || 0);

        if (perHead > 0) {
          referrer.referCommissionBalance =
            Math.round(
              (Number(referrer.referCommissionBalance || 0) + perHead) * 100,
            ) / 100;
        }
      }

      await referrer.save();
    }

    clearOtp({ flow: "register", countryCode, phone });

    /*
     * অ্যাফিলিয়েট সাথে সাথে ঢুকতে পারেন না — টোকেনই দেওয়া হয় না।
     *
     * অ্যাডমিন কমিশনের হার বসিয়ে অনুমোদন দেওয়ার আগে ঢুকতে দিলে
     * ড্যাশবোর্ডে সব শূন্য দেখাত, আর তিনি খেলোয়াড় আনতে শুরু করে
     * দিতেন — অথচ হার শূন্য বলে কোনো কমিশনই জমত না।
     */
    if (site === "affiliate") {
      return successResponse(
        res,
        "Your application is under review",
        { pending: true, user: user.toSafeJSON() },
        201,
      );
    }

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || "";
    await user.save();

    // রেজিস্টার বোনাস (চালু ক্যাম্পেইন থাকলে) — শুধু খেলোয়াড়; ব্যালেন্স বদলায় বলে নতুন করে পড়া
    const bonus = await grantRegisterBonus(user._id);
    const fresh = bonus ? (await User.findById(user._id)) || user : user;

    return successResponse(
      res,
      "Registration successful",
      { token: issueToken(fresh), user: fresh.toSafeJSON(), bonus },
      201,
    );
  } catch (error) {
    if (error?.code === 11000) {
      return errorResponse(res, "This account already exists", 409, "accountExists");
    }

    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   লগইন
   ========================= */

router.post("/login", authLimiter, async (req, res) => {
  try {
    const site = siteOf(req.body);
    const userId = text(req.body?.userId).toLowerCase();
    const password = text(req.body?.password);

    if (!userId || !password) {
      return errorResponse(res, "Username and password are required", 400, "missingFields");
    }

    const user = await User.findOne({ userId }).select(
      "+password +failedLoginAttempts +lockedUntil",
    );

    // অ্যাকাউন্ট নেই আর পাসওয়ার্ড ভুল — একই বার্তা, যাতে কোন ইউজারনেম
    // আছে সেটা বাইরে থেকে যাচাই করা না যায়
    if (!user) {
      return errorResponse(res, "Username or password is not correct", 401, "badLogin");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return errorResponse(
        res,
        `Account locked. Try again in ${minutes} minute(s).`,
        423,
        "accountLocked",
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED) {
        user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        user.failedLoginAttempts = 0;
      }

      await user.save();

      return errorResponse(res, "Username or password is not correct", 401, "badLogin");
    }

    if (!user.isActive) {
      return errorResponse(res, "This account is disabled", 403, "accountDisabled");
    }

    /*
     * খেলোয়াড়ের অ্যাকাউন্ট দিয়ে অ্যাফিলিয়েট সাইটে (বা উল্টোটা) ঢোকা
     * যাবে না। একই বার্তা দেওয়া হয় — নইলে বাইরে থেকে যাচাই করা যেত
     * কোন ইউজারনেমটা কোন ধরনের অ্যাকাউন্ট।
     */
    if (user.role !== roleOf(site)) {
      return errorResponse(res, "Username or password is not correct", 401, "badLogin");
    }

    /*
     * অনুমোদন না হওয়া পর্যন্ত অ্যাফিলিয়েট ঢুকতে পারেন না।
     *
     * পাসওয়ার্ড মেলার পরেই এই কথাটা বলা হয় — তাই কোন ইউজারনেমটা
     * আছে সেটা বাইরে থেকে যাচাই করা যায় না, অথচ যিনি সত্যিই
     * আবেদন করেছেন তিনি জানেন কেন আটকাচ্ছে।
     */
    if (user.role === "aff-user" && user.affiliateStatus !== "approved") {
      const rejected = user.affiliateStatus === "rejected";

      return errorResponse(
        res,
        rejected
          ? text(user.affiliateNote) || "Your application was not accepted"
          : "Your application is still under review",
        403,
        rejected ? "affiliateRejected" : "affiliatePending",
      );
    }

    // লগইনে OTP চালু থাকলে যাচাই হয়ে থাকতে হবে
    // নম্বর না থাকলে কোড পাঠানোর জায়গা নেই — তখন শুধু পাসওয়ার্ডেই
    if (user.phone && (await isOtpRequired(site, "login"))) {
      if (!isVerified({ flow: "login", countryCode: user.countryCode, phone: user.phone })) {
        // পুরো নম্বর ফেরত যায় না — কোড চাওয়ার সময় ক্লায়েন্ট শুধু
        // ইউজারনেম পাঠায়, নম্বরটা সার্ভারই খুঁজে নেয়
        return successResponse(res, "OTP verification needed", {
          otpRequired: true,
          maskedPhone: maskPhone(user.phone),
        });
      }

      clearOtp({ flow: "login", countryCode: user.countryCode, phone: user.phone });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || "";
    await user.save();

    return successResponse(res, "Login successful", {
      token: issueToken(user),
      user: user.toSafeJSON(),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   পাসওয়ার্ড ভুলে গেলে
   ========================= */

router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const site = siteOf(req.body);
    const userId = text(req.body?.userId);
    const inputCode = normalizeCountryCode(req.body?.countryCode);
    const inputPhone = normalizePhone(req.body?.phone, inputCode);
    const newPassword = text(req.body?.newPassword);

    if ((!inputPhone && !userId) || !newPassword) {
      return errorResponse(res, "Account and new password are required", 400, "missingFields");
    }

    if (newPassword.length < MIN_PASSWORD) {
      return errorResponse(
        res,
        `Password must be at least ${MIN_PASSWORD} characters`,
        400,
        "passwordTooShort",
      );
    }

    const target = await resolveTarget({
      userId,
      countryCode: inputCode,
      phone: inputPhone,
    });

    const user = target?.user;

    if (!user) return errorResponse(res, "No account found", 404, "noAccount");

    const countryCode = target.countryCode;
    const phone = target.phone;

    // OTP ছাড়া কখনো নয় — BetChokkor এ OTP বন্ধ থাকলে এখানে কোনো যাচাইই
    // থাকত না, শুধু ইউজারনেম জানলেই অন্যের পাসওয়ার্ড বদলানো যেত
    if (!phone || !(await isOtpRequired(site, "forgotPassword"))) {
      return errorResponse(res, "Password reset is not available, contact support", 400, "forgotUnavailable");
    }

    if (!isVerified({ flow: "forgotPassword", countryCode, phone })) {
      return errorResponse(res, "Please verify the OTP first", 400, "otpNotVerified");
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    // ফেরত আনার পর আগের সব লগইন বন্ধ — চোর ঢুকে থাকলে সেও বেরিয়ে যায়
    user.passwordChangedAt = new Date();
    await user.save();

    clearOtp({ flow: "forgotPassword", countryCode, phone });

    return successResponse(res, "Password changed. Please log in.");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   নিজের তথ্য
   ========================= */

router.get("/me", protectUser, async (req, res) =>
  successResponse(res, "Profile loaded", { user: req.user.toSafeJSON() }),
);

export default router;
