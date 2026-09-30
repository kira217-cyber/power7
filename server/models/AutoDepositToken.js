import mongoose from "mongoose";

const { Schema } = mongoose;

const LangTextSchema = new Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const EligibleProviderSchema = new Schema(
  {
    providerCode: { type: String, required: true, trim: true, uppercase: true },
    percent: { type: Number, default: 100, min: 0, max: 100 },
  },
  { _id: false },
);

/**
 * অটো ডিপোজিটে বেছে নেওয়ার মতো একটা বোনাস।
 *
 * ম্যানুয়ালে বোনাস আসে চ্যানেল ও প্রোমো থেকে; অটোতে গেটওয়ে নিজেই টাকা
 * নিশ্চিত করে বলে চ্যানেল নেই — এই তালিকাটাই বোনাসের জায়গা।
 */
const BonusSchema = new Schema(
  {
    title: { type: LangTextSchema, default: () => ({}) },

    bonusType: { type: String, enum: ["fixed", "percent"], default: "fixed" },
    bonusValue: { type: Number, default: 0, min: 0 },

    turnoverMultiplier: { type: Number, default: 1, min: 0 },

    bonusScope: {
      type: String,
      enum: ["all-time", "first-deposit"],
      default: "all-time",
    },

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0, min: 0 },

    eligibleProviders: { type: [EligibleProviderSchema], default: [] },
  },
  { _id: true },
);

/**
 * একটা পেমেন্ট মাধ্যম — bKash, Nagad, Rocket, Upay, Bank Transfer, Crypto।
 *
 * গেটওয়ে গ্রাহককে নিজের পাতায় মাধ্যম বাছতে দেয়; আমরা এখান থেকে ঠিক
 * করি কোন মাধ্যমগুলো চালু আছে, কী নামে ও লোগোয় দেখাবে, আর সীমা কত।
 * `manual` মাধ্যম (Bank/Crypto) সাথে সাথে টাকা ঢোকায় না — webhook এ
 * PENDING হয়ে আসে, অ্যাডমিন যাচাই করে নিশ্চিত করে।
 */
const MethodSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true },
    name: { type: LangTextSchema, default: () => ({}) },
    logoUrl: { type: String, default: "", trim: true },

    active: { type: Boolean, default: true },
    manual: { type: Boolean, default: false },
    order: { type: Number, default: 0, min: 0 },

    minAmount: { type: Number, default: 0, min: 0 },
    maxAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

/** নতুন সেটিং তৈরি হলে যে ছয়টা মাধ্যম ডিফল্টে থাকে */
const DEFAULT_METHODS = [
  { code: "bkash", name: { bn: "বিকাশ", en: "bKash" }, order: 1 },
  { code: "nagad", name: { bn: "নগদ", en: "Nagad" }, order: 2 },
  { code: "rocket", name: { bn: "রকেট", en: "Rocket" }, order: 3 },
  { code: "upay", name: { bn: "উপায়", en: "Upay" }, order: 4 },
  {
    code: "bank",
    name: { bn: "ব্যাংক ট্রান্সফার", en: "Bank Transfer" },
    order: 5,
    manual: true,
  },
  {
    code: "crypto",
    name: { bn: "ক্রিপ্টো", en: "Crypto" },
    order: 6,
    manual: true,
  },
];

/**
 * অটো ডিপোজিটের গেটওয়ে সেটিং — সবসময় একটাই ডকুমেন্ট।
 *
 * টোকেনটা অ্যাডমিন প্যানেল থেকে বসে, কোডে বা .env এ নয়, তাই টোকেন
 * বদলালে ডিপ্লয় লাগে না। বন্ধ থাকলে ক্লায়েন্টে অটো অংশটা দেখায় না,
 * ম্যানুয়াল উপায়গুলো দিয়েই কাজ চলে।
 */
const autoDepositTokenSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    businessToken: { type: String, default: "", trim: true, select: false },

    active: { type: Boolean, default: false },

    minAmount: { type: Number, default: 100, min: 1 },
    maxAmount: { type: Number, default: 500000, min: 0 },

    methods: { type: [MethodSchema], default: () => DEFAULT_METHODS },

    bonuses: { type: [BonusSchema], default: [] },

    lastError: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

/** সবসময় একটাই ডকুমেন্ট */
autoDepositTokenSchema.statics.current = async function current() {
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

/** অ্যাডমিনে দেখানোর রূপ — টোকেন কখনো পুরো যায় না */
autoDepositTokenSchema.methods.toSafeJSON = function toSafeJSON() {
  const token = String(this.businessToken || "");

  return {
    tokenPreview: token ? `••••••••${token.slice(-4)}` : "",
    hasToken: Boolean(token),
    active: this.active,
    minAmount: this.minAmount,
    maxAmount: this.maxAmount,
    methods: this.methods,
    bonuses: this.bonuses,
    lastError: this.lastError,
    updatedAt: this.updatedAt,
  };
};

const AutoDepositToken =
  mongoose.models.AutoDepositToken ||
  mongoose.model("AutoDepositToken", autoDepositTokenSchema);

export default AutoDepositToken;
