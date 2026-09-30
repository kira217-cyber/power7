import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * যে নম্বরে টাকা পাঠাতে বলা হবে।
 *
 * একটা মেথডে একাধিক নম্বর থাকতে পারে — চাপ ভাগ করে দিতে, বা কোনো
 * নম্বর বন্ধ হয়ে গেলে বাকিগুলো দিয়ে চালিয়ে নিতে।
 */
const ContactSchema = new mongoose.Schema(
  {
    id: { type: String, default: "", trim: true },
    label: { type: LangTextSchema, default: () => ({}) },
    number: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * ডিপোজিটের একটা উপায় — যেমন bKash, Nagad।
 *
 * এখানে শুধু উপায়টার পরিচয় আর নম্বর থাকে। ব্যবহারকারী ফর্মে কী লিখবে
 * সেটা `DepositFieldConfig` এ, আর বোনাস/টার্নওভারের নিয়ম
 * `DepositBonusTurnover` এ — তিনটে আলাদা রাখায় অ্যাডমিনে তিনটে আলাদা
 * পেজ হয় আর একটা বদলাতে গিয়ে অন্যটায় হাত পড়ে না।
 */
const depositMethodSchema = new mongoose.Schema(
  {
    methodId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    methodName: { type: LangTextSchema, default: () => ({}) },

    /** ব্যক্তিগত নম্বর না এজেন্ট নম্বর */
    methodType: {
      type: String,
      enum: ["personal", "agent"],
      default: "agent",
    },

    /** ডিপোজিট পেজের প্রথম পর্দায় যে ভাগে পড়বে */
    group: {
      type: String,
      enum: ["ewallet", "crypto", "bank"],
      default: "ewallet",
      index: true,
    },

    logoUrl: { type: String, default: "", trim: true },

    minDepositAmount: { type: Number, default: 0, min: 0 },
    maxDepositAmount: { type: Number, default: 0, min: 0 },

    contacts: { type: [ContactSchema], default: [] },

    sort: { type: Number, default: 0, index: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

depositMethodSchema.index({ isActive: 1, group: 1, sort: 1 });

const DepositMethod =
  mongoose.models.DepositMethod ||
  mongoose.model("DepositMethod", depositMethodSchema);

export default DepositMethod;
