/**
 * অ্যাফিলিয়েট সাইটের যে লেখা-ছবি এতদিন কোডে বসানো ছিল, সেগুলো admin এ তোলা —
 * যাতে admin প্যানেলে আসল কনটেন্ট দেখা যায় আর সেখান থেকেই বদলানো যায়।
 *
 *   পরিচয় (নাম, লোগো, favicon) · ফুটার · হোম পেজ · লগইন/রেজিস্টার/পাসওয়ার্ড পেজ
 *   · উত্তোলনের মেথড (বিকাশ/নগদ/রকেট) আর উত্তোলনের নোট
 *
 * লেখা `affiliate/src/data/locale.js` থেকে, সংখ্যা ও তালিকা `affiliateData.js`
 * এর মতোই, ছবি `affiliate/public/assets` থেকে আপলোড। যে অংশে admin আগেই কিছু
 * বসিয়েছেন সেটা ছোঁয় না — বারবার চালানো নিরাপদ।
 *
 *   node scripts/seed-affiliate-content.mjs <API_URL> <ADMIN_TOKEN>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { locale } from "../affiliate/src/data/locale.js";

const [API = "http://localhost:5000", TOKEN] = process.argv.slice(2);
if (!TOKEN) {
  console.error("usage: node scripts/seed-affiliate-content.mjs <API_URL> <ADMIN_TOKEN>");
  process.exit(1);
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "..", "affiliate", "public");
const BANK = path.join(ROOT, "..", "client", "public", "assets", "mobile", "bank");
const auth = { Authorization: `Bearer ${TOKEN}` };

const L = (key) => {
  const v = locale[key];
  if (!v) throw new Error(`locale key missing: ${key}`);
  return { bn: v.bn, en: v.en };
};
const both = (bn, en = bn) => ({ bn, en });
const filled = (o) => Boolean(o?.bn || o?.en);
const blobOf = (file) => new Blob([fs.readFileSync(file)], { type: file.endsWith(".png") ? "image/png" : "application/octet-stream" });

const call = async (method, url, body, json = true) => {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: json && body ? { ...auth, "Content-Type": "application/json" } : auth,
    body: json && body ? JSON.stringify(body) : body,
  });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(`${method} ${url}: ${data.message}`);
  return data.data;
};

const upload = async (file) => (await call("POST", "/api/site-settings/admin/upload", (() => {
  const f = new FormData();
  f.set("image", blobOf(file), path.basename(file));
  return f;
})(), false)).url;

/* ── পরিচয় ── */
const identity = (await call("GET", "/api/site-settings/admin/aff-identify")).data;
if (!identity.logo && !identity.siteName) {
  const logo = await upload(path.join(PUBLIC, "assets", "brand", "logo.png"));
  const favicon = await upload(path.join(PUBLIC, "favicon.png"));
  await call("PUT", "/api/site-settings/admin/aff-identify", { siteName: "POWER7 Affiliates", logo, brandLogo: logo, favicon });
  console.log("identity  seeded");
} else console.log("identity  already set");

/* ── ফুটার ── */
const footer = (await call("GET", "/api/site-settings/admin/aff-footer")).data;
if (!filled(footer.copyright) && !filled(footer.description)) {
  const logo = await upload(path.join(PUBLIC, "assets", "brand", "logo.png"));
  await call("PUT", "/api/site-settings/admin/aff-footer", {
    logo,
    description: L("ctaText"),
    copyright: L("copyright"),
    ageNotice: L("ageNotice"),
  });
  console.log("footer    seeded");
} else console.log("footer    already set");

