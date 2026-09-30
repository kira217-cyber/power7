import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, isApiDown } from "../../api/axios";

/**
 * সাইট রক্ষণাবেক্ষণে আছে কিনা — দুই কারণে:
 *
 *   ১. admin রক্ষণাবেক্ষণ চালু করেছেন (`/api/maintenance/status` এর isOn)
 *   ২. API নিজেই বন্ধ/ভাঙা (`outage`) — সংযোগ নেই, nginx এর 502/504/404,
 *      server এর "Route not found" বা ডেটাবেস বন্ধ (api/axios.js এর isApiDown)।
 *      তখনও সেই একই পর্দা, admin এর শেষ লেখা নোটিশ সহ (এই ব্রাউজারে মনে
 *      রাখা); API ফিরলে সাইট নিজে থেকে আবার খোলে (useApiRecovery)।
 *
 * server এর সাধারণ উত্তরে (ভুল পাসওয়ার্ড, "গেম নেই" …) সাইট বন্ধ হয় না।
 */
const NOTICE_KEY = "power7:maintenance-notice";

const saveNotice = (data) => {
  try {
    localStorage.setItem(NOTICE_KEY, JSON.stringify({ title: data.title || null, message: data.message || null }));
  } catch {
    /* জায়গা না থাকলে শুধু এবারের জন্য */
  }
};

const savedNotice = () => {
  try {
    return JSON.parse(localStorage.getItem(NOTICE_KEY)) || {};
  } catch {
    return {};
  }
};

export const fetchMaintenance = createAsyncThunk("maintenance/fetchMaintenance", async () => {
  try {
    const res = await api.get("/api/maintenance/status");
    return res?.data?.data || null;
  } catch (error) {
    return isApiDown(error) ? { outage: true } : null;
  }
});

const initialState = {
  isOn: false,
  outage: false,
  title: null,
  message: null,
  loaded: false,
};

const goDown = (state) => {
  const notice = savedNotice();
  state.isOn = true;
  state.outage = true;
  state.loaded = true;
  state.title = state.title || notice.title || null;
  state.message = state.message || notice.message || null;
};

const maintenanceSlice = createSlice({
  name: "maintenance",
  initialState,

  reducers: {
    /** API বন্ধ — axios থেকে (app/store.js) */
    apiDown: goDown,
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMaintenance.fulfilled, (state, action) => {
        const data = action.payload;
        state.loaded = true;
        if (!data) return;
        if (data.outage) {
          goDown(state);
          return;
        }
        saveNotice(data);
        state.isOn = Boolean(data.isOn) || state.outage;
        state.title = data.title || null;
        state.message = data.message || null;
      })
      .addCase(fetchMaintenance.rejected, (state) => {
        state.loaded = true;
      });
  },
});

export const { apiDown } = maintenanceSlice.actions;

export default maintenanceSlice.reducer;
