import mongoose from "mongoose";

/**
 * গ্রাহক সেবার ঠিকানা — "গ্রাহক সেবা" বোতাম, রক্ষণাবেক্ষণের পাতা,
 * পাসওয়ার্ড ফেরতের পাতা সবাই এটা খোলে। একটাই ডকুমেন্ট।
 *
 * আগে `client/src/data/contact.js` এ টেলিগ্রাম লিংক স্থির বসানো ছিল —
 * সেটাই প্রথমবারের ডিফল্ট।
 */
const contactSettingSchema = new mongoose.Schema(
  {
    supportUrl: { type: String, default: "https://t.me/+NpaAP08VuVtiODc1", trim: true },
    telegramUrl: { type: String, default: "", trim: true },
    whatsappUrl: { type: String, default: "", trim: true },
    facebookUrl: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

contactSettingSchema.statics.current = async function current() {
  return (await this.findOne().sort({ createdAt: 1 })) || this.create({});
};

contactSettingSchema.methods.toPublic = function toPublic() {
  return {
    supportUrl: this.supportUrl,
    telegramUrl: this.telegramUrl,
    whatsappUrl: this.whatsappUrl,
    facebookUrl: this.facebookUrl,
    email: this.email,
  };
};

const ContactSetting = mongoose.models.ContactSetting || mongoose.model("ContactSetting", contactSettingSchema);

export default ContactSetting;
