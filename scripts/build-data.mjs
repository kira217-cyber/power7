/**
 * POWER7 static data builder
 *
 * catalog.json (লাইভ সাইট থেকে তোলা) + announcements.json কে
 * client/src/data/ এর ভিতরের JS মডিউলে রূপান্তর করে, আর প্রতিটা CDN
 * ছবির URL কে public/assets/ এর লোকাল path এ বদলে দেয়।
 *
 *   node scripts/build-data.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "client", "src", "data");
const ASSET_DIR = path.join(ROOT, "client", "public", "assets");

const safeName = (name) => name.replace(/[<>:"/\\|?*\s]+/g, "-");
// উইন্ডোজে aux, con, nul, com1 ইত্যাদি নামে ফোল্ডার খোলা যায় না (গিটও পারে না)
const safeDir = (name) => {
  const d = name.toLowerCase();
  return /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(d) ? `${d}_` : d;
};

// download-assets.mjs এর সাথে হুবহু একই ম্যাপিং — নইলে path মিলবে না
const toAssetPath = (url) => {
  if (!url) return null;

  let rel;
  try {
    rel = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, "");
  } catch {
    return null;
  }

  const file = safeName(rel.split("/").pop());

  let m = rel.match(/^TCG_GAME_ICONS\/([^/]+)\/[^/]+\/(.+)$/);
  if (m) return `/assets/games/${safeDir(m[1])}/${safeName(m[2].split("/").pop())}`;

  m = rel.match(/^TCG_PROD_IMAGES\/([^/]+)\/(.+)$/);
  if (m) return `/assets/vendors/${m[1].toLowerCase()}/${file}`;

  m = rel.match(/^prod-images\/game_icon\/[^/]+\/([^/]+)\//);
  if (m) return `/assets/vendors/${m[1].toLowerCase()}/${file}`;

  if (rel.startsWith("mcs-images/announcement/"))
    return `/assets/banners/${file.replace(/[^\w.\-]+/g, "-")}`;

  if (rel.startsWith("img/") || rel.startsWith("common/")) return `/assets/site/${file}`;

  return `/assets/misc/${file}`;
};

// ডাউনলোড হয়নি এমন path রেখে দিলে ভাঙা ছবি দেখাবে, তাই যাচাই করে নিই
const onDisk = new Set();
const walk = async (dir, prefix) => {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(next, `${prefix}/${entry.name}`);
    else onDisk.add(`${prefix}/${entry.name}`);
  }
};
await walk(ASSET_DIR, "/assets");

const asset = (url) => {
  const local = toAssetPath(url);
  return local && onDisk.has(local) ? local : null;
};

const catalog = JSON.parse(await fs.readFile(path.join(__dirname, "catalog.json"), "utf8"));
const announcements = JSON.parse(
  await fs.readFile(path.join(__dirname, "announcements.json"), "utf8"),
).value;

// ── ১. হোমের ক্যাটাগরি ও ভেন্ডর ──────────────────────────────────
// মূল সাইটের হোমে এই ক্রমে সেকশন আসে; lanes এর key গুলো API এর gameType
// titleIcon → public/assets/icons/title/<name>.png (মূল সাইটের CSS থেকে তোলা)
const SECTIONS = [
  { key: "hot", title: "গরম খেলা", titleIcon: "hot", lane: null },
  { key: "RNG", title: "স্লট", titleIcon: "rng", lane: "RNG" },
  { key: "FISH", title: "ফিশিং", titleIcon: "fish", lane: "FISH" },
  { key: "LIVE", title: "লাইভ", titleIcon: "live", lane: "LIVE" },
  { key: "PVP", title: "পোকার", titleIcon: "pvp", lane: "PVP" },
  { key: "CRASH", title: "ক্র্যাশ গেমস", titleIcon: "mxwin", lane: null },
];

// ভেন্ডর চিপে মূল সাইট গেমের আর্ট নয়, ব্র্যান্ডের ওয়ার্ডমার্ক দেখায় —
// সেগুলো `TCG_PROD_IMAGES/<LANE>_LIST_VENDOR/<CODE>-COLOR.png` এ আছে।
// ওটা না থাকলে lanes এর বড় আইকনে নেমে যাই।
const vendorLogo = (lane, code) => {
  for (const variant of ["COLOR", "GRAY"]) {
    const local = `/assets/vendors/${lane.toLowerCase()}_list_vendor/${code}-${variant}.png`;
    if (onDisk.has(local)) return local;
  }
  return null;
};

const vendors = {};
for (const [lane, cards] of Object.entries(catalog.lanes)) {
  vendors[lane] = cards.map((c) => ({
    code: c.vassalage,
    name: c.displayName,
    icon: vendorLogo(lane, c.vassalage) || asset(c.icon) || asset(c.small),
    art: asset(c.icon) || asset(c.small),
  }));
}

// ── ২. গেমের তালিকা ─────────────────────────────────────────────
const slim = (g) => ({
  id: g.nodeId ?? g.id,
  name: g.gameName ?? g.nodeName,
  code: g.gameCode ?? g.nodeTypeManageId,
  vendor: g.vassalage,
  type: g.gameType,
  classify: g.gameClassifyNew ?? g.gameClassify,
  icon: asset(g.showIcon ?? g.iconUrl),
});

const byType = {};
for (const g of catalog.games) {
  const type = g._classify === "Crash" ? "CRASH" : g._gameType || "OTHER";
  (byType[type] ??= []).push(slim(g));
}
const hot = catalog.hot.map(slim);

// আইকন নেই এমন গেম বাদ — কার্ডে ফাঁকা বাক্স দেখানোর মানে নেই
const withIcon = (list) => list.filter((g) => g.icon);
for (const key of Object.keys(byType)) byType[key] = withIcon(byType[key]);

// ── ৩. ব্যানার, নোটিশ, প্রমোশন ──────────────────────────────────
const banners = (announcements.banners ?? [])
  .map((b) => ({ title: b.title, image: asset(b.url), link: b.linkage }))
  .filter((b) => b.image);

const notices = (announcements.player ?? []).map((a) => ({ id: a.id, text: a.title }));

// ছবি ও লিংক দুটোই `content` এর HTML এ বসানো থাকে:
//   <a href="…"><img src="https://images…/…png"></a>
const imagesIn = (html) =>
  [...(html ?? "").matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => asset(m[1])).filter(Boolean);

const linkIn = (html) => (html ?? "").match(/<a[^>]+href="([^"]+)"/)?.[1] ?? null;

const promotions = (announcements.promotion ?? []).map((p) => ({
  id: p.id,
  title: p.title,
  image: asset(p.announcementImages?.[0]?.url) ?? imagesIn(p.content)[0] ?? null,
  link: linkIn(p.content),
  body: [
    ...imagesIn(p.content),
    ...(p.contents ?? []).flatMap((c) => imagesIn(c.content)),
  ].filter((v, i, a) => a.indexOf(v) === i),
}));

const popups = (announcements.popup ?? []).map((p) => ({
  id: p.id,
  title: p.title,
  image: asset(p.announcementImages?.[0]?.url) ?? imagesIn(p.content)[0] ?? null,
  link: linkIn(p.content),
}));

// ── লেখা ───────────────────────────────────────────────────────
const header = (name) => `/**
 * POWER7 — ${name}
 *
 * scripts/build-data.mjs দিয়ে তৈরি, হাতে এডিট কোরো না।
 * server আসার আগ পর্যন্ত সব কনটেন্ট এখান থেকেই আসে।
 */
`;

const write = async (file, name, exports) => {
  const body = Object.entries(exports)
    .map(([key, value]) => `export const ${key} = ${JSON.stringify(value, null, 2)};\n`)
    .join("\n");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, file), header(name) + "\n" + body);
};

await write("gameData.js", "ক্যাটাগরি ও ভেন্ডর", { sections: SECTIONS, vendors });
await write("gameListData.js", "গেমের তালিকা", { hotGames: hot, gamesByType: byType });
await write("siteData.js", "ব্যানার, নোটিশ ও প্রমোশন", {
  banners,
  notices,
  promotions,
  popups,
});

console.log("সেকশন:", SECTIONS.length);
console.log(
  "ভেন্ডর:",
  Object.entries(vendors)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(" "),
);
console.log(
  "গেম:",
  Object.entries(byType)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(" "),
  "| hot =",
  hot.filter((g) => g.icon).length,
);
console.log("ব্যানার:", banners.length, "| নোটিশ:", notices.length, "| প্রমোশন:", promotions.length);
