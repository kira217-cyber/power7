import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // ফাইল পাঠানোর সময় ব্রাউজারকেই Content-Type বসাতে দিতে হয় —
  // multipart এর boundary ওখান থেকেই আসে, আমরা json বসিয়ে রাখলে
  // সার্ভার ফাইলটা খুঁজেই পায় না
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  const token = localStorage.getItem("admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// টোকেন অচল হলে সেশন মুছে লগইনে ফেরত — কিন্তু লগইন রিকোয়েস্টের
// নিজের 401 (ভুল পাসওয়ার্ড) এ নয়
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    if (status === 401 && !url.includes("/login")) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_data");

      // live এ admin থাকে /admin/ এর নিচে — তাই BASE_URL সহ
      const loginPath = `${import.meta.env.BASE_URL}login`;
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
