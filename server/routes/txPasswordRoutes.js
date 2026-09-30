import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

import User from "../models/User.js";
import { protectUser } from "../middleware/protectUser.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { TX_RULE, checkTxPassword, hashTxPassword } from "../utils/txPassword.js";

/**
 * লেনদেন পাসওয়ার্ড — প্রথমবার বসানো (লগইন পাসওয়ার্ড দিয়ে নিশ্চিত করে),
 * আর বদলানো (পুরোনোটা দিয়ে)। ভুলে গেলে admin রিসেট করেন
 * (`PATCH /api/admin/manage/:id/tx-password/reset`)।
 */
const router = express.Router();

const text = (value) => String(value ?? "").trim();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try again later", code: "tooMany" },
});

router.get("/", protectUser, (req, res) =>
  successResponse(res, "Transaction password status", { hasTxPassword: Boolean(req.user.txPasswordSetAt) }),
);

/** প্রথমবার — লগইন পাসওয়ার্ড লাগে, যাতে খোলা ফোন হাতে পেয়ে কেউ বসাতে না পারে */
router.post("/", protectUser, limiter, async (req, res) => {
  try {
    const loginPassword = text(req.body?.loginPassword);
    const txPassword = text(req.body?.txPassword);

    const user = await User.findById(req.user._id).select("+password +txPassword");
    if (user.txPassword) return errorResponse(res, "Transaction password is already set", 400, "txPasswordSet");

    if (!TX_RULE.test(txPassword)) {
      return errorResponse(res, "Use 6–12 letters or numbers", 400, "txPasswordRule");
    }
    if (!(await bcrypt.compare(loginPassword, user.password))) {
      return errorResponse(res, "Login password is not correct", 400, "loginPasswordWrong");
    }
    if (await bcrypt.compare(txPassword, user.password)) {
      return errorResponse(res, "Use a different password from your login password", 400, "txSameAsLogin");
    }

    user.txPassword = await hashTxPassword(txPassword);
    user.txPasswordSetAt = new Date();
    await user.save();

    return successResponse(res, "Transaction password set", { user: user.toSafeJSON() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** বদলানো — পুরোনো লেনদেন পাসওয়ার্ড লাগে */
router.put("/", protectUser, limiter, async (req, res) => {
  try {
    const oldTxPassword = text(req.body?.oldTxPassword);
    const txPassword = text(req.body?.txPassword);

    if (!TX_RULE.test(txPassword)) {
      return errorResponse(res, "Use 6–12 letters or numbers", 400, "txPasswordRule");
    }

    const check = await checkTxPassword(req.user._id, oldTxPassword);
    if (!check.ok) return errorResponse(res, check.message, check.status, check.code);

    const user = await User.findById(req.user._id).select("+password");
    if (await bcrypt.compare(txPassword, user.password)) {
      return errorResponse(res, "Use a different password from your login password", 400, "txSameAsLogin");
    }

    user.txPassword = await hashTxPassword(txPassword);
    user.txPasswordSetAt = new Date();
    await user.save();

    return successResponse(res, "Transaction password changed", { user: user.toSafeJSON() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
