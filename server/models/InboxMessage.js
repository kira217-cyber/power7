import mongoose from "mongoose";

const { Schema } = mongoose;

const LangText = new Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * "অভ্যন্তরীণ বার্তা" (ইনবক্স) এর একটা বার্তা।
 *
 * `audience: "all"` — সবার জন্য, তবে শুধু তাঁরাই দেখেন যাঁদের অ্যাকাউন্ট
 * বার্তার আগে খোলা (নতুনরা পুরোনো ঘোষণায় ডুবে যান না); `"users"` —
 * শুধু `users` তালিকার খেলোয়াড়েরা।
 *
 * BetChokkor এ একটাই "শেষ দেখা" সময় ছিল, তাই একটা বার্তা আলাদা করে
 * পড়া বা মোছা যেত না। মূল সাইটের ইনবক্সে প্রতিটা বার্তা আলাদা পড়া/মোছা
 * হয় — সেটা `InboxState` এ, খেলোয়াড় আর বার্তা প্রতি একটা সারি।
 */
const inboxMessageSchema = new Schema(
  {
    title: { type: LangText, default: () => ({}) },
    body: { type: LangText, default: () => ({}) },
    audience: { type: String, enum: ["all", "users"], default: "all" },
    users: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);
inboxMessageSchema.index({ isActive: 1, audience: 1, createdAt: -1 });
inboxMessageSchema.index({ users: 1, createdAt: -1 });

const inboxStateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: Schema.Types.ObjectId, ref: "InboxMessage", required: true },
    readAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
inboxStateSchema.index({ user: 1, message: 1 }, { unique: true });
inboxStateSchema.index({ message: 1 });

export const InboxMessage = mongoose.models.InboxMessage || mongoose.model("InboxMessage", inboxMessageSchema);
export const InboxState = mongoose.models.InboxState || mongoose.model("InboxState", inboxStateSchema);
