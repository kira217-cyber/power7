import { api } from "../../api/axios";

/**
 * প্রোভাইডারের তালিকা একবারই আনা হয়।
 *
 * এক পাতায় picker বা চিপ কয়েকটাও থাকতে পারে (প্রতিটা প্রোমোশনের
 * নিজেরটা) — প্রত্যেকে আলাদা করে আনলে একই তালিকা বারবার টানা হতো।
 */
let cache = null;
let inflight = null;

export const cachedProviders = () => cache;

export const loadProviders = () => {
  if (cache) return Promise.resolve(cache);

  if (!inflight) {
    inflight = api
      .get("/api/admin/game-api-key/admin/providers")
      .then(({ data }) => {
        cache = data?.data?.providers || [];
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
};

/** সার্ভার ছবি পাঠায় `image` নামে; পুরোনো নাম `providerIconUrl` */
export const providerImage = (provider) => provider?.image || provider?.providerIconUrl || "";
