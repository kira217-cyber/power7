import { api } from "../../api/axios";

/**
 * পরিচয় যাচাই (KYC)।
 *
 * অবস্থা, সেটিং আর OTP লাগবে কিনা — সব এক ডাকে আসে, তাই পাতাটা
 * একবারেই জানতে পারে কী দেখাতে হবে।
 */
export const fetchVerification = async () => {
  const { data } = await api.get("/api/verification/my");
  return data?.data || { verification: null, setting: {}, otpRequired: false };
};

/**
 * আবেদন পাঠানো।
 *
 * ছবি যাচ্ছে বলে FormData — axios এর interceptor এ Content-Type মুছে
 * দেওয়া আছে, নইলে multipart এর boundary বসত না।
 */
export const submitVerification = async (payload) => {
  const form = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    form.append(key, value);
  });

  const { data } = await api.post("/api/verification", form);
  return data?.data?.verification || null;
};
