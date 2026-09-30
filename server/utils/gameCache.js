/**
 * ছোট ইন-মেমরি ক্যাশ, TTL সহ।
 *
 * master এর game-data একবারে হাজার হাজার গেম ফেরত দেয়। ক্যাশ ছাড়া
 * প্রতিটা ভিজিটরের হোম পেজ খোলার সাথে সাথেই master এ একটা ভারী কল
 * যেত — সাইট ধীর হতো, master এও অযথা চাপ পড়ত।
 *
 * বাইরের কোনো প্যাকেজ নয় (Redis/node-cache), তাই ডিপ্লয়ে বাড়তি কিছু
 * লাগে না। একাধিক ইনস্ট্যান্সে চালালে প্রতিটার নিজের ক্যাশ থাকবে —
 * ডেটা শুধু পড়া হয় বলে তাতে সমস্যা নেই।
 */

const store = new Map();

/**
 * ডিফল্ট ৩০ সেকেন্ড।
 *
 * অ্যাডমিন white-label এ ক্রম বা ব্যাজ বদলালে সেটা প্রায় সাথে সাথেই
 * সাইটে দেখা দরকার, তাই ক্যাশ ছোট রাখা। তবু master এ প্রতিটা ভিজিটে
 * কল যায় না — একই আধা মিনিটে যতজনই আসুক, একবারই যায়।
 */
export const DEFAULT_TTL_MS = 30 * 1000;

export const getCached = (key) => {
  const hit = store.get(key);

  if (!hit) return null;

  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }

  return hit.value;
};

export const setCached = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
};

/**
 * ক্যাশ খালি করা। কোনো prefix দিলে শুধু সেটুকু।
 * অ্যাডমিন কী বদলালে বা নিষ্ক্রিয় করলে সাথে সাথে ডাকা হয়, যাতে
 * পুরোনো সাইটের ডেটা আর না দেখায়।
 */
export const clearCache = (prefix = "") => {
  if (!prefix) {
    store.clear();
    return;
  }

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

export const cacheStats = () => ({
  entries: store.size,
  keys: [...store.keys()],
});
