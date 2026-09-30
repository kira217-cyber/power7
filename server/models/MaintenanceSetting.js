import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * সাইট মেইনটেন্যান্স মোড।
 *
 * দুইভাবে চালু হয়:
 *  - `manualOn` — অ্যাডমিন নিজে টগল করে (কাজ চলাকালীন)
 *  - `autoOn`   — গেম API বারবার ব্যর্থ হলে সার্ভার নিজেই তুলে দেয়
 *
 * দুটোর যেকোনো একটা সত্যি হলেই ক্লায়েন্টে মডাল দেখায়। অ্যাডমিন
 * ম্যানুয়ালটা বন্ধ করলেও অটোটা আলাদা থাকে, তাই সমস্যা মিটলে নিজে
 * থেকেই সাইট খুলে যায় — অ্যাডমিনকে মনে করে কিছু করতে হয় না।
 */
const maintenanceSettingSchema = new mongoose.Schema(
  {
    manualOn: {
      type: Boolean,
      default: false,
      index: true,
    },

    autoOn: {
      type: Boolean,
      default: false,
      index: true,
    },

    // অটো চালু হওয়ার কারণ — অ্যাডমিন প্যানেলে দেখানোর জন্য
    autoReason: {
      type: String,
      default: "",
      trim: true,
    },

    autoTriggeredAt: {
      type: Date,
      default: null,
    },

    autoClearedAt: {
      type: Date,
      default: null,
    },

    title: {
      type: LangTextSchema,
      default: () => ({
        bn: "সাইট রক্ষণাবেক্ষণে আছে",
        en: "Site is under maintenance",
      }),
    },

    message: {
      type: LangTextSchema,
      default: () => ({
        bn: "আমরা কিছু কাজ করছি। অল্প কিছুক্ষণের মধ্যেই সাইট আবার চালু হবে — একটু পরে আবার দেখুন।",
        en: "We are doing some work. The site will be back shortly — please check again in a little while.",
      }),
    },
  },
  { timestamps: true },
);

/** সবসময় একটাই ডকুমেন্ট — না থাকলে ডিফল্ট দিয়ে বানায় */
maintenanceSettingSchema.statics.current = async function current() {
  const existing = await this.findOne().sort({ createdAt: 1 });

  if (existing) return existing;

  return this.create({});
};

const MaintenanceSetting =
  mongoose.models.MaintenanceSetting ||
  mongoose.model("MaintenanceSetting", maintenanceSettingSchema);

export default MaintenanceSetting;
