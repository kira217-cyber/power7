import { loadUsableKey, masterGet } from "./masterApi.js";

/**
 * `gameUId` থেকে গেমের নাম আর প্রোভাইডারের কোড।
 *
 * বেটিং রেকর্ডে গেমের নাম দেখাতে আর টার্নওভারের প্রোভাইডার-শর্ত মেলাতে
 * লাগে। BetChokkor পুরো ক্যাটালগ (কয়েক হাজার গেম) পাতা ধরে নামাত;
 * আমাদের White-label এ একটা গেম আলাদা করে আনার রুট আছে
 * (`/tb-global/client/game/:uid`), তাই শুধু যে গেমটা খেলা হলো সেটাই আনা হয়
 * আর মেমরিতে এক ঘণ্টা থাকে।
 */
const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

const EMPTY = Object.freeze({ name: "", nameBn: "", code: "", category: "" });

const cache = new Map();
const inflight = new Map();

const text = (value) => String(value ?? "").trim();

/** ক্যাশে থাকলে সাথে সাথে — callback এর উত্তরে দেরি না করতে */
export const peekGameInfo = (gameUId) => {
  const hit = cache.get(text(gameUId));
  return hit && hit.expiresAt > Date.now() ? hit.info : EMPTY;
};

/** না থাকলে মাস্টার থেকে এনে ক্যাশে রাখে; না পেলে ফাঁকা (কখনো ছুড়ে না) */
export const resolveGameInfo = async (gameUId) => {
  const uid = text(gameUId);
  if (!uid) return EMPTY;

  const hit = cache.get(uid);
  if (hit && hit.expiresAt > Date.now()) return hit.info;

  // একই গেমের একসাথে অনেক callback এলে মাস্টারে একটাই অনুরোধ
  if (inflight.has(uid)) return inflight.get(uid);

  const job = (async () => {
    try {
      const { apiKey } = await loadUsableKey();
      if (!apiKey) return EMPTY;

      const body = await masterGet(`/game/${encodeURIComponent(uid)}`, apiKey);
      const game = body?.data || {};
      const info = {
        name: text(game.name),
        nameBn: text(game.nameBn),
        code: text(game.providerCode).toUpperCase(),
        // White-label এর ক্যাটাগরি key (slot, fishing, live…) — বেটিং রেকর্ডের ট্যাব
        category: text(game.categoryKey).toLowerCase(),
      };

      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
      cache.set(uid, { info, expiresAt: Date.now() + TTL_MS });
      return info;
    } catch {
      return EMPTY;
    } finally {
      inflight.delete(uid);
    }
  })();

  inflight.set(uid, job);
  return job;
};

export const resolveProviderCode = async (gameUId) => (await resolveGameInfo(gameUId)).code || null;
