/**
 * অ্যাফিলিয়েট ল্যান্ডিং পেজের স্ট্যাটিক ডেটা।
 *
 * সংখ্যাগুলো **power7.live এর আসল রেফারেল অফার** থেকে — সাইটে লগইন
 * করলে যে "৪ টি রেফার কমিশন" ব্যানারটা দেখায় (হিরোতে ওটাই বসানো),
 * সেখান থেকে তোলা:
 *   ৳৩০৯ প্রতিটি রেফারেল · ০.৬৯% প্রতি ডিপোজিটে
 *   ০.৯৭% ৩ স্তরের বাজি কমিশন · ৳১৯,৯৯৯,৯৯৯ অর্জন বোনাস
 *
 * server তৈরি হলে globalSlice এর thunk এই ফাইলের বদলে
 * `/api/global/affiliate/site-data` থেকে একই শেপের ডেটা আনবে।
 */

const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;

export const siteIdentify = {
  siteName: "POWER7 Affiliates",
  logo: asset("brand/logo.png"),
  brandLogo: asset("brand/logo.png"),
  favicon: `${import.meta.env.BASE_URL}favicon.png`,
};

/** হিরোর নিচের চারটি সংখ্যা — ঠিক উপরের ব্যানার ক্রিয়েটিভে যা লেখা,
    তাই (৪ টি রেফার কমিশন) */
export const stats = [
  { key: "perInvite", value: "৳৩০৯", valueEn: "৳309", labelKey: "statPerInvite" },
  { key: "perDeposit", value: "০.৬৯%", valueEn: "0.69%", labelKey: "statPerDeposit" },
  { key: "betCommission", value: "০.৯৭%", valueEn: "0.97%", labelKey: "statBetCommission" },
  { key: "bonus", value: "৳১৯,৯৯৯,৯৯৯", valueEn: "৳19,999,999", labelKey: "statBonus" },
];

/** কমিশন স্ল্যাব — সক্রিয় প্লেয়ার অনুযায়ী রেভিনিউ শেয়ার */
export const commissionTiers = [
  { key: "t1", tier: 1, players: { bn: "১ – ১০", en: "1 – 10" }, share: 30 },
  { key: "t2", tier: 2, players: { bn: "১১ – ৩০", en: "11 – 30" }, share: 35 },
  { key: "t3", tier: 3, players: { bn: "৩১ – ৬০", en: "31 – 60" }, share: 40 },
  { key: "t4", tier: 4, players: { bn: "৬১ – ১০০", en: "61 – 100" }, share: 45 },
  { key: "t5", tier: 5, players: { bn: "১০০+", en: "100+" }, share: 50 },
];

/** তিন ধাপ — আইকনের নাম lucide-react এর */
export const steps = [
  { key: "register", icon: "UserPlus", titleKey: "step1Title", textKey: "step1Text" },
  { key: "share", icon: "Share2", titleKey: "step2Title", textKey: "step2Text" },
  { key: "earn", icon: "Wallet", titleKey: "step3Title", textKey: "step3Text" },
];

/** কেন আমরা — ছয়টি ফিচার কার্ড */
export const features = [
  { key: "commission", icon: "TrendingUp", titleKey: "why1Title", textKey: "why1Text" },
  { key: "reports", icon: "BarChart3", titleKey: "why2Title", textKey: "why2Text" },
  { key: "payout", icon: "Zap", titleKey: "why3Title", textKey: "why3Text" },
  { key: "carry", icon: "ShieldCheck", titleKey: "why4Title", textKey: "why4Text" },
  { key: "manager", icon: "Headset", titleKey: "why5Title", textKey: "why5Text" },
  { key: "tools", icon: "Megaphone", titleKey: "why6Title", textKey: "why6Text" },
];

