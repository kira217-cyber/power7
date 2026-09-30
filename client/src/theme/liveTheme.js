/**
 * admin থেকে বদলানো রঙ সাইটে বসানো, আর admin এর লাইভ প্রিভিউ শোনা।
 *
 * প্রতিটা রঙ একটা CSS ভ্যারিয়েবল (`--home-card-bg` …); কম্পোনেন্টগুলো
 * `var(--নাম, ডিফল্ট)` লেখে, তাই এখানে `:root` এ বসালেই সেই পাতার রঙ বদলায়,
 * আর না বসালে ডিফল্টই থাকে। তালিকা server এর `utils/themeRegistry.js` এ।
 *
 * প্রিভিউ: admin এর থিম স্টুডিও এই সাইটটা iframe এ খোলে আর `postMessage`
 * এ না-সেভ-করা রঙ পাঠায় — শুধু ওই iframe এর ভিতরে বসে, আর কারও নয়।
 * বার্তা নেওয়া হয় শুধু যখন পাতাটা আসলেই iframe এ, আর `VITE_ADMIN_URL`
 * দেওয়া থাকলে শুধু সেই ঠিকানা থেকে।
 */
const SITE = "client";
const API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const ADMIN_ORIGINS = String(import.meta.env.VITE_ADMIN_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAME = /^[a-z0-9-]{1,40}$/;

let applied = new Set();
// প্রিভিউর রঙ এসে গেলে দেরিতে আসা সেভ করা রঙ তার উপর বসবে না
let previewing = false;

/** রঙগুলো বসানো; আগে বসানো কিন্তু এবার নেই এমনগুলো সরিয়ে ডিফল্টে ফেরানো */
const apply = (colors) => {
  const root = document.documentElement;
  const next = new Set();
  Object.entries(colors || {}).forEach(([key, value]) => {
    if (!NAME.test(key) || !HEX.test(String(value))) return;
    root.style.setProperty(`--${key}`, value);
    next.add(key);
  });
  applied.forEach((key) => {
    if (!next.has(key)) root.style.removeProperty(`--${key}`);
  });
  applied = next;
};

export const inPreviewFrame = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const fromAdmin = (event) =>
  inPreviewFrame() && event.source === window.parent && (ADMIN_ORIGINS.length === 0 || ADMIN_ORIGINS.includes(event.origin));

export const startTheme = () => {
  if (API_URL) {
    fetch(`${API_URL}/api/theme/${SITE}/public`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!previewing) apply(data?.data?.colors || {});
      })
      .catch(() => {});
  }

  if (!inPreviewFrame()) return;

  window.addEventListener("message", (event) => {
    if (!fromAdmin(event)) return;
    const msg = event.data || {};
    if (msg.type === "tb-theme:colors") {
      previewing = true;
      apply(msg.colors);
    }
    // মডাল খোলা (ডেস্কটপের লগইন/সদস্য কেন্দ্র) — RootLayout শোনে
    if (msg.type === "tb-theme:open") window.dispatchEvent(new CustomEvent("tb:preview-open", { detail: String(msg.target || "") }));
    // লোগো/ফুটারের খসড়া (admin এর Site Identity / Footer Setting) — site/siteSettings.js শোনে
    if (msg.type === "tb-site:settings") window.dispatchEvent(new CustomEvent("tb:preview-site", { detail: msg.settings || {} }));
    // নিচে = ফুটার পর্যন্ত; গেমগুলো পরে লোড হয়ে পাতা লম্বা হয়, তাই কয়েকবার
    if (msg.type === "tb-theme:scroll") {
      const go = () => {
        const footer = msg.to === "bottom" && document.querySelector("footer");
        if (footer) footer.scrollIntoView({ block: "end" });
        else window.scrollTo({ top: msg.to === "bottom" ? document.body.scrollHeight : 0 });
      };
      [0, 1200, 3000].forEach((ms) => setTimeout(go, ms));
    }
  });

  // admin কে জানানো যে পাতা তৈরি — তখন সে রঙ পাঠায়
  window.parent.postMessage({ type: "tb-theme:ready", site: SITE }, "*");
};
