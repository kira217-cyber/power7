import fs from "node:fs";
import path from "node:path";
import express from "express";

import AffiliateHome from "../models/AffiliateHome.js";
import upload from "../config/multer.js";
import {
  protectAdmin,
  requireMother,
  requireWrite,
} from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const text = (v) => String(v ?? "").trim();
const num = (v) => Number(v) || 0;
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

/* ছবির ফিল্ড: hero ২টা + provider ১২টা স্লট */
const imageFields = [
  { name: "heroDesktop", maxCount: 1 },
  { name: "heroMobile", maxCount: 1 },
  ...Array.from({ length: 12 }, (_, i) => ({ name: `provider_${i}`, maxCount: 1 })),
];
const homeUpload = upload.fields(imageFields);

/** পুরোনো content এর সব /uploads/ ছবি — orphan পরিষ্কারে */
const gatherImages = (c = {}) => {
  const urls = [c.hero?.desktopImage, c.hero?.mobileImage];
  (c.providers?.items || []).forEach((p) => urls.push(p.image));
  return urls.filter((u) => u && u.startsWith("/uploads/"));
};

const buildContent = (b = {}, files = {}) => {
  const slot = (name) => (files[name]?.[0] ? fileUrl(files[name][0]) : null);
  const h = b.hero || {};
  const co = b.commission || {};
  const hiw = b.howItWorks || {};
  const wu = b.whyUs || {};
  const pr = b.providers || {};
  const fq = b.faq || {};
  const ct = b.cta || {};

  return {
    hero: {
      badge: langText(h.badge),
      title: langText(h.title),
      text: langText(h.text),
      joinBtn: langText(h.joinBtn),
      loginBtn: langText(h.loginBtn),
      pill: langText(h.pill),
      earnFigure: langText(h.earnFigure),
      activePlayersValue: langText(h.activePlayersValue),
      activePlayersLabel: langText(h.activePlayersLabel),
      desktopImage: slot("heroDesktop") || text(h.desktopImage),
      mobileImage: slot("heroMobile") || text(h.mobileImage),
    },
    stats: (b.stats || []).slice(0, 8).map((s) => ({
      value: langText(s.value),
      label: langText(s.label),
    })),
    commission: {
      eyebrow: langText(co.eyebrow),
      title: langText(co.title),
      text: langText(co.text),
      tierLabel: langText(co.tierLabel),
      revenueShare: langText(co.revenueShare),
      tiers: (co.tiers || []).slice(0, 10).map((t) => ({
        players: langText(t.players),
        share: num(t.share),
      })),
    },
    howItWorks: {
      eyebrow: langText(hiw.eyebrow),
      title: langText(hiw.title),
      steps: (hiw.steps || []).slice(0, 10).map((s) => ({
        icon: text(s.icon),
        title: langText(s.title),
        text: langText(s.text),
      })),
    },
    whyUs: {
      eyebrow: langText(wu.eyebrow),
      title: langText(wu.title),
      features: (wu.features || []).slice(0, 12).map((f) => ({
        icon: text(f.icon),
        title: langText(f.title),
        text: langText(f.text),
      })),
    },
    providers: {
      title: langText(pr.title),
      text: langText(pr.text),
      items: (pr.items || []).slice(0, 12).map((p, i) => ({
        name: text(p.name),
        image: slot(`provider_${i}`) || text(p.image),
      })),
    },
    faq: {
      eyebrow: langText(fq.eyebrow),
      title: langText(fq.title),
      items: (fq.items || []).slice(0, 20).map((x) => ({
        q: langText(x.q),
        a: langText(x.a),
      })),
    },
    cta: {
      title: langText(ct.title),
      text: langText(ct.text),
      button: langText(ct.button),
    },
  };
};

const toJSON = (doc) => ({
  hero: doc.hero || {},
  stats: doc.stats || [],
  commission: doc.commission || {},
  howItWorks: doc.howItWorks || {},
  whyUs: doc.whyUs || {},
  providers: doc.providers || {},
  faq: doc.faq || {},
  cta: doc.cta || {},
});

/* ── পাবলিক ── */
router.get("/public", async (req, res) => {
  try {
    const doc = await AffiliateHome.current();
    return successResponse(res, "Affiliate home", toJSON(doc));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ── অ্যাডমিন ── */
router.get("/admin", protectAdmin, requireMother, async (req, res) => {
  try {
    const doc = await AffiliateHome.current();
    return successResponse(res, "Affiliate home", toJSON(doc));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put(
  "/admin",
  protectAdmin,
  requireMother,
  requireWrite,
  homeUpload,
  async (req, res) => {
    try {
      const doc = await AffiliateHome.current();
      const prevImages = gatherImages(toJSON(doc));

      const next = buildContent(parseMaybe(req.body.content), req.files || {});
      Object.assign(doc, next);
      await doc.save();

      const nextImages = new Set(gatherImages(toJSON(doc)));
      prevImages.forEach((url) => {
        if (!nextImages.has(url)) removeImage(url);
      });

      return successResponse(res, "Affiliate home saved", toJSON(doc));
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

export default router;
