import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

import AuthCard from "../../components/AuthCard/AuthCard";
import FormField from "../../components/FormField/FormField";
import FormAlert from "../../components/FormAlert/FormAlert";
import OtpStep from "../../components/OtpStep/OtpStep";
import { useLanguage } from "../../Context/LanguageProvider";
import { authError, resetPassword, sendOtp } from "../../features/auth/authApi";
import { notify } from "../../utils/notify";

/**
 * পাসওয়ার্ড ভুলে গেলে।
 *
 * তিন ধাপ: নম্বর দেওয়া → কোড যাচাই → নতুন পাসওয়ার্ড। কোডটা আগেভাগে
 * পাঠানো হয় না — সার্ভার "যাচাই করুন" বললে তবেই, নইলে এই ফ্লোতে OTP
 * বন্ধ থাকলেও অকারণে SMS যেত।
 */
const ForgotPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState("phone");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const phoneValid = phone.length === 11;

  const boxClass =
    "tb-field";
  const inputClass =
    "h-[48px] w-full bg-transparent px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]";

  /** নম্বরটা আছে কিনা দেখে কোড পাঠানো */
  const askCode = async (event) => {
    event.preventDefault();

    if (!phoneValid || busy) return;

    try {
      setBusy(true);
      setError("");

      const sent = await sendOtp({
        flow: "forgotPassword",
        countryCode: "+880",
        phone,
      });

      setMaskedPhone(sent.maskedPhone || "");

      // এই ফ্লোতে OTP বন্ধ থাকলে সরাসরি নতুন পাসওয়ার্ডের ধাপে
      setStep(sent.required === false ? "password" : "otp");
    } catch (err) {
      setError(authError(err, t("somethingWrong"), t));
    } finally {
      setBusy(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();

    if (password.length < 6 || busy) return;

    try {
      setBusy(true);
      setError("");

      await resetPassword({
        countryCode: "+880",
        phone,
        newPassword: password,
      });

      setDone(true);
      notify.success(t("passwordChanged"));
    } catch (err) {
      setError(authError(err, t("somethingWrong"), t));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard variant="forgot" title={t("forgotPassword")} subtitle={t("passwordChanged")}>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="tb-btn tb-btn--primary w-full"
          style={{ background: "var(--auth-submit)", color: "#fff" }}
        >
          {t("login")}
        </button>
      </AuthCard>
    );
  }

  if (step === "otp") {
    return (
      <AuthCard variant="forgot" title={t("otpTitle")} subtitle={t("forgotPassword")}>
        <OtpStep
          flow="forgotPassword"
          countryCode="+880"
          phone={phone}
          maskedPhone={maskedPhone}
          onVerified={() => setStep("password")}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      variant="forgot"
      main
      title={t("forgotPassword")}
      subtitle={t("loginSubtitle")}
      footerLead={t("haveAccount")}
      footer={
        <>
          <Link
            to="/login"
            className="font-semibold text-[var(--auth-link)] underline underline-offset-4"
          >
            {t("login")}
          </Link>
        </>
      }
    >
      {step === "phone" ? (
        <form className="flex flex-col gap-5" onSubmit={askCode}>
          <FormAlert>{error}</FormAlert>

          <FormField
            label={t("phoneNumber")}
            error={phone && !phoneValid ? t("phoneLengthError") : ""}
          >
            <div className="flex w-full gap-3">
              <div
                className={`${boxClass} !w-auto shrink-0 gap-2 px-3`}
                style={{ background: "var(--neutral900)" }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}assets/flag/BD.svg`}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                  draggable="false"
                />
                <span className="text-[15px] text-[var(--text-primary)]">
                  +880
                </span>
                <ChevronDown size={14} className="text-[var(--text-disabled)]" />
              </div>

              <div className={`${boxClass} min-w-0 flex-1`}>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                />
              </div>
            </div>
          </FormField>

          <button
            type="submit"
            disabled={!phoneValid || busy}
            className="tb-btn tb-btn--primary w-full disabled:cursor-not-allowed"
            style={{
              background: phoneValid && !busy
                ? "var(--auth-submit)"
                : "color-mix(in srgb, var(--auth-submit), black 40%)",
              color: "#fff",
            }}
          >
            {busy ? t("loading") : t("continue")}
          </button>
        </form>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={save}>
          <FormAlert>{error}</FormAlert>

          <FormField
            label={t("newPassword")}
            error={
              password && password.length < 6 ? t("passwordTooShort") : ""
            }
          >
            <div className={boxClass}>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("newPasswordPlaceholder")}
                className={inputClass}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={t("password")}
                className="flex h-[48px] w-11 shrink-0 cursor-pointer items-center justify-center text-[var(--text-disabled)] transition-colors hover:text-[var(--text-secondary)]"
              >
                {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>
          </FormField>

          <button
            type="submit"
            disabled={password.length < 6 || busy}
            className="tb-btn tb-btn--primary w-full disabled:cursor-not-allowed"
            style={{
              background: password.length >= 6 && !busy
                ? "var(--auth-submit)"
                : "color-mix(in srgb, var(--auth-submit), black 40%)",
              color: "#fff",
            }}
          >
            {busy ? t("loading") : t("savePassword")}
          </button>
        </form>
      )}
    </AuthCard>
  );
};

export default ForgotPassword;
