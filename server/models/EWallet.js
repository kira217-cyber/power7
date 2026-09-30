import mongoose from "mongoose";

/**
 * ব্যবহারকারীর নিজের নম্বর — টাকা এখানেই ফেরত যাবে।
 *
 * নম্বরটা কোনো একটা উপায়ের সাথে বাঁধা নয়, সব উপায়েই ব্যবহার হয় —
 * একই bKash নম্বর দিয়ে আজ bKash, কাল Nagad এ তুলতে চাইলে আবার যোগ
 * করতে হয় না।
 */
const eWalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    walletType: {
      type: String,
      enum: ["personal", "agent", "merchant"],
      default: "personal",
    },

    walletNumber: { type: String, required: true, trim: true },

    /**
     * কোন মেথডের ওয়ালেট (বিকাশ, নগদ…) — মূল সাইটে ওয়ালেট বাঁধার সময়েই
     * মেথড বাছতে হয়, তাই উত্তোলনে আলাদা করে মেথড চাওয়া হয় না।
     */
    methodId: { type: String, default: "", trim: true, uppercase: true },

    /** প্রাপকের নাম (ঐচ্ছিক) — admin টাকা পাঠানোর সময় মিলিয়ে নেন */
    accountName: { type: String, default: "", trim: true },

    label: { type: String, default: "", trim: true },

    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },

    /**
     * রেজিস্ট্রেশনের নম্বর থেকে নিজে থেকেই তৈরি হওয়া নম্বরটা।
     *
     * সবসময় থাকে, গোনার সীমায় পড়ে না, আর ব্যবহারকারী মুছতে বা
     * বদলাতে পারেন না — নিজের নম্বরটা অন্তত একটা থাকুক।
     */
    isAutoRegistration: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// একই ব্যবহারকারী একই নম্বর দুবার যোগ করতে পারবেন না
// একই মেথডে একই নম্বর দুবার নয় (একই নম্বর বিকাশ আর নগদ দুটোতেই থাকতে পারে)
eWalletSchema.index({ user: 1, methodId: 1, walletNumber: 1 }, { unique: true });
eWalletSchema.index({ user: 1, isDefault: 1 });

const EWallet =
  mongoose.models.EWallet || mongoose.model("EWallet", eWalletSchema);

export default EWallet;
