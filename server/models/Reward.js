import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * পুরস্কার কেন্দ্র — মূল সাইটের "দাবি করা" (টিকিট), "সাইন ইন" আর
 * "টেমু টিকিট"।
 *
 * টিকিটের তিন ধরন:
 *   redPacket — লাল প্যাকেট: খুললে min–max এর মধ্যে এলোমেলো টাকা
 *   wheel     — ভাগ্যের চাকা: ঘরগুলোর ওজন অনুযায়ী একটা ঘর
 *   temu      — "বিশাল পুরস্কার": শুরুতে লক্ষ্যের বড় অংশ পাওয়া যায়, বাকিটা
 *               কাজ (ওয়ালেট বাঁধা, জমা, বন্ধু আমন্ত্রণ) করে পূরণ; লক্ষ্যে
 *               পৌঁছালে পুরো টাকা দাবি
 *
 * admin আগে একটা "টেমপ্লেট" বানান, তারপর সেটা থেকে খেলোয়াড়দের টিকিট যায়
 * (হাতে দেওয়া, নিবন্ধনে, বা সাইন-ইনের দিনের পুরস্কারে)।
 */
export const TICKET_KINDS = ["redPacket", "wheel", "temu"];
export const TEMU_TASKS = ["wallet", "deposit", "invite"];

const Text = { bn: { type: String, default: "", trim: true }, en: { type: String, default: "", trim: true } };

const templateSchema = new Schema(
  {
    name: Text,
    /** কুপনের বাঁ অংশের লেখা — "লাল প্যাকেজ", "টেমু টিকিট", "হুইল" */
    label: Text,
    description: Text,
    kind: { type: String, enum: TICKET_KINDS, required: true },
    validDays: { type: Number, default: 7, min: 1, max: 365 },
    /** পাওয়া টাকার কত গুণ খেলা লাগবে তোলার আগে (০ = শর্ত নেই) */
    turnoverMultiplier: { type: Number, default: 1, min: 0, max: 100 },

    redPacket: { min: { type: Number, default: 1, min: 0 }, max: { type: Number, default: 10, min: 0 } },
    wheel: {
      segments: {
        type: [new Schema({ amount: { type: Number, min: 0, required: true }, weight: { type: Number, min: 0, default: 1 } }, { _id: false })],
        default: [],
      },
    },
    temu: {
      target: { type: Number, default: 1000, min: 1 },
      /** শুরুতে লক্ষ্যের কত % (min–max এর মধ্যে এলোমেলো) */
      initMinPct: { type: Number, default: 85, min: 1, max: 99 },
      initMaxPct: { type: Number, default: 92, min: 1, max: 99 },
      /** প্রতিটা কাজে বাকি অংশের কত % যোগ */
      stepMinPct: { type: Number, default: 30, min: 1, max: 100 },
      stepMaxPct: { type: Number, default: 60, min: 1, max: 100 },
      /** বাকি এর চেয়ে কম হলে কাজটা পুরোটা পূরণ করে দেয় — লক্ষ্য সত্যিই ছোঁয়া যায় */
      finishBelow: { type: Number, default: 10, min: 0 },
      /** কোন কাজগুলো চালু; invite = প্রতি যোগ্য বন্ধুতে একবার */
      tasks: { type: [String], enum: TEMU_TASKS, default: TEMU_TASKS },
      maxInvites: { type: Number, default: 10, min: 0 },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const temuStateSchema = new Schema(
  {
    target: Number,
    score: { type: Number, default: 0 },
    walletDone: { type: Boolean, default: false },
    depositDone: { type: Boolean, default: false },
    invites: { type: Number, default: 0 },
    history: {
      type: [new Schema({ condition: String, score: Number, at: { type: Date, default: Date.now } }, { _id: false })],
      default: [],
    },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userIdText: { type: String, default: "", index: true },
    template: { type: Schema.Types.ObjectId, ref: "RewardTemplate", default: null },
    kind: { type: String, enum: TICKET_KINDS, required: true },
    name: Text,
    label: Text,
    description: Text,
    source: { type: String, enum: ["admin", "register", "signin"], default: "admin" },
    /** একই উৎস থেকে দুবার না — যেমন সাইন-ইনের একটা দিন */
    sourceKey: { type: String, default: null },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["available", "claimed", "expired"], default: "available", index: true },
    amount: { type: Number, default: 0 },
    turnoverMultiplier: { type: Number, default: 1 },
    /** টেমপ্লেটের পুরস্কারের নিয়ম — টিকিট দেওয়ার মুহূর্তের কপি, পরে টেমপ্লেট বদলালেও এটা বদলায় না */
    prize: { type: Schema.Types.Mixed, default: {} },
    temu: { type: temuStateSchema, default: undefined },
    claimedAt: { type: Date, default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);
ticketSchema.index({ user: 1, status: 1, endAt: 1 });
ticketSchema.index({ user: 1, sourceKey: 1 }, { unique: true, partialFilterExpression: { sourceKey: { $type: "string" } } });

const signInDaySchema = new Schema(
  {
    name: Text,
    template: { type: Schema.Types.ObjectId, ref: "RewardTemplate", default: null },
  },
  { _id: false },
);

/** সাইন-ইনের নিয়ম (একটাই ডকুমেন্ট) */
const signInSettingSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    enabled: { type: Boolean, default: true },
    title: Text,
    rules: Text,
    /** সেদিন এত জমা ও এত বাজি হলে সেদিনের পুরস্কার নেওয়া যায় */
    depositReq: { type: Number, default: 1000, min: 0 },
    betReq: { type: Number, default: 15000, min: 0 },
    days: { type: [signInDaySchema], default: [] },
    /** নতুন খেলোয়াড়কে নিবন্ধনে দেওয়া টিকিট (যেমন টেমু) — না থাকলে কিছু না */
    registerTemplate: { type: Schema.Types.ObjectId, ref: "RewardTemplate", default: null },
  },
  { timestamps: true },
);

/** সাইন-ইনের এক দিনের দাবি — ব্যবহারকারী + দিন একবারই */
const signInRecordSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dayKey: { type: String, required: true },
    dayNo: { type: Number, required: true },
    ticket: { type: Schema.Types.ObjectId, ref: "RewardTicket", default: null },
  },
  { timestamps: true },
);
signInRecordSchema.index({ user: 1, dayKey: 1 }, { unique: true });
signInRecordSchema.index({ user: 1, createdAt: -1 });

export const RewardTemplate = mongoose.models.RewardTemplate || mongoose.model("RewardTemplate", templateSchema);
export const RewardTicket = mongoose.models.RewardTicket || mongoose.model("RewardTicket", ticketSchema);
export const SignInSetting = mongoose.models.SignInSetting || mongoose.model("SignInSetting", signInSettingSchema);
export const SignInRecord = mongoose.models.SignInRecord || mongoose.model("SignInRecord", signInRecordSchema);
