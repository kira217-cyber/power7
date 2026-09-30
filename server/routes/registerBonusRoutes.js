import express from "express";
import mongoose from "mongoose";

import RegisterBonusCampaign from "../models/RegisterBonusCampaign.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { sumPercent } from "../utils/depositCalc.js";

const router = express.Router();

const text = (value) => String(value ?? "").trim();
const num = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));

/** ফাঁকা হলে fallback, ভুল তারিখ হলে undefined (যাতে ধরা যায়) */
const dateOf = (value, fallback) => {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** তারিখ ভুল বা শেষ তারিখ শুরুর আগে হলে বার্তা */
const datesError = (start, end) => {
  if (start === undefined || end === undefined) return "Invalid date";
  if (end && start && end < start) return "End date must be after the start date";
  return "";
};

const langText = (input = {}, current = {}) => ({
  bn: text(input.bn) || current.bn || "",
  en: text(input.en) || current.en || "",
});

/** প্রোভাইডার তালিকা পরিষ্কার করে নেওয়া */
const cleanProviders = (list) => {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => ({
      providerCode: text(item?.providerCode).toUpperCase(),
      // `num()` একটাই আর্গুমেন্ট নেয় — দ্বিতীয়টা দিলে কিছুই হতো না, আর
      // শতাংশ না পাঠালে ১০০ এর বদলে ০ বসে যেত। ০ মানে ওই প্রোভাইডারের
      // নিজের কোনো ভাগ নেই, তাই বেছে দেওয়ার পরেও কিছু বদলাত না
      percent: Math.min(100, Math.max(0, num(item?.percent ?? 100))),
    }))
    .filter((item) => item.providerCode);
};

/**
 * প্রোভাইডারের শতাংশ ১০০ ছাড়ালে আটকানো।
 *
 * প্রতিটা শতাংশ সেই প্রোভাইডারের বাঁধা অংশ; যোগফল ১০০ ছাড়ালে শর্তটা
 * কী বোঝায় সেটাই অস্পষ্ট হয়ে যায়। Bonus & Turnover এও একই পরীক্ষা।
 */
const providersError = (list) =>
  sumPercent(list) > 100
    ? "Eligible providers add up to more than 100%"
    : "";

/* =========================
   ক্লায়েন্ট
   ========================= */

/** এখন চালু ক্যাম্পেইন — রেজিস্টার পেজে দেখানোর জন্য */
router.get("/active", async (req, res) => {
  try {
    const campaign = await RegisterBonusCampaign.activeOne();

    if (!campaign) return successResponse(res, "No active bonus", { campaign: null });

    return successResponse(res, "Active bonus loaded", {
      campaign: {
        id: campaign._id,
        title: campaign.title,
        description: campaign.description,
        bonusAmount: campaign.bonusAmount,
        turnoverMultiplier: campaign.turnoverMultiplier,
        turnoverRequired: campaign.bonusAmount * campaign.turnoverMultiplier,
      },
    });
  } catch {
    // জানা না গেলে বোনাস ছাড়াই রেজিস্টার চলুক
    return successResponse(res, "Bonus unavailable", { campaign: null });
  }
});

/* =========================
   অ্যাডমিন
   ========================= */

router.get("/", protectAdmin, requireMother, async (req, res) => {
  try {
    const campaigns = await RegisterBonusCampaign.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return successResponse(res, "Campaigns loaded", { campaigns });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post(
  "/",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const body = req.body || {};

      const title = langText(body.title);

      if (!title.bn && !title.en) {
        return errorResponse(res, "Title is required", 400);
      }

      const bonusAmount = Math.round(num(body.bonusAmount) * 100) / 100;

      if (bonusAmount <= 0) {
        return errorResponse(res, "Bonus amount must be more than 0", 400);
      }

      const providers = cleanProviders(body.eligibleProviders);
      const providerProblem = providersError(providers);

      if (providerProblem) return errorResponse(res, providerProblem, 400);

      const startDate = dateOf(body.startDate, new Date());
      const endDate = dateOf(body.endDate, null);
      const dateProblem = datesError(startDate, endDate);

      if (dateProblem) return errorResponse(res, dateProblem, 400);

      const campaign = await RegisterBonusCampaign.create({
        title,
        description: langText(body.description),
        bonusAmount,
        // এখানেও দ্বিতীয় আর্গুমেন্টটা কাজ করত না — গুণক না পাঠালে ১ এর
        // বদলে ০ বসত, আর ০ গুণক মানে টার্নওভারই তৈরি হতো না
        turnoverMultiplier: Math.max(0, num(body.turnoverMultiplier ?? 1)),
        eligibleProviders: providers,
        startDate,
        endDate,
        order: Math.max(0, num(body.order)),
        status: body.status === "inactive" ? "inactive" : "active",
      });

      return successResponse(res, "Campaign created", { campaign }, 201);
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
  async (req, res) => {
    try {
      if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);

      const campaign = await RegisterBonusCampaign.findById(req.params.id);

      if (!campaign) return errorResponse(res, "Campaign not found", 404);

      const body = req.body || {};

      if (body.title) campaign.title = langText(body.title, campaign.title);
      if (body.description) {
        campaign.description = langText(body.description, campaign.description);
      }

      if (body.bonusAmount !== undefined) {
        const amount = Math.round(num(body.bonusAmount) * 100) / 100;

        if (amount <= 0) {
          return errorResponse(res, "Bonus amount must be more than 0", 400);
        }

        campaign.bonusAmount = amount;
      }

      if (body.turnoverMultiplier !== undefined) {
        campaign.turnoverMultiplier = Math.max(0, num(body.turnoverMultiplier));
      }

      if (body.eligibleProviders !== undefined) {
        const providers = cleanProviders(body.eligibleProviders);
        const providerProblem = providersError(providers);

        if (providerProblem) return errorResponse(res, providerProblem, 400);

        campaign.eligibleProviders = providers;
      }

      const startDate = body.startDate !== undefined ? dateOf(body.startDate, new Date()) : campaign.startDate;
      const endDate = body.endDate !== undefined ? dateOf(body.endDate, null) : campaign.endDate;
      const dateProblem = datesError(startDate, endDate);

      if (dateProblem) return errorResponse(res, dateProblem, 400);

      campaign.startDate = startDate;
      campaign.endDate = endDate;

      if (body.order !== undefined) campaign.order = Math.max(0, num(body.order));

      if (body.status) {
        campaign.status = body.status === "inactive" ? "inactive" : "active";
      }

      await campaign.save();

      return successResponse(res, "Campaign updated", { campaign });
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
      if (!isId(req.params.id)) return errorResponse(res, "Bad id", 400);

      const campaign = await RegisterBonusCampaign.findById(req.params.id);

      if (!campaign) return errorResponse(res, "Campaign not found", 404);

      // পুরোনো ক্যাম্পেইনের TurnOver গুলো থেকে যায় — ব্যবহারকারীর
      // চলতি শর্ত মুছে ফেলা যাবে না
      await RegisterBonusCampaign.deleteOne({ _id: campaign._id });

      return successResponse(res, "Campaign deleted");
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
