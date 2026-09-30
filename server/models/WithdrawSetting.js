import mongoose from "mongoose";

/**
 * উত্তোলনের সাধারণ নিয়ম (একটাই ডকুমেন্ট) — মূল সাইটের `maxTransactionTimes`।
 * `dailyCount` = দিনে (বাংলাদেশের দিন) সর্বোচ্চ কতবার আবেদন; ০ = সীমা নেই।
 * বাতিল হওয়া আবেদন গোনা হয় না।
 */
const withdrawSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    dailyCount: { type: Number, default: 99, min: 0, max: 1000 },
    /** ম্যানুয়াল উত্তোলন চালু কিনা — বন্ধ থাকলে ক্লায়েন্টে শুধু অটো (থাকলে) দেখায় */
    manualEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

withdrawSettingSchema.statics.current = function current() {
  return this.findOneAndUpdate({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, lean: true });
};

const WithdrawSetting = mongoose.models.WithdrawSetting || mongoose.model("WithdrawSetting", withdrawSettingSchema);
export default WithdrawSetting;
