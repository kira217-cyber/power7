import express from "express";
import bcrypt from "bcryptjs";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import Admin from "../models/Admin.js";
import generateToken from "../utils/generateToken.js";
import { successResponse, errorResponse } from "../utils/response.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD = 8;

// পরপর এতবার ভুল হলে অ্যাকাউন্ট এতক্ষণের জন্য লক
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const LOGIN_WINDOW_MINUTES = 15;

// ডেভেলপমেন্টে বারবার লগইন করতে হয়, তাই সীমাটা ঢিলে
const MAX_LOGIN_FAILURES = process.env.NODE_ENV === "production" ? 20 : 100;

/**
 * brute force ঠেকাতে লগইন চেষ্টার সীমা।
 *
 * দুটো জিনিস ইচ্ছে করেই এরকম:
 *
 * ১. **সফল লগইন গোনা হয় না।** brute force মানেই *ব্যর্থ* চেষ্টা; সঠিক
 *    পাসওয়ার্ড দিয়ে ঢোকাটাকে শাস্তি দেওয়ার মানে নেই। আগে গোনা হতো
 *    বলে কয়েকবার ঠিকঠাক লগইন করলেই "Too many login attempts" এসে
 *    যেত।
 *
 * ২. **হিসাব IP + ইমেইল ধরে**, শুধু IP ধরে নয়। একই নেটওয়ার্ক বা
 *    লোকালহোস্টে একজনের ভুল টাইপিংয়ে বাকিরা আটকে যাক, সেটা চাই না।
 *    এক ইমেইলে একটানা অনুমান চালানো তবু আটকায়, আর তার উপরে
 *    অ্যাকাউন্ট-লকটা (৫ বার ভুল → ১৫ মিনিট) তো আছেই।
 */
const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MINUTES * 60 * 1000,
  limit: MAX_LOGIN_FAILURES,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").toLowerCase().trim();

    // ipKeyGenerator — IPv6 ঠিকানা সাবনেট ধরে গোছায়
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
  handler: (req, res) => {
    const resetAt = req.rateLimit?.resetTime;
    const minutes = resetAt
      ? Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60000))
      : LOGIN_WINDOW_MINUTES;

    // কতক্ষণ পরে আবার চেষ্টা করা যাবে সেটা বলে দিই — "later" বলে
    // ছেড়ে দিলে কেউ জানে না কতক্ষণ অপেক্ষা করতে হবে
    return errorResponse(
      res,
      `Too many failed login attempts. Please try again in ${minutes} minute${
        minutes === 1 ? "" : "s"
      }.`,
      429,
    );
  },
});

const isStrongEnough = (password) =>
  typeof password === "string" && password.trim().length >= MIN_PASSWORD;

/** লগইন পেজে দেখানো ডেমো অ্যাকাউন্ট — .env থেকে, ডেটাবেসে নয় */
const demoEmail = () =>
  String(process.env.DEMO_ADMIN_EMAIL || "").toLowerCase().trim();

const isDemoAccount = (email) => Boolean(demoEmail()) && email === demoEmail();

/* =========================
   প্রথম mother অ্যাডমিন
   ========================= */

/**
 * ডেটাবেসে একটাও অ্যাডমিন না থাকলেই কেবল কাজ করে। একবার অ্যাডমিন
 * তৈরি হয়ে গেলে এই রুট চিরতরে বন্ধ, তাই খোলা থাকলেও ঝুঁকি নেই।
 */
