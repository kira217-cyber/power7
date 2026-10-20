import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import gameApiKeyRoutes from "./routes/gameApiKeyRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import playGameRoutes from "./routes/playGameRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import userAuthRoutes from "./routes/userAuthRoutes.js";
import otpSettingRoutes from "./routes/otpSettingRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import callbackRoutes from "./routes/callbackRoutes.js";
import gameHistoryRoutes from "./routes/gameHistoryRoutes.js";
import depositMethodRoutes from "./routes/depositMethodRoutes.js";
import depositFieldRoutes from "./routes/depositFieldRoutes.js";
import depositBonusTurnoverRoutes from "./routes/depositBonusTurnoverRoutes.js";
import depositRequestRoutes from "./routes/depositRequestRoutes.js";
import adminManualDepositRoutes from "./routes/adminManualDepositRoutes.js";
import withdrawMethodRoutes from "./routes/withdrawMethodRoutes.js";
import withdrawRequestRoutes from "./routes/withdrawRequestRoutes.js";
import eWalletRoutes from "./routes/eWalletRoutes.js";
import txPasswordRoutes from "./routes/txPasswordRoutes.js";
import accountRecordRoutes from "./routes/accountRecordRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import turnoverRoutes from "./routes/turnoverRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import vipRoutes from "./routes/vipRoutes.js";
import siteContentRoutes from "./routes/siteContentRoutes.js";
import inboxRoutes from "./routes/inboxRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import helpRoutes from "./routes/helpRoutes.js";
import appRoutes from "./routes/appRoutes.js";
import affiliateRoutes from "./routes/affiliateRoutes.js";
import bulkAdjustmentRoutes from "./routes/bulkAdjustmentRoutes.js";
import registerBonusRoutes from "./routes/registerBonusRoutes.js";
import autoDepositRoutes from "./routes/autoDepositRoutes.js";
import mfsDepositRoutes from "./routes/mfsDepositRoutes.js";
import autoWithdrawRoutes from "./routes/autoWithdrawRoutes.js";
import paymentModeRoutes from "./routes/paymentModeRoutes.js";
import themeRoutes from "./routes/themeRoutes.js";
import affWithdrawRoutes from "./routes/affWithdrawRoutes.js";
import affSiteSettingsRoutes from "./routes/affSiteSettingsRoutes.js";
import affiliateHomeRoutes from "./routes/affiliateHomeRoutes.js";
import affiliateAuthRoutes from "./routes/affiliateAuthRoutes.js";
import { startReferralPayouts } from "./utils/referral.js";

dotenv.config();

// সিক্রেট ছাড়া সার্ভার চালু হলে টোকেন যাচাই ভেঙে পড়ত — তাই
// শুরুতেই থামিয়ে দেওয়া হয়, চুপচাপ চলতে দেওয়ার চেয়ে ভালো
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET নেই বা খুব ছোট (কমপক্ষে ৩২ অক্ষর) — .env দেখুন");
  process.exit(1);
}

await connectDB();

// বন্ধুদের বাজির কমিশন ১৫ মিনিট পরপর ব্যালেন্সে (মূল সাইটের মতো)
startReferralPayouts();

const app = express();

// রিভার্স প্রক্সির পেছনে থাকলে আসল IP পেতে (rate limit এর জন্য দরকার)
app.set("trust proxy", 1);

app.use(helmet());

/**
 * CORS — সব অরিজিন allowed। API টোকেন-ভিত্তিক (কুকি নয়), তাই খোলা
 * CORS এ CSRF ঝুঁকি নেই; ফলে ক্লায়েন্ট (5173), অ্যাফিলিয়েট (5174) ও
 * অ্যাডমিন (5175) — তিন জায়গা থেকেই কল করা যায়।
 */
app.use(cors());

// বড় পে-লোড দিয়ে মেমরি ভরানো ঠেকাতে সীমা
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// আপলোড করা ছবি সরাসরি পরিবেশন — helmet এর crossOriginResourcePolicy
// ডিফল্টে same-origin, তাই অন্য পোর্টের অ্যাডমিন থেকে ছবি দেখা যেত না
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static("uploads"),
);

// পুরো API তে সাধারণ সীমা (লগইনে আলাদা কড়া সীমা আছে)
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // গেমের callback সব খেলোয়াড়ের বাজি নিয়ে এক-দুটো IP থেকে আসে —
    // সীমায় পড়লে বাজি আটকে যেত; ওটার পাহারা URL এর গোপন টোকেন
    skip: (req) => req.path.startsWith("/callback"),
  }),
);

app.get("/", (req, res) => {
  res.json({ success: true, message: "POWER7 Server is running." });
});

app.get("/health", (req, res) => {
  res.json({ success: true, uptime: process.uptime() });
});

app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin/game-api-key", gameApiKeyRoutes);

// admin এর Users / Affiliates — তালিকা, বিস্তারিত, ইতিহাস, বদলানো
app.use("/api/admin/manage", adminUserRoutes);

// ক্লায়েন্টের গেম — White-label master থেকে প্রক্সি
app.use("/api/games", gameRoutes);

