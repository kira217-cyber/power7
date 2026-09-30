import mongoose from "mongoose";

const { Schema } = mongoose;

/** মূল সাইটের "দয়া করে সমস্যার ধরণটি নির্বাচন করুন" তালিকা */
export const FEEDBACK_TYPES = ["deposit", "withdraw", "game", "service", "agent", "other"];

/**
 * "অভিযোগ / পরামর্শ" — খেলোয়াড়ের পাঠানো একটা বার্তা।
 *
 * ছবিতে লেনদেনের স্ক্রিনশট থাকতে পারে, তাই KYC এর মতোই গোপন ফোল্ডারে
 * (`private/kyc`, এলোমেলো নাম) — admin দেখেন সই করা লিংকে। admin উত্তর
 * দিলে সেটা খেলোয়াড়ের ইনবক্সেও যায়।
 */
const feedbackSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userIdText: { type: String, default: "", trim: true },
    type: { type: String, enum: FEEDBACK_TYPES, required: true },
    content: { type: String, required: true, trim: true, maxlength: 500 },
    image: { type: String, default: "" },
    status: { type: String, enum: ["new", "replied", "closed"], default: "new", index: true },
    reply: { type: String, default: "", trim: true, maxlength: 2000 },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);
feedbackSchema.index({ status: 1, createdAt: -1 });

const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
export default Feedback;
