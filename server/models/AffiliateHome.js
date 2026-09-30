import mongoose from "mongoose";

/**
 * অ্যাফিলিয়েট হোম পেজের সব সেকশনের কনটেন্ট — সবসময় একটাই ডকুমেন্ট।
 *
 * প্রতিটা লেখা bn/en; কোনো ফিল্ড/অ্যারে খালি থাকলে ক্লায়েন্ট আগের
 * স্ট্যাটিক লেখা/ছবি দেখায়, তাই পেজ কখনো ভাঙে না। রঙ আলাদাভাবে
 * section-theme (affiliate:*) থেকে নিয়ন্ত্রিত।
 */
const lang = () => ({
  bn: { type: String, default: "", trim: true },
  en: { type: String, default: "", trim: true },
});

const affiliateHomeSchema = new mongoose.Schema(
  {
    // একটাই ডকুমেন্ট — দুটো অনুরোধ একসাথে এলেও দ্বিতীয়টা তৈরি হয় না
    key: { type: String, default: "main", unique: true },
    hero: {
      badge: lang(),
      title: lang(),
      text: lang(),
      joinBtn: lang(),
      loginBtn: lang(),
      pill: lang(), // "৫০%"
      earnFigure: lang(), // "৳৫,০০,০০০"
      activePlayersValue: lang(), // "১২৪ জন"
      activePlayersLabel: lang(),
      desktopImage: { type: String, default: "", trim: true },
      mobileImage: { type: String, default: "", trim: true },
    },
    stats: [
      {
        _id: false,
        value: lang(),
        label: lang(),
      },
    ],
    commission: {
      eyebrow: lang(),
      title: lang(),
      text: lang(),
      tierLabel: lang(),
      revenueShare: lang(),
      tiers: [
        {
          _id: false,
          players: lang(),
          share: { type: Number, default: 0 },
        },
      ],
    },
    howItWorks: {
      eyebrow: lang(),
      title: lang(),
      steps: [
        {
          _id: false,
          icon: { type: String, default: "", trim: true },
          title: lang(),
          text: lang(),
        },
      ],
    },
    whyUs: {
      eyebrow: lang(),
      title: lang(),
      features: [
        {
          _id: false,
          icon: { type: String, default: "", trim: true },
          title: lang(),
          text: lang(),
        },
      ],
    },
    providers: {
      title: lang(),
      text: lang(),
      items: [
        {
          _id: false,
          name: { type: String, default: "", trim: true },
          image: { type: String, default: "", trim: true },
        },
      ],
    },
    faq: {
      eyebrow: lang(),
      title: lang(),
      items: [
        {
          _id: false,
          q: lang(),
          a: lang(),
        },
      ],
    },
    cta: {
      title: lang(),
      text: lang(),
      button: lang(),
    },
  },
  { timestamps: true },
);

affiliateHomeSchema.statics.current = function current() {
  return this.findOneAndUpdate({ key: "main" }, { $setOnInsert: { key: "main" } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
};

const AffiliateHome =
  mongoose.models.AffiliateHome ||
  mongoose.model("AffiliateHome", affiliateHomeSchema);

export default AffiliateHome;
