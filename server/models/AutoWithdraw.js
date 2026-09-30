import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * অটো উইথড্রয়ালের একটা লেনদেন (OraclePay Auto Withdrawal API)।
 *
 * আবেদন জমা হওয়ার সাথে সাথেই খেলোয়াড়ের ব্যালেন্স থেকে টাকা কেটে
 * রাখা হয় (ম্যানুয়ালের মতোই), তারপর গেটওয়েতে পাঠানো হয়। গেটওয়ে
 * তিন ধাপে webhook দেয়: PROCESSING → COMPLETED (প্রমাণ ছবিসহ) বা
 * REJECTED (তখন টাকা ফেরত)। `refunded` আলাদা রাখা — একই REJECTED
 * webhook দুবার এলেও টাকা যেন একবারই ফেরে।
 */
const autoWithdrawSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userIdText: { type: String, default: "", trim: true },

    /** খেলোয়াড় যত টাকা তুলছে — তার ব্যালেন্স থেকে এটাই কাটা হয় */
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },

    /** গেটওয়ের ফি (মার্চেন্ট বহন করে, খেলোয়াড় নয়) */
    feePercentage: { type: Number, default: 0, min: 0 },
    feeAmount: { type: Number, default: 0, min: 0 },
    deductedAmount: { type: Number, default: 0, min: 0 },

    /** মাধ্যম ও প্রাপকের নম্বর */
    paymentMethod: { type: String, default: "", trim: true, lowercase: true },
    userIdentityAddress: { type: String, default: "", trim: true },
    accountNumber: { type: String, default: "", trim: true },

    /** গেটওয়ের নিজের আইডি — webhook এর সাথে মেলানো হয় */
    withdrawalId: { type: String, default: "", trim: true, index: true },

    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    /** সফল হলে ক্যাশ-আউটের প্রমাণ ছবি */
    proofImages: { type: [String], default: [] },

    reason: { type: String, default: "", trim: true },

    /** REJECTED হলে টাকা ফেরত গেছে কিনা — দুবার ফেরত ঠেকাতে */
    refunded: { type: Boolean, default: false, index: true },

    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    reviewNote: { type: String, default: "", trim: true },

    /**
     * গেটওয়ের webhook ঠিকানায় বসানো এই লেনদেনের গোপন চাবি।
     * OraclePay webhook এ কোনো সই পাঠায় না — তাই ঠিকানাটাই প্রমাণ: চাবিটা
     * শুধু আমরা আর গেটওয়ে জানে, বাইরের কেউ নকল "COMPLETED" পাঠাতে পারে না।
     */
    callbackKey: { type: String, default: "", select: false },

    /** কোন বাঁধা ই-ওয়ালেট থেকে — ম্যানুয়াল উত্তোলনের একই ওয়ালেট */
    wallet: { type: Schema.Types.ObjectId, ref: "EWallet", default: null },
    methodName: {
      bn: { type: String, default: "", trim: true },
      en: { type: String, default: "", trim: true },
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

autoWithdrawSchema.index({ user: 1, createdAt: -1 });
autoWithdrawSchema.index({ status: 1, createdAt: -1 });

const AutoWithdraw =
  mongoose.models.AutoWithdraw ||
  mongoose.model("AutoWithdraw", autoWithdrawSchema);

export default AutoWithdraw;
