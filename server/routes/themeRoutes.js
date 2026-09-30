import express from "express";

import SiteTheme from "../models/SiteTheme.js";
import { protectAdmin, requireMother, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { THEME_REGISTRY, cleanColors } from "../utils/themeRegistry.js";

/**
 * সাইটের রঙ — `/api/theme`।
 *
 * পাবলিক: এক সাইটের সব পাতার বদলানো রঙ একসাথে (সাইট `:root` এ বসায়)।
 * admin (mother): তালিকা (registry), এক পাতার রঙ দেখা/সেভ/ডিফল্টে ফেরা।
 */
const router = express.Router();

const SITES = Object.keys(THEME_REGISTRY);
const siteOk = (site) => SITES.includes(site);
const pageOk = (site, page) => (THEME_REGISTRY[site]?.pages || []).some((p) => p.key === page);
const plain = (doc) => (doc?.colors ? Object.fromEntries(doc.colors) : {});

/* ── পাবলিক ── */
router.get("/:site/public", async (req, res) => {
  try {
    const { site } = req.params;
    if (!siteOk(site)) return errorResponse(res, "Unknown site", 404);
    const docs = await SiteTheme.find({ site }).lean();
    const colors = {};
    docs.forEach((doc) => Object.assign(colors, doc.colors || {}));
    // রঙ বদলালে ব্রাউজার যেন পুরোনোটা ধরে না রাখে
    res.set("Cache-Control", "no-store");
    return successResponse(res, "Theme", { colors });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ── admin ── */
router.get("/admin/registry", protectAdmin, requireMother, (req, res) =>
  successResponse(res, "Theme registry", { registry: THEME_REGISTRY }),
);

/** এক সাইটের সব পাতার সেভ করা রঙ — স্টুডিও একবারেই পায় */
router.get("/admin/:site", protectAdmin, requireMother, async (req, res) => {
  try {
    const { site } = req.params;
    if (!siteOk(site)) return errorResponse(res, "Unknown site", 404);
    const docs = await SiteTheme.find({ site }).lean();
    const pages = {};
    docs.forEach((doc) => {
      pages[doc.page] = { colors: doc.colors || {}, updatedAt: doc.updatedAt };
    });
    return successResponse(res, "Theme", { pages });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/:site/:page", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const { site, page } = req.params;
    if (!siteOk(site) || !pageOk(site, page)) return errorResponse(res, "Unknown page", 404);
    const colors = cleanColors(site, page, req.body?.colors);
    const doc = await SiteTheme.findOneAndUpdate(
      { site, page },
      { $set: { colors, updatedBy: req.admin._id } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    return successResponse(res, "Colours saved", { colors: plain(doc), updatedAt: doc.updatedAt });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.delete("/admin/:site/:page", protectAdmin, requireMother, requireWrite, async (req, res) => {
  try {
    const { site, page } = req.params;
    if (!siteOk(site) || !pageOk(site, page)) return errorResponse(res, "Unknown page", 404);
    await SiteTheme.deleteOne({ site, page });
    return successResponse(res, "Back to default colours", { colors: {} });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
