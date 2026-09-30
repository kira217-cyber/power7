import fs from "node:fs";
import path from "node:path";
import multer from "multer";

/**
 * ছবি আপলোড।
 *
 * ডিপোজিট মেথডের লোগোর মতো ছোট ছবিগুলো `uploads/` এ বসে আর
 * `/uploads/...` পথে সরাসরি পরিবেশিত হয়।
 *
 * ফাইলের নাম নতুন করে বানানো হয় — ব্যবহারকারীর দেওয়া নাম সরাসরি
 * ব্যবহার করলে `../` দিয়ে ফোল্ডারের বাইরে লেখা বা একই নামে আগেরটা
 * মুছে যাওয়ার ঝুঁকি থাকত।
 */
const UPLOAD_DIR = "uploads";

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/gif",
]);

const ALLOWED_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
  ".gif",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();

    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${
        ALLOWED_EXT.has(ext) ? ext : ".bin"
      }`,
    );
  },
});

/** নাম আর ধরন — দুটোই মিলতে হবে, নইলে ছদ্মবেশে ফাইল ঢোকানো যেত */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
    return cb(null, true);
  }

  return cb(
    new Error("Only png, jpg, jpeg, webp, avif, svg or gif images are allowed"),
    false,
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
