import express from "express";

import OtpSetting from "../models/OtpSetting.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { sendOtp } from "../utils/otp.js";

const router = express.Router();

const FLOWS = ["register", "login", "forgotPassword", "withdraw", "profileVerify"];

const pickFlows = (input = {}, current = {}) => {
  const next = {};

  FLOWS.forEach((flow) => {
    next[flow] =
      typeof input[flow] === "boolean" ? input[flow] : Boolean(current[flow]);
  });

  return next;
};

/* =========================
   ক্লায়েন্ট / অ্যাফিলিয়েট
   ========================= */

/**
 * কোন ধাপে OTP লাগবে — খোলা রুট।
 *
 * ফ্রন্টএন্ড এটা দেখে ফর্মে OTP ঘরটা দেখাবে কিনা ঠিক করে। কেবল
 * সত্য/মিথ্যা যায়, API key নয়।
 */
router.get("/flows", async (req, res) => {
  try {
    const setting = await OtpSetting.current();
    const enabled = setting.isActive && Boolean(setting.apiKey);

    const shape = (flows) => {
      const out = {};
      FLOWS.forEach((flow) => {
        out[flow] = enabled && Boolean(flows?.[flow]);
      });
      return out;
    };

    return successResponse(res, "OTP flows loaded", {
      client: shape(setting.client),
      affiliate: shape(setting.affiliate),
    });
  } catch {
    // জানা না গেলে OTP ছাড়াই চলুক — নইলে সাইটে ঢোকাই যেত না
    const off = Object.fromEntries(FLOWS.map((flow) => [flow, false]));
    return successResponse(res, "OTP flows unavailable", {
      client: off,
      affiliate: off,
    });
  }
});

/* =========================
   অ্যাডমিন
   ========================= */

router.get("/", protectAdmin, requireMother, async (req, res) => {
  try {
    const setting = await OtpSetting.current();

    return successResponse(res, "OTP setting loaded", {
      setting: setting.toSafeJSON(setting.apiKey),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** key বসানো বা বদলানো */
router.put(
  "/key",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const apiKey = String(req.body?.apiKey || "").trim();

      if (!apiKey) return errorResponse(res, "API key is required", 400);

      const setting = await OtpSetting.current();

      setting.apiKey = apiKey;
      await setting.save();

      return successResponse(res, "OTP API key saved", {
        setting: setting.toSafeJSON(apiKey),
      });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

/** টগল — কোন সাইটের কোন ফ্লোতে OTP লাগবে */
router.put(
  "/flows",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const setting = await OtpSetting.current();

      if (typeof req.body?.isActive === "boolean") {
        setting.isActive = req.body.isActive;
      }

      if (req.body?.client) {
        setting.client = pickFlows(req.body.client, setting.client);
      }

      if (req.body?.affiliate) {
        setting.affiliate = pickFlows(req.body.affiliate, setting.affiliate);
      }

      await setting.save();

      return successResponse(res, "OTP settings updated", {
        setting: setting.toSafeJSON(setting.apiKey),
      });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

/** পরীক্ষামূলক SMS — key ঠিক আছে কিনা দেখতে */
router.post(
  "/test",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const countryCode = String(req.body?.countryCode || "+880").trim();
      const phone = String(req.body?.phone || "").trim();

      if (!phone) return errorResponse(res, "Phone number is required", 400);

      const result = await sendOtp({
        site: "client",
        flow: "test",
        countryCode,
        phone,
      });

      const setting = await OtpSetting.current();

      setting.lastTestedAt = new Date();
      setting.lastTestError = result.ok ? "" : result.message;
      await setting.save();

      if (!result.ok) return errorResponse(res, result.message, 400);

      return successResponse(res, "Test OTP sent", {
        setting: setting.toSafeJSON(setting.apiKey),
      });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

router.delete(
  "/key",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const setting = await OtpSetting.current();

      setting.apiKey = "";
      await setting.save();

      return successResponse(res, "OTP API key removed", {
        setting: setting.toSafeJSON(""),
      });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
