import axios from "axios";

import { readToken } from "../features/auth/tokenStore";

/**
 * POWER7 server এর axios।
 *
 * `.env` এ `VITE_API_URL` না থাকলে লোকাল server (৫০০০) ধরে নেয়।
 * লগইন থাকলে প্রতিটা রিকোয়েস্টে টোকেন যায়; server 401 দিলে (টোকেনের
 * মেয়াদ শেষ) বা 403 accountDisabled দিলে (admin বন্ধ করেছেন) লগআউট — লগইন/নিবন্ধনের নিজের 401 বাদে,
 * সেগুলো "ভুল পাসওয়ার্ড" মাত্র।
 */
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AUTH_PATHS = ["/api/user/login", "/api/user/register", "/api/user/forgot-password", "/api/user/otp"];

let onUnauthorized = null;
let onApiDown = null;

/**
 * API নিজেই বন্ধ/ভাঙা কিনা — তখন পুরো সাইট রক্ষণাবেক্ষণ মোডে যায়।
 *
 *   - সংযোগ নেই / সময় শেষ / DNS / SSL (কোনো উত্তর নেই)
 *   - উত্তর JSON নয় — nginx/proxy র নিজের 502, 503, 504, 404 পাতা
 *   - server এর "Route not found" (API ভুল জায়গায় deploy) আর সাধারণ
 *     "Internal server error" (যেমন ডেটাবেস বন্ধ)
 *
 * server এর নিজের সাধারণ উত্তর (ভুল পাসওয়ার্ড 401, "গেম নেই" 404, গেম
 * চালু না হওয়ার 502 …) এখানে পড়ে না — সেগুলোতে পুরো সাইট বন্ধ হয় না।
 */
export const isApiDown = (error) => {
  if (!error || axios.isCancel(error) || error.code === "ERR_CANCELED") return false;
  const res = error.response;
  if (!res) return true;
  const data = res.data;
  const json = data && typeof data === "object";
  if (!json) return res.status >= 400;
  const message = String(data.message || "");
  if (res.status === 404 && message.startsWith("Route not found")) return true;
  if (res.status >= 500 && message === "Internal server error") return true;
  return false;
};

/** store তৈরির পর একবার বসে — API বন্ধ হলে রক্ষণাবেক্ষণ মোড */
export const setApiDownHandler = (fn) => {
  onApiDown = fn;
};

/** store তৈরির পর একবার বসে — axios নিজে Redux চেনে না */
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error?.config?.url || "";
    const sentToken = Boolean(error?.config?.headers?.Authorization);

    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    // admin অ্যাকাউন্ট বন্ধ করলে 403 + accountDisabled — সেটাও লগআউট
    if (
      sentToken &&
      !AUTH_PATHS.some((p) => url.startsWith(p)) &&
      (status === 401 || (status === 403 && code === "accountDisabled"))
    ) {
      onUnauthorized?.(code);
    }

    if (isApiDown(error)) onApiDown?.();

    return Promise.reject(error);
  },
);

export default api;
