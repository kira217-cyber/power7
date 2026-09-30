import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * হোমের কনটেন্ট — ব্যানার, নোটিশের চলমান লেখা, প্রমোশন, পপআপ।
 *
 * আগে সবই `client/src/data/siteData.js` এ স্থির ছিল; এখন admin থেকে
 * বদলানো যায়। মূল সাইটের মতোই ব্যানার ডেস্কটপ আর মোবাইলে আলাদা
 * (মোবাইলে ৭৫০ × ৩০০ এর "PHONE" ছবি)।
 *
 * `link` — সংখ্যা হলে প্রমোশনের `code` (প্রমোশন পাতার সেই কার্ড খোলে),
 * নইলে বাইরের URL।
 */
const LangText = new Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const common = {
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
};

const bannerSchema = new Schema(
  {
    title: { type: String, default: "", trim: true },
    image: { type: String, required: true, trim: true },
    platform: { type: String, enum: ["desktop", "mobile"], default: "desktop" },
    link: { type: String, default: "", trim: true },
    ...common,
  },
  { timestamps: true },
);
bannerSchema.index({ platform: 1, isActive: 1, order: 1 });

const noticeSchema = new Schema(
  {
    text: { type: LangText, default: () => ({}) },
    ...common,
  },
  { timestamps: true },
);

const promotionSchema = new Schema(
  {
    /** পুরোনো লিংক (ব্যানারের `link`) এই কোড ধরে — মূল সাইটের আইডি */
    code: { type: String, default: "", trim: true },
    title: { type: LangText, default: () => ({}) },
    image: { type: String, default: "", trim: true },
    /** বিস্তারিতের লম্বা ছবিগুলো (মূল সাইটে লেখা নয়, ছবি) */
    bodyImages: { type: [String], default: [] },
    /** ঐচ্ছিক লেখা — ছবির নিচে */
    content: { type: LangText, default: () => ({}) },
    link: { type: String, default: "", trim: true },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    ...common,
  },
  { timestamps: true },
);
promotionSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { code: { $gt: "" } } });

const popupSchema = new Schema(
  {
    title: { type: LangText, default: () => ({}) },
    image: { type: String, required: true, trim: true },
    // মূল সাইটে মোবাইলের পপআপও আলাদা ("POPUP PHONE" ছবি)
    platform: { type: String, enum: ["desktop", "mobile"], default: "desktop" },
    link: { type: String, default: "", trim: true },
    ...common,
  },
  { timestamps: true },
);

export const SiteBanner = mongoose.models.SiteBanner || mongoose.model("SiteBanner", bannerSchema);
export const SiteNotice = mongoose.models.SiteNotice || mongoose.model("SiteNotice", noticeSchema);
export const Promotion = mongoose.models.Promotion || mongoose.model("Promotion", promotionSchema);
export const SitePopup = mongoose.models.SitePopup || mongoose.model("SitePopup", popupSchema);

/**
 * হোমের ভাসমান ইভেন্ট আইকন — মূল সাইটের `.entry-count-wrap` (ডান-নিচে
 * LOGIN / TEMU / RAFFLE এর চলন্ত ছবি, তীরে চাপলে সব একসাথে খোলে)।
 *
 * `kind` ঠিক করে চাপলে কোথায় যাবে; টিকিটের ধরন (`temu`, `redPacket`,
 * `wheel`) হলে `onlyWithTicket` দিলে শুধু সেই টিকিট থাকলেই দেখায়।
 * `image` ফাঁকা থাকলে ধরনের নিজের ছবি (মূল সাইটের)।
 */
export const HOME_EVENT_KINDS = ["signin", "claim", "temu", "redPacket", "wheel", "referral", "promotion", "link"];

const homeEventSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: HOME_EVENT_KINDS, required: true },
    title: { bn: { type: String, default: "", trim: true }, en: { type: String, default: "", trim: true } },
    image: { type: String, default: "" },
    link: { type: String, default: "" },
    platform: { type: String, enum: ["all", "desktop", "mobile"], default: "all" },
    onlyWithTicket: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/** ভাসমান অংশের নিজের নিয়ম — একটাই ডকুমেন্ট */
const homeEventSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    enabled: { type: Boolean, default: true },
    position: { type: String, enum: ["RIGHT_BOTTOM", "RIGHT_MIDDLE", "LEFT_BOTTOM", "LEFT_MIDDLE"], default: "RIGHT_BOTTOM" },
    direction: { type: String, enum: ["vertical", "horizontal"], default: "vertical" },
    /** বন্ধ অবস্থায় কত সেকেন্ড পরপর পরের ছবি */
    interval: { type: Number, default: 3, min: 1, max: 30 },
    /** লগইন না করা দর্শকেও দেখাবে কিনা (চাপলে লগইন খোলে) */
    showGuests: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const HomeEvent = mongoose.models.HomeEvent || mongoose.model("HomeEvent", homeEventSchema);
export const HomeEventSetting = mongoose.models.HomeEventSetting || mongoose.model("HomeEventSetting", homeEventSettingSchema);
