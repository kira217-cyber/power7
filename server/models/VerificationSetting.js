import mongoose from "mongoose";

/**
 * পরিচয় যাচাই কোথায় বাধ্যতামূলক।
 *
 * মূল সাইটে ডিপোজিট ও উইথড্র দুটোই আটকানো, কিন্তু সেটা চালু করার দিনই
 * পুরোনো সব ব্যবহারকারী আটকে যেতেন — তাই দুটোই আলাদা সুইচ, আর
 * শুরুতে দুটোই বন্ধ। অ্যাডমিন যখন প্রস্তুত, তখন চালু করবেন।
 *
 * একটাই ডকুমেন্ট থাকে।
 */
const verificationSettingSchema = new mongoose.Schema(
  {
    requireForDeposit: { type: Boolean, default: false },
    requireForWithdraw: { type: Boolean, default: false },

    /*
     * অ্যাফিলিয়েটের জন্য শুধু উইথড্র।
     *
     * তাঁরা ডিপোজিট করেন না, কমিশন তোলেন — তাই ডিপোজিটের সুইচটা
     * এখানে রাখার কোনো মানে নেই।
     */
    affiliateRequireForWithdraw: { type: Boolean, default: false },

    /** ব্যবহারকারীকে দেখানোর কথা — কেন লাগছে, কী দিতে হবে */
    note: {
      bn: {
        type: String,
        default:
          "ডিপোজিট ও উইথড্র করতে হলে আগে পরিচয় যাচাই সম্পন্ন করতে হবে।",
        trim: true,
      },
      en: {
        type: String,
        default:
          "Please complete identity verification before depositing or withdrawing.",
        trim: true,
      },
    },
  },
  { timestamps: true },
);

/** সব সময় একটাই ডকুমেন্ট — না থাকলে ডিফল্ট নিয়ে বানিয়ে দেয় */
verificationSettingSchema.statics.current = async function current() {
  const existing = await this.findOne().sort({ createdAt: 1 });

  return existing || this.create({});
};

const VerificationSetting =
  mongoose.models.VerificationSetting ||
  mongoose.model("VerificationSetting", verificationSettingSchema);

export default VerificationSetting;
