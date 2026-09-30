import fs from "node:fs";
import path from "node:path";
import express from "express";
import mongoose from "mongoose";

import upload from "../config/multer.js";
import { HOME_EVENT_KINDS, HomeEvent, HomeEventSetting, Promotion, SiteBanner, SiteNotice, SitePopup } from "../models/SiteContent.js";
import ContactSetting from "../models/ContactSetting.js";
import { protectAdmin, requireMother, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { num } from "../utils/money.js";

/**
 * হোমের কনটেন্ট — ব্যানার, নোটিশ, প্রমোশন, পপআপ আর গ্রাহক সেবার লিংক।
 *
 * ক্লায়েন্ট একবারেই সব নেয় (`/public`), তাই প্রতি পাতায় পাঁচটা
 * রিকোয়েস্ট যায় না; ৩০ সেকেন্ড মনে রাখা হয়, admin কিছু বদলালেই মুছে যায়।
 */
const router = express.Router();

const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const isId = (value) => mongoose.Types.ObjectId.isValid(value);
const lang = (input, max = 500) => ({ bn: text(input?.bn, max), en: text(input?.en, max) });
const bool = (value, fallback) => (value === undefined ? fallback : value === true || value === "true");

/** multipart এ বস্তু আসে লেখা হয়ে — `title` = '{"bn":"..","en":".."}' */
const parse = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/** শুধু আমাদের আপলোড করা ছবি মোছা — বীজ করা বা বাইরের লিংকে হাত নয় */
const removeUpload = (url) => {
  if (!url || !url.startsWith("/uploads/")) return;
  fs.promises.unlink(path.join("uploads", path.basename(url))).catch(() => {});
};

const fileUrl = (file) => (file ? `/uploads/${file.filename}` : "");

/** লিংক — প্রমোশনের কোড (শুধু অঙ্ক) বা http(s) URL; বাকি সব বাদ (javascript: ইত্যাদি) */
const cleanLink = (value) => {
  const link = text(value, 500);
  if (!link) return "";
  if (/^\d{1,20}$/.test(link) || /^https?:\/\//i.test(link)) return link;
  return null;
};

/* =========================
   ক্লায়েন্ট
   ========================= */

let cache = { value: null, at: 0 };
const forget = () => {
  cache = { value: null, at: 0 };
};

/** ভাসমান ইভেন্টের নিয়ম — না থাকলে মূল সাইটের মতো ডিফল্ট দিয়ে তৈরি */
const eventSettingOf = () =>
  HomeEventSetting.findOneAndUpdate({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, lean: true });

const loadPublic = async () => {
  if (cache.value && Date.now() - cache.at < 30000) return cache.value;
  const now = new Date();
  const live = { isActive: true };
  const sort = { order: 1, createdAt: 1 };
  const [banners, notices, promotions, popups, contact, events, eventSetting] = await Promise.all([
    SiteBanner.find(live).sort(sort).select("title image platform link").lean(),
    SiteNotice.find(live).sort(sort).select("text").lean(),
    Promotion.find({
      ...live,
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gt: now } }] },
      ],
    })
      .sort(sort)
      .select("code title image bodyImages content link")
      .lean(),
    SitePopup.find(live).sort(sort).select("title image platform link").lean(),
    ContactSetting.current(),
    HomeEvent.find(live).sort(sort).select("kind title image link platform onlyWithTicket").lean(),
    eventSettingOf(),
  ]);
  const value = {
    banners,
    notices,
    promotions,
    popups,
    contact: contact.toPublic(),
    events: eventSetting.enabled ? events : [],
    eventSetting: { position: eventSetting.position, direction: eventSetting.direction, interval: eventSetting.interval, showGuests: eventSetting.showGuests },
  };
  cache = { value, at: Date.now() };
  return value;
};

