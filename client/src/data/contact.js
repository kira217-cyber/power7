/**
 * গ্রাহক সেবার লিংক — হেডার, মেইনটেন্যান্স আর পাসওয়ার্ড ফেরতের পর্দা
 * একই লিংক খোলে।
 *
 * আসল মান admin › Contact Links থেকে (`/api/site-content/public` এর
 * `contact`); সাইটের কনটেন্ট আসার আগে বা server না পেলে মূল সাইটের
 * টেলিগ্রাম চ্যানেল।
 */
const FALLBACK = "https://t.me/+NpaAP08VuVtiODc1";
let current = { supportUrl: FALLBACK };

export const setContact = (contact) => {
  if (contact?.supportUrl) current = { ...contact };
};

export const getContact = () => current;
export const getSupportUrl = () => current.supportUrl || FALLBACK;

export const openSupport = () => window.open(getSupportUrl(), "_blank", "noopener");
