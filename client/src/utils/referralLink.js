/**
 * আমন্ত্রণ লিংক — `https://…/?referralCode=ABC123` (মূল সাইটের মতো)।
 *
 * লিংকে ঢুকে খেলোয়াড় প্রথমেই নিবন্ধন করেন না; হোমে ঘুরে তারপর
 * নিবন্ধনে গেলে URL এর কোডটা আর থাকে না। তাই সাইট খোলার সময়েই কোডটা
 * sessionStorage এ রাখা হয়, নিবন্ধন ফর্ম সেখান থেকে ভরে নেয়।
 */
const KEY = "tb_referral_code";

const safe = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/** সাইট খোলার সময় একবার — `referralCode` (বা পুরোনো `ref`) থাকলে রাখা */
export const captureReferral = () =>
  safe(() => {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get("referralCode") || params.get("ref") || "").trim().toUpperCase();
    if (/^[A-Z0-9]{4,12}$/.test(code)) window.sessionStorage.setItem(KEY, code);
  }, undefined);

/** এই মুহূর্তে URL এ আমন্ত্রণ কোড আছে কিনা (থাকলে কোডটা) */
export const referralInUrl = () =>
  safe(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("referralCode") || params.get("ref") || "").trim().toUpperCase();
  }, "");

/** নিবন্ধন ফর্মের জন্য — URL এ থাকলে সেটা, নইলে রাখা কোড */
export const storedReferral = () =>
  safe(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("referralCode") || params.get("ref") || "").trim().toUpperCase();
    return fromUrl || window.sessionStorage.getItem(KEY) || "";
  }, "");

/** নিজের আমন্ত্রণ লিংক — admin ডোমেইন না দিলে এই সাইটের ঠিকানা */
export const inviteLinkOf = (code, domain = "") => {
  const base = (domain || safe(() => window.location.origin, "")).replace(/\/+$/, "");
  return code ? `${base}/?referralCode=${encodeURIComponent(code)}` : "";
};

/** লেখা কপি — পুরোনো ব্রাউজারে textarea দিয়ে */
export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return safe(() => {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    }, false);
  }
};
