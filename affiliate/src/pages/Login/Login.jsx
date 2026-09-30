import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { Eye, EyeOff } from "lucide-react";

import AuthCard from "../../components/AuthCard/AuthCard";
import FormField from "../../components/FormField/FormField";
import FormAlert from "../../components/FormAlert/FormAlert";
import OtpStep from "../../components/OtpStep/OtpStep";
import { useLanguage } from "../../Context/LanguageProvider";
import { setCredentials } from "../../features/auth/authSlice";
import { authError, loginAffiliate } from "../../features/auth/authApi";
import { notify } from "../../utils/notify";

/**
 * অ্যাফিলিয়েট লগইন।
 *
 * সার্ভারে খেলোয়াড় আর অ্যাফিলিয়েটের রুট একটাই; অনুরোধে
 * `site: "affiliate"` যায় বলে খেলোয়াড়ের অ্যাকাউন্ট দিয়ে এখানে ঢোকা
 * যায় না — সার্ভার ভূমিকা মিলিয়ে দেখে।
 *
 * OTP চালু থাকলে পাসওয়ার্ডের পর কোডের ধাপ আসে; বন্ধ থাকলে সরাসরি।
 */
const Login = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpStep, setOtpStep] = useState(null);

  const canSubmit = form.username.trim() && form.password.trim() && !busy;

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const finish = (data) => {
    dispatch(setCredentials({ user: data.user, token: data.token }));
    notify.success(t("loginOk"), data.user?.userId);
    navigate("/dashboard", { replace: true });
  };

  /**
   * লগইন আটকানোর কারণটা পরিষ্কার করে বলা।
   *
   * অনুমোদনের অপেক্ষায় থাকলে সেটাই বলা হয় — "ইউজারনেম বা পাসওয়ার্ড
   * ভুল" বললে তিনি বারবার পাসওয়ার্ড বদলাতে বসতেন। বাতিল হলে অ্যাডমিনের
   * লেখা কারণটাই দেখানো হয়, কারণ কী ঠিক করতে হবে সেটা ওখানেই লেখা।
   */
  const showError = (err) => {
    const code = err?.response?.data?.code;

    if (code === "affiliatePending") {
      setError(t("errAffiliatePending"));
      return;
    }

    if (code === "affiliateRejected") {
      const note = err?.response?.data?.message;
      setError(note ? `${t("errAffiliateRejected")} ${note}` : t("errAffiliateRejected"));
      return;
    }

    setError(authError(err, t("somethingWrong"), t));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!canSubmit) return;

    try {
      setBusy(true);
      setError("");

      const data = await loginAffiliate({
        userId: form.username.trim(),
        password: form.password,
      });

      // OTP লাগলে সার্ভার টোকেন দেয় না, কোড চাওয়ার কথা বলে
      if (data.otpRequired) {
        setOtpStep({ maskedPhone: data.maskedPhone });
        return;
      }

      finish(data);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  /** কোড মিলে গেলে একই পাসওয়ার্ড দিয়ে আবার — এবার সার্ভার টোকেন দেবে */
  const afterOtp = async () => {
    try {
      setBusy(true);

      const data = await loginAffiliate({
        userId: form.username.trim(),
        password: form.password,
      });

      finish(data);
    } catch (err) {
      showError(err);
      setOtpStep(null);
    } finally {
      setBusy(false);
    }
  };

  const boxClass =
    "tb-field";
  const inputClass =
    "h-[48px] w-full bg-transparent px-4 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]";

  if (otpStep) {
    return (
      <AuthCard variant="login" title={t("otpTitle")} subtitle={t("loginSubtitle")}>
        <OtpStep
          flow="login"
          userId={form.username.trim()}
          maskedPhone={otpStep.maskedPhone}
          onVerified={afterOtp}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      variant="login"
      main
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footerLead={t("noAccount")}
      footer={
        <>
          <Link
            to="/register"
            className="font-semibold text-[var(--auth-link)] underline underline-offset-4"
          >
            {t("signup")}
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <FormAlert>{error}</FormAlert>

        <FormField label={t("username")}>
          <div className={boxClass}>
            <input
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={update("username")}
              placeholder={t("usernamePlaceholder")}
              className={inputClass}
            />
          </div>
        </FormField>

        <FormField label={t("password")}>
          <div className={boxClass}>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={update("password")}
              placeholder={t("passwordPlaceholder")}
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

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-[14px] text-[var(--auth-link)] underline underline-offset-4"
          >
            {t("forgotPassword")}
          </Link>
        </div>

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
          {busy ? t("loading") : t("login")}
        </button>
      </form>
    </AuthCard>
  );
};

export default Login;
