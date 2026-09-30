import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * অ্যাফিলিয়েট সাইটের পরিচয় — সবসময় একটাই ডকুমেন্ট।
 */
const affSiteIdentifySchema = new Schema(
  {
    // একটাই ডকুমেন্ট — দুটো অনুরোধ একসাথে এলেও দ্বিতীয়টা তৈরি হয় না
    key: { type: String, default: "main", unique: true },
    siteName: { type: String, default: "", trim: true },
    logo: { type: String, default: "", trim: true },
    brandLogo: { type: String, default: "", trim: true },
    favicon: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

affSiteIdentifySchema.statics.current = function current() {
  return this.findOneAndUpdate({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
};

const AffSiteIdentify =
  mongoose.models.AffSiteIdentify ||
  mongoose.model("AffSiteIdentify", affSiteIdentifySchema);

export default AffSiteIdentify;
