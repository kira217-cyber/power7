import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

/**
 * পরিচয় যাচাইয়ের (KYC) ছবি — গোপন ফোল্ডারে, `/uploads` এ নয়।
 *
 * BetChokkor এ জাতীয় পরিচয়পত্র আর সেলফি `/uploads` এ থাকত, লিংক পেলে
 * লগইন ছাড়াই যে কেউ দেখতে পারত। এখানে `private/kyc` কোথাও সরাসরি
 * পরিবেশন হয় না — দেখা যায় শুধু সই করা, অল্প সময়ের লিংকে
 * (`utils/kycFiles.js`)।
 */
export const KYC_DIR = path.join("private", "kyc");

if (!fs.existsSync(KYC_DIR)) fs.mkdirSync(KYC_DIR, { recursive: true });

const ALLOWED = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

const kycUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, KYC_DIR),
    // নাম অনুমান করা যায় না — এলোমেলো ৩২ অক্ষর
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString("hex")}${ALLOWED.get(file.mimetype)}`),
  }),
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error("Only png, jpg or webp images are allowed"), false),
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
});

export default kycUpload;
