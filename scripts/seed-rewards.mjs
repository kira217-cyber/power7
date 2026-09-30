/**
 * পুরস্কার কেন্দ্রের শুরুর সেটআপ — মূল সাইটের মতো টিকিটের টেমপ্লেট
 * (টেমু "বিশাল পুরস্কার", "প্রতিদিন লগইন ইনাম" লাল প্যাকেট, চার রকম চাকা)
 * আর ৫ দিনের সাইন-ইন (জমা ৳১০০০ + বাজি ৳১৫০০০)।
 *
 * টেমপ্লেট আগে থেকে থাকলে কিছুই করে না — admin এর বদল মুছে যায় না।
 * নতুন খেলোয়াড় নিবন্ধনে টেমু টিকিট পায় (মূল সাইটের মতো)।
 *
 *   node scripts/seed-rewards.mjs <API_URL> <ADMIN_TOKEN>
 */
const [API = "http://localhost:5000", TOKEN] = process.argv.slice(2);
if (!TOKEN) {
  console.error("usage: node scripts/seed-rewards.mjs <API_URL> <ADMIN_TOKEN>");
  process.exit(1);
}

const call = async (method, url, body) => {
  const res = await fetch(`${API}/api/rewards/admin${url}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(`${method} ${url}: ${data.message}`);
  return data.data;
};

const wheel = (bn, en, amounts) => ({
  kind: "wheel",
  name: { bn, en },
  label: { bn: "লাকি হুইল", en: "Lucky wheel" },
  description: { bn: "চাকা ঘুরিয়ে পুরস্কার জিতুন।", en: "Spin the wheel to win a prize." },
  validDays: 1,
  turnoverMultiplier: 1,
  // ছোট অঙ্কের ওজন বেশি, বড়টার কম
  wheel: { segments: amounts.map((amount, i) => ({ amount, weight: [30, 25, 18, 12, 8, 4, 2, 1][i] ?? 1 })) },
});

const TEMPLATES = {
  temu: {
    kind: "temu",
    name: { bn: "বিশাল পুরস্কার", en: "Grand prize" },
    label: { bn: "টেমু টিকিট", en: "TEMU ticket" },
    description: { bn: "বিশাল পুরস্কার", en: "Grand prize" },
    validDays: 7,
    turnoverMultiplier: 1,
    temu: { target: 1088, initMinPct: 86, initMaxPct: 90, stepMinPct: 35, stepMaxPct: 60, finishBelow: 8, tasks: ["wallet", "deposit", "invite"], maxInvites: 10 },
  },
  daily: {
    kind: "redPacket",
    name: { bn: "প্রতিদিন লগইন ইনাম", en: "Daily login reward" },
    label: { bn: "লাল প্যাকেজ", en: "Red packet" },
    description: { bn: "লাল প্যাকেট খুলে পুরস্কার নিন।", en: "Open the red packet for your reward." },
    validDays: 1,
    turnoverMultiplier: 1,
    redPacket: { min: 5, max: 38 },
  },
  bronze: wheel("ব্রোঞ্জ হুইল", "Bronze wheel", [3, 5, 8, 10, 18, 28, 58, 88]),
  silver: wheel("সিলভার হুইল", "Silver wheel", [5, 8, 10, 18, 28, 58, 88, 188]),
  gold: wheel("গোল্ড হুইল", "Gold wheel", [8, 10, 18, 28, 58, 88, 188, 288]),
  diamond: wheel("ডায়মন্ড হুইল", "Diamond wheel", [10, 18, 28, 58, 88, 188, 288, 888]),
};

const RULES_BN = `POWER7 প্রতিদিন লগ-ইন ইভেন্ট: বিশেষ সুবিধা আনলক করুন!

প্রতিদিন লগ ইন ইভেন্টে কীভাবে অংশগ্রহণ করবেন তার পদ্ধতি এখানে:

১. প্রতিদিন একটি লাকি প্রাইজ হুইল পান।

২. প্রতিদিন ৳ ১০০০ জমা করে এবং ৳ ১৫০০০ টার্নওভার পূরণ করে একটি দৈনিক লগইন বোনাস পান।

৩. একটানা উপস্থিতির সাথে বোনাস বৃদ্ধি পায়। এমনকি যদি আপনি এক দিন মিস করেন, আপনি আবার শুরু করতে পারেন!

৪. প্রতিদিনের লগ-ইন বোনাসগুলি একটি ক্রমাগত উপস্থিতি ধারা সম্পূর্ণ করার পরে পুনঃস্থাপন করা হয়, প্রতিটি দিন এটি নতুন করে শুরু হয়।

POWER7 প্রতিদিন লগ ইন ইভেন্টে যোগ দিন এবং বিশেষ সুবিধা উপভোগ করুন! আপনার যদি কোন প্রশ্ন থাকে বা সাহায্যের প্রয়োজন হয়, যে কোন সময় আমাদের সাথে যোগাযোগ করুন। শুভকামনা!`;

const RULES_EN = `POWER7 daily login event: unlock special benefits!

How to take part in the daily login event:

1. Get a lucky prize wheel every day.

2. Deposit ৳1000 and reach ৳15000 turnover in a day to get that day's login bonus.

3. The bonus grows with consecutive days. If you miss a day, you simply start again!

4. After a full streak is completed the daily bonuses reset and start again from day 1.

Join the POWER7 daily login event and enjoy the benefits! Contact us any time if you need help. Good luck!`;

const { templates } = await call("GET", "/templates");
if (templates.length) {
  console.log(`templates already exist (${templates.length}) — nothing to do`);
  process.exit(0);
}

const ids = {};
for (const [key, body] of Object.entries(TEMPLATES)) {
  ids[key] = (await call("POST", "/templates", body)).template._id;
  console.log("template", key);
}

await call("PUT", "/signin", {
  enabled: true,
  title: { bn: "POWER7 প্রতিদিন লগ-ইন ইভেন্ট: বিশেষ সুবিধা আনলক করুন!", en: "POWER7 daily login event: unlock special benefits!" },
  rules: { bn: RULES_BN, en: RULES_EN },
  depositReq: 1000,
  betReq: 15000,
  registerTemplate: ids.temu,
  days: [
    { name: { bn: "১ম দিন ব্রোঞ্জ হুইল", en: "Day 1 bronze wheel" }, template: ids.bronze },
    { name: { bn: "২য় দিন সিলভার হুইল", en: "Day 2 silver wheel" }, template: ids.silver },
    { name: { bn: "৩য় দিন গোল্ড হুইল", en: "Day 3 gold wheel" }, template: ids.gold },
    { name: { bn: "৪র্থ দিনের লগ-ইন পুরস্কার", en: "Day 4 login reward" }, template: ids.daily },
    { name: { bn: "৫ম দিন ডায়মন্ড হুইল", en: "Day 5 diamond wheel" }, template: ids.diamond },
  ],
});
console.log("sign-in saved");
