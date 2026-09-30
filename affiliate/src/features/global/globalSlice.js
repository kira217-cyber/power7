import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { affiliateData } from "../../data/affiliateData";
import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL || "";
const img = (u) => (!u ? "" : u.startsWith("http") ? u : `${API_URL}${u}`);

/**
 * অ্যাফিলিয়েট সাইটের ডেটা।
 *
 * POWER7 এর নিজের server এখনো নেই, তাই **স্ট্যাটিক ডেটাই ভিত্তি** —
 * ঠিক ক্লায়েন্ট সাইটের মতো (`data/affiliateData.js`, `data/locale.js`)।
 * `.env` এ `VITE_API_URL` বসালে তখন অ্যাডমিন থেকে পরিচয়, ফুটার, হোম ও
 * auth কনটেন্ট এসে স্ট্যাটিকটার উপরে বসবে; না বসালে কোনো কলই হয় না
 * (নইলে অন্য প্রকল্পের server চালু থাকলে তার ডেটা ঢুকে পড়ে)।
 */
export const fetchAffiliateData = createAsyncThunk(
  "global/fetchAffiliateData",
  async () => {
    const base = {
      ...affiliateData,
      footer: null,
      home: null,
      auth: null,
    };

    // server কনফিগার করা না থাকলে স্ট্যাটিকেই থেমে যাই
    if (!API_URL) return base;

    try {
      const res = await api.get("/api/site-settings/affiliate/public");
      const { identify, footer } = res?.data?.data || {};

      if (identify) {
        // admin যা বসাননি সেটা স্ট্যাটিক থেকেই — নইলে খালি ঘর লোগো মুছে দিত
        const own = affiliateData.siteIdentify;
        base.siteIdentify = {
          siteName: identify.siteName || own.siteName,
          logo: identify.logo ? img(identify.logo) : own.logo,
          brandLogo: identify.brandLogo ? img(identify.brandLogo) : own.brandLogo,
          favicon: identify.favicon ? img(identify.favicon) : own.favicon,
        };
      }

      if (footer) {
        base.footer = {
          logo: footer.logo ? img(footer.logo) : "",
          description: footer.description,
          copyright: footer.copyright,
          ageNotice: footer.ageNotice,
        };
      }
    } catch {
      // সার্ভার না পেলে স্ট্যাটিকটাই থাকে
    }

    // হোম পেজের কনটেন্ট (admin থেকে; খালি হলে কম্পোনেন্ট স্ট্যাটিক দেখায়)
    try {
      const res = await api.get("/api/affiliate-home/public");
      const h = res?.data?.data || null;
      if (h) {
        if (h.hero) {
          h.hero.desktopImage = img(h.hero.desktopImage);
          h.hero.mobileImage = img(h.hero.mobileImage);
        }
        if (Array.isArray(h.providers?.items)) {
          h.providers.items = h.providers.items.map((p) => ({
            ...p,
            image: img(p.image),
          }));
        }
        base.home = h;
      }
    } catch {
      // হোম কনটেন্ট না পেলে স্ট্যাটিকটাই থাকে
    }

    // Login/Register পেজের কনটেন্ট (admin থেকে)
    try {
      const res = await api.get("/api/affiliate-auth/public");
      const a = res?.data?.data || null;
      if (a) {
        ["login", "register", "forgot"].forEach((k) => {
          if (a[k]?.image) a[k].image = img(a[k].image);
        });
        base.auth = a;
      }
    } catch {
      // না পেলে স্ট্যাটিকটাই থাকে
    }

    return base;
  },
);

const initialState = {
  siteIdentify: null,
  footer: null,
  stats: [],
  commissionTiers: [],
  steps: [],
  features: [],
  providers: [],
  faqs: [],
  home: null,
  auth: null,

  loading: false,
  loaded: false,
  error: null,
};

const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    clearGlobalData: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAffiliateData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAffiliateData.fulfilled, (state, action) => {
        const data = action.payload || {};

        state.siteIdentify = data.siteIdentify || null;
        state.footer = data.footer || null;
        state.stats = data.stats || [];
        state.commissionTiers = data.commissionTiers || [];
        state.steps = data.steps || [];
        state.features = data.features || [];
        state.providers = data.providers || [];
        state.faqs = data.faqs || [];
        state.home = data.home || null;
        state.auth = data.auth || null;

        state.loading = false;
        state.loaded = true;
        state.error = null;
      })
      .addCase(fetchAffiliateData.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = action.payload || "Affiliate data load failed";
      });
  },
});

export const { clearGlobalData } = globalSlice.actions;

export default globalSlice.reducer;
