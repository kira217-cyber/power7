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

/** বেছে নেওয়ার মতো বোনাস — অটো ডিপোজিটের মতোই */
const BonusSchema = new Schema(
  {
    title: { type: LangTextSchema, default: () => ({}) },
    bonusType: { type: String, enum: ["fixed", "percent"], default: "fixed" },
    bonusValue: { type: Number, default: 0, min: 0 },
    turnoverMultiplier: { type: Number, default: 1, min: 0 },
    bonusScope: { type: String, enum: ["all-time", "first-deposit"], default: "all-time" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0, min: 0 },
    eligibleProviders: { type: [EligibleProviderSchema], default: [] },
  },
  { _id: true },
);

/**
 * একটা মাধ্যম — MFSWallet শুধু এই চারটা নেয় (bkash, nagad, rocket, upay)।
 * খেলোয়াড় আমাদের পাতাতেই মাধ্যম বাছেন (গেটওয়ের API তে `method` লাগে)।
 */
const MethodSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true, enum: ["bkash", "nagad", "rocket", "upay"] },
    name: { type: LangTextSchema, default: () => ({}) },
    logoUrl: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0, min: 0 },
    minAmount: { type: Number, default: 0, min: 0 },
    maxAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

export const MFS_METHODS = ["bkash", "nagad", "rocket", "upay"];

const DEFAULT_METHODS = [
  { code: "bkash", name: { bn: "বিকাশ", en: "bKash" }, order: 1 },
  { code: "nagad", name: { bn: "নগদ", en: "Nagad" }, order: 2 },
  { code: "rocket", name: { bn: "রকেট", en: "Rocket" }, order: 3 },
  { code: "upay", name: { bn: "উপায়", en: "Upay" }, order: 4 },
];

export const MFS_DEFAULT_URL = "https://api.mfswallet.com/api/gateway/create-link";

/**
 * MFSWallet (পার্সোনাল অটো ডিপোজিট) এর সেটিং — সবসময় একটাই ডকুমেন্ট।
 *
 * SIM-ভিত্তিক গেটওয়ে: আমাদের নিজের bKash/Nagad… নম্বরে টাকা আসে, MFSWallet এর
 * Android অ্যাপ SMS পড়ে মিলিয়ে webhook পাঠায়। API Key admin প্যানেল থেকে বসে,
 * কোডে বা .env এ নয়।
 */
const mfsSettingSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    apiKey: { type: String, default: "", trim: true, select: false },
    active: { type: Boolean, default: false },
    /** গেটওয়ের "create-link" ঠিকানা — বদলালে admin থেকেই */
    apiUrl: { type: String, default: MFS_DEFAULT_URL, trim: true },
    /** খেলোয়াড়কে যে নামে দেখায় */
    displayName: {
      type: LangTextSchema,
      default: () => ({ bn: "পার্সোনাল অটো ডিপোজিট", en: "Personal Auto Deposit" }),
    },
    minAmount: { type: Number, default: 100, min: 1 },
    maxAmount: { type: Number, default: 25000, min: 0 },
    quickAmounts: { type: [Number], default: () => [100, 300, 500, 1000, 3000, 5000, 10000, 20000] },
    methods: { type: [MethodSchema], default: () => DEFAULT_METHODS },
    bonuses: { type: [BonusSchema], default: [] },
    lastError: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

mfsSettingSchema.statics.current = async function current() {
  const doc = await this.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).select("+apiKey");
  if (!doc.methods || doc.methods.length === 0) {
    doc.methods = DEFAULT_METHODS;
    await doc.save();
  }
  return doc;
};

/** admin এ দেখানোর রূপ — Key কখনো পুরো যায় না */
mfsSettingSchema.methods.toSafeJSON = function toSafeJSON() {
  const key = String(this.apiKey || "");
  return {
    keyPreview: key ? `••••••••${key.slice(-4)}` : "",
    hasKey: Boolean(key),
    active: this.active,
    apiUrl: this.apiUrl,
    displayName: this.displayName,
    minAmount: this.minAmount,
    maxAmount: this.maxAmount,
    quickAmounts: this.quickAmounts,
    methods: this.methods,
    bonuses: this.bonuses,
    lastError: this.lastError,
    updatedAt: this.updatedAt,
  };
};

const MfsSetting = mongoose.models.MfsSetting || mongoose.model("MfsSetting", mfsSettingSchema);
export default MfsSetting;
