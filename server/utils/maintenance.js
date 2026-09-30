import MaintenanceSetting from "../models/MaintenanceSetting.js";

/**
 * গেম API এর ব্যর্থতা গুনে রাখে, আর বারবার ব্যর্থ হলে মেইনটেন্যান্স
 * নিজে থেকেই চালু করে দেয়।
 *
 * একটামাত্র ব্যর্থতায় সাইট বন্ধ করা হয় না — নেটওয়ার্কের ক্ষণিকের
 * সমস্যাতেও তখন সাইট বন্ধ হয়ে যেত। পরপর কয়েকবার ব্যর্থ হলে তবেই।
 * আবার একবার সফল হলেই অটো-মোড সাথে সাথে নেমে যায়।
 */

const FAILURES_BEFORE_ON = 3;

let consecutiveFailures = 0;

/** গেম API ব্যর্থ — দরকার হলে অটো মেইনটেন্যান্স তুলে দেয় */
export const noteApiFailure = async (reason = "") => {
  consecutiveFailures += 1;

  if (consecutiveFailures < FAILURES_BEFORE_ON) return false;

  try {
    const setting = await MaintenanceSetting.current();

    if (setting.autoOn) return true;

    setting.autoOn = true;
    setting.autoReason = String(reason || "Game API failed").slice(0, 300);
    setting.autoTriggeredAt = new Date();
    await setting.save();

    return true;
  } catch {
    // মেইনটেন্যান্স লিখতে না পারলেও মূল রিকোয়েস্ট যেন না ভাঙে
    return false;
  }
};

/** গেম API সফল — অটো মেইনটেন্যান্স থাকলে নামিয়ে দেয় */
export const noteApiSuccess = async () => {
  consecutiveFailures = 0;

  try {
    const setting = await MaintenanceSetting.current();

    if (!setting.autoOn) return;

    setting.autoOn = false;
    setting.autoReason = "";
    setting.autoClearedAt = new Date();
    await setting.save();
  } catch {
    // উপেক্ষা — পরের সফল কলে আবার চেষ্টা হবে
  }
};

export const failureCount = () => consecutiveFailures;
