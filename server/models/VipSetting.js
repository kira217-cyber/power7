import mongoose from "mongoose";

/**
 * VIP আর ম্যানুয়াল রিবেটের সাধারণ নিয়ম — একটাই ডকুমেন্ট।
 *
 * মূল সাইটে আলাদা VIP পাতা নেই; হেডারে "VIP0" ব্যাজ, আর "ম্যানুয়াল
 * রিবেট" এর হার ধাপ অনুযায়ী। তাই BetChokkor এর পয়েন্ট→ক্যাশ, বেনিফিট
 * কার্ড ইত্যাদি এখানে নেই — শুধু যা এই সাইটে কাজে লাগে।
 */
const vipSettingSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: true },

    /** প্রতি ১ টাকা বাজিতে কত XP */
    xpPerTurnover: { type: Number, default: 1, min: 0 },

    rebateEnabled: { type: Boolean, default: true },
    /** এর কম হলে দাবি করা যায় না */
    rebateMinClaim: { type: Number, default: 1, min: 0 },
    /** কত দিন আগের বাজি পর্যন্ত রিবেটে ধরা হয় (তার আগেরটা বাদ) */
    rebateMaxDays: { type: Number, default: 7, min: 1, max: 60 },
  },
  { timestamps: true },
);

vipSettingSchema.statics.current = async function current() {
  const existing = await this.findOne().sort({ createdAt: 1 });
  if (existing) return existing;
  return this.create({});
};

const VipSetting = mongoose.models.VipSetting || mongoose.model("VipSetting", vipSettingSchema);

export default VipSetting;
