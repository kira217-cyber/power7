/**
 * server এ আপলোড করা ছবির পুরো ঠিকানা — `/uploads/…` এর সামনে API এর ঠিকানা।
 * পুরো লিংক (http…) বা সাইটের নিজের ছবি (`/assets/…`) যেমন আছে তেমনই।
 */
const API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const assetUrl = (url) => (url && url.startsWith("/uploads/") ? `${API_URL}${url}` : url || "");
