import mongoose from "mongoose";

const { Schema } = mongoose;
const Text = { bn: { type: String, default: "", trim: true }, en: { type: String, default: "", trim: true } };

/**
 * অ্যাফিলিয়েটের উত্তোলন — খেলোয়াড়ের থেকে আলাদা।
 *
 * খেলোয়াড় সেভ করা মোবাইল ওয়ালেটে তোলেন; অ্যাফিলিয়েটের উপায়ে admin এর
 * ঠিক করা কয়েকটা ঘর থাকে (ব্যাংকের নাম, অ্যাকাউন্ট নম্বর …)।
 */
const fieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: Text,
    placeholder: Text,
    type: { type: String, enum: ["text", "number", "tel", "email"], default: "text" },
    required: { type: Boolean, default: true },
  },
  { _id: false },
);

const methodSchema = new Schema(
  {
    methodId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: Text,
    logoUrl: { type: String, default: "", trim: true },
    minimumWithdrawAmount: { type: Number, default: 0, min: 0 },
    maximumWithdrawAmount: { type: Number, default: 0, min: 0 },
    fields: { type: [fieldSchema], default: [] },
    sort: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

const requestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userIdText: { type: String, default: "", trim: true, index: true },
    methodId: { type: String, required: true, trim: true, uppercase: true },
    /** আবেদনের সময়ের নাম ও ঘর — পরে উপায় বদলালেও পুরোনো আবেদন পড়া যায় */
    methodSnapshot: { name: Text, fields: { type: Array, default: [] } },
    fields: { type: Object, default: {} },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    adminNote: { type: String, default: "", trim: true, maxlength: 300 },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ user: 1, createdAt: -1 });
// একজনের একসাথে একটাই অপেক্ষমাণ আবেদন — দুটো অনুরোধ একই মুহূর্তে এলেও
requestSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { status: "pending" }, name: "one_pending_per_user" });

/** নিয়ম — একটাই ডকুমেন্ট (key দিয়ে upsert, তাই দুটো তৈরি হয় না) */
const settingSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    /** কতজন সক্রিয় খেলোয়াড় আনলে তোলা যাবে */
    requiredActiveReferrals: { type: Number, default: 5, min: 0 },
    /** জমে থাকা কমিশন আগে admin এর মিলিয়ে দেওয়া (settle) লাগবে কিনা */
    requireSettledCommission: { type: Boolean, default: true },
    note: Text,
  },
  { timestamps: true },
);
settingSchema.statics.current = function current() {
  return this.findOneAndUpdate({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
};

/**
 * কমিশন মেলানো (settle) — চার ভাগের জমা শূন্য করে নেট টাকাটা ব্যালেন্সে।
 * কে, কবে, কত — পরে দেখার জন্য।
 */
const settlementSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userIdText: { type: String, default: "" },
    refer: Number,
    deposit: Number,
    gameLoss: Number,
    gameWin: Number,
    net: Number,
    /** ব্যালেন্সে আসলে কত গেল (নেট ঋণাত্মক হলে ব্যালেন্স পর্যন্তই কাটে) */
    applied: Number,
    /** কাটতে না পারা দেনা — পরের হিসাবে জিতের ঘরে থেকে যায় */
    carried: Number,
    by: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

export const AffWithdrawMethod = mongoose.models.AffWithdrawMethod || mongoose.model("AffWithdrawMethod", methodSchema);
export const AffWithdrawRequest = mongoose.models.AffWithdrawRequest || mongoose.model("AffWithdrawRequest", requestSchema);
export const AffWithdrawSetting = mongoose.models.AffWithdrawSetting || mongoose.model("AffWithdrawSetting", settingSchema);
export const AffSettlement = mongoose.models.AffSettlement || mongoose.model("AffSettlement", settlementSchema);
