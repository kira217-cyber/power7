import express from "express";

import upload from "../config/multer.js";
import AffSiteIdentify from "../models/AffSiteIdentify.js";
import AffFooterSetting from "../models/AffFooterSetting.js";
import SiteIdentify, { IDENTITY_DEFAULTS } from "../models/SiteIdentify.js";
import ClientFooterSetting, { FOOTER_DEFAULTS } from "../models/ClientFooterSetting.js";
import { protectAdmin, requireMother, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";

/**
 * ক্লায়েন্ট ও অ্যাফিলিয়েট সাইটের পরিচয় (নাম, লোগো, favicon) আর ফুটার —
 * `/api/site-settings`। পড়া সবার জন্য, বদলানো শুধু mother admin।
 */
const router = express.Router();
const text = (v, n = 300) => String(v ?? "").trim().slice(0, n);
const lang = (i = {}, n = 500) => ({ bn: text(i?.bn, n), en: text(i?.en, n) });
/**
 * শুধু আমাদের আপলোড করা ছবি (`/uploads/…`), ক্লায়েন্টের নিজের ছবি
 * (`/assets/…`, `/favicon.png`) বা খালি — বাইরের/`javascript:` লিংক নয়
 */
const imagePath = (v) => {
  const s = text(v, 300);
  if (!s) return s;
  if (s.includes("..")) return null;
  return /^\/uploads\/[\w.\-]+$/.test(s) || /^\/assets\/[\w.\-/]+$/.test(s) || /^\/[\w.\-]+\.(png|jpe?g|webp|gif|svg|ico)$/i.test(s) ? s : null;
};
/** লিংক — শুধু http(s), নইলে খালি */
const webLink = (v) => {
  const s = text(v, 500);
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : "";
};

router.get("/client/public", async (req, res) => {
  try {
    const [identify, footer] = await Promise.all([SiteIdentify.current(), ClientFooterSetting.current()]);
    res.set("Cache-Control", "no-store");
    return successResponse(res, "Client settings", { identify, footer });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/affiliate/public", async (req, res) => {
  try {
    const [identify, footer] = await Promise.all([AffSiteIdentify.current(), AffFooterSetting.current()]);
    return successResponse(res, "Affiliate settings", { identify, footer });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/admin/upload", protectAdmin, requireMother, requireWrite, upload.single("image"), (req, res) => {
  if (!req.file) return errorResponse(res, "Choose an image", 400);
  return successResponse(res, "Uploaded", { url: `/uploads/${req.file.filename}` });
});

const makeCrud = (Model, key, set, defaults) => {
  router.get(`/admin/${key}`, protectAdmin, requireMother, async (req, res) => {
    try {
      return successResponse(res, "Loaded", { data: await Model.current() });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  });
  router.put(`/admin/${key}`, protectAdmin, requireMother, requireWrite, async (req, res) => {
    try {
      const doc = await Model.current();
      const problem = set(doc, req.body || {});
      if (problem) return errorResponse(res, problem, 400);
      await doc.save();
      return successResponse(res, "Saved", { data: doc });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  });
  if (!defaults) return;
  // সব কিছু ডিফল্টে (এখনকার মূল সাইটের মতো) ফেরানো
  router.delete(`/admin/${key}`, protectAdmin, requireMother, requireWrite, async (req, res) => {
    try {
      const doc = await Model.current();
      doc.set(JSON.parse(JSON.stringify(defaults)));
      await doc.save();
      return successResponse(res, "Back to default", { data: doc });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  });
};

const setImages = (doc, b, keys) => {
  for (const k of keys) {
    if (b[k] === undefined) continue;
    const v = imagePath(b[k]);
    if (v === null) return "Upload the image here instead of pasting a link";
    doc[k] = v;
  }
  return "";
};

makeCrud(AffSiteIdentify, "aff-identify", (doc, b) => {
  if (b.siteName !== undefined) doc.siteName = text(b.siteName, 80);
  return setImages(doc, b, ["logo", "brandLogo", "favicon"]);
});

makeCrud(AffFooterSetting, "aff-footer", (doc, b) => {
  if (b.description !== undefined) doc.description = lang(b.description);
  if (b.copyright !== undefined) doc.copyright = lang(b.copyright);
  if (b.ageNotice !== undefined) doc.ageNotice = lang(b.ageNotice);
  return setImages(doc, b, ["logo"]);
});

makeCrud(
  SiteIdentify,
  "identify",
  (doc, b) => {
    if (b.siteName !== undefined) doc.siteName = text(b.siteName, 80);
    return setImages(doc, b, ["logo", "mobileLogo", "favicon"]);
  },
  IDENTITY_DEFAULTS,
);

/** ছবির তালিকা — প্রতিটা সারি পরীক্ষা করে; খালি ছবির সারি বাদ */
const imageList = (list, map, max = 30) => {
  if (!Array.isArray(list)) return { error: "Invalid list" };
  const out = [];
  for (const row of list.slice(0, max)) {
    const item = map(row || {});
    if (item === null) return { error: "Upload the image here instead of pasting a link" };
    if (item) out.push(item);
  }
  return { out };
};

/** ক্যাটাগরির key — ছোট হাতের অক্ষর, সংখ্যা, - _ */
const categoryKey = (v) => {
  const s = text(v, 40).toLowerCase();
  return /^[a-z0-9_-]+$/.test(s) ? s : "";
};

/** ছবি + নাম + লিংক (সার্টিফিকেট, প্রোভাইডার লোগো) */
const logoRow = (r) => {
  const image = imagePath(r.image);
  if (image === null) return null;
  return image ? { name: text(r.name, 60), image, link: webLink(r.link) } : false;
};

makeCrud(
  ClientFooterSetting,
  "client-footer",
  (doc, b) => {
    if (b.about && typeof b.about === "object") {
      const a = b.about;
      if (a.show !== undefined) doc.about.show = Boolean(a.show);
      if (a.title !== undefined) doc.about.title = lang(a.title, 80);
      if (a.text !== undefined) doc.about.text = lang(a.text, 1000);
      if (a.logo !== undefined) {
        const logo = imagePath(a.logo);
        if (logo === null) return "Upload the image here instead of pasting a link";
        doc.about.logo = logo;
      }
      doc.markModified("about");
    }
    if (b.games && typeof b.games === "object") {
      const g = b.games;
      if (g.show !== undefined) doc.games.show = Boolean(g.show);
      if (g.title !== undefined) doc.games.title = lang(g.title, 80);
      if (g.items !== undefined) {
        const { out, error } = imageList(g.items, (r) => {
          const category = categoryKey(r.category);
          const label = lang(r.label, 80);
          return category && (label.bn || label.en) ? { category, label } : false;
        }, 20);
        if (error) return error;
        doc.games.items = out;
      }
      doc.markModified("games");
    }
    if (b.certificates && typeof b.certificates === "object") {
      const c = b.certificates;
      if (c.show !== undefined) doc.certificates.show = Boolean(c.show);
      if (c.title !== undefined) doc.certificates.title = lang(c.title, 80);
      if (c.items !== undefined) {
        const { out, error } = imageList(c.items, logoRow, 12);
        if (error) return error;
        doc.certificates.items = out;
      }
      doc.markModified("certificates");
    }
    if (b.showProviders !== undefined) doc.showProviders = Boolean(b.showProviders);
    if (b.providerLogos !== undefined) {
      const { out, error } = imageList(b.providerLogos, logoRow);
      if (error) return error;
      doc.providerLogos = out;
    }
    if (b.copyright !== undefined) doc.copyright = lang(b.copyright, 300);
    return "";
  },
  FOOTER_DEFAULTS,
);

export default router;
