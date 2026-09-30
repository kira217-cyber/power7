import express from "express";

import GameApiKeySetting from "../models/GameApiKeySetting.js";
import { protectAdmin, requireMother, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { clearCache } from "../utils/gameCache.js";
import { loadSetting, verifyWithMaster } from "../utils/masterApi.js";
import { loadProviderCatalog } from "../utils/providerCatalog.js";

/**
 * অ্যাডমিন — White-label এর API key বসানো, যাচাই, চালু/বন্ধ।
 * শুধু mother অ্যাডমিন; কী কখনো রেসপন্সে যায় না, শুধু শেষ চার অক্ষর।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();

const failMessage = (error) => error?.message || "Verify failed";

router.use(protectAdmin, requireMother);

/** বোনাসের টার্নওভারে প্রোভাইডার বাছার তালিকা (ProviderPicker) */
router.get("/admin/providers", async (req, res) => {
  try {
    return successResponse(res, "Providers loaded", { providers: await loadProviderCatalog() });
  } catch (error) {
    return errorResponse(res, error.message || "Master request failed", 502);
  }
});

router.get("/", async (req, res) => {
  try {
    const setting = await loadSetting();

    return successResponse(res, setting ? "API key setting loaded" : "No API key saved yet", {
      setting: setting ? setting.toSafeJSON(setting.apiKey) : null,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** কী বসানো বা বদলানো — সাথে সাথেই master এ যাচাই হয় */
router.post("/", requireWrite, async (req, res) => {
  try {
    const apiKey = text(req.body?.apiKey);
    if (!apiKey) return errorResponse(res, "API key is required", 400);

    let verification = { valid: false, site: null };
    let verifyError = "";

    try {
      verification = await verifyWithMaster(apiKey);
    } catch (error) {
      verifyError = failMessage(error);
    }

    // একটাই সেটিং রাখি — পুরোনোটা মুছে নতুনটা
    await GameApiKeySetting.deleteMany({});

    const setting = await GameApiKeySetting.create({
      apiKey,
      isActive: true,
      isVerified: verification.valid,
      lastVerifiedAt: verification.valid ? new Date() : null,
      lastVerifyError: verification.valid ? "" : verifyError || "Invalid API key",
      siteInfo: verification.site,
    });

    // কী বদলেছে মানে অন্য সাইটের ডেটা আসতে পারে — পুরোনো ক্যাশ বাতিল
    clearCache("game:");

    return successResponse(
      res,
      verification.valid ? "API key saved and verified" : "API key saved, but verification failed",
      { setting: setting.toSafeJSON(apiKey) },
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** আবার যাচাই */
router.post("/verify", requireWrite, async (req, res) => {
  try {
    const setting = await loadSetting();
    if (!setting?.apiKey) return errorResponse(res, "No API key saved yet", 404);

    try {
      const verification = await verifyWithMaster(setting.apiKey);
      setting.isVerified = verification.valid;
      setting.lastVerifiedAt = verification.valid ? new Date() : null;
      setting.lastVerifyError = verification.valid ? "" : "Invalid API key";
      setting.siteInfo = verification.site;
    } catch (error) {
      setting.isVerified = false;
      setting.lastVerifyError = failMessage(error);
    }

    await setting.save();
    clearCache("game:");

    return successResponse(res, setting.isVerified ? "API key is valid" : "API key is not valid", {
      setting: setting.toSafeJSON(setting.apiKey),
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** চালু / বন্ধ */
router.patch("/status", requireWrite, async (req, res) => {
  try {
    const setting = await loadSetting();
    if (!setting) return errorResponse(res, "No API key saved yet", 404);

    setting.isActive = Boolean(req.body?.isActive);
    await setting.save();
    clearCache("game:");

    return successResponse(res, "Status updated", { setting: setting.toSafeJSON(setting.apiKey) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.delete("/", requireWrite, async (req, res) => {
  try {
    await GameApiKeySetting.deleteMany({});
    clearCache("game:");
    return successResponse(res, "API key removed");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
