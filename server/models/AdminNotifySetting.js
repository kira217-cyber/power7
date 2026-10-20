import mongoose from "mongoose";

/**
 * Notification App (adminnoti.oraclesoft.online) — সাইটের মালিকের ফোনে push।
 *
 * ওই সিস্টেমে এই সাইট একটা "Company" (নাম + ফোন + PIN); মালিক APK এ সেই
 * ফোন আর PIN দিয়ে ঢোকেন। আমরা `/api/v1/notices/send` এ ঘটনা পাঠাই।
 * কোন ঘটনায় যাবে, কোন শব্দে (priority), কোন admin পাতা খুলবে — সব এখানে।
 * একটাই ডকুমেন্ট।
 */
const eventSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    // important = জোরে রিং, normal = সাধারণ শব্দ, silent = শব্দ নেই
    priority: { type: String, enum: ["important", "normal", "silent"], default: "normal" },
    // খালি = admin এর ঠিকানা + ঘটনার নিজের পাতা
    url: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const adminNotifySettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    active: { type: Boolean, default: false },

    apiBase: { type: String, default: "https://noitapi.oraclesoft.online", trim: true },
    // x-api-key — শুধু লেখা যায়, ফেরত দেওয়া হয় না
    apiKey: { type: String, default: "", trim: true, select: false },

    // ওই সিস্টেমে এই সাইটের Company — APK এ লগইন এই ফোন + PIN দিয়ে
    companyId: { type: String, default: "", trim: true },
    companyName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    pinCode: { type: String, default: "", trim: true },

    // notification চাপলে যে admin পাতা খোলে, তার গোড়া — যেমন https://admin.power7.live
    adminUrl: { type: String, default: "", trim: true },

    // ঘটনা → সেটিং (না থাকলে utils/adminNotify.js এর ডিফল্ট)
    events: { type: Map, of: eventSchema, default: () => ({}) },

    sentCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: null },
    lastError: { type: String, default: "", trim: true },
    lastErrorAt: { type: Date, default: null },
  },
  { timestamps: true },
);

adminNotifySettingSchema.statics.current = async function current({ withKey = false } = {}) {
  const query = this.findOne({ key: "main" });
  if (withKey) query.select("+apiKey");
  const found = await query;
  if (found) return found;
  await this.updateOne({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true });
  const created = this.findOne({ key: "main" });
  if (withKey) created.select("+apiKey");
  return created;
};

const AdminNotifySetting = mongoose.model("AdminNotifySetting", adminNotifySettingSchema);

export default AdminNotifySetting;
