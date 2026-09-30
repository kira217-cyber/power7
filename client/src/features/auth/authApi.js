import { api } from "../../api/axios";

/**
 * server এর `/api/user/*` — খেলোয়াড়ের সাইট (`site: "client"`)।
 *
 * সবগুলো `{ ok, data }` অথবা `{ ok: false, code, message }` ফেরত দেয়;
 * কম্পোনেন্টকে axios এর এরর ঘাঁটতে হয় না। নেটওয়ার্কে না পৌঁছালে
 * `code: "network"`, বেশি চেষ্টা হলে (429) `code: "tooMany"`।
 */
const SITE = "client";

const call = async (fn) => {
  try {
    const res = await fn();
    return { ok: true, data: res?.data?.data || {} };
  } catch (error) {
    const status = error?.response?.status;
    const body = error?.response?.data;
    return {
      ok: false,
      code: body?.code || (status === 429 ? "tooMany" : status ? "" : "network"),
      message: body?.message || "",
    };
  }
};

export const fetchCaptcha = () => call(() => api.get("/api/user/captcha"));

/** কোন ধাপে OTP লাগবে — শুধু খেলোয়াড়ের সাইটেরটা */
let flowsPromise = null;
export const fetchOtpFlows = () => {
  if (!flowsPromise) {
    flowsPromise = call(() => api.get("/api/otp-setting/flows")).then((r) => {
      // ব্যর্থ হলে পরের বার আবার চেষ্টা
      if (!r.ok) flowsPromise = null;
      return r.ok ? r.data?.client || {} : {};
    });
  }
  return flowsPromise;
};

export const sendOtp = (body) => call(() => api.post("/api/user/otp/send", { site: SITE, ...body }));
export const verifyOtp = (body) => call(() => api.post("/api/user/otp/verify", { site: SITE, ...body }));
export const loginRequest = (body) => call(() => api.post("/api/user/login", { site: SITE, ...body }));
export const registerRequest = (body) => call(() => api.post("/api/user/register", { site: SITE, ...body }));
export const forgotRequest = (body) => call(() => api.post("/api/user/forgot-password", { site: SITE, ...body }));
