/**
 * POWER7 CSS icon extractor
 *
 * মূল সাইটের সাইডবার ও ক্যাটাগরি ট্যাবের আইকনগুলো আলাদা ফাইল নয় —
 * CSS এর ভিতরে base64 হয়ে বসানো। সেগুলো বের করে
 * client/public/assets/icons/ এ সিলেক্টরের নামে সেভ করে।
 *
 *   node scripts/extract-css-icons.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "client", "public", "assets", "icons");

const CSS_FILES = [
  "https://power7.live/css/index.be54ecef.css",
  "https://power7.live/css/chunk-web-view.8ce5c1e4.css",
];

const EXT = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp", gif: "gif", "svg+xml": "svg" };

await fs.mkdir(OUT_DIR, { recursive: true });

let saved = 0;
const index = {};

for (const url of CSS_FILES) {
  const css = await fetch(url, {
    headers: { Referer: "https://power7.live/" },
  }).then((r) => r.text());

  // `.sel-a,.sel-b{ … url("data:image/png;base64,XXXX") … }` — রুলের শুরু
  // থেকে ছবির আগ পর্যন্ত টুকরোটা নিয়ে শেষ সিলেক্টরটাকে নাম ধরি
  const re = /([^{}]+)\{([^{}]*?)url\(["']?data:image\/([a-z+]+);base64,([^"')]+)["']?\)/g;

  for (const [, selectors, , mime, b64] of css.matchAll(re)) {
    const selector = selectors.split(",").pop().trim();
    const name =
      selector
        .replace(/::?[a-z-]+$/g, "")
        .replace(/[^\w-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || `icon-${saved}`;

    const ext = EXT[mime] ?? "png";
    let file = `${name}.${ext}`;

    // একই নামে একাধিক হলে (active/inactive ভ্যারিয়েন্ট) সংখ্যা জুড়ে দিই
    let n = 2;
    while (index[file]) file = `${name}-${n++}.${ext}`;

    const buf = Buffer.from(b64, "base64");
    if (buf.length < 64) continue;

    await fs.writeFile(path.join(OUT_DIR, file), buf);
    index[file] = { selector, bytes: buf.length };
    saved++;
  }
}

await fs.writeFile(
  path.join(OUT_DIR, "_index.json"),
  JSON.stringify(index, null, 1),
  "utf8",
);

console.log(`${saved} টা আইকন বের করা হয়েছে → client/public/assets/icons/`);
