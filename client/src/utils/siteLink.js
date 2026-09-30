import { API_URL } from "../api/axios";

/** server এ আপলোড করা ছবি (`/uploads/…`) হলে server এর ঠিকানা সামনে */
export const assetUrl = (url) => (url && url.startsWith("/uploads/") ? `${API_URL}${url}` : url || "");

/**
 * ব্যানার/পপআপের লিংক — শুধু অঙ্ক হলে প্রমোশনের কোড (প্রমোশন পাতায়
 * সেই কার্ড খোলে), http(s) হলে নতুন ট্যাবে; বাকি কিছু (javascript: ইত্যাদি)
 * কখনো খোলে না।
 */
export const followLink = (link, navigate) => {
  const value = String(link || "").trim();
  if (!value) return false;
  if (/^\d+$/.test(value)) {
    navigate(`/promotions?open=${value}`);
    return true;
  }
  if (/^https?:\/\//i.test(value)) {
    window.open(value, "_blank", "noopener");
    return true;
  }
  return false;
};
