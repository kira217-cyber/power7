import { useSyncExternalStore } from "react";

import { API_URL } from "../api/axios";

/**
 * সাইটের পরিচয় (নাম, লোগো, favicon) আর ফুটার — admin এর "Site Identity"
 * ও "Footer Setting" থেকে (`/api/site-settings/client/public`)।
 *
 * React এর বাইরের ছোট একটা store: শুরুতেই আনা হয়, শেষবারেরটা
 * localStorage এ থাকে (পরের বার পুরোনো লোগো এক ঝলক দেখায় না), আর server
 * না পেলে নিচের ডিফল্ট — যা হুবহু এখনকার মূল সাইটের মতো। admin এর
 * প্রিভিউ iframe এ খসড়াও এখানে আসে (theme/liveTheme.js → "tb:preview-site")।
 */
const CACHE_KEY = "power7:site-settings";

const lang = (bn, en = bn) => ({ bn, en });
export const DEFAULT_SETTINGS = {
  identify: {
    siteName: "POWER7 - এশিয়ার সেরা কেসিনো এবং স্পোটস প্লার্টফম",
    logo: "/assets/site/logo.c2ac3228.png",
    mobileLogo: "/assets/mobile/logo.png",
    favicon: "/favicon.png",
  },
  // server এর models/ClientFooterSetting.js এর FOOTER_DEFAULTS এর হুবহু কপি
  footer: {
    about: {
      show: true,
      title: lang("আমাদের সম্পর্কে", "About us"),
      logo: "",
      text: lang(
        "পাওয়ার৭ এর মালিক ও পরিচালনাকারী প্রতিষ্ঠান হলো পাওয়ার৭ হোল্ডিংস লিমিটেড। এর নিবন্ধন নম্বর ১২৮৩১ এবং নিবন্ধিত ঠিকানা হলো হামচাকো, মুৎসামুদু, স্বায়ত্তশাসিত দ্বীপ আনজোয়ান, ইউনিয়ন অফ কোমোরোস।",
        "POWER7 is owned and operated by Power7 Holdings Limited, registration number 12831, with its registered address at Hamchako, Mutsamudu, Autonomous Island of Anjouan, Union of Comoros.",
      ),
    },
    games: {
      show: true,
      title: lang("প্রয়োজনীয় খেলা", "Popular games"),
      items: [
        ["slot", "স্লট গেম", "Slot games"],
        ["fishing", "ফিশিং গেম", "Fishing games"],
        ["live", "ক্যাসিনো গেম", "Casino games"],
        ["poker", "পোকার গেম", "Poker games"],
        ["sports", "স্পোর্টস গেম", "Sports games"],
        ["crash", "ক্র্যাশ গেম", "Crash games"],
      ].map(([category, bn, en]) => ({ category, label: lang(bn, en) })),
    },
    certificates: {
      show: true,
      title: lang("সার্টিফিকেট", "Certificates"),
      items: [
        { name: "Gaming Curacao", image: "/assets/footer/gaming-curacao.png", link: "" },
        { name: "Oracle API", image: "/assets/footer/oracle-api.png", link: "https://oracleapi.co.uk/" },
      ],
    },
    showProviders: true,
    providerLogos: [
      ["PG", "/assets/vendors/rng_list_vendor/PG-COLOR.png"],
      ["EVO", "/assets/vendors/live_list_vendor/EG4-COLOR.png"],
      ["PT", "/assets/vendors/live_list_vendor/PT-COLOR.png"],
      ["JDB", "/assets/vendors/rng_list_vendor/JDB-COLOR.png"],
      ["CQ9", "/assets/vendors/rng_list_vendor/CQ9-GRAY.png"],
      ["FC", "/assets/vendors/rng_list_vendor/FC-COLOR.png"],
      ["JILI", "/assets/vendors/rng_list_vendor/JL-COLOR.png"],
      ["BTG", "/assets/vendors/rng_list_vendor/BTG-COLOR.png"],
    ].map(([name, image]) => ({ name, image, link: "" })),
    copyright: lang("Copyright © 2025 POWER7 All rights reserved."),
  },
};

/** ছবি ছাড়া সারি (admin এ সদ্য যোগ করা) দেখানো হয় না */
const withImage = (list) => (Array.isArray(list) ? list.filter((r) => r && r.image) : null);

/** server এর ডেটা `base` এর উপর (সাধারণত ডিফল্ট) — যা নেই তা base থেকে */
const merge = (data, base = DEFAULT_SETTINGS) => {
  const identify = { ...base.identify };
  Object.keys(identify).forEach((k) => {
    // খালি = এখনকার মূল সাইটের ছবি/নাম
    if (typeof data?.identify?.[k] === "string") identify[k] = data.identify[k] || DEFAULT_SETTINGS.identify[k];
  });

  const f = data?.footer || {};
  const b = base.footer;
  const section = (key, extra) => (f[key] && typeof f[key] === "object" ? { ...b[key], ...f[key], ...extra(f[key]) } : b[key]);
  const footer = {
    about: section("about", () => ({})),
    games: section("games", (g) => ({
      items: Array.isArray(g.items) ? g.items.filter((r) => r && r.category) : b.games.items,
    })),
    certificates: section("certificates", (c) => ({ items: withImage(c.items) || b.certificates.items })),
    showProviders: typeof f.showProviders === "boolean" ? f.showProviders : b.showProviders,
    providerLogos: withImage(f.providerLogos) || b.providerLogos,
    copyright: f.copyright || b.copyright,
  };
  return { identify, footer };
};

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? merge(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

let state = readCache();
let previewing = false;
const listeners = new Set();

/** server এ আপলোড করা ছবি হলে server এর ঠিকানা সামনে; ক্লায়েন্টের নিজের ছবি যেমন আছে */
export const siteImage = (url) => (url && url.startsWith("/uploads/") ? `${API_URL}${url}` : url || "");

const setFavicon = (href) => {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
};

const set = (next) => {
  state = next;
  if (state.identify.siteName) document.title = state.identify.siteName;
  setFavicon(siteImage(state.identify.favicon));
  listeners.forEach((fn) => fn());
};

export const startSiteSettings = () => {
  set(state);
  // admin এর প্রিভিউ — খসড়া এলে সেভ করা ডেটা আর তার উপর বসে না
  window.addEventListener("tb:preview-site", (event) => {
    previewing = true;
    // শুধু যে অংশটা এসেছে (পরিচয় বা ফুটার) সেটাই বদলায়
    set(merge(event.detail, state));
  });
  fetch(`${API_URL}/api/site-settings/client/public`, { cache: "no-store" })
    .then((res) => res.json())
    .then((body) => {
      if (!body?.data) return;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(body.data));
      } catch {
        /* জায়গা না থাকলে শুধু এবারের জন্য */
      }
      if (!previewing) set(merge(body.data));
    })
    .catch(() => {});
};

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** `{ identify, footer }` — বদলালে কম্পোনেন্ট নতুন করে আঁকে */
export const useSiteSettings = () => useSyncExternalStore(subscribe, () => state);

/** ভাষা অনুযায়ী লেখা (বাংলা/ইংরেজি জোড়া) */
export const pickLang = (value, lang) => (lang === "en" ? value?.en || value?.bn : value?.bn || value?.en) || "";
