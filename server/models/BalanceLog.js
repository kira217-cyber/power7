import mongoose from "mongoose";

/**
 * টাকার খাতা — খেলোয়াড়ের ব্যালেন্সে প্রতিটা আসা-যাওয়ার এক সারি
 * (মূল সাইটের "অ্যাকাউন্ট রেকর্ড")।
 *
 * ডিপোজিট, বোনাস, উত্তোলন, ফেরত, admin এর সরাসরি বদল — সব এখানে, সাথে
 * বদলের পরের ব্যালেন্স আর পড়ার মতো অর্ডার নম্বর। খেলার প্রতিটা রাউন্ড
 * এখানে নয় — সেটা GameHistory তে (বেটিং রেকর্ড), নইলে খাতা বাজিতেই ভরে যেত।
 * BetChokkor এ এমন খাতা ছিল না, admin ব্যালেন্স বদলালে কোনো চিহ্ন থাকত না।
 */
export const LOG_TYPES = [
  "deposit", // অনুমোদিত ডিপোজিট (আসল টাকা)
  "promotion", // ডিপোজিট/নিবন্ধন বোনাস
  "withdraw", // উত্তোলনের আবেদনে কাটা
  "withdraw-refund", // বাতিল উত্তোলনের ফেরত
  "rebate", // রিবেট/ক্যাশব্যাক
  "referral", // বন্ধুদের আমন্ত্রণের পুরস্কার/কমিশন
  "vip", // VIP ধাপে ওঠার বোনাস
  "reward", // পুরস্কার কেন্দ্রের টিকিট (লাল প্যাকেট, চাকা, টেমু)
  "commission", // অ্যাফিলিয়েটের কমিশন মেলানো (settle) — ব্যালেন্সে তোলা
  "admin-adjust", // admin এর সরাসরি বদল
];

const balanceLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: LOG_TYPES, required: true },
    amount: { type: Number, required: true }, // + জমা, − কাটা
    balanceAfter: { type: Number, required: true },
    orderNo: { type: String, required: true, unique: true },
    refType: { type: String, default: "" }, // DepositRequest, WithdrawRequest …
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    note: { type: String, default: "", trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

balanceLogSchema.index({ user: 1, createdAt: -1 });
balanceLogSchema.index({ user: 1, type: 1, createdAt: -1 });

const BalanceLog = mongoose.models.BalanceLog || mongoose.model("BalanceLog", balanceLogSchema);

export default BalanceLog;
