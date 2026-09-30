import express from "express";
import fs from "node:fs";
import path from "node:path";

import upload from "../config/multer.js";
import WithdrawMethod from "../models/WithdrawMethod.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num } from "../utils/money.js";

const router = express.Router();

const text = (value) => String(value ?? "").trim();

const langText = (input = {}, current = {}) => ({
  bn: text(input?.bn) || current?.bn || "",
  en: text(input?.en) || current?.en || "",
});

/** ফর্ম-ডেটায় nested অংশ JSON স্ট্রিং হয়ে আসে */
const parseMaybeJSON = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const removeOldLogo = (logoUrl) => {
  if (!logoUrl || !logoUrl.startsWith("/uploads/")) return;

  fs.promises
    .unlink(path.join("uploads", path.basename(logoUrl)))
    .catch(() => {});
};

/* =========================
   ক্লায়েন্ট
   ========================= */

router.get("/public", async (req, res) => {
  try {
    const methods = await WithdrawMethod.find({ isActive: true })
      .sort({ sort: 1, createdAt: 1 })
      .lean();

    return successResponse(res, "Withdraw methods loaded", { methods });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   অ্যাডমিন
   ========================= */

router.get("/", protectAdmin, async (req, res) => {
  try {
    const methods = await WithdrawMethod.find()
      .sort({ sort: 1, createdAt: 1 })
      .lean();

    return successResponse(res, "Methods loaded", { methods });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post(
  "/",
  protectAdmin,
  requireMother,
  requireWrite,
  upload.single("logo"),
  async (req, res) => {
    try {
      const body = req.body || {};
      const methodId = text(body.methodId).toUpperCase();

      if (!methodId) return errorResponse(res, "Method id is required", 400);

      if (await WithdrawMethod.exists({ methodId })) {
        return errorResponse(res, "This method id already exists", 409);
      }

      const method = await WithdrawMethod.create({
        methodId,
        name: langText(parseMaybeJSON(body.name, {})),
        logoUrl: req.file ? `/uploads/${req.file.filename}` : text(body.logoUrl),
        minimumWithdrawAmount: Math.max(0, num(body.minimumWithdrawAmount)),
        maximumWithdrawAmount: Math.max(0, num(body.maximumWithdrawAmount)),
        sort: Math.max(0, num(body.sort)),
        isActive: body.isActive !== false && body.isActive !== "false",
      });

      return successResponse(res, "Method created", { method }, 201);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

router.put(
  "/:id",
  protectAdmin,
  requireMother,
  requireWrite,
  upload.single("logo"),
  async (req, res) => {
    try {
      const method = await WithdrawMethod.findById(req.params.id);

      if (!method) return errorResponse(res, "Method not found", 404);

      const body = req.body || {};
      const name = parseMaybeJSON(body.name, null);

      if (name) method.name = langText(name, method.name);

      if (req.file) {
        removeOldLogo(method.logoUrl);
        method.logoUrl = `/uploads/${req.file.filename}`;
      } else if (body.logoUrl !== undefined) {
        const next = text(body.logoUrl);

        if (!next && method.logoUrl) removeOldLogo(method.logoUrl);

        method.logoUrl = next;
      }

      if (body.minimumWithdrawAmount !== undefined) {
        method.minimumWithdrawAmount = Math.max(
          0,
          num(body.minimumWithdrawAmount),
        );
      }

      if (body.maximumWithdrawAmount !== undefined) {
        method.maximumWithdrawAmount = Math.max(
          0,
          num(body.maximumWithdrawAmount),
        );
      }

      if (body.sort !== undefined) method.sort = Math.max(0, num(body.sort));

      if (body.isActive !== undefined) {
        method.isActive = body.isActive !== false && body.isActive !== "false";
      }

      await method.save();

      return successResponse(res, "Method updated", { method });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

router.delete(
  "/:id",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const method = await WithdrawMethod.findById(req.params.id);

      if (!method) return errorResponse(res, "Method not found", 404);

      removeOldLogo(method.logoUrl);
      await WithdrawMethod.deleteOne({ _id: method._id });

      return successResponse(res, "Method deleted");
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
