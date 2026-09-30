import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import api from "../../api/axios";
import { banners, notices, promotions, popups } from "../../data/siteData";
import { setContact } from "../../data/contact";
import { assetUrl } from "../../utils/siteLink";

/**
 * সাইটের কনটেন্ট — ব্যানার, নোটিশ, প্রমোশন, পপআপ (admin থেকে)।
 *
 * মূল সাইটের মতো ব্যানার আর পপআপ ডেস্কটপ-মোবাইলে আলাদা, তাই
 * `platform` দিয়ে আনা হয়। server না পেলে আগের স্থির ডেটা — সাইট খালি
 * দেখায় না। কম্পোনেন্টগুলো আগের আকারই পায় (title/titleEn, image …)।
 */
const STATIC = { banners, notices, promotions, popups };

const both = (value) => ({ bn: value?.bn || value?.en || "", en: value?.en || "" });

const shape = (d) => ({
  banners: d.banners.map((b) => ({ id: b._id, title: b.title, image: assetUrl(b.image), link: b.link || "" })),
  notices: d.notices.map((n) => ({ id: n._id, text: both(n.text).bn, textEn: both(n.text).en })),
  promotions: d.promotions.map((p) => ({
    id: p._id,
    code: p.code || "",
    title: both(p.title).bn,
    titleEn: both(p.title).en,
    image: assetUrl(p.image),
    link: p.link || null,
    body: (p.bodyImages || []).map(assetUrl),
    content: both(p.content),
  })),
  popups: d.popups.map((p) => ({ id: p._id, title: both(p.title).bn, titleEn: both(p.title).en, image: assetUrl(p.image), link: p.link || "" })),
  // হোমের ভাসমান ইভেন্ট আইকন (admin এর "Home Events")
  events: (d.events || []).map((e) => ({ id: e._id, kind: e.kind, title: both(e.title), image: e.image ? assetUrl(e.image) : "", link: e.link || "", platform: e.platform || "all", onlyWithTicket: Boolean(e.onlyWithTicket) })),
  eventSetting: d.eventSetting || null,
});

export const fetchGlobalClientData = createAsyncThunk("global/fetchGlobalClientData", async (platform = "desktop") => {
  try {
    const { data } = await api.get("/api/site-content/public", { params: { platform } });
    setContact(data?.data?.contact);
    return shape(data.data);
  } catch {
    return STATIC;
  }
});

const initialState = {
  banners: [],
  notices: [],
  promotions: [],
  popups: [],
  events: [],
  eventSetting: null,
  platform: "",
  loading: false,
  loaded: false,
};

const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGlobalClientData.pending, (state, action) => {
        state.loading = true;
        state.platform = action.meta.arg || "desktop";
      })
      .addCase(fetchGlobalClientData.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        Object.assign(state, action.payload);
      })
      .addCase(fetchGlobalClientData.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      });
  },
});

export default globalSlice.reducer;