/** প্রোভাইডার স্ট্রিপ — ক্লায়েন্ট সাইটের আসল ভেন্ডর লোগো */
export const providers = [
  { key: "jili", name: "JILI", icon: asset("vendors/JL.png") },
  { key: "pg", name: "PG Soft", icon: asset("vendors/PG.png") },
  { key: "pp", name: "Pragmatic Play", icon: asset("vendors/PP.png") },
  { key: "fc", name: "Fa Chai", icon: asset("vendors/FC.png") },
  { key: "btg", name: "Big Time Gaming", icon: asset("vendors/BTG.png") },
  { key: "mg", name: "Microgaming", icon: asset("vendors/MG.png") },
  { key: "jdb", name: "JDB", icon: asset("vendors/JDB.png") },
  { key: "evo", name: "Evolution", icon: asset("vendors/EG4.png") },
  { key: "sexy", name: "Sexy Gaming", icon: asset("vendors/SEX.png") },
  { key: "pt", name: "Playtech", icon: asset("vendors/PT.png") },
  { key: "spribe", name: "Crash Games", icon: asset("vendors/SPB.png") },
];

/** সাধারণ প্রশ্ন */
export const faqs = [
  {
    key: "cost",
    q: { bn: "যোগ দিতে কোনো খরচ আছে?", en: "Is there any joining cost?" },
    a: {
      bn: "না। অ্যাফিলিয়েট অ্যাকাউন্ট খোলা সম্পূর্ণ ফ্রি, কোনো ডিপোজিটও লাগে না।",
      en: "No. Opening an affiliate account is completely free and needs no deposit.",
    },
  },
  {
    key: "payout",
    q: { bn: "কমিশন কখন পাব?", en: "When do I get my commission?" },
    a: {
      bn: "প্রতি মাসের হিসাব পরের মাসের প্রথম সপ্তাহে হয়। উইথড্র রিকোয়েস্ট দিলে ২৪ ঘণ্টার মধ্যে টাকা পৌঁছে যায়।",
      en: "Each month is settled in the first week of the next month. Once you request a withdrawal, the money arrives within 24 hours.",
    },
  },
  {
    key: "methods",
    q: { bn: "টাকা তোলার মাধ্যম কী কী?", en: "Which withdrawal methods are supported?" },
    a: {
      bn: "বিকাশ, নগদ এবং সরাসরি ব্যাংক ট্রান্সফার — ক্লায়েন্ট সাইটের মতো একই চ্যানেলগুলোই।",
      en: "bKash, Nagad and direct bank transfer — the same channels as the main site.",
    },
  },
  {
    key: "active",
    q: { bn: "সক্রিয় প্লেয়ার বলতে কী বোঝায়?", en: "What counts as an active player?" },
    a: {
      bn: "যে প্লেয়ার আপনার লিংক দিয়ে রেজিস্টার করেছে এবং ওই মাসে অন্তত একবার ডিপোজিট করে খেলেছে।",
      en: "A player who registered through your link and deposited and played at least once that month.",
    },
  },
  {
    key: "tiers",
    q: { bn: "৩ স্তরের বাজি কমিশন কী?", en: "What is the 3-tier bet commission?" },
    a: {
      bn: "আপনার রেফার করা প্লেয়ার, তার রেফার করা প্লেয়ার আর তার পরের স্তর — তিন স্তর থেকেই বাজির উপর ০.৯৭% কমিশন যোগ হয়।",
      en: "You earn 0.97% on bets from three levels — the players you refer, the players they refer, and the level below that.",
    },
  },
  {
    key: "negative",
    q: { bn: "কোনো মাসে লস হলে কী হয়?", en: "What happens if a month ends in a loss?" },
    a: {
      bn: "কিছুই না — নেগেটিভ ব্যালেন্স পরের মাসে যোগ হয় না। প্রতি মাস শূন্য থেকে শুরু।",
      en: "Nothing — a negative balance is never carried forward. Every month starts from zero.",
    },
  },
];

export const affiliateData = {
  siteIdentify,
  stats,
  commissionTiers,
  steps,
  features,
  providers,
  faqs,
};

export default affiliateData;
