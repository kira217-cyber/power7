import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * ক্লায়েন্ট সাইটের পরিচয় — সবসময় একটাই ডকুমেন্ট।
 *
 * siteName ব্রাউজার টাইটেলে, logo ডেস্কটপ হেডারে (আর রক্ষণাবেক্ষণ পাতায়),
 * mobileLogo মোবাইল হেডার/লগইন/অ্যাপ-ডাউনলোডে, favicon ট্যাব আইকনে।
 * ডিফল্ট = ক্লায়েন্টের নিজের ছবি (`/assets/…`), তাই admin প্রথম দিনেই
 * এখনকার লোগো দেখেন; বদলালে `/uploads/…`।
 */
export const IDENTITY_DEFAULTS = {
  siteName: "POWER7 - এশিয়ার সেরা কেসিনো এবং স্পোটস প্লার্টফম",
  logo: "/assets/site/logo.c2ac3228.png",
  mobileLogo: "/assets/mobile/logo.png",
  favicon: "/favicon.png",
};

const siteIdentifySchema = new Schema(
  {
    siteName: { type: String, default: IDENTITY_DEFAULTS.siteName, trim: true },
    logo: { type: String, default: IDENTITY_DEFAULTS.logo, trim: true },
    mobileLogo: { type: String, default: IDENTITY_DEFAULTS.mobileLogo, trim: true },
    favicon: { type: String, default: IDENTITY_DEFAULTS.favicon, trim: true },
  },
  { timestamps: true },
);

siteIdentifySchema.statics.current = async function current() {
  const existing = await this.findOne().sort({ createdAt: 1 });
  return existing || this.create({});
};

const SiteIdentify = mongoose.models.SiteIdentify || mongoose.model("SiteIdentify", siteIdentifySchema);

export default SiteIdentify;