router.post("/create-first-time", async (req, res) => {
  try {
    const totalAdmins = await Admin.estimatedDocumentCount();

    if (totalAdmins > 0) {
      return errorResponse(res, "First admin already created", 403);
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
      return errorResponse(res, "Email and password required", 400);
    }

    if (!isStrongEnough(password)) {
      return errorResponse(
        res,
        `Password must be at least ${MIN_PASSWORD} characters`,
        400,
      );
    }

    const admin = await Admin.create({
      email: String(email).toLowerCase().trim(),
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: "mother",
      permissions: [],
    });

    return successResponse(
      res,
      "First mother admin created successfully",
      { admin: admin.toSafeJSON() },
      201,
    );
  } catch (error) {
    if (error?.code === 11000) {
      return errorResponse(res, "Email already exists", 409);
    }

    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   ডেমো ক্রেডেনশিয়াল
   ========================= */

/**
 * লগইন পেজে একসাথে একটাই অ্যাকাউন্ট দেখানো হয়। নতুন একটায় টিক দিলে
 * আগেরগুলোর টিক উঠে যায়, নইলে কোনটা দেখাবে তার কোনো ঠিক থাকত না।
 * পাসওয়ার্ডও মুছে দিই — দেখানোর দরকার না থাকলে পড়ার মতো করে রাখাও নয়।
 */
const clearOtherDemoAccounts = (keepId = null) => {
  const filter = { showOnLogin: true };

  if (keepId) {
    filter._id = { $ne: keepId };
  }

  return Admin.updateMany(filter, { showOnLogin: false, demoPassword: "" });
};

/**
 * লগইন পেজের ডেমো বাক্সের জন্য। ইচ্ছে করেই খোলা রুট — এই অ্যাকাউন্টের
 * পাসওয়ার্ড সবাইকে দেখানোই উদ্দেশ্য।
 *
 * উৎস দুটো, এই ক্রমে:
 *   ১. প্যানেলে "Show on login page" টিক দেওয়া viewer অ্যাকাউন্ট
 *   ২. `.env` এর DEMO_ADMIN_EMAIL/PASSWORD (পুরোনো পথ)
 *
 * দুই ক্ষেত্রেই **রোল viewer** আর অ্যাকাউন্ট সক্রিয় থাকতে হবে, তাই ভুল
 * করেও mother বা sub অ্যাকাউন্টের পাসওয়ার্ড এখান দিয়ে বেরোতে পারে না।
 * অ্যাকাউন্টটি মুছে ফেললে, নিষ্ক্রিয় করলে, রোল বদলালে বা টিক তুলে
 * নিলে বাক্সটা নিজে থেকেই মিলিয়ে যায়।
 */
router.get("/demo-credentials", async (req, res) => {
  try {
    // ১) প্যানেল থেকে চিহ্নিত viewer অ্যাকাউন্ট — এটাই সাধারণ পথ
    const flagged = await Admin.findOne({
      role: "viewer",
      showOnLogin: true,
      isActive: true,
    })
      .select("email +demoPassword")
      .lean();

    if (flagged?.demoPassword) {
      return successResponse(res, "Demo credentials loaded", {
        demo: { email: flagged.email, password: flagged.demoPassword },
      });
    }

    // ২) পুরোনো পথ — `.env` এ ইমেইল/পাসওয়ার্ড দেওয়া থাকলে
    const email = demoEmail();
    const password = process.env.DEMO_ADMIN_PASSWORD || "";

    if (!email || !password) {
      return successResponse(res, "No demo account configured", { demo: null });
    }

    const admin = await Admin.findOne({ email }).select("role isActive").lean();

    if (!admin || admin.role !== "viewer" || !admin.isActive) {
      return successResponse(res, "No demo account available", { demo: null });
    }

    return successResponse(res, "Demo credentials loaded", {
      demo: { email, password },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   লগইন
   ========================= */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return errorResponse(res, "Email and password required", 400);
    }

    const admin = await Admin.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+password +failedLoginAttempts +lockedUntil");

    // অ্যাকাউন্ট নেই আর পাসওয়ার্ড ভুল — একই বার্তা, যাতে কোন ইমেইল
    // আছে সেটা বাইরে থেকে যাচাই করা না যায়
    if (!admin) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    // ডেমো অ্যাকাউন্টের পাসওয়ার্ড লগইন পেজেই লেখা থাকে, তাই লক করে
    // brute force ঠেকানোর কিছু নেই — উল্টো যে কেউ ইচ্ছে করে ভুল পাসওয়ার্ড
    // দিয়ে ডেমো বন্ধ করে দিতে পারত
    const skipLock = isDemoAccount(admin.email);

    if (!skipLock && admin.lockedUntil && admin.lockedUntil > new Date()) {
      const minutes = Math.ceil((admin.lockedUntil - Date.now()) / 60000);

      return errorResponse(
        res,
        `Account locked. Try again in ${minutes} minute(s).`,
        423,
      );
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;

      if (!skipLock && admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        admin.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        admin.failedLoginAttempts = 0;
      }

      await admin.save();

      return errorResponse(res, "Invalid email or password", 401);
    }

    if (!admin.isActive) {
      return errorResponse(res, "This admin account is disabled", 403);
    }

    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateToken({
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    return successResponse(res, "Login successful", {
      token,
      admin: admin.toSafeJSON(),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   নিজের প্রোফাইল
   ========================= */
router.get("/profile", protectAdmin, async (req, res) => {
  return successResponse(res, "Profile loaded", {
    admin: req.admin.toSafeJSON(),
  });
});

router.put("/profile", protectAdmin, requireWrite, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body || {};

    const admin = await Admin.findById(req.admin._id).select("+password");

    if (!admin) {
      return errorResponse(res, "Admin not found", 404);
    }

    const nextEmail =
      typeof email === "string" && email.trim()
        ? email.toLowerCase().trim()
        : admin.email;

    const wantEmailChange = nextEmail !== admin.email;
    const wantPasswordChange =
      typeof newPassword === "string" && newPassword.trim().length > 0;

    if (!wantEmailChange && !wantPasswordChange) {
      return errorResponse(res, "Nothing to update", 400);
    }

    if (!currentPassword) {
      return errorResponse(res, "Current password is required", 400);
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);

    if (!isMatch) {
      return errorResponse(res, "Current password is incorrect", 400);
    }

    if (wantEmailChange) {
      const exists = await Admin.findOne({ email: nextEmail });

      if (exists && String(exists._id) !== String(admin._id)) {
        return errorResponse(res, "Email already in use", 409);
      }

      admin.email = nextEmail;
    }

    if (wantPasswordChange) {
      if (!isStrongEnough(newPassword)) {
        return errorResponse(
          res,
          `New password must be at least ${MIN_PASSWORD} characters`,
          400,
        );
      }

      admin.password = await bcrypt.hash(newPassword.trim(), BCRYPT_ROUNDS);
    }

    await admin.save();

    return successResponse(res, "Profile updated successfully", {
      admin: admin.toSafeJSON(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return errorResponse(res, "Email already exists", 409);
    }

    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   অ্যাডমিন ব্যবস্থাপনা (শুধু mother)
   ========================= */
router.get("/admins", protectAdmin, requireMother, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select("_id email role permissions isActive showOnLogin lastLoginAt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, "Admins loaded successfully", { admins });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post(
  "/admins",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const { email, password, role, permissions, showOnLogin } = req.body || {};

      if (!email || !password) {
        return errorResponse(res, "Email and password required", 400);
      }

      if (!isStrongEnough(password)) {
        return errorResponse(
          res,
          `Password must be at least ${MIN_PASSWORD} characters`,
          400,
        );
      }

      const normalizedEmail = String(email).toLowerCase().trim();

      if (await Admin.exists({ email: normalizedEmail })) {
        return errorResponse(res, "Admin already exists", 409);
      }

      const finalRole = ["mother", "viewer"].includes(role) ? role : "sub";

      // লগইন পেজে দেখানো যায় শুধু viewer অ্যাকাউন্ট — যেটা কিছুই
      // বদলাতে পারে না
      const asDemo = finalRole === "viewer" && Boolean(showOnLogin);

      if (asDemo) {
        await clearOtherDemoAccounts();
      }

      const admin = await Admin.create({
        email: normalizedEmail,
        password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        role: finalRole,
        // mother ও viewer সব পেজেই ঢোকে, তাই আলাদা তালিকা লাগে না
        permissions:
          finalRole === "sub" && Array.isArray(permissions) ? permissions : [],
        showOnLogin: asDemo,
        // পাসওয়ার্ডটা পড়ার মতো করে শুধু এখানেই — লগইন পেজে দেখাতে হয়
        demoPassword: asDemo ? password : "",
      });

      return successResponse(
        res,
        "Admin created successfully",
        { admin: admin.toSafeJSON() },
        201,
      );
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(res, "Email already exists", 409);
      }

      return errorResponse(res, error.message, 500);
    }
  },
);

router.put(
  "/admins/:id",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const { email, role, permissions, newPassword, isActive, showOnLogin } =
        req.body || {};

      const target = await Admin.findById(req.params.id).select(
        "+demoPassword",
      );

      if (!target) {
        return errorResponse(res, "Admin not found", 404);
      }

      const isSelf = String(target._id) === String(req.admin._id);

      // নিজের role বা isActive বদলে ফেললে নিজেকেই বের করে দেওয়ার
      // ঝুঁকি থাকে, তাই সেটা আটকানো
      if (isSelf && (role !== undefined || isActive !== undefined)) {
        return errorResponse(
          res,
          "You cannot change your own role or status",
          400,
        );
      }

      if (typeof email === "string" && email.trim()) {
        const normalizedEmail = email.toLowerCase().trim();

        const exists = await Admin.findOne({ email: normalizedEmail });

        if (exists && String(exists._id) !== String(target._id)) {
          return errorResponse(res, "Email already in use", 409);
        }

        target.email = normalizedEmail;
      }

      if (typeof role === "string") {
        target.role = ["mother", "viewer"].includes(role) ? role : "sub";

        if (target.role !== "sub") {
          target.permissions = [];
        }

        // viewer থেকে সরে গেলে আর লগইন পেজে দেখানো চলে না
        if (target.role !== "viewer") {
          target.showOnLogin = false;
          target.demoPassword = "";
        }
      }

      if (Array.isArray(permissions) && target.role === "sub") {
        target.permissions = permissions;
      }

      if (typeof isActive === "boolean") {
        target.isActive = isActive;
      }

      if (typeof newPassword === "string" && newPassword.trim()) {
        if (!isStrongEnough(newPassword)) {
          return errorResponse(
            res,
            `New password must be at least ${MIN_PASSWORD} characters`,
            400,
          );
        }

        target.password = await bcrypt.hash(
          newPassword.trim(),
          BCRYPT_ROUNDS,
        );

        // ডেমো অ্যাকাউন্ট হলে লগইন পেজে দেখানো পাসওয়ার্ডটাও বদলাতে
        // হবে, নইলে পেজে পুরোনোটা দেখিয়ে লগইন ব্যর্থ হতো
        if (target.showOnLogin && target.role === "viewer") {
          target.demoPassword = newPassword.trim();
        }

        // পাসওয়ার্ড বদলালে আগের লক আর ব্যর্থ গণনা মুছে যায়
        target.failedLoginAttempts = 0;
        target.lockedUntil = null;
      }

      if (typeof showOnLogin === "boolean") {
        if (!showOnLogin) {
          target.showOnLogin = false;
          target.demoPassword = "";
        } else if (target.role !== "viewer") {
          return errorResponse(
            res,
            "Only a view only admin can be shown on the login page",
            400,
          );
        } else {
          // চালু করতে হলে পাসওয়ার্ডটা জানা দরকার — হ্যাশ থেকে ফেরত
          // আনা যায় না, তাই এই অনুরোধেই নতুন পাসওয়ার্ড দিতে হয়
          const known =
            (typeof newPassword === "string" && newPassword.trim()) ||
            target.demoPassword;

          if (!known) {
            return errorResponse(
              res,
              "Set a new password in the same request to show it on the login page",
              400,
            );
          }

          await clearOtherDemoAccounts(target._id);

          target.showOnLogin = true;
          target.demoPassword = known;
        }
      }

      await target.save();

      return successResponse(res, "Admin updated successfully", {
        admin: target.toSafeJSON(),
      });
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(res, "Email already exists", 409);
      }

      return errorResponse(res, error.message, 500);
    }
  },
);

router.delete(
  "/admins/:id",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const target = await Admin.findById(req.params.id);

      if (!target) {
        return errorResponse(res, "Admin not found", 404);
      }

      if (String(target._id) === String(req.admin._id)) {
        return errorResponse(res, "You cannot delete your own account", 400);
      }

      // শেষ mother অ্যাডমিন মুছে গেলে প্যানেলে আর কেউ ঢুকতে পারবে না
      if (target.role === "mother") {
        const motherCount = await Admin.countDocuments({ role: "mother" });

        if (motherCount <= 1) {
          return errorResponse(res, "Cannot delete the last mother admin", 400);
        }
      }

      await Admin.deleteOne({ _id: target._id });

      return successResponse(res, "Admin deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
