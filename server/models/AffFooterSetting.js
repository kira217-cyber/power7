import mongoose from "mongoose";

const { Schema } = mongoose;

const Lang = new Schema(
  { bn: { type: String, default: "", trim: true }, en: { type: String, default: "", trim: true } },
  { _id: false },
);

/**
 * অ্যাফিলিয়েট ফুটারের অ্যাডমিন-নিয়ন্ত্রিত অংশ।
 */
const affFooterSettingSchema = new Schema(
  {
    // একটাই ডকুমেন্ট — দুটো অনুরোধ একসাথে এলেও দ্বিতীয়টা তৈরি হয় না
    key: { type: String, default: "main", unique: true },
    logo: { type: String, default: "", trim: true },
    description: { type: Lang, default: () => ({}) },
    copyright: { type: Lang, default: () => ({}) },
    ageNotice: { type: Lang, default: () => ({}) },
  },
  { timestamps: true },
);

affFooterSettingSchema.statics.current = function current() {
  return this.findOneAndUpdate({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
};

const AffFooterSetting =
  mongoose.models.AffFooterSetting ||
  mongoose.model("AffFooterSetting", affFooterSettingSchema);

export default AffFooterSetting;