/* ── হোম পেজ ── */
const home = await call("GET", "/api/affiliate-home/admin");
if (!filled(home.hero?.title) && !home.stats?.length) {
  const PROVIDERS = [
    ["JILI", "JL"], ["PG Soft", "PG"], ["Pragmatic Play", "PP"], ["Fa Chai", "FC"], ["Big Time Gaming", "BTG"], ["Microgaming", "MG"],
    ["JDB", "JDB"], ["Evolution", "EG4"], ["Sexy Gaming", "SEX"], ["Playtech", "PT"], ["Crash Games", "SPB"],
  ];
  const FAQ = [
    ["যোগ দিতে কোনো খরচ আছে?", "Is there any joining cost?", "না। অ্যাফিলিয়েট অ্যাকাউন্ট খোলা সম্পূর্ণ ফ্রি, কোনো ডিপোজিটও লাগে না।", "No. Opening an affiliate account is completely free and needs no deposit."],
    ["কমিশন কখন পাব?", "When do I get my commission?", "প্রতি মাসের হিসাব পরের মাসের প্রথম সপ্তাহে হয়। উইথড্র রিকোয়েস্ট দিলে ২৪ ঘণ্টার মধ্যে টাকা পৌঁছে যায়।", "Each month is settled in the first week of the next month. Once you request a withdrawal, the money arrives within 24 hours."],
    ["টাকা তোলার মাধ্যম কী কী?", "Which withdrawal methods are supported?", "বিকাশ, নগদ এবং সরাসরি ব্যাংক ট্রান্সফার — ক্লায়েন্ট সাইটের মতো একই চ্যানেলগুলোই।", "bKash, Nagad and direct bank transfer — the same channels as the main site."],
    ["সক্রিয় প্লেয়ার বলতে কী বোঝায়?", "What counts as an active player?", "যে প্লেয়ার আপনার লিংক দিয়ে রেজিস্টার করেছে এবং ওই মাসে অন্তত একবার ডিপোজিট করে খেলেছে।", "A player who registered through your link and deposited and played at least once that month."],
    ["৩ স্তরের বাজি কমিশন কী?", "What is the 3-tier bet commission?", "আপনার রেফার করা প্লেয়ার, তার রেফার করা প্লেয়ার আর তার পরের স্তর — তিন স্তর থেকেই বাজির উপর ০.৯৭% কমিশন যোগ হয়।", "You earn 0.97% on bets from three levels — the players you refer, the players they refer, and the level below that."],
    ["কোনো মাসে লস হলে কী হয়?", "What happens if a month ends in a loss?", "কিছুই না — নেগেটিভ ব্যালেন্স পরের মাসে যোগ হয় না। প্রতি মাস শূন্য থেকে শুরু।", "Nothing — a negative balance is never carried forward. Every month starts from zero."],
  ];

  const content = {
    hero: {
      badge: L("heroBadge"),
      title: L("heroTitle"),
      text: L("heroText"),
      joinBtn: L("joinNow"),
      loginBtn: L("login"),
      desktopImage: "",
      mobileImage: "",
    },
    stats: [
      { value: both("৳৩০৯", "৳309"), label: L("statPerInvite") },
      { value: both("০.৬৯%", "0.69%"), label: L("statPerDeposit") },
      { value: both("০.৯৭%", "0.97%"), label: L("statBetCommission") },
      { value: both("৳১৯,৯৯৯,৯৯৯", "৳19,999,999"), label: L("statBonus") },
    ],
    commission: {
      title: L("commissionTitle"),
      text: L("commissionText"),
      tiers: [
        { players: both("১ – ১০", "1 – 10"), share: 30 },
        { players: both("১১ – ৩০", "11 – 30"), share: 35 },
        { players: both("৩১ – ৬০", "31 – 60"), share: 40 },
        { players: both("৬১ – ১০০", "61 – 100"), share: 45 },
        { players: both("১০০+", "100+"), share: 50 },
      ],
    },
    howItWorks: {
      title: L("howTitle"),
      steps: ["UserPlus", "Share2", "Wallet"].map((icon, i) => ({ icon, title: L(`step${i + 1}Title`), text: L(`step${i + 1}Text`) })),
    },
    whyUs: {
      title: L("whyTitle"),
      features: ["TrendingUp", "BarChart3", "Zap", "ShieldCheck", "Headset", "Megaphone"].map((icon, i) => ({
        icon,
        title: L(`why${i + 1}Title`),
        text: L(`why${i + 1}Text`),
      })),
    },
    providers: {
      title: L("providersTitle"),
      text: L("providersText"),
      items: PROVIDERS.map(([name]) => ({ name, image: "" })),
    },
    faq: {
      title: L("faqTitle"),
      items: FAQ.map(([qb, qe, ab, ae]) => ({ q: both(qb, qe), a: both(ab, ae) })),
    },
    cta: { title: L("ctaTitle"), text: L("ctaText"), button: L("joinNow") },
  };

  const form = new FormData();
  form.set("content", JSON.stringify(content));
  form.set("heroDesktop", blobOf(path.join(PUBLIC, "assets", "banners", "affiliate-desktop.png")), "affiliate-desktop.png");
  PROVIDERS.forEach(([, code], i) => form.set(`provider_${i}`, blobOf(path.join(PUBLIC, "assets", "vendors", `${code}.png`)), `${code}.png`));
  await call("PUT", "/api/affiliate-home/admin", form, false);
  console.log("home      seeded");
} else console.log("home      already set");

