import express from "express";
import mongoose from "mongoose";

import HelpArticle from "../models/HelpArticle.js";
import { protectAdmin, requireMother, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";

/**
 * সাহায্য কেন্দ্র — `/api/help`।
 * খেলোয়াড়: `GET /?platform=mobile|desktop` (৩০ সেকেন্ড ক্যাশ)।
 * admin (mother): তালিকা, নতুন, বদল, মোছা, ক্রম।
 */
const router = express.Router();

const isId = (value) => mongoose.Types.ObjectId.isValid(value);
const text = (value, max) => String(value ?? "").trim().slice(0, max);
const both = (value, max) => ({ bn: text(value?.bn, max), en: text(value?.en, max) });

let cache = {};
const forget = () => {
  cache = {};
};

router.get("/", async (req, res) => {
  try {
    const platform = req.query.platform === "desktop" ? "desktop" : "mobile";
    const hit = cache[platform];
    if (hit && Date.now() - hit.at < 30000) return successResponse(res, "Help", hit.value);
    const rows = await HelpArticle.find({ isActive: true, [platform === "desktop" ? "showDesktop" : "showMobile"]: true })
      .sort({ order: 1, createdAt: 1 })
      .select("title body")
      .lean();
    const value = { articles: rows.map((r) => ({ id: r._id, title: r.title, body: r.body })) };
    cache[platform] = { value, at: Date.now() };
    return successResponse(res, "Help", value);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

const guard = [protectAdmin, requireMother];
const writeGuard = [...guard, requireWrite];

const bodyOf = (b = {}) => ({
  title: both(b.title, 120),
  body: both(b.body, 100000),
  showMobile: b.showMobile !== false,
  showDesktop: Boolean(b.showDesktop),
  isActive: b.isActive !== false,
});

router.get("/admin", ...guard, async (req, res) => {
  try {
    const articles = await HelpArticle.find().sort({ order: 1, createdAt: 1 }).lean();
    return successResponse(res, "Help articles", { articles });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/admin", ...writeGuard, async (req, res) => {
  try {
    const body = bodyOf(req.body);
    if (!body.title.bn && !body.title.en) return errorResponse(res, "Write a title", 400);
    const last = await HelpArticle.findOne().sort({ order: -1 }).select("order").lean();
    const article = await HelpArticle.create({ ...body, order: (last?.order ?? -1) + 1 });
    forget();
    return successResponse(res, "Article created", { article }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/reorder", ...writeGuard, async (req, res) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isId);
    await Promise.all(ids.map((id, order) => HelpArticle.updateOne({ _id: id }, { $set: { order } })));
    forget();
    return successResponse(res, "Order saved", {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/:id", ...writeGuard, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const body = bodyOf(req.body);
    if (!body.title.bn && !body.title.en) return errorResponse(res, "Write a title", 400);
    const article = await HelpArticle.findByIdAndUpdate(req.params.id, body, { returnDocument: "after" });
    if (!article) return errorResponse(res, "Not found", 404);
    forget();
    return successResponse(res, "Saved", { article });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.delete("/admin/:id", ...writeGuard, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    await HelpArticle.deleteOne({ _id: req.params.id });
    forget();
    return successResponse(res, "Deleted", {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
