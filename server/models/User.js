import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * রেজিস্টার বোনাস — টাকাটা সাথে সাথে ব্যালেন্সে যায় না।
 *
 * টার্নওভার পূরণ হলে তবেই যোগ হয়, তাই এখানে অপেক্ষমাণ অবস্থায় বসে
 * থাকে। `isApplied` হয়ে গেলে আর দ্বিতীয়বার দেওয়া হয় না।
 */
const pendingRegisterBonusSchema = new Schema(
  {
    bonusId: {
      type: Schema.Types.ObjectId,
      ref: "RegisterBonusCampaign",
      default: null,
    },
    amount: { type: Number, default: 0, min: 0 },
    turnoverMultiplier: { type: Number, default: 0, min: 0 },
    isApplied: { type: Boolean, default: false, index: true },
    appliedAt: { type: Date, default: null },
  },
  { _id: false },
);

/**
 * সাইটের ব্যবহারকারী।
 *
 * সাধারণ প্লেয়ার আর অ্যাফিলিয়েট একই কালেকশনে, আলাদা `role` দিয়ে —
 * তাতে রেফারেল সম্পর্ক (`referredBy`) একই মডেলের ভিতরেই থাকে, দুই
 * কালেকশনের মধ্যে জোড়া লাগাতে হয় না।
 */
const userSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 4,
      maxlength: 15,
    },

    /** গেম প্ল্যাটফর্মে পাঠানোর নাম — ১০ অক্ষরের ছোট হাতের */
    userGamePlayName: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      match: /^[a-z]{10}$/,
    },

    email: { type: String, default: "", trim: true, lowercase: true },

    /*
     * ফোন ঐচ্ছিক — মূল সাইটের নিবন্ধনে ফোন নেই (ইউজারনেম, পাসওয়ার্ড,
     * ক্যাপচা)। admin নিবন্ধনে OTP চালু রাখলে তবেই নম্বর চাওয়া হয়;
     * অ্যাফিলিয়েটে সবসময় (BetChokkor এর মতো)। পরে প্রোফাইল থেকেও বসানো যায়।
     */
    countryCode: { type: String, trim: true, default: "+880" },
    phone: { type: String, trim: true, default: "" },

    password: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ["user", "aff-user"],
      default: "user",
      index: true,
    },

    isActive: { type: Boolean, default: true, index: true },

    currency: { type: String, default: "BDT" },
    balance: { type: Number, default: 0 },

    /**
     * এ পর্যন্ত মোট কত বাজি ধরেছেন ও কত জমা দিয়েছেন।
     *
     * রেফারেল কমিশনের ধাপ ঠিক হয় এই দুটো দেখে। প্রতিবার যোগ করে না
     * বের করে চলতি যোগফল রাখা হয় — নইলে প্রতিটা রাউন্ডে পুরো ইতিহাস
     * গুনতে হতো।
     */
    totalTurnover: { type: Number, default: 0, min: 0 },
    totalDeposit: { type: Number, default: 0, min: 0 },

    /* ── VIP ──
       XP লেভেল ওঠায় (কখনো কমে না), points রিবেটে ক্যাশে রূপান্তরযোগ্য।
       দুটোই টার্নওভার থেকে জমে; সেটিং ও লেভেল অ্যাডমিন থেকে নিয়ন্ত্রিত। */
    // মূল সাইটে নতুন অ্যাকাউন্ট VIP0 থেকে শুরু
    vipLevel: { type: Number, default: 0, min: 0 },
    vipXP: { type: Number, default: 0, min: 0 },
    vipPoints: { type: Number, default: 0, min: 0 },

    pendingRegisterBonus: {
      type: pendingRegisterBonusSchema,
      default: () => ({}),
    },

    /* ── রেফারেল ── */
    referralCode: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },
    referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    referralCount: { type: Number, default: 0, min: 0 },
    /**
     * কবে "যোগ্য বন্ধু" হলেন (জমা + বাজির শর্ত পূরণ) — রেফারকারীর আমন্ত্রণ
     * পুরস্কার একবারই, তাই null থেকে তারিখে বসানোটা এক ধাপে (atomic)।
     */
    referralQualifiedAt: { type: Date, default: null },

    /**
     * ম্যানুয়াল রিবেট এই সময়ের পরের বাজি থেকে গোনা হয় — দাবি করলে
     * "এখন" এ সরে। শর্তসাপেক্ষ বদলে একই বাজির রিবেট দুবার নয়।
     */
    rebateFrom: { type: Date, default: null },

    /* ── কমিশনের হার (%) — অ্যাডমিন প্রতিটা অ্যাফিলিয়েটের জন্য বসায় ── */
    /* ── অ্যাফিলিয়েট অনুমোদন ──
     *
     * রেজিস্টার করলেই ঢোকা যায় না। অ্যাডমিন কমিশনের হারগুলো বসিয়ে
     * অনুমোদন দিলে তবেই লগইন খোলে — নইলে হার শূন্য অবস্থায় কেউ
     * খেলোয়াড় আনতে শুরু করতেন আর কমিশন জমত না।
     *
     * ডিফল্ট "approved", তাই খেলোয়াড় ও আগে থেকে থাকা অ্যাফিলিয়েটরা
     * অচল হয়ে যান না; রেজিস্টার রুট নতুনদের জন্য "pending" বসায়।
     */
    affiliateStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
    affiliateNote: { type: String, default: "", trim: true },
    affiliateReviewedAt: { type: Date, default: null },
    affiliateReviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },

    referCommission: { type: Number, default: 0, min: 0 },
    depositCommission: { type: Number, default: 0, min: 0 },
    gameWinCommission: { type: Number, default: 0, min: 0 },
    gameLossCommission: { type: Number, default: 0, min: 0 },

    /* ── জমা হওয়া কমিশন (টাকা) ── */
    referCommissionBalance: { type: Number, default: 0 },
    depositCommissionBalance: { type: Number, default: 0 },
    gameWinCommissionBalance: { type: Number, default: 0 },
    gameLossCommissionBalance: { type: Number, default: 0 },

    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },

    /* ── প্রোফাইলের তথ্য ──
     *
     * নাম আর জন্ম তারিখ একবারই বসে। পরে বদলাতে হলে সাপোর্টের মাধ্যমে —
     * মূল সাইটেও তাই, কারণ এই দুটো দিয়েই টাকা তোলার সময় পরিচয় মেলানো
     * হয়; ব্যবহারকারী নিজে বদলাতে পারলে সেই মেলানোর কোনো মানে থাকত না।
     */
    fullName: { type: String, default: "", trim: true },
    dateOfBirth: { type: Date, default: null },

    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    /*
     * পরিচয় যাচাইয়ের অবস্থা — আসল রেকর্ড `Verification` কালেকশনে,
     * এটা তার প্রতিচ্ছবি।
     *
     * নকল করে রাখা হয় বলে হেডারে ব্যাজ দেখাতে প্রতি পাতায় আলাদা
     * রিকোয়েস্ট করতে হয় না; `/api/user/me` তেই চলে আসে।
     */
    verificationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
      index: true,
    },

    /*
     * নোটিফিকেশন সবশেষ কখন দেখেছেন — এর পরে তৈরি হওয়া নোটিফিকেশনই
     * "না-পড়া" ধরা হয়। পাতা খুললেই এটা এখনকার সময়ে বসে, তখন গণনা ০।
     */
    notificationsSeenAt: { type: Date, default: null },

    /*
     * লেনদেন পাসওয়ার্ড — মূল সাইটের মতো উত্তোলন আর ওয়ালেট বাঁধা/মোছায় লাগে
     * (BetChokkor এ ছিল না)। লগইন পাসওয়ার্ড ফাঁস হলেও টাকা সরানো যায় না।
     * পরপর ৫ বার ভুলে ১৫ মিনিট বন্ধ; ভুলে গেলে admin রিসেট করেন।
     */
    txPassword: { type: String, default: "", select: false },
    txPasswordSetAt: { type: Date, default: null },
    /** উত্তোলনের আবেদন চলাকালীন ছোট তালা — utils/withdrawLock.js */
    withdrawBusyUntil: { type: Date, default: null, select: false },
    failedTxAttempts: { type: Number, default: 0, select: false },
    txLockedUntil: { type: Date, default: null, select: false },

    /* ── নিরাপত্তা ── */
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: "" },

    /*
     * পাসওয়ার্ড শেষ কবে বদলেছে — এর আগে তৈরি টোকেন আর চলে না।
     * BetChokkor এ পাসওয়ার্ড বদলালেও চুরি হওয়া টোকেন ৭ দিন চলত।
     */
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// একই নম্বরে দুবার অ্যাকাউন্ট হবে না — নম্বর ছাড়া অ্যাকাউন্ট অনেক থাকতে পারে,
// তাই শুধু নম্বর বসানো থাকলে তবেই unique
userSchema.index(
  { countryCode: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $gt: "" } } },
);
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
userSchema.index({ userGamePlayName: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ referredBy: 1, createdAt: -1 });
userSchema.index({ referredBy: 1, referralQualifiedAt: 1 });

