import React, { useState } from "react";
import { storedReferral } from "../../utils/referralLink";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { useSelector } from "react-redux";

import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { useHideBootLoader } from "../../hook/useHideBootLoader";
import { useAuthFlow } from "../../features/auth/useAuthFlow";
import { selectIsLoggedIn } from "../../features/auth/authSelectors";
import {
  MobileAuthShell,
  MobileField,
  MobilePasswordField,
  MobileSideButton,
  MobileSubmit,
  codeLabel,
} from "./MobileAuthBits";

/**
 * মোবাইলের লগইন ও নিবন্ধন — মূল সাইটে এগুলো মডাল নয়, আলাদা **পেজ**
 * (`/m/login`, `/m/register`)। তাই এখানেও পেজ। মাপ `MobileAuthBits.jsx` এ।
 *
 * নিয়ম-কানুন ডেস্কটপের মডালের সাথে ভাগ করা (`useAuthFlow`)। কাজ শেষে
 * যে পাতা থেকে এসেছিলেন সেখানে ফেরে (`state.from`), নইলে হোমে।
 *
 *   চেকবক্স সারি উঁচু ৪৪ — বাক্স ৪০ × ৪০ radius ১২, bg #27416A;
 *     লেবেল fs ৩৩ fw ৫০০; "ভুলে গেছেন" ডানে, রঙ #FF6DB3
 *   `.form_links` fs ৩২ সাদা; লিংক সবুজ #7BC242
 */

