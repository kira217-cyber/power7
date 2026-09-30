import mongoose from "mongoose";

const EligibleProviderSchema = new mongoose.Schema(
  {
    providerCode: { type: String, required: true, trim: true, uppercase: true },
    percent: { type: Number, default: 100, min: 0, max: 100 },
  },
  { _id: false },
);

/**
 * একটা টার্নওভারের হিসাব।
 *
 * বোনাস বা ডিপোজিটের সাথে একটা শর্ত আসে — এত টাকার খেলা খেলতে হবে।
 * সেই শর্তটা এখানে আলাদা ডকুমেন্ট হয়ে থাকে, তাই একজন ব্যবহারকারীর
 * একাধিক শর্ত একসাথে চলতে পারে আর প্রতিটার অগ্রগতি আলাদা দেখা যায়।
 *
 * `required` পূরণ হলে `creditedAmount` ব্যালেন্সে যোগ হয় (আগামীকালের
 * কাজ — এখন শুধু হিসাবটা তৈরি ও গোনা হয়)।
 */
const turnOverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sourceType: {
      type: String,
      enum: [
        "register-bonus",
        "deposit",
        "auto-deposit",
        "admin-manual-deposit",
        "reward",
      ],
      required: true,
      index: true,
    },

    /** কোন বোনাস বা ডিপোজিট থেকে এসেছে */
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    title: { type: String, default: "", trim: true },

    /** যে টাকাটা আটকে আছে — শর্ত পূরণ হলে এটাই ব্যালেন্সে যায় */
    creditedAmount: { type: Number, default: 0, min: 0 },

    /** কত টাকার খেলা লাগবে */
    required: { type: Number, required: true, min: 0 },

    /** এ পর্যন্ত কত হয়েছে */
    progress: { type: Number, default: 0, min: 0 },

    eligibleProviders: { type: [EligibleProviderSchema], default: [] },

    /**
     * eligibleProviders এর প্রতিটা প্রোভাইডারের বাঁধা অংশে এ পর্যন্ত কত
     * জমেছে। এর বাইরের অগ্রগতি এসেছে "যে কোনো প্রোভাইডার" অংশ থেকে।
     * তাই একটা প্রোভাইডারের ন্যূনতম অংশ আলাদা করে গোনা ও থামানো যায়।
     */
    providerProgress: {
      type: [
        new mongoose.Schema(
          {
            providerCode: {
              type: String,
              required: true,
              trim: true,
              uppercase: true,
            },
            progress: { type: Number, default: 0, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["running", "completed", "cancelled"],
      default: "running",
      index: true,
    },

    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// একই উৎস থেকে দুবার টার্নওভার তৈরি হতে পারবে না — অনুমোদন দুবার
// চললেও (রিট্রাই, দুই ট্যাব) হিসাব একবারই বসে
turnOverSchema.index(
  { user: 1, sourceType: 1, sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceId: { $type: "objectId" } } },
);

turnOverSchema.index({ user: 1, status: 1 });

/** কতটুকু হয়েছে (০–১০০) */
turnOverSchema.virtual("percent").get(function percent() {
  if (!this.required) return 100;

  return Math.min(100, Math.round((this.progress / this.required) * 100));
});

turnOverSchema.set("toJSON", { virtuals: true });
turnOverSchema.set("toObject", { virtuals: true });

const TurnOver =
  mongoose.models.TurnOver || mongoose.model("TurnOver", turnOverSchema);

export default TurnOver;
