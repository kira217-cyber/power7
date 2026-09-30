import mongoose from "mongoose";

const EligibleProviderSchema = new mongoose.Schema(
  {
    providerCode: { type: String, trim: true, uppercase: true },
    percent: { type: Number, default: 100, min: 0, max: 100 },
  },
  { _id: false },
);

/**
 * রেফারকারী অ্যাফিলিয়েটের কমিশন — জমা দেওয়ার সময়ই হিসাব হয়ে যায়।
 *
 * পরে হার বদলালেও এই রেকর্ডটা অপরিবর্তিত থাকে, তাই হিসাব মেলানো যায়।
 */
const AffiliateDepositCommissionSchema = new mongoose.Schema(
  {
    affiliatorId: { type: String, default: "", trim: true },
    affiliatorUserId: { type: String, default: "", trim: true },
    percent: { type: Number, default: 0, min: 0 },
    baseAmount: { type: Number, default: 0, min: 0 },
    commissionAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

/**
 * জমা দেওয়ার মুহূর্তের হিসাব।
 *
 * বোনাস আর টার্নওভার এখানেই বসে যায় — অ্যাডমিন অনুমোদনের সময় কিছু
 * হিসাব করে না, শুধু এই সংখ্যাগুলো কাজে লাগায়। তাই অনুমোদনের আগে
 * অ্যাডমিন নিয়ম বদলালেও ব্যবহারকারী যা দেখে জমা দিয়েছিলেন তাই পান।
 */
const CalcSchema = new mongoose.Schema(
  {
    channelPercent: { type: Number, default: 0 },
    percentBonus: { type: Number, default: 0 },
    promoBonus: { type: Number, default: 0 },
    totalBonus: { type: Number, default: 0 },

    turnoverMultiplier: { type: Number, default: 1 },
    targetTurnover: { type: Number, default: 0 },

    /** টাকা + বোনাস — অনুমোদনে এটাই ব্যালেন্সে যায় */
    creditedAmount: { type: Number, default: 0 },

    eligibleProviders: { type: [EligibleProviderSchema], default: [] },

    affiliateDepositCommission: {
      type: AffiliateDepositCommissionSchema,
      default: () => ({}),
    },
  },
  { _id: false },
);

/**
 * একটা ডিপোজিট রিকোয়েস্ট।
 *
 * ব্যবহারকারী নিজে দেয়, অ্যাডমিন সরাসরি জমা করলেও একই ডকুমেন্ট তৈরি হয়
 * (status সাথে সাথেই approved) — তাই ইতিহাস এক জায়গাতেই থাকে।
 */
const depositRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    methodId: { type: String, required: true, trim: true, lowercase: true },
    channelId: { type: String, required: true, trim: true },
    promoId: { type: String, default: "none", trim: true },

    amount: { type: Number, required: true, min: 1 },

    /** ফর্মের ঘরগুলোর উত্তর — মেথডভেদে আলাদা, তাই খোলা অবজেক্ট */
    fields: { type: Object, default: {} },

    calc: { type: CalcSchema, default: () => ({}) },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    adminNote: { type: String, default: "", trim: true },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    approvedAt: { type: Date, default: null },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    rejectedAt: { type: Date, default: null },

    /**
     * দেখানোর জন্য নাম-নম্বরের অনুলিপি।
     *
     * পরে মেথড বা চ্যানেলের নাম বদলালে বা মুছে গেলেও পুরোনো রেকর্ড
     * ঠিকঠাক দেখায়, আর তালিকা আনতে বাড়তি join লাগে না।
     */
    display: { type: Object, default: {} },
  },
  { timestamps: true },
);

depositRequestSchema.index({ createdAt: -1 });
depositRequestSchema.index({ user: 1, createdAt: -1 });
depositRequestSchema.index({ status: 1, createdAt: -1 });

// একজনের একটাই অপেক্ষমাণ রিকোয়েস্ট — দুবার দ্রুত ক্লিক করলেও দুটো তৈরি হয় না
depositRequestSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "pending" }, name: "one_pending_per_user" },
);

const DepositRequest =
  mongoose.models.DepositRequest ||
  mongoose.model("DepositRequest", depositRequestSchema);

export default DepositRequest;
