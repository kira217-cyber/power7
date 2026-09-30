import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";

import AppSetting from "../models/AppSetting.js";
import { protectAdmin, requireMother, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";

/**
 * অ্যাপ ডাউনলোড — `/api/app`।
 *   GET  /public        — মডালের তথ্য (APK আছে কিনা, নাম, আকার, বর্ণনা)
 *   GET  /download      — APK, admin এর দেওয়া আসল নামে
 *   admin (mother): তথ্য, APK আপলোড/মোছা, বর্ণনা ও চালু-বন্ধ
 */
const router = express.Router();

const APK_DIR = path.join("private", "apk");
if (!fs.existsSync(APK_DIR)) fs.mkdirSync(APK_DIR, { recursive: true });

const MAX_MB = 300;

// ডিস্কে এলোমেলো নাম (`../` বা একই নামে মুছে যাওয়ার ঝুঁকি নেই); আসল নাম ডাটাবেসে
const apkUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, APK_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.apk`),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname || "").toLowerCase() !== ".apk") return cb(new Error("Only .apk files can be uploaded"));
    cb(null, true);
  },
});

/** multer নামটা latin1 হিসেবে পড়ে — বাংলা/ইউনিকোড নাম ঠিক রাখতে utf8 এ ফেরানো */
const originalName = (file) => {
  const raw = Buffer.from(file.originalname || "app.apk", "latin1").toString("utf8");
  // পথের অংশ আর নিয়ন্ত্রণ-অক্ষর বাদ, নাম যেমন ছিল তেমনই
  const base = path.basename(raw).replace(/[\u0000-\u001f\u007f"\\/]/g, "").trim();
  return base.toLowerCase().endsWith(".apk") ? base.slice(0, 200) : `${base.slice(0, 196)}.apk`;
};

const removeStored = (name) => {
  if (!name) return;
  fs.promises.unlink(path.join(APK_DIR, path.basename(name))).catch(() => {});
};

const publicOf = (s) => ({
  enabled: s.enabled,
  hasApk: Boolean(s.enabled && s.apk?.storedName),
  fileName: s.apk?.fileName || "",
  size: s.apk?.size || 0,
  version: s.apk?.version || "",
  uploadedAt: s.apk?.uploadedAt || null,
  description: s.description,
  showWebApp: s.showWebApp,
});

router.get("/public", async (req, res) => {
  try {
    const s = await AppSetting.current();
    return successResponse(res, "App", publicOf(s));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/download", async (req, res) => {
  try {
    const s = await AppSetting.current();
    const stored = s.apk?.storedName;
    if (!s.enabled || !stored) return errorResponse(res, "The app is not available right now", 404);
    const file = path.resolve(APK_DIR, path.basename(stored));
    if (!fs.existsSync(file)) return errorResponse(res, "The app file is missing", 404);

    const name = s.apk.fileName || "app.apk";
    // ASCII ফাইলনাম (পুরোনো ব্রাউজার) + UTF-8 নাম (RFC 5987) — দুটোই admin এর নাম
    const ascii = name.replace(/[^\x20-\x7e]/g, "_");
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.setHeader("Content-Length", fs.statSync(file).size);
    res.setHeader("Cache-Control", "no-store");
    AppSetting.updateOne({ key: "main" }, { $inc: { downloads: 1 } }).catch(() => {});
    return fs.createReadStream(file).pipe(res);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ─────────────────── admin ─────────────────── */

const guard = [protectAdmin, requireMother];
const writeGuard = [...guard, requireWrite];

router.get("/admin", ...guard, async (req, res) => {
  try {
    const s = await AppSetting.current();
    return successResponse(res, "App setting", { setting: { ...publicOf(s), downloads: s.downloads } });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post(
  "/admin/apk",
  ...writeGuard,
  (req, res, next) =>
    apkUpload.single("apk")(req, res, (err) => {
      if (!err) return next();
      const msg = err.code === "LIMIT_FILE_SIZE" ? `The file is bigger than ${MAX_MB} MB` : err.message;
      return errorResponse(res, msg, 400);
    }),
  async (req, res) => {
    try {
      if (!req.file) return errorResponse(res, "Choose an .apk file", 400);
      const s = await AppSetting.current();
      const old = s.apk?.storedName;
      s.apk = {
        fileName: originalName(req.file),
        storedName: req.file.filename,
        size: req.file.size,
        version: String(req.body?.version || "").trim().slice(0, 30),
        uploadedAt: new Date(),
      };
      await s.save();
      if (old && old !== req.file.filename) removeStored(old);
      return successResponse(res, "APK uploaded", { setting: { ...publicOf(s), downloads: s.downloads } });
    } catch (error) {
      if (req.file) removeStored(req.file.filename);
      return errorResponse(res, error.message, 500);
    }
  },
);

router.delete("/admin/apk", ...writeGuard, async (req, res) => {
  try {
    const s = await AppSetting.current();
    removeStored(s.apk?.storedName);
    s.apk = { fileName: "", storedName: "", size: 0, version: "", uploadedAt: null };
    await s.save();
    return successResponse(res, "APK removed", { setting: { ...publicOf(s), downloads: s.downloads } });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin", ...writeGuard, async (req, res) => {
  try {
    const b = req.body || {};
    const text = (v, n) => String(v ?? "").trim().slice(0, n);
    const s = await AppSetting.current();
    if (b.enabled !== undefined) s.enabled = Boolean(b.enabled);
    if (b.showWebApp !== undefined) s.showWebApp = Boolean(b.showWebApp);
    if (b.description) s.description = { bn: text(b.description.bn, 300), en: text(b.description.en, 300) };
    if (b.version !== undefined && s.apk?.storedName) s.apk.version = text(b.version, 30);
    await s.save();
    return successResponse(res, "Saved", { setting: { ...publicOf(s), downloads: s.downloads } });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