/* ── লগইন / রেজিস্টার / পাসওয়ার্ড ফেরত ── */
const pages = await call("GET", "/api/affiliate-auth/admin");
const PAGES = {
  login: { title: L("loginTitle"), subtitle: L("loginSubtitle"), footerText: L("noAccount") },
  register: { title: L("registerTitle"), subtitle: L("registerSubtitle"), footerText: L("haveAccount") },
  forgot: { title: L("forgotPassword"), subtitle: L("loginSubtitle"), footerText: L("haveAccount") },
};
for (const [page, content] of Object.entries(PAGES)) {
  if (filled(pages[page]?.title)) {
    console.log(`${page.padEnd(9)} already set`);
    continue;
  }
  const form = new FormData();
  form.set("content", JSON.stringify({ ...content, image: "" }));
  form.set("image", blobOf(path.join(PUBLIC, "assets", "brand", "logo.png")), "logo.png");
  await call("PUT", `/api/affiliate-auth/admin/${page}`, form, false);
  console.log(`${page.padEnd(9)} seeded`);
}

/* ── অ্যাফিলিয়েটের উত্তোলন ── */
const { methods } = await call("GET", "/api/aff-withdraw/admin/methods");
const WALLETS = [
  ["BKASH", "বিকাশ", "Bkash"],
  ["NAGAD", "নগদ", "Nagad"],
  ["ROCKET", "রকেট", "Rocket"],
];
for (const [index, [methodId, bn, en]] of WALLETS.entries()) {
  if (methods.some((m) => m.methodId === methodId)) {
    console.log(`${methodId.padEnd(9)} already set`);
    continue;
  }
  const form = new FormData();
  form.set("methodId", methodId);
  form.set("name", JSON.stringify(both(bn, en)));
  form.set("minimumWithdrawAmount", "500");
  form.set("maximumWithdrawAmount", "50000");
  form.set("sort", String(index));
  form.set(
    "fields",
    JSON.stringify([
      {
        key: "walletNumber",
        label: both(`${bn} নম্বর`, `${en} number`),
        placeholder: both("01XXXXXXXXX"),
        type: "tel",
        required: true,
      },
    ]),
  );
  const logo = path.join(BANK, `${methodId}.png`);
  if (fs.existsSync(logo)) form.set("logo", blobOf(logo), `${methodId}.png`);
  await call("POST", "/api/aff-withdraw/admin/methods", form, false);
  console.log(`${methodId.padEnd(9)} seeded`);
}

const { setting } = await call("GET", "/api/aff-withdraw/admin/setting");
if (!filled(setting.note)) {
  await call("PUT", "/api/aff-withdraw/admin/setting", {
    note: both(
      "উইথড্র রিকোয়েস্ট দিলে ২৪ ঘণ্টার মধ্যে টাকা আপনার নম্বরে পৌঁছে যায়। পাঠানোর আগে নম্বরটা মিলিয়ে নিন।",
      "Once you request a withdrawal, the money reaches your number within 24 hours. Double-check the number before you send.",
    ),
  });
  console.log("aff note  seeded");
} else console.log("aff note  already set");

console.log("done");
