import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * কোন প্রোভাইডারে খেলা টার্নওভারে গোনা হবে, আর কতটুকু।
 *
 * খালি রাখলে সব প্রোভাইডারই চলে। `percent` দিয়ে ঠিক করা যায় ওই
 * প্রোভাইডারে খেলা কতটা গুনবে — যেমন লাইভ ক্যাসিনো ৩০%, স্লট ১০০%।
 */
const EligibleProviderSchema = new mongoose.Schema(
  {
    providerCode: { type: String, required: true, trim: true, uppercase: true },
    percent: { type: Number, default: 100, min: 0, max: 100 },
  },
  { _id: false },
);

/**
 * রেজিস্টার বোনাস।
 *
 * একসাথে একাধিক ক্যাম্পেইন থাকতে পারে; নতুন ইউজার পাবে সেই চালু
 * ক্যাম্পেইনটা যেটার ক্রম (order) সবচেয়ে আগে।
 */
const registerBonusCampaignSchema = new mongoose.Schema(
  {
    title: { type: LangTextSchema, required: true },
    description: { type: LangTextSchema, default: () => ({}) },

    bonusAmount: { type: Number, required: true, min: 0 },

    /** বোনাসের কত গুণ টার্নওভার লাগবে */
    turnoverMultiplier: { type: Number, default: 1, min: 0 },

    eligibleProviders: { type: [EligibleProviderSchema], default: [] },

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },

    order: { type: Number, default: 0, min: 0, index: true },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

registerBonusCampaignSchema.index({ status: 1, order: 1 });

/** এখন যে ক্যাম্পেইনটা চলছে — না থাকলে null */
registerBonusCampaignSchema.statics.activeOne = function activeOne() {
  const now = new Date();

  return this.findOne({
    status: "active",
    bonusAmount: { $gt: 0 },
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  }).sort({ order: 1, createdAt: 1 });
};

const RegisterBonusCampaign =
  mongoose.models.RegisterBonusCampaign ||
  mongoose.model("RegisterBonusCampaign", registerBonusCampaignSchema);

export default RegisterBonusCampaign;
