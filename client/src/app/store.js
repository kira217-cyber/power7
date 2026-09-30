import { configureStore } from "@reduxjs/toolkit";

import authReducer, { logout } from "../features/auth/authSlice";
import { setApiDownHandler, setUnauthorizedHandler } from "../api/axios";
import { notify } from "../utils/notify";
import { locale } from "../data/locale";

import globalReducer from "../features/global/globalSlice";
import globalGameReducer from "../features/globalGame/globalGameSlice";
import maintenanceReducer, { apiDown } from "../features/maintenance/maintenanceSlice";
import inboxReducer from "../features/inbox/inboxSlice";
import rewardReducer from "../features/reward/rewardSlice";

/** Redux এর বাইরে (axios থেকে) বর্তমান ভাষার লেখা — LanguageProvider যেখানে রাখে সেখান থেকে */
const currentLocale = () => {
  try {
    return locale[localStorage.getItem("power7:lang")] || locale.bn;
  } catch {
    return locale.bn;
  }
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    global: globalReducer,
    globalGame: globalGameReducer,
    maintenance: maintenanceReducer,
    inbox: inboxReducer,
    reward: rewardReducer,
  },
});

// টোকেন অচল (মেয়াদ শেষ, অ্যাকাউন্ট বন্ধ) — server 401 দিলেই লগআউট
setUnauthorizedHandler((code) => {
  if (!store.getState().auth.token) return;
  store.dispatch(logout());
  const t = currentLocale();
  if (code === "accountDisabled") notify.error(t.authErr.accountDisabled);
  else notify.warning(t.notify.sessionExpired);
});

// API বন্ধ/ভাঙা (সংযোগ নেই, 502, "Route not found" …) — পুরো সাইট রক্ষণাবেক্ষণ মোডে
setApiDownHandler(() => {
  if (!store.getState().maintenance.outage) store.dispatch(apiDown());
});

export default store;
