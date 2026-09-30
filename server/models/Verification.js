import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * পরিচয় যাচাই (KYC)।
 *
 * মূল সাইটে ডিপোজিট ও উইথড্র এর পেছনে আটকানো — "পরিচয় ভেরিফিকেশন
 * সম্পন্ন করা হলে ডিপোজিট এবং উইথড্র করতে পারবেন"। এখানেও সেভাবেই,
 * তবে আটকানোটা অ্যাডমিন থেকে চালু-বন্ধ করা যায় (SiteSetting) — নইলে
 * চালু করার দিনই পুরোনো সব ব্যবহারকারী আটকে যেতেন।
 *
 * প্রতিটা ব্যবহারকারীর একটাই আবেদন থাকে; বাতিল হলে সেটাই আবার পূরণ
 * করে পাঠানো যায়, নতুন সারি তৈরি হয় না — তাই ইতিহাসে একজনের নামে
 * গাদা গাদা আবেদন জমে না।
 */
const verificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    userIdText: { type: String, default: "", trim: true, index: true },

    /*
     * খেলোয়াড় না অ্যাফিলিয়েট — আবেদনের সাথেই তুলে রাখা।
     *
     * `user` populate করে ভূমিকা দেখা যেত, কিন্তু তাতে ভূমিকা ধরে
     * ফিল্টার বা গোনা যেত না; অ্যাডমিনের দুটো আলাদা পাতার জন্য
     * সেটাই দরকার।
     */
    role: {
      type: String,
      enum: ["user", "aff-user"],
      default: "user",
      index: true,
    },

    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    dateOfBirth: { type: Date, default: null },

    documentType: {
      type: String,
      enum: ["nid", "passport", "driving"],
      required: true,
    },
    documentNumber: { type: String, required: true, trim: true, maxlength: 60 },

    /** ছবিগুলো `/uploads/...` পথে থাকে */
    frontImage: { type: String, default: "", trim: true },
    backImage: { type: String, default: "", trim: true },
    selfieImage: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    /** বাতিল করলে কারণটা ব্যবহারকারী দেখতে পান, নইলে কী ঠিক করবেন? */
    reviewNote: { type: String, default: "", trim: true, maxlength: 300 },

    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    reviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

verificationSchema.index({ role: 1, status: 1, createdAt: -1 });

const Verification =
  mongoose.models.Verification ||
  mongoose.model("Verification", verificationSchema);

export default Verification;
