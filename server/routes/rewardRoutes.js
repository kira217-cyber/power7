import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";

import { RewardTemplate, RewardTicket, SignInSetting, TICKET_KINDS, TEMU_TASKS } from "../models/Reward.js";
import { protectUser } from "../middleware/protectUser.js";
import { protectAdmin, requirePermission, requireWrite } from "../middleware/protectAdmin.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { money, num } from "../utils/money.js";
import {
  claimSignIn,
  claimTemu,
  expireTickets,
  findUsersByIds,
  issueTicket,
  openTicket,
  publicTicket,
  signInSetting,
  signInState,
} from "../utils/reward.js";

/**
 * পুরস্কার কেন্দ্র — `/api/rewards`।
 * খেলোয়াড়: টিকিটের তালিকা, খোলা, টেমু দাবি, টেমুর ইতিহাস, সাইন-ইন।
 * admin (perm `rewards`): টেমপ্লেট, টিকিট দেওয়া/দেখা, সাইন-ইনের নিয়ম।
 */
const router = express.Router();

const isId = (value) => mongoose.Types.ObjectId.isValid(value);
const text = (value, max = 200) => String(value ?? "").trim().slice(0, max);
const both = (value, max = 200) => ({ bn: text(value?.bn, max), en: text(value?.en, max) });
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, num(value)));

// খোলা/দাবি — এক মিনিটে ৩০টার বেশি নয়
const actLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  // protectUser আগে চলে, তাই আইপিতে পড়ার পথ কার্যত আসে না
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, message: "Too many requests", code: "tooMany" },
});

const fail = (res, result) => errorResponse(res, result.code, 400, result.code);

/* ─────────────────── খেলোয়াড় ─────────────────── */