/** অ্যাফিলিয়েটের মোট তোলার মতো কমিশন */
userSchema.methods.totalCommissionBalance = function totalCommissionBalance() {
  return (
    Number(this.referCommissionBalance || 0) +
    Number(this.depositCommissionBalance || 0) +
    Number(this.gameWinCommissionBalance || 0) +
    Number(this.gameLossCommissionBalance || 0)
  );
};

/** বাইরে পাঠানোর নিরাপদ রূপ — পাসওয়ার্ড বা লক কখনো যায় না */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    userId: this.userId,
    // userGamePlayName ইচ্ছে করেই নেই — callback এই নাম ধরে টাকা দেয়,
    // খেলোয়াড়ের হাতে যাওয়ার দরকার নেই (admin তালিকায় দেখা যায়)
    email: this.email,
    countryCode: this.countryCode,
    phone: this.phone,
    role: this.role,
    isActive: this.isActive,
    currency: this.currency,
    balance: this.balance,
    vipLevel: this.vipLevel,
    vipXP: this.vipXP,
    vipPoints: this.vipPoints,
    referralCode: this.referralCode,
    referralCount: this.referralCount,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    dateOfBirth: this.dateOfBirth,
    isEmailVerified: this.isEmailVerified,
    isPhoneVerified: this.isPhoneVerified,
    affiliateStatus: this.affiliateStatus,
    affiliateNote: this.affiliateNote,
    verificationStatus: this.verificationStatus,
    hasTxPassword: Boolean(this.txPasswordSetAt),
    lastLoginAt: this.lastLoginAt,
    lastLoginIp: this.lastLoginIp,
    pendingRegisterBonus: this.pendingRegisterBonus,
    createdAt: this.createdAt,
  };
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
