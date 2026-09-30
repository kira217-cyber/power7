import { api } from "../../api/axios";

/**
 * অ্যাফিলিয়েটের নিজের হিসাব।
 *
 * উইথড্র আর নম্বরের রুটগুলো খেলোয়াড়দের সাথেই ভাগাভাগি — সার্ভারে
 * ওগুলো ভূমিকা দেখে না, টোকেন দেখে। তাই এখানে আলাদা কিছু লাগে না।
 */

const qs = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.append(key, String(value));
  });

  const text = search.toString();
  return text ? `?${text}` : "";
};

export const fetchAffiliate = async () => {
  const { data } = await api.get("/api/affiliate/me");
  return data?.data || null;
};

export const fetchCommissionStatus = async () => {
  const { data } = await api.get("/api/affiliate/commission-status");
  return data?.data || null;
};

export const fetchMyUsers = async ({ page = 1, limit = 20, q, status } = {}) => {
  const { data } = await api.get(`/api/affiliate/my-users${qs({ page, limit, q, status })}`);
  return data?.data || { rows: [], summary: {}, meta: {} };
};

export const fetchCommissionHistory = async ({ page = 1, limit = 20, type } = {}) => {
  const { data } = await api.get(
    `/api/affiliate/commission-history${qs({ page, limit, type })}`,
  );
  return data?.data || { rows: [], meta: {} };
};

/* ── উইথড্র — অ্যাফিলিয়েটের নিজের, খেলোয়াড়ের থেকে আলাদা ──
 *
 * খেলোয়াড়ের উইথড্র সেভ করা মোবাইল নম্বর ধরে চলে; অ্যাফিলিয়েটের
 * উপায়গুলোতে অ্যাডমিনের ঠিক করা কয়েকটা ঘর থাকে (ব্যাংকের নাম,
 * অ্যাকাউন্ট নম্বর…), তাই রুটও আলাদা।
 */

export const fetchAffWithdrawMethods = async () => {
  const { data } = await api.get("/api/aff-withdraw/methods/public");
  return data?.data || { methods: [], setting: {} };
};

export const fetchAffEligibility = async () => {
  const { data } = await api.get("/api/aff-withdraw/eligibility");
  return data?.data || { eligible: false };
};

export const submitAffWithdraw = async (payload) => {
  const { data } = await api.post("/api/aff-withdraw", payload);
  return data?.data?.request || null;
};

export const fetchMyWithdraws = async ({ page = 1, limit = 20, status } = {}) => {
  const { data } = await api.get(`/api/aff-withdraw/my${qs({ page, limit, status })}`);
  return data?.data || { requests: [], meta: {} };
};

export const fetchMe = async () => {
  const { data } = await api.get("/api/user/me");
  return data?.data?.user || null;
};
