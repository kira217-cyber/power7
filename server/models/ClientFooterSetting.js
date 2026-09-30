import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * ক্লায়েন্ট সাইটের ফুটার — সবসময় একটাই ডকুমেন্ট, সব অংশ admin থেকে।
 *
 * তিন কলাম (ডেস্কটপে পাশাপাশি, মোবাইলে উপরে-নিচে):
 *   ১. আমাদের সম্পর্কে — লোগো (খালি = Site Identity র লোগো) + লেখা
 *   ২. প্রয়োজনীয় খেলা — প্রতিটা সারি একটা গেম ক্যাটাগরি (`category` =
 *      ক্যাটাগরির key, যেমন slot / live); ক্লিক করলে খেলার কেন্দ্র
 *   ৩. সার্টিফিকেট — ছবি + লিংক (Gaming Curacao, Oracle API …)
 * নিচে প্রোভাইডার লোগোর সারি আর কপিরাইট। প্রতিটা অংশ চাইলে লুকানো যায়।
 */
const lang = (bn, en = bn) => ({ bn, en });

export const FOOTER_DEFAULTS = {
  about: {
    show: true,
    title: lang("আমাদের সম্পর্কে", "About us"),
    logo: "",
    text: lang(
      "পাওয়ার৭ এর মালিক ও পরিচালনাকারী প্রতিষ্ঠান হলো পাওয়ার৭ হোল্ডিংস লিমিটেড। এর নিবন্ধন নম্বর ১২৮৩১ এবং নিবন্ধিত ঠিকানা হলো হামচাকো, মুৎসামুদু, স্বায়ত্তশাসিত দ্বীপ আনজোয়ান, ইউনিয়ন অফ কোমোরোস।",
      "POWER7 is owned and operated by Power7 Holdings Limited, registration number 12831, with its registered address at Hamchako, Mutsamudu, Autonomous Island of Anjouan, Union of Comoros.",
    ),
  },
  games: {
    show: true,
    title: lang("প্রয়োজনীয় খেলা", "Popular games"),
    items: [
      ["slot", "স্লট গেম", "Slot games"],
      ["fishing", "ফিশিং গেম", "Fishing games"],
      ["live", "ক্যাসিনো গেম", "Casino games"],
      ["poker", "পোকার গেম", "Poker games"],
      ["sports", "স্পোর্টস গেম", "Sports games"],
      ["crash", "ক্র্যাশ গেম", "Crash games"],
    ].map(([category, bn, en]) => ({ category, label: lang(bn, en) })),
  },
  certificates: {
    show: true,
    title: lang("সার্টিফিকেট", "Certificates"),
    items: [
      { name: "Gaming Curacao", image: "/assets/footer/gaming-curacao.png", link: "" },
      { name: "Oracle API", image: "/assets/footer/oracle-api.png", link: "https://oracleapi.co.uk/" },
    ],
  },
  showProviders: true,
  providerLogos: [
    ["PG", "/assets/vendors/rng_list_vendor/PG-COLOR.png"],
    ["EVO", "/assets/vendors/live_list_vendor/EG4-COLOR.png"],
    ["PT", "/assets/vendors/live_list_vendor/PT-COLOR.png"],
    ["JDB", "/assets/vendors/rng_list_vendor/JDB-COLOR.png"],
    ["CQ9", "/assets/vendors/rng_list_vendor/CQ9-GRAY.png"],
    ["FC", "/assets/vendors/rng_list_vendor/FC-COLOR.png"],
    ["JILI", "/assets/vendors/rng_list_vendor/JL-COLOR.png"],
    ["BTG", "/assets/vendors/rng_list_vendor/BTG-COLOR.png"],
  ].map(([name, image]) => ({ name, image, link: "" })),
  copyright: lang("Copyright © 2025 POWER7 All rights reserved."),
};

/** আগের নকশার ঘর — নতুন নকশায় নেই, একবার মুছে দেওয়া হয় */
const OLD_FIELDS = ["titles", "licenseText", "license", "responsible", "providers", "payment", "certification", "security", "desktopProviders", "socials"];

const Lang = new Schema(
  { bn: { type: String, default: "", trim: true }, en: { type: String, default: "", trim: true } },
  { _id: false },
);
const Link = new Schema(
  { name: { type: String, default: "", trim: true }, image: { type: String, default: "", trim: true }, link: { type: String, default: "", trim: true } },
  { _id: false },
);
const GameRow = new Schema({ category: { type: String, default: "", trim: true }, label: { type: Lang, default: () => ({}) } }, { _id: false });

const clone = (v) => JSON.parse(JSON.stringify(v));

const clientFooterSettingSchema = new Schema(
  {
    about: {
      type: new Schema(
        { show: { type: Boolean, default: true }, title: { type: Lang, default: () => ({}) }, logo: { type: String, default: "", trim: true }, text: { type: Lang, default: () => ({}) } },
        { _id: false },
      ),
      default: () => clone(FOOTER_DEFAULTS.about),
    },
    games: {
      type: new Schema({ show: { type: Boolean, default: true }, title: { type: Lang, default: () => ({}) }, items: { type: [GameRow], default: () => [] } }, { _id: false }),
      default: () => clone(FOOTER_DEFAULTS.games),
    },
    certificates: {
      type: new Schema({ show: { type: Boolean, default: true }, title: { type: Lang, default: () => ({}) }, items: { type: [Link], default: () => [] } }, { _id: false }),
      default: () => clone(FOOTER_DEFAULTS.certificates),
    },
    showProviders: { type: Boolean, default: true },
    providerLogos: { type: [Link], default: () => clone(FOOTER_DEFAULTS.providerLogos) },
    copyright: { type: Lang, default: () => clone(FOOTER_DEFAULTS.copyright) },
  },
  { timestamps: true },
);

clientFooterSettingSchema.statics.current = async function current() {
  const existing = await this.findOne().sort({ createdAt: 1 });
  if (!existing) return this.create({});

  // আগের নকশার ডকুমেন্ট (Mongoose পড়ার সময় ডিফল্ট বসায়, তাই কাঁচা ডেটা দেখে
  // চেনা) — নতুন ঘর ডিফল্টে, পুরোনো ঘর মুছে; একবারই হয়
  const raw = await this.collection.findOne({ _id: existing._id });
  const stale = OLD_FIELDS.filter((k) => raw && k in raw);
  if (raw && (!raw.about || stale.length)) {
    const { about, games, certificates, showProviders, providerLogos } = FOOTER_DEFAULTS;
    const fresh = { about, games, certificates, showProviders, providerLogos };
    const $set = clone(Object.fromEntries(Object.entries(fresh).filter(([k]) => !(k in raw))));
    await this.collection.updateOne(
      { _id: existing._id },
      {
        ...(Object.keys($set).length ? { $set } : {}),
        ...(stale.length ? { $unset: Object.fromEntries(stale.map((k) => [k, ""])) } : {}),
      },
    );
    return this.findById(existing._id);
  }
  return existing;
};

const ClientFooterSetting =
  mongoose.models.ClientFooterSetting || mongoose.model("ClientFooterSetting", clientFooterSettingSchema);

export default ClientFooterSetting;
