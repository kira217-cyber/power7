import mongoose from "mongoose";

/**
 * অ্যাডমিন অ্যাকাউন্ট।
 *
 * role তিন রকম:
 *   mother — সব কিছু করতে পারে, নতুন অ্যাডমিন বানাতে পারে
 *   sub    — শুধু permissions তালিকায় থাকা পেজগুলো
 *   viewer — সব পেজ দেখতে পারে, কিন্তু কোনো কিছু লিখতে/বদলাতে পারে না
 *
 * পাসওয়ার্ড সবসময় bcrypt hash হিসেবেই থাকে — কোথাও পড়ার মতো করে
 * রাখা হয় না, ডেমো অ্যাকাউন্টের জন্যও না।
 */
const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      // কোনো query তে ভুল করেও যেন hash বেরিয়ে না আসে
      select: false,
    },

    role: {
      type: String,
      enum: ["mother", "sub", "viewer"],
      default: "sub",
    },

    /** শুধু sub অ্যাডমিনের জন্য — কোন পেজগুলো খুলতে পারবে */
    permissions: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * লগইন পেজে এই অ্যাকাউন্টের ইমেইল ও পাসওয়ার্ড দেখানো হবে কিনা।
     * শুধু `viewer` রোলেই কাজ করে — যে অ্যাকাউন্ট কিছুই বদলাতে পারে
     * না, কেবল সেটাই সবাইকে দেখানো নিরাপদ।
     */
    showOnLogin: {
      type: Boolean,
      default: false,
    },

    /**
     * ডেমো অ্যাকাউন্টের পাসওয়ার্ড পড়ার মতো করে।
     *
     * এটা ইচ্ছাকৃত — পাসওয়ার্ডটা লগইন পেজে দেখানোই উদ্দেশ্য, তাই
     * হ্যাশ থেকে ফেরত আনা সম্ভব নয় বলে আলাদা করে রাখতে হয়।
     * `select: false`, আর শুধু `showOnLogin` করা viewer অ্যাকাউন্টেই
     * বসে; রোল বদলালে বা ফ্ল্যাগ নামালে সাথে সাথেই মুছে যায়।
     */
    demoPassword: {
      type: String,
      default: "",
      select: false,
    },

    /** পরপর ভুল পাসওয়ার্ড দিলে সাময়িক লক — brute force ঠেকাতে */
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockedUntil: {
      type: Date,
      default: null,
      select: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/** API রেসপন্সে পাঠানোর মতো নিরাপদ রূপ */
adminSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    permissions: this.permissions || [],
    isActive: this.isActive,
    showOnLogin: Boolean(this.showOnLogin),
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
