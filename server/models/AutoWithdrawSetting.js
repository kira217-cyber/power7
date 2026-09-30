import mongoose from "mongoose";

const { Schema } = mongoose;

const LangTextSchema = new Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * অটো উইথড্রয়ালের একটা মাধ্যম।
 *
 * গেটওয়ে শুধু চারটা মোবাইল ওয়ালেট সাপোর্ট করে (bkash, nagad, rocket,
 * upay)। অ্যাডমিন এখান থেকে ঠিক করে কোনগুলো চালু, কী নামে দেখাবে আর
 * সীমা কত।
 */
const MethodSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["bkash", "nagad", "rocket", "upay"],
    },
    name: { type: LangTextSchema, default: () => ({}) },
    logoUrl: { type: String, default: "", trim: true },

    active: { type: Boolean, default: true },
    order: { type: Number, default: 0, min: 0 },

    minAmount: { type: Number, default: 0, min: 0 },
    maxAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

const DEFAULT_METHODS = [
  { code: "bkash", name: { bn: "বিকাশ", en: "bKash" }, order: 1 },
  { code: "nagad", name: { bn: "নগদ", en: "Nagad" }, order: 2 },
  { code: "rocket", name: { bn: "রকেট", en: "Rocket" }, order: 3 },
  { code: "upay", name: { bn: "উপায়", en: "Upay" }, order: 4 },
];

/**
 * অটো উইথড্রয়ালের গেটওয়ে সেটিং — সবসময় একটাই ডকুমেন্ট।
 *
 * টোকেন অ্যাডমিন প্যানেল থেকে বসে, কোডে/`.env` এ নয়। বন্ধ থাকলে
 * ক্লায়েন্টে অটো উইথড্র অংশটা দেখায় না, ম্যানুয়াল দিয়েই কাজ চলে।
 */
const autoWithdrawSettingSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    businessToken: { type: String, default: "", trim: true, select: false },

    active: { type: Boolean, default: false },

    minAmount: { type: Number, default: 500, min: 1 },
    maxAmount: { type: Number, default: 50000, min: 0 },

    /** গেটওয়ের ফি শতাংশ — শুধু অ্যাডমিনকে দেখানোর জন্য (আসল ফি
        গেটওয়ে রেসপন্সেই আসে) */
    feePercent: { type: Number, default: 0, min: 0 },

    methods: { type: [MethodSchema], default: () => DEFAULT_METHODS },

    lastError: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

autoWithdrawSettingSchema.statics.current = async function current() {
  // একটাই ডকুমেন্ট — `key` unique, তাই দুটো অনুরোধ একসাথে এলেও দুটো তৈরি হয় না
  const doc = await this.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).select("+businessToken");

  if (!doc.methods || doc.methods.length === 0) {
    doc.methods = DEFAULT_METHODS;
    await doc.save();
  }

  return doc;
};

autoWithdrawSettingSchema.methods.toSafeJSON = function toSafeJSON() {
  const token = String(this.businessToken || "");

  return {
    tokenPreview: token ? `••••••••${token.slice(-4)}` : "",
    hasToken: Boolean(token),
    active: this.active,
    minAmount: this.minAmount,
    maxAmount: this.maxAmount,
    feePercent: this.feePercent,
    methods: this.methods,
    lastError: this.lastError,
    updatedAt: this.updatedAt,
  };
};

const AutoWithdrawSetting =
  mongoose.models.AutoWithdrawSetting ||
  mongoose.model("AutoWithdrawSetting", autoWithdrawSettingSchema);

export default AutoWithdrawSetting;
