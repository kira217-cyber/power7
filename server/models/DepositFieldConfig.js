import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * ডিপোজিট ফর্মের একটা ঘর।
 *
 * মেথডভেদে দরকারি তথ্য আলাদা (কারো ট্রানজেকশন আইডি লাগে, কারো পাঠানো
 * নম্বর), তাই ঘরগুলো কোডে না লিখে অ্যাডমিন থেকেই ঠিক করা যায়।
 */
const DepositInputSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: LangTextSchema, default: () => ({}) },
    placeholder: { type: LangTextSchema, default: () => ({}) },

    type: {
      type: String,
      enum: ["text", "number", "tel"],
      default: "text",
    },

    required: { type: Boolean, default: true },

    /**
     * একই মান আবার চলবে না — যেমন ট্রানজেকশন আইডি। BetChokkor এ একই
     * TrxID দিয়ে বারবার ডিপোজিট জমা দেওয়া যেত; admin এই ঘরটা চিহ্নিত
     * করলে অপেক্ষমাণ বা অনুমোদিত কোনো রিকোয়েস্টে থাকা মান আবার নেয় না।
     */
    uniqueValue: { type: Boolean, default: false },

    minLength: { type: Number, default: 0, min: 0 },
    maxLength: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

/**
 * একটা মেথডের ফর্ম — মেথডপ্রতি একটাই ডকুমেন্ট।
 *
 * নির্দেশনার লেখাটাও এখানে, কারণ সেটা ফর্মের মাথায়ই দেখানো হয়।
 */
const depositFieldConfigSchema = new mongoose.Schema(
  {
    depositMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepositMethod",
      required: true,
      unique: true,
    },

    instructions: { type: LangTextSchema, default: () => ({}) },

    inputs: { type: [DepositInputSchema], default: [] },
  },
  { timestamps: true },
);

const DepositFieldConfig =
  mongoose.models.DepositFieldConfig ||
  mongoose.model("DepositFieldConfig", depositFieldConfigSchema);

export default DepositFieldConfig;
