/**
 * আগের স্থির কনটেন্ট (client/src/data/siteData.js) admin এ বসানো —
 * ব্যানার (ডেস্কটপ + মোবাইল), নোটিশ, প্রমোশন, পপআপ (ডেস্কটপ + মোবাইল)।
 *
 * ছবি client/public/assets/banners থেকে API দিয়ে আপলোড হয়, তাই লাইভ
 * server এও একইভাবে চলে। বারবার চালানো যায় — কোনো তালিকায় আগে থেকে
 * কিছু থাকলে সেই তালিকা ছুঁয়ে দেখে না।
 *
 * মোবাইলের তালিকা মূল সাইটের `/m/home` (platform=M) থেকে।
 *
 *   node scripts/seed-site-content.mjs <API_URL> <ADMIN_TOKEN>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { banners, notices, promotions, popups } from "../client/src/data/siteData.js";

const [API = "http://localhost:5000", TOKEN] = process.argv.slice(2);
if (!TOKEN) {
  console.error("usage: node scripts/seed-site-content.mjs <API_URL> <ADMIN_TOKEN>");
  process.exit(1);
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "..", "client", "public");
const auth = { Authorization: `Bearer ${TOKEN}` };

const MOBILE_BANNERS = [
  { title: "Brand alliance", image: "/assets/banners/1774536343026_HBAJEE.gif", link: "https://88hbajee.com" },
  { title: "Mobile banner 0", image: "/assets/banners/1790215706213_default_mobile.png", link: "" },
  { title: "Mobile banner 1", image: "/assets/banners/1763469951001_TBAJEE-WINDOW-PHONE1.png", link: "" },
  { title: "Mobile banner 2", image: "/assets/banners/1774360300161_TBAJEE-WINDOW-PHONE.png", link: "https://www.12hbajee.com" },
  { title: "Mobile banner 3", image: "/assets/banners/1763469964572_TBAJEE-WINDOW-PHONE.png", link: "" },
  { title: "Mobile banner 4", image: "/assets/banners/1742391429386_3-vip-window-phone.png", link: "" },
  { title: "Mobile banner 5", image: "/assets/banners/1740490117587_0-8-phonewindow.png", link: "" },
  { title: "Mobile banner 6", image: "/assets/banners/1763469973133_TBAJEE-WINDOW-PHONE4.png", link: "" },
  { title: "Mobile banner 7", image: "/assets/banners/1725172058545_6-monthly.png", link: "" },
  { title: "Mobile banner 9", image: "/assets/banners/1725172064408_s-pt.png", link: "" },
];

const MOBILE_POPUPS = [
  { bn: "প্রতি মাসের ২৬ তারিখে ক্যাশব্যাক", en: "Cashback on the 26th of every month", image: "/assets/banners/1763967171372_TBAJEE-POPUP-PHONE-PERMANENT.jpeg", link: "https://www.12cbaji.com" },
  { bn: "এক্সক্লুসিভ প্রচার", en: "Exclusive Promotion", image: "/assets/banners/1763470239561_TBAJEE-POPUP-PHONE2.png", link: "https://t.me/+NpaAP08VuVtiODc1" },
  { bn: "HBAJEE ব্র্যান্ড অ্যালায়েন্স", en: "HBAJEE Brand Alliance", image: "/assets/banners/1774360348668_TBAJEE-POPUP-PHONE.png", link: "https://www.12hbajee.com" },
  { bn: "নতুন সদস্যের সুবিধা", en: "New Member Benefits", image: "/assets/banners/1763470223768_TBAJEE-POPUP-PHONE1.png", link: "https://t.me/+NpaAP08VuVtiODc1" },
];

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };
const fileOf = (webPath) => {
  const full = path.join(PUBLIC, webPath);
  if (!fs.existsSync(full)) throw new Error(`missing image ${webPath}`);
  const ext = path.extname(full).toLowerCase();
  return new Blob([fs.readFileSync(full)], { type: MIME[ext] || "application/octet-stream" });
};

const call = async (method, url, body) => {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API}/api/site-content${url}`, {
    method,
    headers: isForm ? auth : { ...auth, "Content-Type": "application/json" },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(`${method} ${url}: ${data.message}`);
  return data.data;
};

const empty = async (name) => (await call("GET", `/admin/${name}`)).items.length === 0;

const form = (fields, files = {}) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v)));
  Object.entries(files).forEach(([k, list]) =>
    [].concat(list).forEach((p) => fd.append(k, fileOf(p), path.basename(p))),
  );
  return fd;
};

// ব্যানারের `link` মূল সাইটে প্রমোশনের আইডি বা URL — দুটোই রাখা যায়
const linkOf = (value) => (value && (/^\d+$/.test(value) || /^https?:\/\//.test(value)) ? value : "");

if (await empty("banners")) {
  // মূল সাইটের নাম চীনা ("网页端首页横幅_2") — admin এ পড়ার মতো নাম
  for (const [i, b] of banners.entries()) await call("POST", "/admin/banners", form({ title: `Desktop banner ${i + 1}`, platform: "desktop", link: linkOf(b.link) }, { image: b.image }));
  for (const b of MOBILE_BANNERS) await call("POST", "/admin/banners", form({ title: b.title, platform: "mobile", link: b.link }, { image: b.image }));
  console.log("banners:", banners.length, "desktop +", MOBILE_BANNERS.length, "mobile");
} else console.log("banners: already there, skipped");

if (await empty("notices")) {
  for (const n of notices) await call("POST", "/admin/notices", { text: { bn: n.text, en: n.textEn || "" } });
  console.log("notices:", notices.length);
} else console.log("notices: already there, skipped");

if (await empty("promotions")) {
  for (const p of promotions) {
    await call(
      "POST",
      "/admin/promotions",
      form(
        { code: String(p.id), title: { bn: p.title, en: p.titleEn || "" }, link: /^https?:\/\//.test(p.link || "") ? p.link : "" },
        { image: p.image, bodyImages: p.body || [] },
      ),
    );
  }
  console.log("promotions:", promotions.length);
} else console.log("promotions: already there, skipped");

if (await empty("popups")) {
  for (const p of popups) await call("POST", "/admin/popups", form({ title: { bn: p.title, en: p.titleEn || "" }, platform: "desktop", link: p.link || "" }, { image: p.image }));
  for (const p of MOBILE_POPUPS) await call("POST", "/admin/popups", form({ title: { bn: p.bn, en: p.en }, platform: "mobile", link: p.link }, { image: p.image }));
  console.log("popups:", popups.length, "desktop +", MOBILE_POPUPS.length, "mobile");
} else console.log("popups: already there, skipped");

// হোমের ভাসমান ইভেন্ট আইকন — মূল সাইটের LOGIN / TEMU / RAFFLE; ছবি ফাঁকা মানে ধরনের নিজের ছবি
if (await empty("events")) {
  const EVENTS = [
    { kind: "signin", title: { bn: "সাইন ইন", en: "Sign in" }, onlyWithTicket: false },
    { kind: "temu", title: { bn: "টেমু টিকিট", en: "TEMU ticket" }, onlyWithTicket: true },
    { kind: "redPacket", title: { bn: "লাল প্যাকেট", en: "Red packet" }, onlyWithTicket: true },
  ];
  for (const e of EVENTS) await call("POST", "/admin/events", form({ ...e, platform: "all" }, {}));
  console.log("events:", EVENTS.length);
} else console.log("events: already there, skipped");