/** ব্যাজের সংখ্যা */
router.get("/summary", protectUser, async (req, res) => {
  try {
    await expireTickets(req.user._id);
    const [byKind, sign] = await Promise.all([
      RewardTicket.aggregate([{ $match: { user: req.user._id, status: "available" } }, { $group: { _id: "$kind", n: { $sum: 1 } } }]),
      signInState(req.user._id),
    ]);
    const kinds = Object.fromEntries(byKind.map((k) => [k._id, k.n]));
    const available = byKind.reduce((sum, k) => sum + k.n, 0);
    // kinds — হোমের ভাসমান আইকনের "টিকিট থাকলেই দেখাও" এর জন্য
    return successResponse(res, "Reward summary", { available, kinds, claimedToday: sign.claimedToday, signInEnabled: sign.enabled });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** `?status=available` (দাবি করা) বা `?status=history` (টিকিটের রেকর্ড) */
router.get("/tickets", protectUser, async (req, res) => {
  try {
    await expireTickets(req.user._id);
    const history = req.query.status === "history";
    const rows = await RewardTicket.find({ user: req.user._id, status: history ? { $in: ["claimed", "expired"] } : "available" })
      .sort(history ? { updatedAt: -1 } : { endAt: 1 })
      .limit(100)
      .lean();
    return successResponse(res, "Tickets", { tickets: rows.map(publicTicket) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/tickets/:id/open", protectUser, actLimiter, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const result = await openTicket(req.user._id, req.params.id);
    if (!result.ok) return fail(res, result);
    return successResponse(res, "Opened", result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/tickets/:id/claim", protectUser, actLimiter, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const result = await claimTemu(req.user._id, req.params.id);
    if (!result.ok) return fail(res, result);
    return successResponse(res, "Claimed", result);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** "TEMU টিকিট ইতিহাস" — সব টেমু টিকিটের ঘটনা, আর মোট দাবিকৃত */
router.get("/temu-history", protectUser, async (req, res) => {
  try {
    const rows = await RewardTicket.find({ user: req.user._id, kind: "temu" }).select("name temu status amount").lean();
    const list = rows
      .flatMap((t) => (t.temu?.history || []).map((h) => ({ ticketName: t.name, condition: h.condition, score: h.score, at: h.at })))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
    const claimed = money(rows.filter((t) => t.status === "claimed").reduce((sum, t) => sum + num(t.amount), 0));
    return successResponse(res, "TEMU history", { list, claimed });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/signin", protectUser, async (req, res) => {
  try {
    return successResponse(res, "Sign-in", await signInState(req.user._id));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/signin", protectUser, actLimiter, async (req, res) => {
  try {
    const result = await claimSignIn(req.user);
    if (!result.ok) return fail(res, result);
    return successResponse(res, "Signed in", { dayNo: result.dayNo, ticket: result.ticket ? publicTicket(result.ticket) : null });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/* ─────────────────── admin ─────────────────── */

const admin = [protectAdmin, requirePermission("rewards")];
const write = [...admin, requireWrite];

/** ফর্ম থেকে টেমপ্লেট — সীমার বাইরের সংখ্যা কেটে ভিতরে */
const templateBody = (b = {}) => {
  const kind = TICKET_KINDS.includes(b.kind) ? b.kind : null;
  const segments = (Array.isArray(b.wheel?.segments) ? b.wheel.segments : [])
    .slice(0, 12)
    .map((s) => ({ amount: money(clamp(s.amount, 0, 1e7)), weight: clamp(s.weight, 0, 1e6) }));
  const t = b.temu || {};
  const initMin = clamp(t.initMinPct, 1, 99);
  const stepMin = clamp(t.stepMinPct, 1, 100);
  return {
    kind,
    name: both(b.name, 80),
    label: both(b.label, 40),
    description: both(b.description, 2000),
    validDays: clamp(b.validDays || 7, 1, 365),
    turnoverMultiplier: clamp(b.turnoverMultiplier ?? 1, 0, 100),
    redPacket: { min: money(clamp(b.redPacket?.min, 0, 1e7)), max: money(clamp(b.redPacket?.max, 0, 1e7)) },
    wheel: { segments },
    temu: {
      target: money(clamp(t.target || 1000, 1, 1e7)),
      initMinPct: initMin,
      initMaxPct: Math.max(initMin, clamp(t.initMaxPct, 1, 99)),
      stepMinPct: stepMin,
      stepMaxPct: Math.max(stepMin, clamp(t.stepMaxPct, 1, 100)),
      finishBelow: money(clamp(t.finishBelow, 0, 1e7)),
      tasks: (Array.isArray(t.tasks) ? t.tasks : TEMU_TASKS).filter((k) => TEMU_TASKS.includes(k)),
      maxInvites: clamp(t.maxInvites ?? 10, 0, 1000),
    },
    isActive: b.isActive !== false,
  };
};

const checkTemplate = (body) => {
  if (!body.kind) return "Choose a ticket type";
  if (!body.name.bn && !body.name.en) return "Write a name";
  if (body.kind === "redPacket" && body.redPacket.max < body.redPacket.min) return "Max must be at least min";
  if (body.kind === "wheel" && body.wheel.segments.length < 2) return "A wheel needs at least 2 segments";
  if (body.kind === "temu" && !body.temu.tasks.length) return "Choose at least one TEMU task";
  return "";
};

router.get("/admin/templates", ...admin, async (req, res) => {
  try {
    const templates = await RewardTemplate.find().sort({ createdAt: -1 }).lean();
    const counts = await RewardTicket.aggregate([{ $group: { _id: { t: "$template", s: "$status" }, n: { $sum: 1 } } }]);
    const stats = {};
    for (const c of counts) {
      const key = String(c._id.t);
      stats[key] = stats[key] || { available: 0, claimed: 0, expired: 0 };
      stats[key][c._id.s] = c.n;
    }
    return successResponse(res, "Templates", { templates: templates.map((t) => ({ ...t, stats: stats[String(t._id)] || { available: 0, claimed: 0, expired: 0 } })) });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/admin/templates", ...write, async (req, res) => {
  try {
    const body = templateBody(req.body);
    const problem = checkTemplate(body);
    if (problem) return errorResponse(res, problem, 400);
    const template = await RewardTemplate.create(body);
    return successResponse(res, "Template created", { template }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/templates/:id", ...write, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const body = templateBody(req.body);
    const problem = checkTemplate(body);
    if (problem) return errorResponse(res, problem, 400);
    const template = await RewardTemplate.findByIdAndUpdate(req.params.id, body, { returnDocument: "after" });
    if (!template) return errorResponse(res, "Not found", 404);
    return successResponse(res, "Template saved", { template });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** মুছে ফেলা নয়, বন্ধ করা — আগের টিকিটগুলোর নাম/নিয়ম টিকিটেই কপি আছে */
router.delete("/admin/templates/:id", ...write, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const used = await RewardTicket.exists({ template: req.params.id });
    const setting = await signInSetting();
    const inSignIn = (setting.days || []).some((d) => String(d.template) === req.params.id) || String(setting.registerTemplate) === req.params.id;
    if (inSignIn) return errorResponse(res, "Used by sign-in or register reward — change that first", 400);
    if (used) {
      await RewardTemplate.updateOne({ _id: req.params.id }, { $set: { isActive: false } });
      return successResponse(res, "Template has tickets — turned off instead", { deactivated: true });
    }
    await RewardTemplate.deleteOne({ _id: req.params.id });
    return successResponse(res, "Deleted", {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** ইউজারনেম ধরে টিকিট দেওয়া (একবারে ৫০০ জন পর্যন্ত) */
router.post("/admin/issue", ...write, async (req, res) => {
  try {
    if (!isId(req.body?.template)) return errorResponse(res, "Choose a template", 400);
    const tpl = await RewardTemplate.findOne({ _id: req.body.template, isActive: true }).lean();
    if (!tpl) return errorResponse(res, "Template not found or off", 404);
    const ids = [...new Set(String(req.body?.userIds || "").toLowerCase().split(/[\s,]+/).filter(Boolean))].slice(0, 500);
    if (!ids.length) return errorResponse(res, "Write at least one username", 400);
    const users = await findUsersByIds(ids);
    const found = new Set(users.map((u) => u.userId));
    const missing = ids.filter((id) => !found.has(id));
    if (!users.length) return errorResponse(res, `No such players: ${missing.join(", ")}`, 400);
    for (const user of users) await issueTicket(user, tpl, { source: "admin", by: req.admin._id });
    return successResponse(res, `Sent to ${users.length} player(s)`, { sent: users.length, missing });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/admin/tickets", ...admin, async (req, res) => {
  try {
    const page = Math.max(1, num(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, num(req.query.limit) || 20));
    const filter = {};
    if (["available", "claimed", "expired"].includes(req.query.status)) filter.status = req.query.status;
    if (TICKET_KINDS.includes(req.query.kind)) filter.kind = req.query.kind;
    if (["admin", "register", "signin"].includes(req.query.source)) filter.source = req.query.source;
    const q = text(req.query.q, 40).toLowerCase();
    if (q) filter.userIdText = q;
    await RewardTicket.updateMany({ status: "available", endAt: { $lt: new Date() } }, { $set: { status: "expired" } });
    const [rows, total, paid] = await Promise.all([
      RewardTicket.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      RewardTicket.countDocuments(filter),
      RewardTicket.aggregate([{ $match: { ...filter, status: "claimed" } }, { $group: { _id: null, n: { $sum: "$amount" } } }]),
    ]);
    return successResponse(res, "Tickets", {
      tickets: rows,
      paid: money(paid[0]?.n),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

/** চালু টিকিট বাতিল (ভুলে দেওয়া) — দাবি হয়ে গেলে আর নয় */
router.patch("/admin/tickets/:id/cancel", ...write, async (req, res) => {
  try {
    if (!isId(req.params.id)) return errorResponse(res, "Invalid id", 400);
    const done = await RewardTicket.updateOne({ _id: req.params.id, status: "available" }, { $set: { status: "expired", endAt: new Date() } });
    if (!done.modifiedCount) return errorResponse(res, "Only an unclaimed ticket can be cancelled", 400);
    return successResponse(res, "Cancelled", {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/admin/signin", ...admin, async (req, res) => {
  try {
    return successResponse(res, "Sign-in setting", { setting: await signInSetting() });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.put("/admin/signin", ...write, async (req, res) => {
  try {
    const b = req.body || {};
    const days = (Array.isArray(b.days) ? b.days : []).slice(0, 10).map((d) => ({
      name: both(d.name, 80),
      template: isId(d.template) ? d.template : null,
    }));
    const setting = await SignInSetting.findOneAndUpdate(
      { key: "main" },
      {
        $set: {
          enabled: b.enabled !== false,
          title: both(b.title, 200),
          rules: both(b.rules, 5000),
          depositReq: money(clamp(b.depositReq, 0, 1e8)),
          betReq: money(clamp(b.betReq, 0, 1e9)),
          days,
          registerTemplate: isId(b.registerTemplate) ? b.registerTemplate : null,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    return successResponse(res, "Sign-in saved", { setting });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
