import express from "express";

import DepositSetting from "../models/DepositSetting.js";
import WithdrawSetting from "../models/WithdrawSetting.js";
import DepositMethod from "../models/DepositMethod.js";
import WithdrawMethod from "../models/WithdrawMethod.js";

import { protectAdmin, requireMother, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { autoDepositStatus } from "./autoDepositRoutes.js";
import { autoWithdrawStatus } from "./autoWithdrawRoutes.js";

/**
 * ডিপোজিট আর উত্তোলনের কোন পথ খোলা — `/api/payment-modes`।
 *
 * ক্লায়েন্ট এটা দেখে ঠিক করে: দুটো চালু → দুটো কার্ড, একটা চালু → সরাসরি
 * সেই পাতা, কোনোটাই নয় → "সাময়িকভাবে বন্ধ"। ম্যানুয়াল "চালু" মানে admin
 * সুইচ অন **আর** অন্তত একটা সক্রিয় মেথড আছে — নইলে ঢুকে খালি পাতা মিলত।
 */
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [dep, wd, depMethods, wdMethods, autoDep, autoWd] = await Promise.all([
      DepositSetting.current(),
      WithdrawSetting.current(),
      DepositMethod.countDocuments({ isActive: true }),
      WithdrawMethod.countDocuments({ isActive: true }),
      autoDepositStatus().catch(() => ({ active: false })),
      autoWithdrawStatus().catch(() => ({ active: false })),
    ]);

    return successResponse(res, "Payment modes", {
      deposit: { manual: Boolean(dep.manualEnabled !== false && depMethods), auto: Boolean(autoDep.active) },
      withdraw: { manual: Boolean(wd.manualEnabled !== false && wdMethods), auto: Boolean(autoWd.active) },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** ম্যানুয়াল ডিপোজিট/উত্তোলনের সুইচ — admin (mother) */
router.get("/admin", protectAdmin, requireMother, async (req, res) => {
  try {
    const [dep, wd] = await Promise.all([DepositSetting.current(), WithdrawSetting.current()]);
    return successResponse(res, "Manual switches", { depositManual: dep.manualEnabled !== false, withdrawManual: wd.manualEnabled !== false });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const opts = { upsert: true, returnDocument: "after", setDefaultsOnInsert: true };
    if (typeof req.body?.depositManual === "boolean") {
      await DepositSetting.findOneAndUpdate({ key: "main" }, { $set: { manualEnabled: req.body.depositManual } }, opts);
    }
    if (typeof req.body?.withdrawManual === "boolean") {
      await WithdrawSetting.findOneAndUpdate({ key: "main" }, { $set: { manualEnabled: req.body.withdrawManual } }, opts);
    }
    const [dep, wd] = await Promise.all([DepositSetting.current(), WithdrawSetting.current()]);
    return successResponse(res, "Saved", { depositManual: dep.manualEnabled !== false, withdrawManual: wd.manualEnabled !== false });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
