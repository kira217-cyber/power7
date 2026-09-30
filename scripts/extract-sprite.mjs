/**
 * POWER7 SVG sprite extractor
 *
 * মূল সাইটের সাইডবার, হেডার ও ফর্মের সব আইকন একটা inline SVG স্প্রাইটে
 * (`<symbol id="icon-deposit">` …) থাকে, যেটা JS রানটাইমে DOM এ ঢোকায়।
 * রেন্ডার করা HTML থেকে সেই symbol গুলো তুলে একটা sprite.svg বানায়,
 * যাতে আমরা `<svg><use href="#icon-deposit" /></svg>` লিখতে পারি।
 *
 *   node scripts/extract-sprite.mjs <rendered.html> [আরো html…]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "client", "public", "assets", "icons", "sprite.svg");

const files = process.argv.slice(2);
if (!files.length) {
  console.error("ব্যবহার: node scripts/extract-sprite.mjs <rendered.html> […]");
  process.exit(1);
}

const symbols = new Map();

// কিছু আইকন ভেক্টর নয় — `<rect fill="url(#pattern)">` + `<pattern>` এর
// ভিতরে base64 করা PNG। Chrome এরকম symbol কে `<use>` দিয়ে আঁকে না
// (খালি দেখায়), তাই ওগুলো আলাদা PNG ফাইল করে `<img>` দিয়ে দেখাতে হয়।
const RASTER_DIR = path.join(ROOT, "client", "public", "assets", "icons", "raster");
const raster = new Map();

for (const file of files) {
  const html = await fs.readFile(file, "utf8");

  for (const match of html.matchAll(/<symbol\b[^>]*\bid="([^"]+)"[\s\S]*?<\/symbol>/g)) {
    const [raw, id] = match;

    const markup = raw
      // কিছু symbol সাইটে JS স্ট্রিং হয়ে বসানো, তাই path এর `d` এ আসল
      // newline/tab এর বদলে দুই-অক্ষরের `\n` `\t` লেখা থাকে। ওগুলো রেখে
      // দিলে ব্রাউজার "Expected path command" বলে আইকনটা আঁকে না।
      .replace(/\\[nrt]/g, " ")
      // স্প্রাইটটা আমরা `innerHTML` দিয়ে বসাই, অর্থাৎ HTML পার্সারে —
      // সেখানে XLink নেমস্পেস থাকে না, তাই `xlink:href` কাজ করে না আর
      // pattern/image ভিত্তিক আইকনগুলো ফাঁকা আসে। SVG2 এর `href` এ বদলে দিই।
      .replace(/\bxlink:href=/g, "href=");
    // মোবাইল বান্ডলের id গুলোতে হ্যাশ জোড়া থাকে (deposit_00578df3) —
    // ডেস্কটপের পরিষ্কার নামগুলোই আগে রাখি
    if (!symbols.has(id)) symbols.set(id, markup);

    if (!raster.has(id)) {
      const embedded = markup.match(/href="data:image\/(png|jpeg|webp);base64,([^"]+)"/);
      if (embedded) raster.set(id, { ext: embedded[1] === "jpeg" ? "jpg" : embedded[1], b64: embedded[2] });
    }
  }
}

await fs.mkdir(RASTER_DIR, { recursive: true });
const rasterNames = [];

for (const [id, { ext, b64 }] of raster) {
  const name = id.replace(/^icon-/, "");
  await fs.writeFile(path.join(RASTER_DIR, `${name}.${ext}`), Buffer.from(b64, "base64"));
  rasterNames.push([name, `/assets/icons/raster/${name}.${ext}`]);
}

// Icon কম্পোনেন্ট এই তালিকা দেখে ঠিক করে কোনটা `<img>`, কোনটা `<use>`
await fs.writeFile(
  path.join(ROOT, "client", "src", "data", "rasterIcons.js"),
  `/**\n * POWER7 — যেসব আইকন ভেক্টর নয়, PNG\n *\n * scripts/extract-sprite.mjs দিয়ে তৈরি, হাতে এডিট কোরো না।\n */\n\n` +
    `export const rasterIcons = ${JSON.stringify(Object.fromEntries(rasterNames.sort()), null, 2)};\n`,
  "utf8",
);

const sprite =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<!-- power7.live এর রেন্ডার করা DOM থেকে তোলা, ` +
  `scripts/extract-sprite.mjs দিয়ে -->\n` +
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:none">\n` +
  [...symbols.values()].join("\n") +
  `\n</svg>\n`;

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, sprite, "utf8");

console.log(`${symbols.size} টা আইকন → client/public/assets/icons/sprite.svg`);
console.log([...symbols.keys()].filter((id) => id.startsWith("icon-")).join(" "));
