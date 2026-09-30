import express from "express";

import DepositBonusTurnover from "../models/DepositBonusTurnover.js";
import DepositMethod from "../models/DepositMethod.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num, sumPercent } from "../utils/depositCalc.js";

const router = express.Router();

const text = (value) => String(value ?? "").trim();

const langText = (input = {}) => ({
  bn: text(input?.bn),
  en: text(input?.en),
});

const cleanProviders = (list) => {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => ({
      providerCode: text(item?.providerCode).toUpperCase(),
      percent: Math.min(100, Math.max(0, num(item?.percent ?? 100))),
    }))
    .filter((item) => item.providerCode);
};

const cleanChannels = (list) => {
  if (!Array.isArray(list)) return [];

  return list.map((item, index) => ({
    id: text(item?.id) || `channel-${Date.now()}-${index}`,
    name: langText(item?.name),
    // বোনাস না থাকলে ট্যাগও নেই — "+0%" দেখালে খেলোয়াড় ভাবতেন কিছু আছে
    tagText: text(item?.tagText) || (num(item?.bonusPercent) > 0 ? `+${num(item.bonusPercent)}%` : ""),
    bonusTitle: langText(item?.bonusTitle),
    bonusPercent: Math.max(0, num(item?.bonusPercent)),
    isActive: item?.isActive !== false,
  }));
};

const cleanPromotions = (list) => {
  if (!Array.isArray(list)) return [];

  return list.map((item, index) => ({
    id: (text(item?.id) || `promotion-${Date.now()}-${index}`).toLowerCase(),
    name: langText(item?.name),
    bonusType: item?.bonusType === "percent" ? "percent" : "fixed",
    bonusValue: Math.max(0, num(item?.bonusValue)),
    turnoverMultiplier: Math.max(0, num(item?.turnoverMultiplier ?? 1)),
    bonusScope: item?.bonusScope === "first-deposit" ? "first-deposit" : "all-time",
    isActive: item?.isActive !== false,
    sort: num(item?.sort ?? index),
    eligibleProviders: cleanProviders(item?.eligibleProviders),
  }));
};

router.get("/", protectAdmin, async (req, res) => {
  try {
    const configs = await DepositBonusTurnover.find()
      .populate("depositMethod", "methodId methodName isActive")
      .lean();

    return successResponse(res, "Bonus configs loaded", { configs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/method/:methodId", protectAdmin, async (req, res) => {
  try {
    const config = await DepositBonusTurnover.findOne({
      depositMethod: req.params.methodId,
    }).lean();

    return successResponse(res, "Bonus config loaded", { config: config || null });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** একটা মেথডের বোনাস ও টার্নওভারের নিয়ম — মেথডপ্রতি একটাই ডকুমেন্ট */
router.post(
  "/",
  protectAdmin,
  requireMother,
  requireWrite,
  async (req, res) => {
    try {
      const depositMethod = text(req.body?.depositMethod);

      if (!depositMethod) {
        return errorResponse(res, "Choose a deposit method", 400);
      }

      if (!(await DepositMethod.exists({ _id: depositMethod }))) {
        return errorResponse(res, "Deposit method not found", 404);
      }

      const eligibleProviders = cleanProviders(req.body?.eligibleProviders);

      // প্রতিটা প্রোভাইডারের অংশ যোগ করে ১০০ ছাড়ালে শর্তটা কখনো পূরণ
      // হতো না — তাই এখানেই আটকানো হয়
      if (sumPercent(eligibleProviders) > 100) {
        return errorResponse(
          res,
          "Default eligible providers add up to more than 100%",
          400,
        );
      }

      const promotions = cleanPromotions(req.body?.promotions);

      for (const promo of promotions) {
        if (sumPercent(promo.eligibleProviders) > 100) {
          return errorResponse(
            res,
            `Promotion "${promo.id}" eligible providers add up to more than 100%`,
            400,
          );
        }
      }

      const config = await DepositBonusTurnover.findOneAndUpdate(
        { depositMethod },
        {
          depositMethod,
          turnoverMultiplier: Math.max(0, num(req.body?.turnoverMultiplier ?? 1)),
          eligibleProviders,
          channels: cleanChannels(req.body?.channels),
          promotions,
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      return successResponse(res, "Bonus & turnover config saved", { config });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
