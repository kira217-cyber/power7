import mongoose from "mongoose";

/**
 * "বন্ধুদের আমন্ত্রণ করুন" প্রোগ্রামের নিয়ম — সবটাই admin থেকে, একটাই ডকুমেন্ট।
 *
 * মূল সাইটের (power7) চারটে অংশ, প্রতিটা আলাদা করে চালু/বন্ধ:
 *
 *   ১. আমন্ত্রণ পুরস্কার — বন্ধু "যোগ্য" হলে (এতটা জমা + এতটা বাজি) একবার
 *      থোক টাকা (মূল সাইটে ৳309)।
 *   ২. অর্জন (achievement) — মোট এতজন যোগ্য বন্ধু হলে থোক বোনাস (মূল
 *      সাইটের "পুরস্কার" ট্যাব: ৫ জনে ৳399, ২০ জনে ৳1,699 …) — দাবি করতে হয়।
 *   ৩. জমার রিবেট — বন্ধুর প্রতিটা অনুমোদিত জমার একটা শতাংশ (মোট ০.৬৯%)।
 *   ৪. বাজির কমিশন — বন্ধুর প্রতিটা বাজির একটা শতাংশ (মোট ০.৯৭%)।
 *
 * ১, ৩ আর ৪ নিজে থেকেই ব্যালেন্সে যায় (বাজির কমিশন ১৫ মিনিট পরপর একবারে)।
 *
 * ৩ আর ৪ তিন স্তর পর্যন্ত যায় (বন্ধু, বন্ধুর বন্ধু, তারও পরের) — প্রতি
 * স্তরের হার আলাদা। অ্যাফিলিয়েটের আনা খেলোয়াড়ের উপরে গিয়ে শিকল থামে:
 * অ্যাফিলিয়েট তাঁর নিজের কমিশন পান, খেলোয়াড় প্রোগ্রাম থেকে দ্বিতীয়বার নয়।
 */

const tierSchema = new mongoose.Schema(
  {
    tier: { type: Number, required: true, min: 1, max: 3 },
    /** শতাংশে — ০.৫ মানে ০.৫% */
    percent: { type: Number, required: true, min: 0, max: 10 },
  },
  { _id: false },
);

const milestoneSchema = new mongoose.Schema(
  {
    /** কতজন যোগ্য বন্ধু */
    count: { type: Number, required: true, min: 1 },
    /** কত টাকা */
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const langSchema = {
  bn: { type: String, default: "", trim: true },
  en: { type: String, default: "", trim: true },
};

const referralSettingSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: true },

    invitation: {
      enabled: { type: Boolean, default: true },
      amount: { type: Number, default: 309, min: 0 },
      /** যোগ্য হতে বন্ধুর মোট জমা আর মোট বাজি — দুটোই পূরণ হতে হবে */
      requireDeposit: { type: Number, default: 500, min: 0 },
      requireTurnover: { type: Number, default: 1000, min: 0 },
    },

    achievement: {
      enabled: { type: Boolean, default: true },
      milestones: { type: [milestoneSchema], default: [] },
    },

    depositRebate: {
      enabled: { type: Boolean, default: true },
      tiers: { type: [tierSchema], default: [] },
    },

    bettingRebate: {
      enabled: { type: Boolean, default: true },
      tiers: { type: [tierSchema], default: [] },
    },

    /** "বাজি কমিশন ৳7,500" — একজন বন্ধু থেকে আনুমানিক আয় (শুধু দেখানো) */
    estimatePerInvitee: { type: Number, default: 7500, min: 0 },

    /** আমন্ত্রণ লিংকের ডোমেইন — খালি হলে ক্লায়েন্ট নিজের ঠিকানা বসায় */
    inviteDomain: { type: String, default: "", trim: true },

    /** "এজেন্ট ৪ সুপার কমিশন" — অ্যাফিলিয়েট সাইটের লিংক */
    agentLink: { type: String, default: "", trim: true },

    /** ব্যবহারকারীকে দেখানোর নিয়মাবলী */
    rules: langSchema,
  },
  { timestamps: true },
);

