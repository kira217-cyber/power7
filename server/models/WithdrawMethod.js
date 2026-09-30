import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * টাকা তোলার একটা উপায় — যেমন bKash, Nagad।
 *
 * ডিপোজিটের মেথডের মতো এখানে নম্বর থাকে না; নম্বরটা ব্যবহারকারী নিজে
 * দেন (`EWallet`), কারণ টাকা তাঁর কাছেই যাবে।
 */
const withdrawMethodSchema = new mongoose.Schema(
  {
    methodId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: { type: LangTextSchema, default: () => ({}) },

    logoUrl: { type: String, default: "", trim: true },

    minimumWithdrawAmount: { type: Number, default: 0, min: 0 },
    maximumWithdrawAmount: { type: Number, default: 0, min: 0 },

    sort: { type: Number, default: 0, index: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

withdrawMethodSchema.index({ isActive: 1, sort: 1 });

const WithdrawMethod =
  mongoose.models.WithdrawMethod ||
  mongoose.model("WithdrawMethod", withdrawMethodSchema);

export default WithdrawMethod;
