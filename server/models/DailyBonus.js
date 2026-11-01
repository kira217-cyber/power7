import mongoose from "mongoose";

const { Schema } = mongoose;

const Text = { bn: { type: String, default: "", trim: true }, en: { type: String, default: "", trim: true } };

export const DAILY_BONUS_DAYS = 7;

/**
 * ডেইলি বোনাস — ৭ দিনের চক্র, প্রতিটা দিনের টাকা admin ঠিক করেন।
 *
 * খেলোয়াড় বাংলাদেশের প্রতিটা দিনে (রাত ১২টায় বদলায়) সেই দিনের টাকা একবার
 * দাবি করতে পারেন। দাবি না করে দিন পেরোলে সেই দিনেরটা চলে যায়, পরের দিন
 * পরের দিনেরটা পাওয়া যায়। ৭ দিন পেরোলে আবার দিন ১ (utils/dailyBonus.js)।
 * সবসময় একটাই ডকুমেন্ট।
 */
const dailyBonusSettingSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    enabled: { type: Boolean, default: false },
    title: { type: Text, default: () => ({ bn: "ডেইলি বোনাস", en: "Daily bonus" }) },
    rules: { type: Text, default: () => ({}) },
    /** দিন ১…৭ এর টাকা — ০ দিলে সেই দিন কিছু নেই */
    days: {
      type: [{ type: Number, min: 0 }],
      default: () => [10, 10, 15, 15, 20, 25, 50],
    },
    /** পাওয়া টাকার কত গুণ বাজি ধরলে তোলা যায় (০ = শর্ত নেই) */
    turnoverMultiplier: { type: Number, default: 1, min: 0 },
    /** দাবি করতে মোট ডিপোজিট অন্তত এত (০ = লাগে না) — নতুন অ্যাকাউন্ট খুলে টাকা তোলা ঠেকাতে */
    minTotalDeposit: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

dailyBonusSettingSchema.statics.current = function current() {
  return this.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
};

/**
 * একটা দাবি। `(user, dayKey)` unique — একই দিনে দুই ট্যাব থেকে একসাথে চাপলেও
 * একটাই ঢোকে, টাকাও একবারই যায়।
 */
const dailyBonusClaimSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userIdText: { type: String, default: "", trim: true, lowercase: true, index: true },
    /** বাংলাদেশের দিন, `YYYY-MM-DD` */
    dayKey: { type: String, required: true },
    /** এই চক্রের দিন ১ এর `dayKey` */
    cycleStart: { type: String, required: true },
    dayNo: { type: Number, required: true, min: 1, max: DAILY_BONUS_DAYS },
    amount: { type: Number, required: true, min: 0 },
    turnoverRequired: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
  },
  { timestamps: true },
);

dailyBonusClaimSchema.index({ user: 1, dayKey: 1 }, { unique: true });
dailyBonusClaimSchema.index({ user: 1, createdAt: -1 });
dailyBonusClaimSchema.index({ createdAt: -1 });

export const DailyBonusSetting =
  mongoose.models.DailyBonusSetting || mongoose.model("DailyBonusSetting", dailyBonusSettingSchema);
export const DailyBonusClaim =
  mongoose.models.DailyBonusClaim || mongoose.model("DailyBonusClaim", dailyBonusClaimSchema);
