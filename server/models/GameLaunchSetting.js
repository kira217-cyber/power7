import mongoose from "mongoose";

/**
 * গেম চালু করার কী (Oracle launch key)।
 *
 * মাস্টারের API key (GameApiKeySetting) আর এটা এক জিনিস নয় — ওটা দিয়ে
 * গেমের তালিকা আসে, আর এটা দিয়ে একজন খেলোয়াড়ের জন্য গেমের লিংক
 * বানানো হয়। দুটো আলাদা সার্ভিসের কী, তাই আলাদা ডকুমেন্টে।
 *
 * কী কোডে বসানো নেই — অ্যাডমিন প্যানেল থেকে বদলানো যায়, কারণ কী
 * বদলালে সার্ভার নতুন করে ডেপ্লয় করতে হবে এমন হওয়া উচিত নয়।
 *
 * একটাই ডকুমেন্ট থাকে (সবচেয়ে নতুনটাই ব্যবহৃত হয়)।
 */
const gameLaunchSettingSchema = new mongoose.Schema(
  {
    launchKey: {
      type: String,
      required: true,
      trim: true,
      // ভুল করেও যেন কোনো রেসপন্সে না যায়
      select: false,
    },

    /** কোথায় পাঠানো হবে — সার্ভিস ঠিকানা বদলালে এখান থেকেই বদলাবে */
    launchUrl: {
      type: String,
      default: "https://oraclegames.net/api/getgameurl",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /**
     * শেষবার সত্যিকারের একটা গেম চালু করে দেখা হয়েছিল কিনা।
     *
     * যাচাই না করে কী সেভ করা যায়, কিন্তু তখন খেলোয়াড় গেমে ঢুকতে
     * গিয়ে আটকাবেন — তাই অ্যাডমিনে অবস্থাটা স্পষ্ট দেখানো হয়।
     */
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

    /**
     * callback URL এর গোপন অংশ — `/api/callback/<token>`।
     *
     * callback দিয়ে খেলোয়াড়ের ব্যালেন্স বাড়ে-কমে, তাই টোকেন না মিললে
     * server কিছুই করে না। admin এর পাতায় পুরো URL দেখায়; ফাঁস হলে
     * সেখান থেকেই নতুন টোকেন বানানো যায়।
     */
    callbackToken: {
      type: String,
      default: "",
      select: false,
    },
  },
  { timestamps: true },
);

/** অ্যাডমিন প্যানেলে দেখানোর জন্য — কী এখানে নেই, শুধু শেষ চার অক্ষর */
gameLaunchSettingSchema.methods.toSafeJSON = function toSafeJSON(rawKey = "") {
  const key = String(rawKey || "");

  return {
    id: this._id,
    keyPreview: key ? `••••••••${key.slice(-4)}` : "",
    launchUrl: this.launchUrl,
    isActive: this.isActive,
    isVerified: this.isVerified,
    lastVerifiedAt: this.lastVerifiedAt,
    lastVerifyError: this.lastVerifyError,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const GameLaunchSetting =
  mongoose.models.GameLaunchSetting ||
  mongoose.model("GameLaunchSetting", gameLaunchSettingSchema);

export default GameLaunchSetting;
