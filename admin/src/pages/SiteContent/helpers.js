const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** server এ আপলোড করা ছবি (`/uploads/…`) দেখাতে server এর ঠিকানা সামনে */
export const imageUrl = (url) => (!url ? "" : /^https?:\/\//.test(url) || url.startsWith("blob:") ? url : `${API_URL}${url}`);

export const errorOf = (error, fallback = "Request failed") => error?.response?.data?.message || fallback;

/** তালিকার দুটো আইটেম অদলবদল করে নতুন ক্রম (id গুলো) */
export const swapIds = (items, i, j) => {
  const ids = items.map((x) => x._id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
};
