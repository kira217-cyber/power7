import mongoose from "mongoose";

const Text = { bn: { type: String, default: "", trim: true }, en: { type: String, default: "", trim: true } };

/**
 * অ্যাপ ডাউনলোড (একটাই ডকুমেন্ট) — admin APK আপলোড করেন, খেলোয়াড় ঠিক
 * সেই নামেই নামান।
 *
 * ফাইল থাকে `private/apk/` এ (git এ যায় না, সরাসরি লিংকে খোলা যায় না);
 * `/api/app/download` আসল নামটা `Content-Disposition` এ দিয়ে পাঠায়।
 */
const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    enabled: { type: Boolean, default: true },
    apk: {
      /** admin যে নামে আপলোড করেছেন — ডাউনলোডও এই নামে */
      fileName: { type: String, default: "" },
      /** ডিস্কের এলোমেলো নাম */
      storedName: { type: String, default: "" },
      size: { type: Number, default: 0 },
      version: { type: String, default: "", trim: true },
      uploadedAt: { type: Date, default: null },
    },
    downloads: { type: Number, default: 0 },
    /** মডালের বর্ণনা ("আমরা নতুনত্ব ফ্রি বেট … যুক্ত করতে চাই") */
    description: Text,
    /** "ওয়েব-অ্যাপ" বোতাম (হোম স্ক্রিনে যোগ) দেখাবে কিনা */
    showWebApp: { type: Boolean, default: true },
  },
  { timestamps: true },
);

appSettingSchema.statics.current = function current() {
  return this.findOneAndUpdate({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
};

const AppSetting = mongoose.models.AppSetting || mongoose.model("AppSetting", appSettingSchema);
export default AppSetting;
