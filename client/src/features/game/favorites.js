import { useSyncExternalStore } from "react";

/**
 * "আমার প্রিয়" — খেলোয়াড়ের ♥ দেওয়া গেম।
 *
 * user সিস্টেম এখনো নেই, তাই তালিকাটা এই ব্রাউজারেই থাকে (localStorage)।
 * পুরো গেমের তথ্য রাখা হয় (নাম, ছবি, প্রোভাইডার) যাতে তালিকা দেখাতে
 * server এ যেতে না হয়। লগইন এলে এই তালিকাই অ্যাকাউন্টে তুলে দেওয়া যাবে।
 */
const KEY = "power7:favorites";
const MAX = 200;

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.filter((game) => game?.gameUId) : [];
  } catch {
    return [];
  }
};

let favorites = read();
const listeners = new Set();

const save = (next) => {
  favorites = next.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(favorites));
  } catch {
    /* প্রাইভেট মোডে না রাখতে পারলেও এই পাতায় কাজ করবে */
  }
  listeners.forEach((fn) => fn());
};

// অন্য ট্যাবে বদলালে এখানেও
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    favorites = read();
    listeners.forEach((fn) => fn());
  });
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useFavorites = () => useSyncExternalStore(subscribe, () => favorites);

export const isFavorite = (list, game) => Boolean(game?.gameUId) && list.some((g) => g.gameUId === game.gameUId);

/** ♥ চাপলে — থাকলে সরে, না থাকলে সবার আগে বসে */
export const toggleFavorite = (game) => {
  if (!game?.gameUId) return;
  if (favorites.some((g) => g.gameUId === game.gameUId)) {
    save(favorites.filter((g) => g.gameUId !== game.gameUId));
  } else {
    const { id, gameUId, name, nameEn, vendor, vendorName, icon, isHot } = game;
    save([{ id, gameUId, name, nameEn, vendor, vendorName, icon, isHot }, ...favorites]);
  }
};

/**
 * "আমার প্রিয়" তে যা দেখায়: খেলোয়াড়ের নিজের ♥ আগে, তারপর admin এর বাছাই
 * (White-label → Favorite Games) — একই গেম দুবার নয়।
 */
export const mergeFavorites = (mine = [], picked = []) => {
  const seen = new Set(mine.map((g) => g.gameUId));
  return [...mine, ...picked.filter((g) => g?.gameUId && !seen.has(g.gameUId))];
};
