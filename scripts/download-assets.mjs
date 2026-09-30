/**
 * POWER7 asset downloader
 *
 * asset-urls.txt এ থাকা প্রতিটা URL ডাউনলোড করে
 * client/public/assets/ এর ভিতরে গোছানো path এ সেভ করে।
 *
 *   node scripts/download-assets.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const URL_FILE = path.join(__dirname, "asset-urls.txt");
const OUT_DIR = path.join(ROOT, "client", "public", "assets");

// CDN path → public/assets এর ভিতরের ছোট, পড়ার মতো path
// Windows এ `|` `?` `*` ইত্যাদি ফাইলের নামে রাখা যায় না — কিছু গেম কোডে
// এগুলো আছে, তাই নাম নিরাপদ করে নিই
const safeName = (name) => name.replace(/[<>:"/\\|?*\s]+/g, "-");
// উইন্ডোজে aux, con, nul, com1 ইত্যাদি নামে ফোল্ডার খোলা যায় না (গিটও পারে না)
const safeDir = (name) => {
  const d = name.toLowerCase();
  return /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(d) ? `${d}_` : d;
};

const toLocalPath = (url) => {
  const rel = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, "");
  const file = safeName(rel.split("/").pop());

  // গেমের আইকন: TCG_GAME_ICONS/<VENDOR>/EN/<CODE>.avif
  let m = rel.match(/^TCG_GAME_ICONS\/([^/]+)\/[^/]+\/(.+)$/);
  if (m) return `games/${safeDir(m[1])}/${safeName(m[2].split("/").pop())}`;

  // ভেন্ডর লোগো: TCG_PROD_IMAGES/<GROUP>/.../<FILE>
  m = rel.match(/^TCG_PROD_IMAGES\/([^/]+)\/(.+)$/);
  if (m) return `vendors/${m[1].toLowerCase()}/${file}`;

  // ভেন্ডরের বড়/ছোট আইকন: prod-images/game_icon/default/<size>/<FILE>
  m = rel.match(/^prod-images\/game_icon\/[^/]+\/([^/]+)\//);
  if (m) return `vendors/${m[1].toLowerCase()}/${file}`;

  // ব্যানার ও প্রমোশনের ছবি: mcs-images/announcement/<merchant>/<FILE>
  // ফাইলের নামে স্পেস ও ব্র্যাকেট আছে — path-নিরাপদ করে নিই
  if (rel.startsWith("mcs-images/announcement/"))
    return `banners/${file.replace(/[^\w.\-]+/g, "-")}`;

  // সাইটের নিজের ছবি
  if (rel.startsWith("img/")) return `site/${file}`;
  if (rel.startsWith("common/")) return `site/${file}`;

  return `misc/${file}`;
};

const download = async (url) => {
  const target = path.join(OUT_DIR, toLocalPath(url));

  // আগে নামানো থাকলে আবার নামাই না
  try {
    const stat = await fs.stat(target);
    if (stat.size > 0) return "skip";
  } catch {
    // নেই — নামাতে হবে
  }

  await fs.mkdir(path.dirname(target), { recursive: true });

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Referer: "https://power7.live/",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  await fs.writeFile(target, Buffer.from(await res.arrayBuffer()));
  return "ok";
};

const urls = (await fs.readFile(URL_FILE, "utf8"))
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

console.log(`${urls.length} টা অ্যাসেট নামানো হচ্ছে…`);

let ok = 0;
let skipped = 0;
const failed = [];

// একসাথে ৮টা — CDN কে বেশি চাপ না দিয়ে
const CONCURRENCY = 8;
let cursor = 0;

const worker = async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      const result = await download(url);
      if (result === "skip") skipped++;
      else ok++;
    } catch (err) {
      failed.push(`${url} — ${err.message}`);
    }

    const done = ok + skipped + failed.length;
    if (done % 100 === 0) console.log(`  ${done}/${urls.length}`);
  }
};

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\nনামানো: ${ok} | আগেই ছিল: ${skipped} | ব্যর্থ: ${failed.length}`);
if (failed.length) {
  console.log(failed.slice(0, 20).join("\n"));
  await fs.writeFile(path.join(__dirname, "failed-assets.txt"), failed.join("\n"));
}
