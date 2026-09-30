import mongoose from "mongoose";

/**
 * ডিপোজিটের সাধারণ নিয়ম (একটাই ডকুমেন্ট)।
 *
 * `manualEnabled` — ম্যানুয়াল ডিপোজিট চালু কিনা। অটো ডিপোজিটের নিজের
 * চালু/বন্ধ `AutoDepositToken.active` এ; ক্লায়েন্ট দুটো মিলিয়ে ঠিক করে
 * দুটো কার্ড, একটার পাতা, নাকি "সাময়িক বন্ধ" দেখাবে।
 */
const depositSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    manualEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

depositSettingSchema.statics.current = function current() {
  return this.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, lean: true },
  );
};

const DepositSetting = mongoose.models.DepositSetting || mongoose.model("DepositSetting", depositSettingSchema);
export default DepositSetting;
