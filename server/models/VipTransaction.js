import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * VIP ইতিহাসের একটা সারি।
 *
 * type:
 *  - earn    : টার্নওভার থেকে XP/পয়েন্ট জমা
 *  - convert : পয়েন্ট → ক্যাশে রূপান্তর (points ঋণাত্মক, amount ধনাত্মক)
 *  - upgrade : লেভেল ওঠা (levelFrom → levelTo)
 *  - bonus   : লেভেল-আপ/মাসিক বোনাস ক্যাশ
 *  - adjust  : অ্যাডমিন হাতে বদল
 */
const vipTransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userIdText: { type: String, default: "", trim: true, index: true },

    type: {
      type: String,
      enum: ["earn", "convert", "upgrade", "bonus", "adjust", "rebate"],
      required: true,
      index: true,
    },

    xp: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },

    levelFrom: { type: Number, default: 0 },
    levelTo: { type: Number, default: 0 },

    note: { type: String, default: "", trim: true },

    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

vipTransactionSchema.index({ user: 1, createdAt: -1 });
vipTransactionSchema.index({ type: 1, createdAt: -1 });

// একই ধাপের বোনাস দুবার নয় — BetChokkor এ একসাথে দুটো বাজিতে দুবার পেত
vipTransactionSchema.index(
  { user: 1, levelTo: 1 },
  { unique: true, partialFilterExpression: { type: "upgrade" } },
);

const VipTransaction =
  mongoose.models.VipTransaction ||
  mongoose.model("VipTransaction", vipTransactionSchema);

export default VipTransaction;
