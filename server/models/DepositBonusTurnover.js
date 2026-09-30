import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * কোন প্রোভাইডারে খেললে টার্নওভারে গোনা হবে।
 *
 * `percent` হলো সেই প্রোভাইডারের জন্য বাঁধা একটা ন্যূনতম অংশ — গুণক নয়।
 * তালিকা খালি মানে কোনো বাধা নেই, যে কোনো প্রোভাইডারই পুরোপুরি গোনে।
 */
const EligibleProviderSchema = new mongoose.Schema(
  {
    providerCode: { type: String, required: true, trim: true, uppercase: true },
    percent: { type: Number, default: 100, min: 0, max: 100 },
  },
  { _id: false },
);

/**
 * বোনাস চ্যানেল — ডিপোজিট পেজে মেথডের নিচে যে ট্যাবগুলো থাকে।
 *
 * এগুলো টাকা পাঠানোর নম্বর নয়; নম্বর থাকে মেথডের `contacts` এ। এখানে
 * শুধু বোনাসের হার — যেমন "ক্যাশআউট +৫%"।
 */
const ChannelSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: LangTextSchema, default: () => ({}) },

    /** কার্ডে যে ব্যাজটা দেখায় */
    tagText: { type: String, default: "+0%", trim: true },

    bonusTitle: { type: LangTextSchema, default: () => ({}) },
    bonusPercent: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

/**
 * প্রোমোশন — চ্যানেলের বোনাসের সাথে বাড়তি যোগ হয়।
 *
 * নিজের টার্নওভার গুণক আছে, তাই প্রোমো বেছে নিলে মেথডের সাধারণ গুণকের
 * বদলে প্রোমোরটাই চলে।
 */
const PromotionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, lowercase: true },
    name: { type: LangTextSchema, default: () => ({}) },

    bonusType: { type: String, enum: ["percent", "fixed"], default: "fixed" },
    bonusValue: { type: Number, default: 0, min: 0 },

    turnoverMultiplier: { type: Number, default: 1, min: 0 },

    /** first-deposit হলে যার আগে একটাও approved ডিপোজিট আছে সে পাবে না */
    bonusScope: {
      type: String,
      enum: ["first-deposit", "all-time"],
      default: "all-time",
    },

    isActive: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },

    /**
     * নিজের তালিকা থাকলে মেথডের সাধারণ তালিকাটা এটা দিয়ে বদলে যায়;
     * খালি রাখলে মেথডেরটাই চলে — তাই প্রোমোতে বসাতে ভুলে গেলে বাধাটা
     * চুপচাপ উঠে যায় না।
     */
    eligibleProviders: { type: [EligibleProviderSchema], default: [] },
  },
  { _id: false },
);

/**
 * একটা মেথডের বোনাস ও টার্নওভারের নিয়ম — মেথডপ্রতি একটাই ডকুমেন্ট।
 */
const depositBonusTurnoverSchema = new mongoose.Schema(
  {
    depositMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepositMethod",
      required: true,
      unique: true,
    },

    turnoverMultiplier: { type: Number, default: 1, min: 0 },

    /** প্রোমো ছাড়া শুধু চ্যানেল বোনাসে ডিপোজিট হলে এটাই চলে */
    eligibleProviders: { type: [EligibleProviderSchema], default: [] },

    channels: { type: [ChannelSchema], default: [] },
    promotions: { type: [PromotionSchema], default: [] },
  },
  { timestamps: true },
);

const DepositBonusTurnover =
  mongoose.models.DepositBonusTurnover ||
  mongoose.model("DepositBonusTurnover", depositBonusTurnoverSchema);

export default DepositBonusTurnover;
