import mongoose from "mongoose";

/**
 * white-label master এর API key (TB ক্যাটালগ)।
 *
 * এই কী দিয়েই সার্ভার master থেকে ক্যাটাগরি, প্রোভাইডার, গেম ও hot গেম
 * আনে। কী কখনো ব্রাউজারে যায় না — ক্লায়েন্ট শুধু আমাদের
 * প্রক্সি রুট ডাকে, সার্ভার হেডারে কী বসিয়ে master এ পাঠায়।
 *
 * একটাই ডকুমেন্ট থাকে (সবচেয়ে নতুনটাই ব্যবহৃত হয়)।
 */
const gameApiKeySettingSchema = new mongoose.Schema(
  {
    apiKey: {
      type: String,
      required: true,
      trim: true,
      // ভুল করেও যেন কোনো রেসপন্সে না যায়
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastVerifiedAt: {
      type: Date,
      default: null,
    },

    lastVerifyError: {
      type: String,
      default: "",
      trim: true,
    },

    // master যাচাইয়ের সময় সাইটের যে তথ্য ফেরত দেয়
    siteInfo: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true },
);

/** অ্যাডমিন প্যানেলে দেখানোর জন্য — কী এখানে নেই, শুধু শেষ চার অক্ষর */
gameApiKeySettingSchema.methods.toSafeJSON = function toSafeJSON(rawKey = "") {
  const key = String(rawKey || "");

  return {
    id: this._id,
    keyPreview: key ? `••••••••${key.slice(-4)}` : "",
    isActive: this.isActive,
    isVerified: this.isVerified,
    lastVerifiedAt: this.lastVerifiedAt,
    lastVerifyError: this.lastVerifyError,
    siteInfo: this.siteInfo,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const GameApiKeySetting =
  mongoose.models.GameApiKeySetting ||
  mongoose.model("GameApiKeySetting", gameApiKeySettingSchema);

export default GameApiKeySetting;
