/**
 * "এখনই যাচাই করুন" — ডিপোজিট/উত্তোলনের পাতা থেকে My Account (ডেস্কটপ) বা
 * Security (মোবাইল) এ গিয়ে KYC ফর্মটাই খুলে দেওয়া। পাতা বদলের মাঝে
 * sessionStorage এ একটা চিহ্ন; যে পাতা খোলে সে একবার পড়ে মুছে দেয়।
 */
const KEY = "power7:open-kyc";

export const requestKyc = () => {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* না পারলে শুধু পাতাটা খোলে */
  }
};

export const takeKycRequest = () => {
  try {
    const asked = sessionStorage.getItem(KEY) === "1";
    sessionStorage.removeItem(KEY);
    return asked;
  } catch {
    return false;
  }
};
