import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * কোন নম্বরে টাকা যাবে, তার অনুলিপি।
 *
 * পরে ব্যবহারকারী নম্বরটা মুছে ফেললে বা বদলালেও পুরোনো রেকর্ডে কোথায়
 * টাকা গিয়েছিল সেটা জানা থাকে।
 */
const WalletSnapshotSchema = new mongoose.Schema(
  {
    methodId: { type: String, default: "", trim: true, uppercase: true },
    methodName: { type: LangTextSchema, default: () => ({}) },
    walletType: { type: String, default: "", trim: true },
    walletNumber: { type: String, default: "", trim: true },
    label: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * টাকা তোলার একটা আবেদন।
 *
 * জমা দেওয়ার সাথে সাথেই ব্যালেন্স থেকে টাকাটা কেটে রাখা হয় — নইলে
 * আবেদন ঝুলে থাকা অবস্থায় সেই টাকা দিয়েই খেলে ফেলা যেত। বাতিল হলে
 * টাকা ফেরত যায়।
 */
const withdrawRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userIdText: { type: String, default: "", trim: true },

    methodId: { type: String, required: true, trim: true, uppercase: true },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EWallet",
      default: null,
    },
    walletSnapshot: { type: WalletSnapshotSchema, default: () => ({}) },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    adminNote: { type: String, default: "", trim: true },

    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

withdrawRequestSchema.index({ user: 1, createdAt: -1 });
withdrawRequestSchema.index({ status: 1, createdAt: -1 });

// একজনের একটাই অপেক্ষমাণ উত্তোলন — একসাথে দুটো পাঠালেও দ্বিতীয়টা আটকায়
withdrawRequestSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "pending" }, name: "one_pending_withdraw_per_user" },
);

const WithdrawRequest =
  mongoose.models.WithdrawRequest ||
  mongoose.model("WithdrawRequest", withdrawRequestSchema);

export default WithdrawRequest;
