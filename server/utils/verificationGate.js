import Verification from "../models/Verification.js";
import VerificationSetting from "../models/VerificationSetting.js";

/**
 * পরিচয় যাচাই (KYC) এর শর্ত — admin চাইলে ডিপোজিট/উত্তোলনের আগে KYC লাগে
 * (admin › Verification এর সুইচ)। অ্যাফিলিয়েটের নিজের সুইচ, শুধু উত্তোলনে।
 *
 * @param {string} userId
 * @param {"deposit"|"withdraw"} action
 * @param {"user"|"aff-user"} role
 * @returns {Promise<{ ok: boolean, status?: string, message?: string }>}
 */
export const verificationGate = async (userId, action, role = "user") => {
  const setting = await VerificationSetting.current();

  const needed =
    role === "aff-user"
      ? action === "withdraw" && setting.affiliateRequireForWithdraw
      : action === "deposit"
        ? setting.requireForDeposit
        : setting.requireForWithdraw;

  if (!needed) return { ok: true };

  const row = await Verification.findOne({ user: userId }).select("status").lean();
  if (row?.status === "approved") return { ok: true };

  return {
    ok: false,
    status: row?.status || "none",
    message:
      row?.status === "pending"
        ? "Your identity verification is still being checked"
        : "Please complete identity verification first",
  };
};

export default verificationGate;
