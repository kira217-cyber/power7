import crypto from "node:crypto";

/**
 * নিবন্ধনের ক্যাপচা — মূল সাইটের মতো ৫ অঙ্কের ছবি।
 *
 * ছবিটা server নিজেই SVG হিসেবে বানায় (কোনো প্যাকেজ লাগে না)। কোডটা
 * শুধু মেমরিতে থাকে, ব্রাউজারে যায় কেবল একটা `captchaId`; তাই পাতার
 * কোড পড়ে উত্তর বের করা যায় না। প্রতিটা ক্যাপচা একবারই কাজে লাগে —
 * মিলুক বা না মিলুক, যাচাইয়ের পর মুছে যায়, ফলে একই উত্তর বারবার
 * চালিয়ে বট দিয়ে অ্যাকাউন্ট খোলা যায় না।
 *
 * OTP এর মতোই এক ইনস্ট্যান্সের মেমরি; একাধিক ইনস্ট্যান্সে Redis লাগবে।
 */

const TTL_MS = 5 * 60 * 1000;
const MAX_STORE = 20000;

const store = new Map();

const rand = (min, max) => min + Math.random() * (max - min);

/** মেয়াদ পেরোনোগুলো ঝেড়ে ফেলা — মেমরি যেন অসীম না বাড়ে */
const sweep = () => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) store.delete(id);
  }
  // এরপরও বেশি থাকলে সবচেয়ে পুরোনোগুলো বাদ (Map ঢোকানোর ক্রম রাখে)
  while (store.size > MAX_STORE) store.delete(store.keys().next().value);
};

/** ০–৯ এর রেখা — ১০ × ১৬ এর ঘরে বিন্দুর তালিকা */
const DIGITS = {
  0: [[2, 0], [8, 0], [10, 3], [10, 13], [8, 16], [2, 16], [0, 13], [0, 3], [2, 0]],
  1: [[3, 3], [6, 0], [6, 16]],
  2: [[0, 3], [3, 0], [8, 0], [10, 3], [10, 6], [0, 16], [10, 16]],
  3: [[0, 1], [9, 0], [4, 7], [9, 9], [10, 13], [6, 16], [0, 15]],
  4: [[8, 16], [8, 0], [0, 11], [10, 11]],
  5: [[10, 0], [1, 0], [0, 7], [6, 6], [10, 9], [10, 13], [6, 16], [0, 15]],
  6: [[9, 0], [3, 3], [0, 9], [1, 15], [5, 16], [9, 14], [10, 10], [6, 7], [1, 9]],
  7: [[0, 0], [10, 0], [4, 16]],
  8: [[5, 7], [1, 4], [2, 1], [5, 0], [8, 1], [9, 4], [5, 7], [1, 10], [1, 14], [5, 16], [9, 14], [9, 10], [5, 7]],
  9: [[9, 7], [5, 9], [1, 7], [0, 3], [3, 0], [7, 0], [10, 3], [9, 10], [5, 16], [1, 15]],
};

/** ১২০ × ৪৪ এর SVG — হালকা পটভূমি, বাঁকা অঙ্ক, আঁকিবুঁকি দাগ */
const drawSvg = (code) => {
  const W = 120;
  const H = 44;

  const lines = Array.from({ length: 4 }, () => {
    const color = `hsl(${Math.round(rand(0, 360))} 45% 55%)`;
    return `<path d="M${rand(0, 20).toFixed(1)} ${rand(5, H - 5).toFixed(1)} Q${rand(30, 90).toFixed(1)} ${rand(0, H).toFixed(1)} ${rand(100, W).toFixed(1)} ${rand(5, H - 5).toFixed(1)}" stroke="${color}" stroke-width="1.4" fill="none"/>`;
  }).join("");

  const dots = Array.from({ length: 22 }, () =>
    `<circle cx="${rand(0, W).toFixed(1)}" cy="${rand(0, H).toFixed(1)}" r="${rand(0.6, 1.4).toFixed(1)}" fill="hsl(${Math.round(rand(0, 360))} 40% 55%)"/>`,
  ).join("");

  // অঙ্কগুলো <text> নয়, রেখা দিয়ে আঁকা — লেখা হলে SVG এর ভিতরেই উত্তরটা
  // পড়া যেত, আর বট সেখান থেকে সরাসরি তুলে নিত
  const step = W / (code.length + 1);
  const chars = code
    .split("")
    .map((ch, i) => {
      const scale = rand(1.25, 1.5);
      const x = step * (i + 1) - 5 * scale;
      const y = rand(6, 11);
      const rotate = rand(-20, 20).toFixed(1);
      const color = `hsl(${Math.round(rand(0, 360))} 55% 32%)`;
      const d = DIGITS[ch]
        .map(([px, py], k) => `${k ? "L" : "M"}${(px + rand(-0.6, 0.6)).toFixed(1)} ${(py + rand(-0.6, 0.6)).toFixed(1)}`)
        .join("");
      return `<path d="${d}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate} 5 8) scale(${scale.toFixed(2)})" stroke="${color}" stroke-width="${rand(1.7, 2.1).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#eef3ea"/>${dots}${lines}${chars}</svg>`;
};

/** নতুন ক্যাপচা — `{ captchaId, image }` (image = data URL) */
export const createCaptcha = () => {
  sweep();

  const code = String(crypto.randomInt(10000, 100000));
  const captchaId = crypto.randomUUID();

  store.set(captchaId, { code, expiresAt: Date.now() + TTL_MS });

  const image = `data:image/svg+xml;base64,${Buffer.from(drawSvg(code)).toString("base64")}`;

  return { captchaId, image };
};

/**
 * মেলানো — একবারই। মিলুক বা না মিলুক, এন্ট্রিটা মুছে যায়।
 * ফেরত দেয় `{ ok, code? }` — code: captchaExpired | captchaWrong
 */
export const checkCaptcha = (captchaId, answer) => {
  const id = String(captchaId || "");
  const entry = store.get(id);

  store.delete(id);

  if (!entry || entry.expiresAt < Date.now()) return { ok: false, code: "captchaExpired" };

  if (String(answer || "").trim() !== entry.code) return { ok: false, code: "captchaWrong" };

  return { ok: true };
};
