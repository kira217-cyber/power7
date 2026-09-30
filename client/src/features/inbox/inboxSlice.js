import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import api from "../../api/axios";
import { logout } from "../auth/authSlice";

/**
 * ইনবক্সের না-পড়া সংখ্যা — মোবাইলের সদস্য গ্রিড আর ডেস্কটপ মডালের
 * মেনুতে লাল ব্যাজ। ইনবক্সে পড়া/মোছার পর server এর নতুন সংখ্যা বসে।
 */
export const fetchInboxUnread = createAsyncThunk("inbox/unread", async () => {
  const { data } = await api.get("/api/inbox/unread-count");
  return data?.data?.unread || 0;
});

const inboxSlice = createSlice({
  name: "inbox",
  initialState: { unread: 0 },
  reducers: {
    setInboxUnread: (state, action) => {
      state.unread = Math.max(0, Number(action.payload) || 0);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInboxUnread.fulfilled, (state, action) => {
        state.unread = action.payload;
      })
      .addCase(logout, (state) => {
        state.unread = 0;
      });
  },
});

export const { setInboxUnread } = inboxSlice.actions;
export const selectInboxUnread = (state) => state.inbox.unread;
export default inboxSlice.reducer;
