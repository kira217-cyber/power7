import React, { useEffect, useRef, useState } from "react";

import FormField from "../FormField/FormField";
import FormAlert from "../FormAlert/FormAlert";
import { useLanguage } from "../../Context/LanguageProvider";
import { authError, sendOtp, verifyOtp } from "../../features/auth/authApi";

const RESEND_SECONDS = 60;

/**
 * OTP যাচাইয়ের ধাপ।
 *
 * রেজিস্টার, লগইন আর পাসওয়ার্ড পুনরুদ্ধার — তিন জায়গাতেই একই ধাপ।
 * নম্বরটা ঢাকা অবস্থায় (০১৭***৮৯০১) দেখানো হয়: ব্যবহারকারী নিজের নম্বর
 * চিনবেন, কিন্তু কাঁধের উপর দিয়ে কেউ পড়ে নিতে পারবে না।
 */
const OtpStep = ({ flow, userId, countryCode = "+880", phone, maskedPhone, onVerified }) => {
  const { t } = useLanguage();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(RESEND_SECONDS);

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // আবার পাঠানোর জন্য অপেক্ষা — সার্ভারও ৬০ সেকেন্ডের আগে পাঠায় না
  useEffect(() => {
    if (left <= 0) return undefined;

    const timer = setTimeout(() => setLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const target = userId ? { userId } : { countryCode, phone };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (otp.length < 4) return;

    try {
      setBusy(true);
      setError("");

      await verifyOtp({ flow, ...target, otp });

      onVerified();
    } catch (err) {
      setError(authError(err, t("somethingWrong"), t));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      setBusy(true);
      setError("");

      await sendOtp({ flow, ...target });

      setLeft(RESEND_SECONDS);
      setOtp("");
    } catch (err) {
      setError(authError(err, t("somethingWrong"), t));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = otp.length >= 4 && !busy;

  return (
    <form className="flex flex-col gap-5" onSubmit={handleVerify}>
      <FormAlert>{error}</FormAlert>

      <FormField label={t("otpTitle")}>
        <div className="flex w-full items-center overflow-hidden rounded-[12px] bg-[var(--form-box-bg)]">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            placeholder={t("otpPlaceholder")}
            className="h-[48px] w-full bg-transparent text-center text-[20px] tracking-[8px] text-[var(--text-primary)] outline-none placeholder:text-[15px] placeholder:tracking-normal placeholder:text-[var(--text-disabled)]"
          />
        </div>
      </FormField>

      {maskedPhone ? (
        <p className="text-center text-[14px] text-[var(--text-secondary)]">
          {t("otpSentTo")} {maskedPhone}
        </p>
      ) : null}

      <div className="flex items-center justify-center">
        {left > 0 ? (
          <span className="text-[14px] text-[var(--text-disabled)]">
            {t("resendIn")} {left}
            {t("seconds")}
          </span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={busy}
            className="cursor-pointer text-[14px] text-[var(--primary500)] underline underline-offset-4 disabled:opacity-60"
          >
            {t("resendOtp")}
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="tb-btn tb-btn--primary w-full disabled:cursor-not-allowed"
        style={
          canSubmit
            ? undefined
            : { background: "color-mix(in srgb, var(--primary500), black 40%)" }
        }
      >
        {busy ? t("loading") : t("verify")}
      </button>
    </form>
  );
};

export default OtpStep;
