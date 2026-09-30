import mongoose from "mongoose";

const Text = { bn: { type: String, default: "", trim: true }, en: { type: String, default: "", trim: true } };

/**
 * সাহায্য কেন্দ্রের একটা লেখা (গোপনীয়তা নীতি, ব্যবহারের শর্তাবলী …) —
 * মূল সাইটের `/wps/system/helpCenter`। লেখা সাধারণ টেক্সট: ফাঁকা লাইনে
 * নতুন অনুচ্ছেদ, `## ` দিয়ে শুরু লাইন শিরোনাম, `**…**` মোটা — HTML নয়,
 * তাই admin এর লেখায় কোনো স্ক্রিপ্ট ঢুকতে পারে না।
 *
 * মূল সাইটে শুধু মোবাইলে দেখায় (ডেস্কটপের ফুটারে "help" খালি); admin চাইলে
 * `showDesktop` দিয়ে ডেস্কটপের ফুটারেও তোলেন।
 */
const helpArticleSchema = new mongoose.Schema(
  {
    title: Text,
    body: {
      bn: { type: String, default: "", maxlength: 100000 },
      en: { type: String, default: "", maxlength: 100000 },
    },
    order: { type: Number, default: 0, index: true },
    showMobile: { type: Boolean, default: true },
    showDesktop: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const HelpArticle = mongoose.models.HelpArticle || mongoose.model("HelpArticle", helpArticleSchema);
export default HelpArticle;
