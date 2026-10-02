import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * অটো উইথড্রয়ালের একটা লেনদেন (OraclePay Auto Withdrawal API)।
 *
 * ধাপ:
 *   PENDING    — খেলোয়াড় আবেদন করেছেন; ব্যালেন্স থেকে টাকা আটকে রাখা,
 *                গেটওয়েতে এখনো কিছু যায়নি। admin Approve বা Reject করেন।
 *   PROCESSING — admin Approve করেছেন, OraclePay তে পাঠানো হয়েছে।
 *   COMPLETED  — OraclePay পাঠিয়ে দিয়েছে (Trx ID, প্রমাণ লেখা ও ছবি সহ)।
 *   REJECTED   — admin বা OraclePay বাতিল করেছে; টাকা ফেরত।
 * `refunded` আলাদা রাখা — একই REJECTED দুবার এলেও টাকা যেন একবারই ফেরে।
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

    /** সফল হলে OraclePay এর প্রমাণ — এজেন্টের Trx ID, লেখা আর স্ক্রিনশট */
    transactionId: { type: String, default: "", trim: true },
    proofText: { type: String, default: "", trim: true },
    proofImages: { type: [String], default: [] },

    /** admin এর অনুমোদন — তখনই গেটওয়েতে যায় */
    approvedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    approvedAt: { type: Date, default: null },
    /** গেটওয়েতে পাঠানো চলছে — একই আবেদন দুবার যেন না যায় */
    sendingAt: { type: Date, default: null },
    /** শেষবার পাঠাতে গিয়ে গেটওয়ের ভুল (আবেদন তখনো PENDING থাকে) */
    gatewayError: { type: String, default: "", trim: true },

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
    callbackKey: { type: String, default: "", select: false, index: true },

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
