import React, { useState } from "react";
import { Link } from "react-router";
import { Check, ChevronDown, Clock, Eye, EyeOff } from "lucide-react";

import AuthCard from "../../components/AuthCard/AuthCard";
import FormField from "../../components/FormField/FormField";
import FormAlert from "../../components/FormAlert/FormAlert";
import OtpStep from "../../components/OtpStep/OtpStep";
import { useLanguage } from "../../Context/LanguageProvider";
import {
  authError,
  registerAffiliate,
  sendOtp,
} from "../../features/auth/authApi";
import { notify } from "../../utils/notify";

/**
 * অ্যাফিলিয়েট রেজিস্ট্রেশন — এক পেজেই সব ঘর (ক্লায়েন্টের ৩-ধাপ ফর্মের
 * বদলে), কারণ অ্যাফিলিয়েটের তথ্য কম আর একবারে দেখতে পারলে সুবিধা।
 *
 * OTP চালু থাকলে সাবমিটের পর কোডের ধাপ আসে — কোডটা আগেভাগে পাঠানো হয়
 * না, সার্ভার চাওয়ার পরেই; নইলে যাদের জন্য OTP বন্ধ তাদেরও SMS যেত।
 */
const Register = () => {
  const { t } = useLanguage();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpStep, setOtpStep] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(false);

  // কোন কোন পাসওয়ার্ডের ঘর এখন খোলা দেখাচ্ছে
  const [revealed, setRevealed] = useState({});

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const phoneValid = form.phone.length === 11;
  const passwordMatch = form.password && form.password === form.confirmPassword;

  const canSubmit =
    form.fullName.trim() &&
    form.username.trim() &&
    phoneValid &&
    passwordMatch &&
    agreed &&
    !busy;

  /** নামটা দুই ভাগে — সার্ভারে firstName ও lastName আলাদা ঘর */
  const splitName = () => {
    const parts = form.fullName.trim().split(/\s+/);
    return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
  };

  const payload = () => ({
    userId: form.username.trim().toLowerCase(),
    password: form.password,
    countryCode: "+880",
    phone: form.phone,
    email: form.email.trim(),
    ...splitName(),
  });

  /*
   * রেজিস্টার হলেই ড্যাশবোর্ডে নয়।
   *
   * অ্যাডমিন কমিশনের হার বসিয়ে অনুমোদন দেওয়ার আগে অ্যাকাউন্টটা
   * অপেক্ষায় থাকে — সার্ভার টোকেনই দেয় না। তাই এখানে শুধু জানিয়ে
   * দেওয়া হয় আবেদন জমা পড়েছে।
   */
  const finish = () => {
    setSubmitted(true);
    notify.success(t("applicationSentTitle"), t("applicationSentText"));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!canSubmit) return;

    try {
      setBusy(true);
      setError("");

      await registerAffiliate(payload());
      finish();
    } catch (err) {
      // সার্ভার কোড চাইলে তখনই পাঠানো হয়
      if (err?.response?.data?.code === "otpNotVerified") {
        try {
          const sent = await sendOtp({
            flow: "register",
            countryCode: "+880",
            phone: form.phone,
          });

          setOtpStep({ maskedPhone: sent.maskedPhone });
          return;
        } catch (otpErr) {
          setError(authError(otpErr, t("somethingWrong"), t));
          return;
        }
      }

      setError(authError(err, t("somethingWrong"), t));
    } finally {
      setBusy(false);
    }
  };

  const afterOtp = async () => {
    try {
      setBusy(true);
      await registerAffiliate(payload());
      finish();
    } catch (err) {
      setError(authError(err, t("somethingWrong"), t));
      setOtpStep(null);
    } finally {
      setBusy(false);
    }
  };

  const boxClass =
    "tb-field";
  const inputClass =
    "h-[48px] w-full bg-transparent px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]";

  /**
   * সাধারণ ঘর, আর পাসওয়ার্ড হলে পাশে দেখা/লুকানোর চোখ।
   *
   * চোখটা শুধু লেখা থাকলে দেখা যায় — ফাঁকা ঘরে লুকানোর মতো কিছু নেই।
   */
  const textInput = (key, placeholder, type = "text") => {
    const secret = type === "password";
    const shown = secret && revealed[key];

    return (
      <div className={boxClass}>
        <input
          type={secret ? (shown ? "text" : "password") : type}
          value={form[key]}
          onChange={update(key)}
          placeholder={placeholder}
          className={inputClass}
        />

        {secret && form[key] ? (
          <button
            type="button"
            onClick={() =>
              setRevealed((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            aria-label={t(shown ? "hide" : "show")}
            className="flex h-[48px] w-11 shrink-0 cursor-pointer items-center justify-center text-[var(--text-disabled)] transition-colors hover:text-[var(--text-secondary)]"
          >
            {shown ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
        ) : null}
      </div>
    );
  };

  if (submitted) {
    return (
      <AuthCard variant="register" title={t("applicationSentTitle")}>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--status-pending)]/10 text-[var(--status-pending)]">
            <Clock size={34} />
          </span>

          <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
            {t("applicationSentText")}
          </p>

          <Link to="/login" className="tb-btn tb-btn--primary mt-2 w-full">
            {t("login")}
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (otpStep) {
    return (
      <AuthCard variant="register" title={t("otpTitle")} subtitle={t("registerSubtitle")}>
        <OtpStep
          flow="register"
          countryCode="+880"
          phone={form.phone}
          maskedPhone={otpStep.maskedPhone}
          onVerified={afterOtp}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      variant="register"
      main
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      width="560px"
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
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <FormAlert>{error}</FormAlert>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t("fullName")}>
            {textInput("fullName", t("fullNamePlaceholder"))}
          </FormField>

          <FormField label={t("username")}>
            {textInput("username", t("usernamePlaceholder"))}
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t("email")}>
            {textInput("email", t("emailPlaceholder"), "email")}
          </FormField>

          <FormField
            label={t("phoneNumber")}
            error={form.phone && !phoneValid ? t("phoneLengthError") : ""}
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
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      phone: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                />
              </div>
            </div>
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t("password")}>
            {textInput("password", t("passwordPlaceholder"), "password")}
          </FormField>

          <FormField
            label={t("confirmPassword")}
            error={
              form.confirmPassword && !passwordMatch ? t("passwordMismatch") : ""
            }
          >
            {textInput(
              "confirmPassword",
              t("confirmPasswordPlaceholder"),
              "password",
            )}
          </FormField>
        </div>

        <button
          type="button"
          onClick={() => setAgreed((prev) => !prev)}
          className="flex cursor-pointer items-start gap-3 text-start"
        >
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors"
            style={{
              borderColor: agreed ? "var(--primary500)" : "var(--neutral600)",
              background: agreed ? "var(--primary500)" : "transparent",
              color: "var(--neutral600)",
            }}
          >
            {agreed && <Check size={13} strokeWidth={3} />}
          </span>

          <span className="text-[14px] leading-relaxed text-[var(--text-muted)]">
            {t("agreeTerms")}
          </span>
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className="tb-btn tb-btn--primary w-full disabled:cursor-not-allowed"
          style={{
            background: canSubmit
              ? "var(--auth-submit)"
              : "color-mix(in srgb, var(--auth-submit), black 40%)",
            color: "#fff",
          }}
        >
          {busy ? t("loading") : t("signup")}
        </button>
      </form>
    </AuthCard>
  );
};

export default Register;
