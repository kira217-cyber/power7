import express from "express";

import { successResponse, errorResponse } from "../utils/response.js";
import { getCached, setCached } from "../utils/gameCache.js";
import { loadUsableKey, masterGet } from "../utils/masterApi.js";
import { noteApiFailure, noteApiSuccess } from "../utils/maintenance.js";
import { loadProviderCatalog } from "../utils/providerCatalog.js";

/**
 * ক্লায়েন্টের গেম — White-label master থেকে প্রক্সি করে।
 *
 * ব্রাউজার কখনো master বা API key দেখে না; এখানে কী বসিয়ে master এ
 * যায়, আর ৩০ সেকেন্ড ক্যাশ থাকে — একই আধা মিনিটে যতজনই হোম খুলুক,
 * master এ একবারই কল যায়।
 *
 * কী বসানো না থাকলে এরর নয় — `configured: false` যায়, আর ক্লায়েন্ট
 * তখন নিজের স্ট্যাটিক ডেটাই দেখায়। এতে কী বসার আগে-পরে সাইট একইভাবে চলে।
 */
const router = express.Router();

const notConfigured = (res, reason) =>
  successResponse(res, "Game API key is not ready", { configured: false, reason, data: null });

const text = (value) => String(value ?? "").trim();

/**
 * শুধু শেল (`game-data`) এর ফলাফল মেইনটেন্যান্সে গোনা হয় — ওটা ছাড়া সাইটের
 * কিছুই দেখানো যায় না। একটা গেম না পাওয়া (404) বা খোঁজ ব্যর্থ হওয়ায়
 * পুরো সাইট বন্ধ হওয়া ঠিক নয়।
 */
const proxy = (cacheKeyOf, pathOf, paramsOf = () => ({}), watch = false) => async (req, res) => {
  try {
    const { apiKey, reason } = await loadUsableKey();
    if (!apiKey) return notConfigured(res, reason);

    const cacheKey = `game:${cacheKeyOf(req)}`;
    const cached = getCached(cacheKey);
    if (cached) return successResponse(res, "Game data (cached)", { configured: true, cached: true, data: cached });

    const body = await masterGet(pathOf(req), apiKey, paramsOf(req));
    setCached(cacheKey, body.data);
    if (watch) noteApiSuccess();

    return successResponse(res, "Game data", { configured: true, cached: false, data: body.data });
  } catch (error) {
    const status = error.status === 404 ? 404 : 502;
    if (watch && status === 502) noteApiFailure(`Game API: ${error.message || "not reachable"}`);
    return errorResponse(res, error.message || "Master is not reachable", status);
  }
};

/** শেল — ক্যাটাগরি (দুই ডিজাইনের), প্রোভাইডার, হোমের প্রথম গেমগুলো */
router.get(
  "/game-data",
  proxy(
    () => "data",
    () => "/game-data",
    () => ({}),
    true,
  ),
);

/** একটা ক্যাটাগরির (বা প্রোভাইডারের) এক পাতা, অথবা খোঁজ */
const listParams = (req) => ({
  category: text(req.query.category).toLowerCase().slice(0, 40),
  provider: text(req.query.provider).toUpperCase().slice(0, 40),
  search: text(req.query.search).slice(0, 60),
  page: Math.max(Number(req.query.page) || 1, 1),
  limit: Math.min(Math.max(Number(req.query.limit) || 30, 1), 100),
});

router.get(
  "/game-list",
  proxy(
    (req) => `list:${JSON.stringify(listParams(req))}`,
    () => "/game-list",
    listParams,
  ),
);

/** একটা গেম — খেলার পেজের শিরোনাম / চালু আছে কিনা */
router.get(
  "/game/:gameUId",
  proxy(
    (req) => `one:${text(req.params.gameUId)}`,
    (req) => `/game/${encodeURIComponent(text(req.params.gameUId))}`,
  ),
);

/** প্রোভাইডারের নাম-আইকন — টার্নওভারের অগ্রগতিতে দেখাতে (না পেলে ফাঁকা) */
router.get("/providers", async (req, res) => {
  try {
    return successResponse(res, "Providers loaded", { providers: await loadProviderCatalog() });
  } catch {
    return successResponse(res, "Providers unavailable", { providers: [] });
  }
});

export default router;
