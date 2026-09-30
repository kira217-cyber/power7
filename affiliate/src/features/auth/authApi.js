import { api } from "../../api/axios";

/**
 * অ্যাফিলিয়েটের লগইন-রেজিস্টার।
 *
 * সার্ভারে খেলোয়াড় আর অ্যাফিলিয়েটের রুট আলাদা নয় — প্রতিটা অনুরোধে
 * `site: "affiliate"` যায়, আর সার্ভার সেটা দেখে ভূমিকা ও OTP এর সেটিং
 * বেছে নেয়। তাই এখানে সবগুলো ডাকায় ওটা নিজে থেকেই বসে যায়, কোথাও
 * দিতে ভুলে যাওয়ার সুযোগ থাকে না।
 */
const SITE = "affiliate";

/**
 * সার্ভারের ভুলটা ব্যবহারকারীর ভাষায় বের করা।
 *
 * সার্ভার একটা `code` পাঠায় (যেমন `badLogin`), সেটা locale এর
 * `errBadLogin` কী হয়ে যায়। কোড না চিনলে সার্ভারের নিজের লেখাটাই।
 */
export const authError = (error, fallback, t) => {
  const data = error?.response?.data;
  const code = data?.code;

  if (code && t) {
    const key = `err${code.charAt(0).toUpperCase()}${code.slice(1)}`;
    const text = t(key);

    if (text && text !== key) return text;
  }

  return data?.message || fallback;
};

/** OTP চাওয়া — এই ফ্লোতে OTP বন্ধ থাকলে `required: false` আসে */
export const sendOtp = async (payload) => {
  const { data } = await api.post("/api/user/otp/send", { ...payload, site: SITE });
  return data?.data || {};
};

export const verifyOtp = async (payload) => {
  const { data } = await api.post("/api/user/otp/verify", { ...payload, site: SITE });
  return data?.data || {};
};

export const registerAffiliate = async (payload) => {
  const { data } = await api.post("/api/user/register", { ...payload, site: SITE });
  return data?.data || {};
};

export const loginAffiliate = async (payload) => {
  const { data } = await api.post("/api/user/login", { ...payload, site: SITE });
  return data?.data || {};
};

export const resetPassword = async (payload) => {
  const { data } = await api.post("/api/user/forgot-password", {
    ...payload,
    site: SITE,
  });
  return data || {};
};
