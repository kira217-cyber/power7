import fs from "node:fs";
import path from "node:path";
import express from "express";

import AffiliateAuth from "../models/AffiliateAuth.js";
import upload from "../config/multer.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const text = (v) => String(v ?? "").trim();
const langText = (o) => ({ bn: text(o?.bn), en: text(o?.en) });
const parseMaybe = (v) => {
  if (typeof v !== "string") return v || {};
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
};
const fileUrl = (f) => (f ? `/uploads/${f.filename}` : "");
const removeImage = (url) => {
  if (!url || !url.startsWith("/uploads/")) return;
  fs.promises.unlink(path.join("uploads", path.basename(url))).catch(() => {});
};

const PAGES = ["login", "register", "forgot"];

const toJSON = (doc) => ({
  login: doc.login || {},
  register: doc.register || {},
  forgot: doc.forgot || {},
});

/* ── পাবলিক ── */
router.get("/public", async (req, res) => {
  try {
    const doc = await AffiliateAuth.current();
    return successResponse(res, "Affiliate auth", toJSON(doc));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ── অ্যাডমিন ── */
router.get("/admin", protectAdmin, requireMother, async (req, res) => {
  try {
    const doc = await AffiliateAuth.current();
    return successResponse(res, "Affiliate auth", toJSON(doc));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** একটা পেজ (login/register) সেভ — multipart, ছবি ফিল্ড "image" */
router.put(
  "/admin/:page",
  protectAdmin,
  requireMother,
  requireWrite,
  upload.single("image"),
  async (req, res) => {
    try {
      const page = req.params.page;
      if (!PAGES.includes(page)) return errorResponse(res, "Bad page", 400);

      const doc = await AffiliateAuth.current();
      const body = parseMaybe(req.body.content);
      const prev = doc[page]?.image || "";

      const next = {
        title: langText(body.title),
        subtitle: langText(body.subtitle),
        footerText: langText(body.footerText),
        image: req.file ? fileUrl(req.file) : text(body.image),
      };
      doc[page] = next;
      await doc.save();

      if (prev && prev.startsWith("/uploads/") && prev !== next.image) {
        removeImage(prev);
      }

      return successResponse(res, "Saved", toJSON(doc));
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