// গেম চালু — এখন শুধু ফ্রি ট্রায়াল (০ ব্যালেন্সে); অ্যাডমিনের launch key ও এখানে
app.use("/api/play-game", playGameRoutes);

// গেমের প্রতিটা বাজির কাটা-জমা (seamless wallet) — URL এ গোপন টোকেন লাগে
app.use("/api/callback", callbackRoutes);

// খেলার ইতিহাস (বেটিং রেকর্ড) আর টার্নওভার — খেলোয়াড় ও admin
app.use("/api/game-history", gameHistoryRoutes);
app.use("/api/turnover", turnoverRoutes);

// বন্ধুদের আমন্ত্রণ (খেলোয়াড়ের রেফারেল প্রোগ্রাম) আর VIP/ম্যানুয়াল রিবেট
app.use("/api/referral", referralRoutes);
app.use("/api/vip", vipRoutes);

// হোমের ব্যানার/নোটিশ/প্রমোশন/পপআপ/গ্রাহক সেবা আর খেলোয়াড়ের ইনবক্স
app.use("/api/site-content", siteContentRoutes);
app.use("/api/inbox", inboxRoutes);

// "অভিযোগ / পরামর্শ" — খেলোয়াড় পাঠান, admin উত্তর দেন (ইনবক্সে যায়)
app.use("/api/feedback", feedbackRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/app", appRoutes);
app.use("/api/affiliate", affiliateRoutes);
app.use("/api/admin/bulk-adjustment", bulkAdjustmentRoutes);
app.use("/api/register-bonus", registerBonusRoutes);
app.use("/api/auto-deposit", autoDepositRoutes);
app.use("/api/mfs-deposit", mfsDepositRoutes);
app.use("/api/auto-withdraw", autoWithdrawRoutes);
app.use("/api/payment-modes", paymentModeRoutes);
app.use("/api/theme", themeRoutes);
app.use("/api/aff-withdraw", affWithdrawRoutes);
app.use("/api/site-settings", affSiteSettingsRoutes);
app.use("/api/affiliate-home", affiliateHomeRoutes);
app.use("/api/affiliate-auth", affiliateAuthRoutes);

// ম্যানুয়াল ডিপোজিট — মেথড, ফর্মের ঘর, বোনাস-টার্নওভার, রিকোয়েস্ট, admin এর সরাসরি জমা
app.use("/api/deposit-methods", depositMethodRoutes);
app.use("/api/deposit-fields", depositFieldRoutes);
app.use("/api/deposit-bonus-turnover", depositBonusTurnoverRoutes);
app.use("/api/deposit-requests", depositRequestRoutes);
app.use("/api/manual-deposit", adminManualDepositRoutes);

// উত্তোলন — মেথড, রিকোয়েস্ট, খেলোয়াড়ের ই-ওয়ালেট, লেনদেন পাসওয়ার্ড
app.use("/api/withdraw-methods", withdrawMethodRoutes);
app.use("/api/withdraw-requests", withdrawRequestRoutes);
app.use("/api/e-wallets", eWalletRoutes);
app.use("/api/profile/tx-password", txPasswordRoutes);

// খেলোয়াড়ের অ্যাকাউন্ট রেকর্ড (টাকার খাতা) আর দিনভিত্তিক লাভ-ক্ষতি
app.use("/api/account-records", accountRecordRoutes);

// প্রোফাইল (ব্যক্তিগত তথ্য, ফোন, পাসওয়ার্ড) আর পরিচয় যাচাই (KYC)
app.use("/api/profile", profileRoutes);
app.use("/api/verification", verificationRoutes);

// সাইট রক্ষণাবেক্ষণ — অ্যাডমিন নিজে, বা গেম API পরপর ব্যর্থ হলে নিজে থেকে
app.use("/api/maintenance", maintenanceRoutes);

// খেলোয়াড় ও অ্যাফিলিয়েটের অ্যাকাউন্ট (একই রুট, `site` দিয়ে আলাদা)
app.use("/api/user", userAuthRoutes);
app.use("/api/otp-setting", otpSettingRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// শেষ ভরসার এরর হ্যান্ডলার — প্রোডাকশনে ভিতরের বার্তা বাইরে যায় না
app.use((err, req, res, next) => {
  // আপলোডের ভুল খেলোয়াড়ের — ফাইল বড়, বেশি ফাইল, ভুল ঘর। 500 দিলে সাইট
  // "server বন্ধ" ভেবে রক্ষণাবেক্ষণ দেখাত, তাই 400 আর বোঝার মতো বার্তা
  if (err?.name === "MulterError") {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooBig ? 413 : 400).json({
      success: false,
      code: tooBig ? "fileTooLarge" : "badUpload",
      message: tooBig ? "The image is too large — please choose a smaller one" : `Upload problem: ${err.message}`,
    });
  }

  console.error("SERVER ERROR:", err.message);

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  return res.status(status).json({
    success: false,
    ...(err.code && typeof err.code === "string" && status < 500 ? { code: err.code } : {}),
    message: isProd && status === 500 ? "Internal server error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 POWER7 Server running on port ${PORT}`);
});
