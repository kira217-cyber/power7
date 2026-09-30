import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import api from "../../api/axios";
import { logout } from "../auth/authSlice";

/**
 * পুরস্কার কেন্দ্রের ব্যাজ — দাবি না করা টিকিটের সংখ্যা (মোবাইলের গ্রিড,
 * ডেস্কটপ মডালের মেনু, "দাবি করা" টাইল)। টিকিট খোলার পর আবার আনা হয়।
 */
export const fetchRewardSummary = createAsyncThunk("reward/summary", async () => {
  const { data } = await api.get("/api/rewards/summary");
  return data?.data || { available: 0 };
});

const rewardSlice = createSlice({
  name: "reward",
  initialState: { available: 0, kinds: {}, claimedToday: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRewardSummary.fulfilled, (state, action) => {
        state.available = Number(action.payload.available) || 0;
        state.kinds = action.payload.kinds || {};
        state.claimedToday = Boolean(action.payload.claimedToday);
      })
      .addCase(logout, (state) => {
        state.available = 0;
        state.kinds = {};
        state.claimedToday = false;
      });
  },
});

export const selectRewardAvailable = (state) => state.reward.available;
export const selectRewardKinds = (state) => state.reward.kinds;
export default rewardSlice.reducer;
