import mongoose from "mongoose";

/**
 * এক পাতার রঙ — যেমন `client:home`, `affiliate:p-withdraw`। প্রতি পাতায় একটাই
 * ডকুমেন্ট। `colors` এ শুধু admin যা বদলেছেন; বাকিগুলো সাইটের ডিফল্টই থাকে
 * (`utils/themeRegistry.js`)।
 */
const siteThemeSchema = new mongoose.Schema(
  {
    site: { type: String, required: true, enum: ["client", "affiliate"] },
    page: { type: String, required: true, trim: true },
    colors: { type: Map, of: String, default: () => ({}) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

siteThemeSchema.index({ site: 1, page: 1 }, { unique: true });

const SiteTheme = mongoose.models.SiteTheme || mongoose.model("SiteTheme", siteThemeSchema);
export default SiteTheme;
