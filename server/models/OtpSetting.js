import mongoose from "mongoose";

/**
 * কোন কোন ধাপে OTP লাগবে।
 *
 * প্রতিটা ফ্লো আলাদা করে বন্ধ/চালু করা যায়, তাই কোডে হাত না দিয়েই
 * অ্যাডমিন ঠিক করতে পারেন কোথায় OTP চাইবে। বন্ধ থাকলে ওই ধাপটা
 * নিঃশব্দে এড়িয়ে যায়।
 */
const flowsSchema = new mongoose.Schema(
  {
    register: { type: Boolean, default: true },
    login: { type: Boolean, default: false },
    forgotPassword: { type: Boolean, default: true },
    withdraw: { type: Boolean, default: true },
    profileVerify: { type: Boolean, default: true },
  },
  { _id: false },
);

/**
 * একটাই ডকুমেন্ট থাকে।
 *
 * ক্লায়েন্ট আর অ্যাফিলিয়েট সাইটের টগল আলাদা — একই SMS key দুই
 * জায়গাতেই চলে, কিন্তু কোথায় OTP চাইবে সেটা আলাদা করে ঠিক করা যায়।
 */
const otpSettingSchema = new mongoose.Schema(
  {
    // o-sms.com এর API key — অ্যাডমিন প্যানেল থেকে বসে
    apiKey: { type: String, default: "", trim: true, select: false },

    isActive: { type: Boolean, default: true, index: true },

    client: { type: flowsSchema, default: () => ({}) },
    affiliate: { type: flowsSchema, default: () => ({}) },

    lastTestedAt: { type: Date, default: null },
    lastTestError: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

/** সবসময় একটাই ডকুমেন্ট — না থাকলে ডিফল্ট দিয়ে বানায় */
otpSettingSchema.statics.current = async function current() {
  const existing = await this.findOne().sort({ createdAt: 1 }).select("+apiKey");

  if (existing) return existing;

  return this.create({});
};

/** অ্যাডমিনে দেখানোর রূপ — পুরো key কখনো বাইরে যায় না */
otpSettingSchema.methods.toSafeJSON = function toSafeJSON(rawKey = "") {
  const key = String(rawKey || "");

  return {
    keyPreview: key ? `••••••••${key.slice(-4)}` : "",
    hasKey: Boolean(key),
    isActive: this.isActive,
    client: this.client,
    affiliate: this.affiliate,
    lastTestedAt: this.lastTestedAt,
    lastTestError: this.lastTestError,
    updatedAt: this.updatedAt,
  };
};

const OtpSetting =
  mongoose.models.OtpSetting || mongoose.model("OtpSetting", otpSettingSchema);

export default OtpSetting;
