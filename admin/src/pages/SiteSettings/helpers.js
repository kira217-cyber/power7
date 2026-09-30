import { toast } from "react-toastify";

import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CLIENT_URL = String(import.meta.env.VITE_CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
/** আপলোড করা ছবি server এ; `/assets/…`, `/favicon.png` ক্লায়েন্ট সাইটের নিজের ছবি */
export const imageUrl = (u) =>
  !u ? "" : u.startsWith("http") ? u : u.startsWith("/uploads/") ? `${API_URL}${u}` : `${CLIENT_URL}${u}`;

/** সাইট সেটিং আপলোড হেল্পার — /api/site-settings/admin/upload */
export const useUpload = () => async (file) => {
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    toast.error("Choose an image");
    return "";
  }
  const form = new FormData();
  form.append("image", file);
  const { data } = await api.post("/api/site-settings/admin/upload", form);
  return data?.data?.url || "";
};
