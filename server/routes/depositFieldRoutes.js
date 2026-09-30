import express from "express";

import DepositFieldConfig from "../models/DepositFieldConfig.js";
import DepositMethod from "../models/DepositMethod.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num } from "../utils/depositCalc.js";

const router = express.Router();

const text = (value) => String(value ?? "").trim();

const langText = (input = {}) => ({
  bn: text(input?.bn),
  en: text(input?.en),
});

const cleanInputs = (list) => {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => ({
      key: text(item?.key),
      label: langText(item?.label),
      placeholder: langText(item?.placeholder),
      type: ["number", "tel"].includes(item?.type) ? item.type : "text",
      required: item?.required !== false,
      uniqueValue: Boolean(item?.uniqueValue),
      minLength: Math.max(0, num(item?.minLength)),
      maxLength: Math.max(0, num(item?.maxLength)),
    }))
    .filter((item) => item.key);
};

/** সব মেথডের ফর্ম একসাথে — অ্যাডমিন পেজে কোনটার ফর্ম বসানো হয়েছে বোঝাতে */
router.get("/", protectAdmin, async (req, res) => {
  try {
    const configs = await DepositFieldConfig.find()
      .populate("depositMethod", "methodId methodName isActive")
      .lean();

    return successResponse(res, "Field configs loaded", { configs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/method/:methodId", protectAdmin, async (req, res) => {
  try {
    const config = await DepositFieldConfig.findOne({
      depositMethod: req.params.methodId,
    }).lean();

    return successResponse(res, "Field config loaded", {
      config: config || null,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** একটা মেথডের ফর্ম বসানো বা বদলানো — মেথডপ্রতি একটাই ডকুমেন্ট */
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

      const inputs = cleanInputs(req.body?.inputs);

      const keys = inputs.map((item) => item.key);

      if (new Set(keys).size !== keys.length) {
        return errorResponse(res, "Two fields cannot share the same key", 400);
      }

      const config = await DepositFieldConfig.findOneAndUpdate(
        { depositMethod },
        {
          depositMethod,
          instructions: langText(req.body?.instructions),
          inputs,
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      return successResponse(res, "Deposit field config saved", { config });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
