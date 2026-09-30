import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * রেফারেল থেকে পাওয়া এক-একটা টাকা — "দাবি করুন" না চাপা পর্যন্ত
 * `claimable`, চাপলে ব্যালেন্সে যায় আর `claimed` হয়।
 *
 *   invitation  — একজন বন্ধু যোগ্য হলেন (বন্ধু প্রতি একবার)
 *   achievement — মাসে এতজন যোগ্য বন্ধু (মাইলফলক প্রতি মাসে একবার)
 *   deposit     — বন্ধুর একটা জমার রিবেট (জমা আর স্তর প্রতি একবার)
 *   betting     — বন্ধুদের বাজির কমিশন, দিনে একটা সারিতে জমতে থাকে
 *
 * BetChokkor প্রতিটা বাজিতে একটা সারি লিখত — হাজার বাজিতে হাজার সারি।
 * এখানে বাজির কমিশন দিনের একটা সারিতে যোগ হয়; দাবি করলে সারিটা
 * `claimed` হয়ে যায়, পরের বাজি নতুন সারি খোলে।
 *
 * দুবার টাকা যেন না বসে, সেজন্য প্রতিটা ধরনের নিজের unique index।
 */
const referralRewardSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userIdText: { type: String, default: "", trim: true },

    type: {
      type: String,
      enum: ["invitation", "achievement", "deposit", "betting"],
      required: true,
    },

    /** বাজির কমিশনে ভগ্নাংশ জমে — দাবির সময় দুই দশমিকে গোল */
    amount: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ["claimable", "claimed"], default: "claimable" },

    /** কার থেকে (invitation/deposit) */
    fromUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    fromUserIdText: { type: String, default: "", trim: true },

    /** ১ = সরাসরি বন্ধু */
    tier: { type: Number, default: 0 },

    /** যার উপর হিসাব — জমার টাকা বা দিনের মোট বাজি */
    base: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },

    /** কোন জমা (deposit) */
    refId: { type: Schema.Types.ObjectId, default: null },

    /** "2026-09" (achievement) বা "2026-09-25" (betting) */
    periodKey: { type: String, default: "", trim: true },
    milestoneCount: { type: Number, default: 0 },

    claimedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

referralRewardSchema.index({ user: 1, status: 1, createdAt: -1 });
referralRewardSchema.index({ user: 1, createdAt: -1 });
referralRewardSchema.index({ type: 1, createdAt: -1 });

referralRewardSchema.index(
  { user: 1, fromUser: 1 },
  { unique: true, partialFilterExpression: { type: "invitation" } },
);
referralRewardSchema.index(
  { user: 1, periodKey: 1, milestoneCount: 1 },
  { unique: true, partialFilterExpression: { type: "achievement" } },
);
referralRewardSchema.index(
  { user: 1, refId: 1, tier: 1 },
  { unique: true, partialFilterExpression: { type: "deposit" } },
);
// দিনে একটাই খোলা সারি — একসাথে দুটো বাজি এলেও
referralRewardSchema.index(
  { user: 1, periodKey: 1 },
  { unique: true, partialFilterExpression: { type: "betting", status: "claimable" } },
);

const ReferralReward =
  mongoose.models.ReferralReward || mongoose.model("ReferralReward", referralRewardSchema);

export default ReferralReward;