router.get("/public", async (req, res) => {
  try {
    const data = await loadPublic();
    const platform = req.query.platform === "mobile" ? "mobile" : "desktop";
    // মোবাইলের নিজের ব্যানার/পপআপ না থাকলে ডেস্কটপেরটাই
    const pick = (list) => {
      const own = list.filter((b) => b.platform === platform);
      return own.length ? own : list.filter((b) => b.platform === "desktop");
    };
    return successResponse(res, "Site content loaded", { ...data, banners: pick(data.banners), popups: pick(data.popups) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* =========================
   admin — একই ধাঁচের চারটে তালিকা
   ========================= */

const guard = [protectAdmin, requireMother];
const writeGuard = [protectAdmin, requireMother, requireWrite];

/**
 * একটা তালিকার CRUD — `build(body, files, current)` নতুন/বদলানো ঘরগুলো
 * দেয় (ভুল হলে `{ error }`), `images(doc)` ওই ডকুমেন্টের আপলোড করা ছবি
 * (মোছার সময় ডিস্ক থেকেও সরাতে)।
 */
const crud = ({ name, Model, uploader, build, images }) => {
  router.get(`/admin/${name}`, ...guard, async (req, res) => {
    try {
      const items = await Model.find().sort({ order: 1, createdAt: 1 }).lean();
      return successResponse(res, `${name} loaded`, { items });
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  });

  router.post(`/admin/${name}`, ...writeGuard, uploader, async (req, res) => {
    const uploaded = Object.values(req.files || {}).flat().concat(req.file ? [req.file] : []);
    try {
      const data = build(req.body || {}, req.files || { image: req.file ? [req.file] : [] }, null);
      if (data.error) {
        uploaded.forEach((f) => removeUpload(fileUrl(f)));
        return errorResponse(res, data.error, 400);
      }
      if (data.order === undefined) {
        const last = await Model.findOne().sort({ order: -1 }).select("order").lean();
        data.order = (last?.order ?? -1) + 1;
      }
      const item = await Model.create(data);
      forget();
      return successResponse(res, "Saved", { item }, 201);
    } catch (error) {
      uploaded.forEach((f) => removeUpload(fileUrl(f)));
      return errorResponse(res, error.code === 11000 ? "This code is already used" : error.message, 400);
    }
  });

  router.put(`/admin/${name}/:id`, ...writeGuard, uploader, async (req, res) => {
    const uploaded = Object.values(req.files || {}).flat().concat(req.file ? [req.file] : []);
    try {
      if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
      const current = await Model.findById(req.params.id);
      if (!current) return errorResponse(res, "Not found", 404);
      const before = images(current);
      const data = build(req.body || {}, req.files || { image: req.file ? [req.file] : [] }, current);
      if (data.error) {
        uploaded.forEach((f) => removeUpload(fileUrl(f)));
        return errorResponse(res, data.error, 400);
      }
      current.set(data);
      await current.save();
      // বদলে যাওয়া পুরোনো ছবি ডিস্ক থেকে সরানো
      const after = new Set(images(current));
      before.filter((url) => !after.has(url)).forEach(removeUpload);
      forget();
      return successResponse(res, "Saved", { item: current });
    } catch (error) {
      uploaded.forEach((f) => removeUpload(fileUrl(f)));
      return errorResponse(res, error.code === 11000 ? "This code is already used" : error.message, 400);
    }
  });

  router.delete(`/admin/${name}/:id`, ...writeGuard, async (req, res) => {
    try {
      if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return errorResponse(res, "Not found", 404);
      images(item).forEach(removeUpload);
      forget();
      return successResponse(res, "Deleted", {});
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  });

  /** ক্রম — `ids` এর ক্রমেই `order` বসে */
  router.patch(`/admin/${name}/reorder`, ...writeGuard, async (req, res) => {
    try {
      const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isId).slice(0, 300);
      await Promise.all(ids.map((id, order) => Model.updateOne({ _id: id }, { $set: { order } })));
      forget();
      return successResponse(res, "Order saved", {});
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  });
};

/** একটা ছবি + লিংক + চালু/বন্ধ — ব্যানার আর পপআপ দুটোই */
const imageAndLink = (body, files, current) => {
  const out = {};
  const file = files.image?.[0];
  if (file) out.image = fileUrl(file);
  else if (!current) return { error: "Choose an image" };
  if (body.link !== undefined) {
    const link = cleanLink(body.link);
    if (link === null) return { error: "Link must be a promotion code (numbers) or an http(s) URL" };
    out.link = link;
  }
  if (body.isActive !== undefined) out.isActive = bool(body.isActive, true);
  if (body.order !== undefined) out.order = Math.trunc(num(body.order));
  return out;
};

crud({
  name: "banners",
  Model: SiteBanner,
  uploader: upload.single("image"),
  build: (body, files, current) => {
    const out = imageAndLink(body, files, current);
    if (out.error) return out;
    if (body.title !== undefined) out.title = text(body.title, 120);
    if (body.platform !== undefined) out.platform = body.platform === "mobile" ? "mobile" : "desktop";
    return out;
  },
  images: (doc) => [doc.image],
});

crud({
  name: "popups",
  Model: SitePopup,
  uploader: upload.single("image"),
  build: (body, files, current) => {
    const out = imageAndLink(body, files, current);
    if (out.error) return out;
    if (body.title !== undefined) out.title = lang(parse(body.title), 120);
    if (body.platform !== undefined) out.platform = body.platform === "mobile" ? "mobile" : "desktop";
    return out;
  },
  images: (doc) => [doc.image],
});

crud({
  name: "events",
  Model: HomeEvent,
  uploader: upload.single("image"),
  build: (body, files, current) => {
    const out = {};
    const file = files.image?.[0];
    if (file) out.image = fileUrl(file);
    else if (body.clearImage === "true") out.image = "";
    if (body.kind !== undefined || !current) {
      if (!HOME_EVENT_KINDS.includes(body.kind)) return { error: "Choose what the icon opens" };
      out.kind = body.kind;
    }
    if (body.title !== undefined) out.title = lang(parse(body.title), 60);
    if (body.link !== undefined) {
      const link = cleanLink(body.link);
      if (link === null) return { error: "Link must be a promotion number or an http(s) address" };
      out.link = link;
    }
    const kind = out.kind || current?.kind;
    if ((kind === "link" || kind === "promotion") && !(out.link ?? current?.link)) return { error: "This icon needs a link" };
    if (body.platform !== undefined) out.platform = ["desktop", "mobile"].includes(body.platform) ? body.platform : "all";
    if (body.onlyWithTicket !== undefined) out.onlyWithTicket = bool(body.onlyWithTicket, false);
    if (body.isActive !== undefined) out.isActive = bool(body.isActive, true);
    return out;
  },
  images: (doc) => [doc.image],
});

router.get("/admin/event-setting", ...guard, async (req, res) => {
  try {
    return successResponse(res, "Event setting", { setting: await eventSettingOf() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/event-setting", ...writeGuard, async (req, res) => {
  try {
    const b = req.body || {};
    const setting = await HomeEventSetting.findOneAndUpdate(
      { key: "main" },
      {
        $set: {
          enabled: b.enabled !== false,
          position: ["RIGHT_BOTTOM", "RIGHT_MIDDLE", "LEFT_BOTTOM", "LEFT_MIDDLE"].includes(b.position) ? b.position : "RIGHT_BOTTOM",
          direction: b.direction === "horizontal" ? "horizontal" : "vertical",
          interval: Math.min(30, Math.max(1, num(b.interval) || 3)),
          showGuests: Boolean(b.showGuests),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    forget();
    return successResponse(res, "Saved", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

crud({
  name: "notices",
  Model: SiteNotice,
  uploader: (req, res, next) => next(),
  build: (body, files, current) => {
    const out = {};
    if (body.text !== undefined || !current) {
      out.text = lang(parse(body.text), 500);
      if (!out.text.bn && !out.text.en) return { error: "Write the notice text" };
    }
    if (body.isActive !== undefined) out.isActive = bool(body.isActive, true);
    return out;
  },
  images: () => [],
});

crud({
  name: "promotions",
  Model: Promotion,
  uploader: upload.fields([
    { name: "image", maxCount: 1 },
    { name: "bodyImages", maxCount: 10 },
  ]),
  build: (body, files, current) => {
    const out = {};
    const cover = files.image?.[0];
    if (cover) out.image = fileUrl(cover);
    else if (!current) return { error: "Choose a cover image" };

    // রাখা ছবি (পুরোনো, ক্রমসহ) + নতুন আপলোড — শেষে যোগ হয়
    const keep = parse(body.keepBodyImages);
    const kept = Array.isArray(keep) ? keep.map((u) => text(u, 300)).filter((u) => (current?.bodyImages || []).includes(u)) : current?.bodyImages || [];
    const added = (files.bodyImages || []).map(fileUrl);
    if (body.keepBodyImages !== undefined || added.length) out.bodyImages = [...kept, ...added].slice(0, 20);

    if (body.title !== undefined || !current) {
      out.title = lang(parse(body.title), 150);
      if (!out.title.bn && !out.title.en) return { error: "Write the promotion title" };
    }
    if (body.content !== undefined) out.content = lang(parse(body.content), 20000);
    if (body.code !== undefined) {
      const code = text(body.code, 20);
      if (code && !/^\d+$/.test(code)) return { error: "Code must be numbers only" };
      out.code = code;
    }
    // প্রমোশনের নিজের লিংক শুধু বাইরের URL (যেমন "যোগ দিন" এর টেলিগ্রাম)
    if (body.link !== undefined) {
      const link = text(body.link, 500);
      if (link && !/^https?:\/\//i.test(link)) return { error: "Link must be an http(s) URL" };
      out.link = link;
    }
    ["startAt", "endAt"].forEach((key) => {
      if (body[key] === undefined) return;
      const d = body[key] ? new Date(body[key]) : null;
      out[key] = d && !Number.isNaN(d.getTime()) ? d : null;
    });
    if (body.isActive !== undefined) out.isActive = bool(body.isActive, true);
    return out;
  },
  images: (doc) => [doc.image, ...(doc.bodyImages || [])],
});

/* =========================
   admin — গ্রাহক সেবার লিংক
   ========================= */

router.get("/admin/contact", ...guard, async (req, res) => {
  try {
    const setting = await ContactSetting.current();
    return successResponse(res, "Contact loaded", { setting: setting.toPublic() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/contact", ...writeGuard, async (req, res) => {
  try {
    const setting = await ContactSetting.current();
    const urls = ["supportUrl", "telegramUrl", "whatsappUrl", "facebookUrl"];
    for (const key of urls) {
      if (req.body?.[key] === undefined) continue;
      const value = text(req.body[key], 300);
      if (value && !/^https?:\/\//i.test(value)) return errorResponse(res, `${key} must start with http(s)://`, 400);
      setting[key] = value;
    }
    if (req.body?.email !== undefined) {
      const email = text(req.body.email, 120).toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse(res, "Enter a valid email", 400);
      setting.email = email;
    }
    if (!setting.supportUrl) return errorResponse(res, "Customer service link is required", 400);
    await setting.save();
    forget();
    return successResponse(res, "Contact saved", { setting: setting.toPublic() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
