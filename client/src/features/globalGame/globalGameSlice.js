import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import api from "../../api/axios";
import { sections, vendors } from "../../data/gameData";
import { hotGames, gamesByType } from "../../data/gameListData";
import { adaptGameData } from "./gameAdapter";

/**
 * গেমের ক্যাটালগ — হোমের সেকশন, ভেন্ডর ও গেমের তালিকা।
 *
 * আসে server থেকে (White-label admin এর "TB Games")। server এ API key না
 * বসলে, master বন্ধ থাকলে বা ক্যাটালগ ফাঁকা হলে `data/` এর স্ট্যাটিক
 * ডেটাই দেখায় — সাইট কখনো ফাঁকা থাকে না।
 */
const STATIC = {
  source: "static",
  sections,
  mobileSections: null,
  vendors,
  hotGames,
  gamesByType,
  totals: {},
  tabs: null,
  categories: [],
};

export const fetchGlobalGameData = createAsyncThunk(
  "globalGame/fetchGlobalGameData",
  async () => {
    try {
      const res = await api.get("/api/games/game-data");
      const body = res.data?.data;

      if (!body?.configured || !body?.data?.categories?.length) return STATIC;

      const adapted = adaptGameData(body.data);
      return adapted.sections.length ? adapted : STATIC;
    } catch {
      return STATIC;
    }
  },
);

const initialState = {
  // সেকশনের তালিকাটা কনফিগ, ডেটা নয় — তাই শুরু থেকেই থাকে। এতে
  // মূল সাইটের মতো শিরোনাম-ট্যাব সাথে সাথে দেখা যায় আর ভিতরে
  // গেম আসা পর্যন্ত স্পিনার ঘোরে।
  source: "static",
  sections,
  // null = মোবাইলেও ডেস্কটপের সেকশন (স্ট্যাটিক ডেটা)
  mobileSections: null,
  vendors: {},
  hotGames: [],
  gamesByType: {},
  totals: {},
  // null মানে স্ট্যাটিক ট্যাব (Categories এর নিজের তালিকা)
  tabs: null,
  // খেলার কেন্দ্রের ক্যাটাগরি — শুধু API থেকে
  categories: [],
  loading: false,
  loaded: false,
};

const globalGameSlice = createSlice({
  name: "globalGame",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGlobalGameData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGlobalGameData.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        Object.assign(state, action.payload);
      })
      .addCase(fetchGlobalGameData.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      });
  },
});

export default globalGameSlice.reducer;
