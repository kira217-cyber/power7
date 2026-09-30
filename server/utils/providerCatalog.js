import { loadUsableKey, masterGet } from "./masterApi.js";

/**
 * সাইটের সব প্রোভাইডার — `{ providerCode, providerName, image }`।
 *
 * ডিপোজিট/রেজিস্টার বোনাসের টার্নওভারে "কোন প্রোভাইডারে খেললে গোনা হবে"
 * বাছতে admin এর, আর টার্নওভারের অগ্রগতিতে নাম-আইকন দেখাতে খেলোয়াড়ের
 * লাগে। White-label এর শেল (`game-data`) থেকে প্রতিটা ক্যাটাগরির প্রোভাইডার
 * জড়ো করে কোড ধরে একটাই রাখা হয়; ৫ মিনিট মেমরিতে।
 */
const TTL_MS = 5 * 60 * 1000;
let cache = { list: null, at: 0 };

const text = (value) => String(value ?? "").trim();

export const loadProviderCatalog = async () => {
  if (cache.list && Date.now() - cache.at < TTL_MS) return cache.list;

  const { apiKey } = await loadUsableKey();
  if (!apiKey) return [];

  const data = (await masterGet("/game-data", apiKey)).data || {};
  const byCode = new Map();

  (data.categories || []).forEach((category) => {
    (category.providers || []).forEach((p) => {
      const code = text(p.code || p.providerCode).toUpperCase();
      if (!code || byCode.has(code)) return;
      byCode.set(code, { providerCode: code, providerName: text(p.name) || code, image: text(p.icon) });
    });
  });

  cache = { list: [...byCode.values()].sort((a, b) => a.providerCode.localeCompare(b.providerCode)), at: Date.now() };
  return cache.list;
};