const AuthForm = ({ mode, onDone, onReset }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const isLogin = mode === "login";
  // আমন্ত্রণ লিংকের কোড — URL বা সাইট খোলার সময় রাখা কোড থেকে
  const [refFromLink] = useState(() => params.get("referralCode") || params.get("ref") || storedReferral());

  // মোবাইলের চেকবক্স মূল সাইটে আগে থেকেই টিক দেওয়া
  const f = useAuthFlow(mode, { onDone, initialReferral: refFromLink, defaultRemember: true });
  const bind = (name) => ({
    value: f.values[name],
    onChange: (e) => f.setField(name, e.target.value),
    error: f.errors[name],
  });

  // লগইনের দ্বিতীয় ধাপ — ফোনে কোড
  if (isLogin && f.step === "otp") {
    return (
      <form onSubmit={f.submit} noValidate>
        <div className="text-center" style={{ fontSize: m(52), fontWeight: 700, color: "var(--auth-line, #d6e2f4)" }}>
          {t.auth.otpTitle}
        </div>
        <div className="text-center" style={{ color: "#a8b4c8", fontSize: m(28), marginTop: m(16), marginBottom: m(40) }}>
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
        <div style={{ marginTop: m(50) }}>
          <MobileSubmit busy={f.busy}>{t.auth.confirm}</MobileSubmit>
        </div>
        <div className="text-center" style={{ marginTop: m(40), fontSize: m(32) }}>
          <span className="cursor-pointer" style={{ color: "var(--auth-link, #7bc242)" }} onClick={f.backToForm}>
            {t.auth.back}
          </span>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={f.submit} noValidate>
      <div className="text-center" style={{ height: m(69), fontSize: m(60), fontWeight: 700, color: "var(--auth-line, #d6e2f4)" }}>
        {isLogin ? t.auth.loginTab : t.auth.registerShort}
      </div>

      <div style={{ marginTop: m(30) }}>
        <MobileField
          kind="user"
          placeholder={t.auth.username}
          autoComplete="username"
          required={!isLogin}
          {...bind("username")}
        />
        <MobilePasswordField
          placeholder={t.auth.password}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required={!isLogin}
          {...bind("password")}
        />

        {!isLogin && (
          <>
            <MobilePasswordField
              placeholder={t.auth.confirmPassword}
              autoComplete="new-password"
              required
              {...bind("confirm")}
            />

            {/* admin নিবন্ধনে OTP চালু রাখলে তবেই নম্বর আর কোড */}
            {f.otpOnRegister && (
              <>
                <MobileField
                  kind="phone"
                  placeholder={t.auth.phone}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  trailingWidth={170}
                  trailing={
                    <MobileSideButton onClick={f.sendCode} disabled={f.countdown > 0 || f.busy}>
                      {codeLabel(f, t, f.otpSent)}
                    </MobileSideButton>
                  }
                  {...bind("phone")}
                />
                {(f.otpSent || f.errors.otp) && (
                  <MobileField
                    kind="sms"
                    placeholder={t.auth.otp}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    {...bind("otp")}
                  />
                )}
              </>
            )}

            <MobileField
              kind="invite"
              placeholder={t.auth.referral}
              readOnly={Boolean(refFromLink)}
              {...bind("referral")}
            />

            <MobileField
              kind="captcha"
              placeholder={t.auth.captchaMobile}
              inputMode="numeric"
              autoComplete="off"
              required
              trailingWidth={160}
              trailing={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={f.refreshCaptcha}
                  title={t.auth.refreshCaptcha}
                  className="absolute flex items-center justify-center overflow-hidden"
                  style={{ right: m(20), top: m(15), width: m(150), height: m(60), borderRadius: m(8), background: "#eef3ea" }}
                >
                  {f.captcha.image && (
                    <img
                      src={f.captcha.image}
                      alt="captcha"
                      draggable="false"
                      style={{ width: m(150), height: m(60), opacity: f.captcha.loading ? 0.4 : 1 }}
                    />
                  )}
                </button>
              }
              {...bind("captcha")}
            />
          </>
        )}
      </div>

      {isLogin && (
        <div className="flex items-center" style={{ height: m(44), marginTop: m(10) }}>
          <label className="flex cursor-pointer items-center" style={{ gap: m(15) }}>
            <input
              type="checkbox"
              checked={f.remember}
              onChange={(e) => f.setRemember(e.target.checked)}
              style={{ width: m(40), height: m(40), borderRadius: m(12), accentColor: "#27416a" }}
            />
            <span style={{ fontSize: m(33), fontWeight: 500, color: "var(--auth-line, #d6e2f4)" }}>{t.auth.remember}</span>
          </label>
          <span className="flex-1" />
          <span
            className="cursor-pointer"
            onClick={() => navigate("/forget")}
            style={{ fontSize: m(33), fontWeight: 500, color: "var(--auth-alt, #ff6db3)" }}
          >
            {t.auth.forgotMobile}
          </span>
        </div>
      )}


      {/* সাবমিট — নিবন্ধনে পাশে রিসেট বোতাম (সব ঘর খালি করে) */}
      <div className="flex items-center" style={{ marginTop: m(50), gap: m(30) }}>
        <MobileSubmit busy={f.busy} width={isLogin ? "100%" : m(425)}>
          {isLogin ? t.auth.loginTab : t.auth.registerShort}
        </MobileSubmit>

        {!isLogin && (
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer"
            style={{
              width: m(225),
              height: m(100),
              borderRadius: m(50),
              background: "transparent",
              border: "1px solid var(--accent-bright)",
              color: "var(--auth-line, #d6e2f4)",
              fontSize: m(42),
              fontWeight: 500,
            }}
          >
            {t.auth.reset}
          </button>
        )}
      </div>

      <div className="flex justify-center" style={{ marginTop: m(50), fontSize: m(32), color: "#fff", gap: m(10) }}>
        <span>{isLogin ? t.auth.noAccountMobile : t.auth.haveAccount}</span>
        <span
          className="cursor-pointer"
          style={{ color: "var(--auth-link, #7bc242)", fontSize: m(30) }}
          onClick={() => navigate(isLogin ? "/register" : "/login", { replace: true, state: location.state })}
        >
          {isLogin ? t.auth.registerShort : t.auth.loginNow}
        </span>
      </div>
    </form>
  );
};

const AuthPage = ({ mode = "login" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = useSelector(selectIsLoggedIn);
  const [formKey, setFormKey] = useState(0);

  useHideBootLoader();

  // যেখান থেকে এসেছিলেন সেখানে — লগইন পেজে আবার ফেরা অর্থহীন
  const from = location.state?.from;
  const target = from && !/^\/(login|register|forget)/.test(from) ? from : "/";

  // আগে থেকেই লগইন থাকলে এই পাতার কাজ নেই
  if (loggedIn) return <Navigate to={target} replace />;

  return (
    <MobileAuthShell>
      <AuthForm
        key={`${mode}-${formKey}`}
        mode={mode}
        onDone={() => navigate(target, { replace: true })}
        onReset={() => setFormKey((k) => k + 1)}
      />
    </MobileAuthShell>
  );
};

export default AuthPage;
