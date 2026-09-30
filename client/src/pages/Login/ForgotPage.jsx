import React from "react";
import { useNavigate } from "react-router";

import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { useHideBootLoader } from "../../hook/useHideBootLoader";
import { useAuthFlow } from "../../features/auth/useAuthFlow";
import { openSupport } from "../../data/contact";
import {
  MobileAuthShell,
  MobileField,
  MobilePasswordField,
  MobileSideButton,
  MobileSubmit,
  codeLabel,
} from "./MobileAuthBits";

/**
 * মোবাইলের "পাসওয়ার্ড ভুলে গেছেন" — মূল সাইটের `/m/forget` এর মতো পেজ।
 *
 * মূল সাইট: শিরোনাম fs ৬০ fw ৭০০, নিচে ব্যাখ্যা fs ২৬ fw ৭০০, ঘর,
 * "রিসেট করুন" বোতাম (৬৮০ × ১০০, radius ৫০)। মূল সাইট ইমেইল চায়; এখানে
 * BetChokkor এর মতো ফোনে কোড — প্রথমে ইউজারনেম, তারপর কোড ও নতুন
 * পাসওয়ার্ড। OTP বন্ধ বা অ্যাকাউন্টে নম্বর না থাকলে গ্রাহক সেবা।
 */
const ForgotPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const f = useAuthFlow("forgot");

  useHideBootLoader();

  const bind = (name) => ({
    value: f.values[name],
    onChange: (e) => f.setField(name, e.target.value),
    error: f.errors[name],
  });

  const toLogin = () => navigate("/login", { replace: true });

  const note = (text) => (
    <div
      className="text-center"
      style={{ color: "var(--auth-line, #d6e2f4)", fontSize: m(30), lineHeight: 1.5, marginTop: m(30), marginBottom: m(50) }}
    >
      {text}
    </div>
  );

  return (
    <MobileAuthShell>
      <form onSubmit={f.submit} noValidate>
        <div className="text-center" style={{ fontSize: m(60), fontWeight: 700, color: "var(--auth-line, #d6e2f4)" }}>
          {t.auth.forgotTitleMobile}
        </div>
        <div
          className="text-center"
          style={{ fontSize: m(26), fontWeight: 700, color: "#fff", marginTop: m(16), marginBottom: m(40) }}
        >
          {t.auth.forgotSub}
        </div>

        {f.step === "user" && (
          <>
            <MobileField kind="user" placeholder={t.auth.username} autoComplete="username" {...bind("username")} />
            <div style={{ marginTop: m(60) }}>
              <MobileSubmit busy={f.busy}>{t.auth.resetBtn}</MobileSubmit>
            </div>
          </>
        )}

        {f.step === "reset" && (
          <>
            <div className="text-center" style={{ color: "#a8b4c8", fontSize: m(28), marginBottom: m(30) }}>
              {t.auth.otpSentTo} <span style={{ color: "#fff", fontWeight: 700 }}>{f.maskedPhone}</span>
            </div>
            <MobileField
              kind="sms"
              placeholder={t.auth.otp}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              trailingWidth={170}
              trailing={
                <MobileSideButton onClick={f.sendCode} disabled={f.countdown > 0 || f.busy}>
                  {codeLabel(f, t, true)}
                </MobileSideButton>
              }
              {...bind("otp")}
            />
            <MobilePasswordField placeholder={t.auth.newPassword} autoComplete="new-password" {...bind("newPassword")} />
            <MobilePasswordField placeholder={t.auth.newConfirm} autoComplete="new-password" {...bind("newConfirm")} />
            <div style={{ marginTop: m(40) }}>
              <MobileSubmit busy={f.busy}>{t.auth.resetBtn}</MobileSubmit>
            </div>
          </>
        )}

        {f.step === "unavailable" && (
          <>
            {note(t.auth.unavailable)}
            <MobileSubmit type="button" onClick={openSupport}>
              {t.auth.support}
            </MobileSubmit>
          </>
        )}

        {f.step === "done" && (
          <>
            {note(t.auth.resetDone)}
            <MobileSubmit type="button" onClick={toLogin}>
              {t.auth.loginNow}
            </MobileSubmit>
          </>
        )}

        {f.step !== "done" && (
          <div className="text-center" style={{ marginTop: m(50), fontSize: m(32) }}>
            <span className="cursor-pointer" style={{ color: "var(--auth-link, #7bc242)" }} onClick={toLogin}>
              {t.auth.back}
            </span>
          </div>
        )}
      </form>
    </MobileAuthShell>
  );
};

export default ForgotPage;
