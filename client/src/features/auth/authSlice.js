import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "../../api/axios";
import { clearSession, readToken, readUser, saveSession, saveUser } from "./tokenStore";

/**
 * লগইন অবস্থা — server এর `/api/user/*` থেকে।
 *
 * server এর ইউজারকে (`userId`, `createdAt` …) সাইটের কম্পোনেন্টগুলো যে
 * নামে পড়ে (`username`, `joinedAt`, `currency: "৳"`) সেভাবে সাজানো হয়,
 * তাই হেডার-সদস্য কেন্দ্রের কোনো কম্পোনেন্ট বদলাতে হয়নি।
 */
export const toClientUser = (u) =>
  u
    ? {
        ...u,
        username: u.userId,
        nickname: u.userId,
        balance: Number(u.balance) || 0,
        vipLevel: Number(u.vipLevel) || 0,
        currency: "৳",
        joinedAt: u.createdAt ? String(u.createdAt).slice(0, 10) : "",
        avatar: "/assets/mobile/avatar.png",
      }
    : null;

/** ব্যালেন্স ও তথ্য নতুন করে — হেডারের রিফ্রেশ, খেলা থেকে ফেরা ইত্যাদি */
export const refreshMe = createAsyncThunk("auth/refreshMe", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/api/user/me");
    return data?.data?.user || null;
  } catch (error) {
    return rejectWithValue(error?.response?.status || 0);
  }
});

const initialToken = readToken();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: initialToken ? readUser() : null,
    token: initialToken,
    refreshing: false,
  },
  reducers: {
    setCredentials: (state, action) => {
      const { token, user, remember = true } = action.payload || {};
      state.token = token;
      state.user = toClientUser(user);
      saveSession({ token, user: state.user, remember });
    },
    updateUser: (state, action) => {
      if (!state.token) return;
      state.user = toClientUser(action.payload);
      saveUser(state.user);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      clearSession();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshMe.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(refreshMe.fulfilled, (state, action) => {
        state.refreshing = false;
        if (!state.token || !action.payload) return;
        state.user = toClientUser(action.payload);
        saveUser(state.user);
      })
      .addCase(refreshMe.rejected, (state) => {
        // 401 হলে axios নিজেই লগআউট করায়; নেটওয়ার্কের ভুলে আগের তথ্য থাকে
        state.refreshing = false;
      });
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
