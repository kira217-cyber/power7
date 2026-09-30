import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * VIP এর একটা ধাপ — VIP0 থেকে শুরু (মূল সাইটে নতুন অ্যাকাউন্ট VIP0)।
 *
 * `xpRequired` = এই ধাপে উঠতে মোট যত XP লাগে; XP আসে বাজি থেকে
 * (VipSetting.xpPerTurnover)। ধাপে ওঠার সময় একবার `upgradeBonus`, আর
 * "ম্যানুয়াল রিবেট" এর হার এই ধাপের `rebate` থেকে — খেলার ধরন অনুযায়ী।
 */
const vipLevelSchema = new Schema(
  {
    lv: { type: Number, required: true, unique: true, min: 0 },
    name: { type: String, default: "", trim: true },

    xpRequired: { type: Number, default: 0, min: 0 },
    upgradeBonus: { type: Number, default: 0, min: 0 },

    /** ম্যানুয়াল রিবেটের হার (%) — মূল সাইটের rng/fish/live/pvp/sports */
    rebate: {
      slot: { type: Number, default: 0, min: 0, max: 5 },
      fishing: { type: Number, default: 0, min: 0, max: 5 },
      live: { type: Number, default: 0, min: 0, max: 5 },
      poker: { type: Number, default: 0, min: 0, max: 5 },
      sports: { type: Number, default: 0, min: 0, max: 5 },
    },

    color: { type: String, default: "#f9b901", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const rate = (slot, live) => ({ slot, fishing: slot, live, poker: live, sports: live });

/** প্রথমবার বসানো ধাপ — admin এর "VIP Levels" থেকে সব বদলানো যায় */
export const DEFAULT_VIP_LEVELS = [
  { lv: 0, name: "VIP0", xpRequired: 0, upgradeBonus: 0, rebate: rate(0.3, 0.2) },
  { lv: 1, name: "VIP1", xpRequired: 10000, upgradeBonus: 50, rebate: rate(0.4, 0.3) },
  { lv: 2, name: "VIP2", xpRequired: 50000, upgradeBonus: 150, rebate: rate(0.5, 0.35) },
  { lv: 3, name: "VIP3", xpRequired: 200000, upgradeBonus: 500, rebate: rate(0.6, 0.4) },
  { lv: 4, name: "VIP4", xpRequired: 500000, upgradeBonus: 1200, rebate: rate(0.7, 0.45) },
  { lv: 5, name: "VIP5", xpRequired: 1000000, upgradeBonus: 2500, rebate: rate(0.8, 0.5) },
  { lv: 6, name: "VIP6", xpRequired: 3000000, upgradeBonus: 7000, rebate: rate(0.9, 0.6) },
  { lv: 7, name: "VIP7", xpRequired: 8000000, upgradeBonus: 18000, rebate: rate(1, 0.7) },
];

/** ধাপগুলো (ছোট থেকে বড়) — একটাও না থাকলে ডিফল্ট বসিয়ে */
vipLevelSchema.statics.ladder = async function ladder() {
  let levels = await this.find({ isActive: true }).sort({ lv: 1 }).lean();
  if (!levels.length && !(await this.exists({}))) {
    await this.insertMany(DEFAULT_VIP_LEVELS, { ordered: false }).catch(() => {});
    levels = await this.find({ isActive: true }).sort({ lv: 1 }).lean();
  }
  return levels;
};

const VipLevel = mongoose.models.VipLevel || mongoose.model("VipLevel", vipLevelSchema);

export default VipLevel;
