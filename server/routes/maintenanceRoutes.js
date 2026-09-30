import express from "express";

import MaintenanceSetting from "../models/MaintenanceSetting.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const text = (value) => String(value ?? "").trim();

/** ক্লায়েন্ট যা দেখে — চালু কিনা আর কী লেখা দেখাবে */
const publicShape = (setting) => ({
  isOn: Boolean(setting.manualOn || setting.autoOn),
  manualOn: Boolean(setting.manualOn),
  autoOn: Boolean(setting.autoOn),
  title: setting.title,
  message: setting.message,
});

/* =========================
   ক্লায়েন্ট
   ========================= */

/**
 * খোলা রুট — ক্লায়েন্ট প্রতিবার লোডে এটা ডাকে।
 *
 * কিছু ভুল হলেও এখানে এরর দেওয়া হয় না; মেইনটেন্যান্স জানতে না পারলে
 * সাইট বন্ধ দেখানোর চেয়ে খোলা দেখানোই ভালো।
 */
router.get("/status", async (req, res) => {
  try {
    const setting = await MaintenanceSetting.current();
    return successResponse(res, "Maintenance status", publicShape(setting));
  } catch {
    return successResponse(res, "Maintenance status unavailable", {
      isOn: false,
      manualOn: false,
      autoOn: false,
    });
  }
});

/* =========================
   অ্যাডমিন
   ========================= */

router.get("/", protectAdmin, requireMother, async (req, res) => {
  try {
    const setting = await MaintenanceSetting.current();

    return successResponse(res, "Maintenance setting loaded", {
      setting: {
        ...publicShape(setting),
        autoReason: setting.autoReason,
        autoTriggeredAt: setting.autoTriggeredAt,
        autoClearedAt: setting.autoClearedAt,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** অ্যাডমিন নিজে চালু/বন্ধ করে */
router.patch(
  "/status",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const setting = await MaintenanceSetting.current();

      setting.manualOn = Boolean(req.body?.manualOn);
      await setting.save();

      return successResponse(
        res,
        setting.manualOn
          ? "Maintenance mode turned on"
          : "Maintenance mode turned off",
        { setting: publicShape(setting) },
      );
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

/**
 * অটো মেইনটেন্যান্স হাতে নামানো।
 *
 * API ঠিক হয়ে গেলে প্রথম সফল কলেই নিজে থেকে নেমে যায়, কিন্তু কেউ
 * সাইটে না ঢুকলে সেই কলটাই হয় না — তখন এটা কাজে লাগে।
 */
router.post(
  "/clear-auto",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const setting = await MaintenanceSetting.current();

      setting.autoOn = false;
      setting.autoReason = "";
      setting.autoClearedAt = new Date();
      await setting.save();

      return successResponse(res, "Auto maintenance cleared", {
        setting: publicShape(setting),
      });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

/** দেখানোর লেখা বদলানো */
router.put(
  "/message",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const setting = await MaintenanceSetting.current();

      const { title, message } = req.body || {};

      if (title) {
        setting.title = {
          bn: text(title.bn) || setting.title.bn,
          en: text(title.en) || setting.title.en,
        };
      }

      if (message) {
        setting.message = {
          bn: text(message.bn) || setting.message.bn,
          en: text(message.en) || setting.message.en,
        };
      }

      await setting.save();

      return successResponse(res, "Maintenance message updated", {
        setting: publicShape(setting),
      });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