const DEFAULTS = {
  achievement: {
    enabled: true,
    // মূল সাইটের ধাপ — মোট যোগ্য বন্ধুর সংখ্যায়
    milestones: [
      { count: 5, amount: 399 },
      { count: 20, amount: 1699 },
      { count: 50, amount: 3999 },
      { count: 100, amount: 9999 },
      { count: 200, amount: 16999 },
      { count: 500, amount: 49999 },
      { count: 1000, amount: 99999 },
    ],
  },
  // মূল সাইটের মোট হার ভাগ করে তিন স্তরে — admin বদলাতে পারেন
  depositRebate: {
    enabled: true,
    tiers: [
      { tier: 1, percent: 0.4 },
      { tier: 2, percent: 0.2 },
      { tier: 3, percent: 0.09 },
    ],
  },
  bettingRebate: {
    enabled: true,
    tiers: [
      { tier: 1, percent: 0.5 },
      { tier: 2, percent: 0.3 },
      { tier: 3, percent: 0.17 },
    ],
  },
  rules: {
    bn: "১. আপনার লিংক বা কোড দিয়ে বন্ধু নিবন্ধন করলে তিনি আপনার আমন্ত্রিত।\n২. বন্ধু নির্দিষ্ট জমা ও বাজি পূরণ করলে যোগ্য হন — আমন্ত্রণ পুরস্কার সরাসরি ব্যালেন্সে।\n৩. বন্ধুর জমা ও বাজি থেকে তিন স্তর পর্যন্ত কমিশন — নিজে থেকেই ব্যালেন্সে (বাজির কমিশন ১৫ মিনিট পরপর)।\n৪. মোট যোগ্য বন্ধুর মাইলফলকের বোনাস \"পুরস্কার\" ট্যাব থেকে দাবি করুন।\n৫. একই ব্যক্তির একাধিক অ্যাকাউন্ট বা প্রতারণা ধরা পড়লে পুরস্কার বাতিল।",
    en: "1. Friends who register with your link or code are your invitees.\n2. A friend qualifies after reaching the deposit and bet requirement — the invitation reward goes straight to your balance.\n3. Earn commission on friends' deposits and bets, up to three levels — paid automatically (bet commission every 15 minutes).\n4. Claim the milestone bonuses for your total qualified friends from the \"Rewards\" tab.\n5. Multiple accounts or abuse cancels the rewards.",
  },
};

/** সবসময় একটাই ডকুমেন্ট — প্রথমবার মূল সাইটের নিয়ম বসিয়ে তৈরি */
referralSettingSchema.statics.current = async function current() {
  const existing = await this.findOne().sort({ createdAt: 1 });
  if (existing) return existing;
  return this.create(DEFAULTS);
};

/** খেলোয়াড়কে যা দেখানো যায় */
referralSettingSchema.methods.toClientJSON = function toClientJSON() {
  const on = (part) => this.isActive && Boolean(part?.enabled);
  const sum = (tiers = []) => Math.round(tiers.reduce((s, t) => s + Number(t.percent || 0), 0) * 100) / 100;
  return {
    isActive: this.isActive,
    invitation: { enabled: on(this.invitation), amount: this.invitation.amount, requireDeposit: this.invitation.requireDeposit, requireTurnover: this.invitation.requireTurnover },
    achievement: { enabled: on(this.achievement), milestones: [...(this.achievement.milestones || [])].sort((a, b) => a.count - b.count) },
    depositRebate: { enabled: on(this.depositRebate), tiers: this.depositRebate.tiers, total: sum(this.depositRebate.tiers) },
    bettingRebate: { enabled: on(this.bettingRebate), tiers: this.bettingRebate.tiers, total: sum(this.bettingRebate.tiers) },
    estimatePerInvitee: this.estimatePerInvitee,
    inviteDomain: this.inviteDomain,
    agentLink: this.agentLink,
    rules: this.rules,
  };
};

const ReferralSetting =
  mongoose.models.ReferralSetting || mongoose.model("ReferralSetting", referralSettingSchema);

export default ReferralSetting;
