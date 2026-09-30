import React, { useEffect, useState } from "react";
import { storedReferral } from "../../utils/referralLink";

import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { useAuthFlow } from "../../features/auth/useAuthFlow";
import { openSupport } from "../../data/contact";

/**
 * ডেস্কটপের লগইন / নিবন্ধন / পাসওয়ার্ড ফেরত — মডাল।
 *
 * মূল সাইট থেকে মাপা (১৯২০ viewport, `.popup_modal_wrap`):
 *   মডাল ৪৪৪ চওড়া; স্ক্রিনের মাঝে
 *   `.form-popup-bg` bg #181F2B, radius ২০, padding ৯৫ ৩৫ ৩০
 *   ক্লোজ বোতাম ২২ × ২২, উপরে-ডানে ২৫,২৫
 *   `.form-type` ৩৭৪ × ৩৮ — দুটো ট্যাব ১২০ × ৩৮, radius ১০,
 *     সক্রিয়টার bg #BC43F4; fs ১৮ fw ৬০০
 *   `.form_item` ৩৭৪ × ৬২  (ইনপুট ৪৭ + এররের জায়গা ১৫)
 *   ইনপুট ৩৭৪ × ৪৭, bg #212937, radius ১০, fs ১৪ fw ৬০০,
 *     padding `0 16px 0 63px`; বাঁ পাশে আইকন ২০ × ২০ (x+২৬), রঙ #A8A8A8
 *   মনে রাখুন সারি ৩৭৪ × ৫০ — চেকবক্স ৩০ × ৩০, "ভুলে গিয়েছেন" fs ১৭
 *     fw ৫০০ রঙ #BC43F4
 *   সাবমিট ৩৭৪ × ৫৮, radius ৭, bg #BC43F4, fs ১৮ fw ৭০০
 *   শর্তাবলির লেখা ৩৭৪ × ৩২, fs ১৪ সাদা
 *   `.form-tip` padding-top ১৯, fs ১৪; লিংকের রঙ #BC43F4
 *   এরর লেখা fs ১২ রঙ #F56C6C
 *
 * পাসওয়ার্ড ফেরত মূল সাইটে একই কার্ডের আলাদা মডাল: শিরোনাম (fs ৩০ fw ৭০০),
 * নিচে ছোট ব্যাখ্যা (fs ১৪ fw ৭০০), ঘর, "ঠিক আছে" বোতাম।
 *
 * মোবাইলের পেজগুলো (`pages/Login/*`) একই `useAuthFlow` ব্যবহার করে —
 * চেহারা আলাদা, নিয়ম এক।
 */

const FIELD_ICON = {
  user: "form-icon-name",
  pass: "form-icon-password",
  captcha: "form-icon-verify",
  phone: "form-icon-phone",
  sms: "form-icon-sms",
  invite: "form-icon-invitation",
};

const ERR = "#f56c6c";
const MUTED = "#a8a8a8";

const Field = ({ kind, error, trailing, trailingWidth = 0, ...input }) => (
  <div style={{ minHeight: 62, paddingBottom: 2 }}>
    <div className="relative" style={{ height: 47 }}>
      <span
        className="pointer-events-none absolute flex items-center"
        style={{ left: 26, top: 13.5, width: 20, height: 20, color: MUTED }}
      >
        <Icon name={FIELD_ICON[kind]} size={20} />
      </span>
      <input
        {...input}
        style={{
          width: 374,
          height: 47,
          background: "var(--auth-modal-panel, #212937)",
          borderRadius: 10,
          color: "var(--auth-modal-text, #fff)",
          fontSize: 14,
          fontWeight: 600,
          padding: `0 ${16 + trailingWidth}px 0 63px`,
          outline: "none",
          border: `1px solid ${error ? ERR : "transparent"}`,
          opacity: input.readOnly ? 0.75 : 1,
        }}
      />
      {trailing}
    </div>
    {error && (
      <div style={{ color: ERR, fontSize: 12, lineHeight: "15px", paddingTop: 2, paddingLeft: 4 }}>{error}</div>
    )}
  </div>
);

/** পাসওয়ার্ডের ঘর — চোখে চাপলে দেখা/লুকানো */
const PasswordField = (props) => {
  const [show, setShow] = useState(false);
  return (
    <Field
      kind="pass"
      type={show ? "text" : "password"}
      autoComplete={props.autoComplete || "current-password"}
      trailingWidth={24}
      trailing={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          aria-label="show password"
          className="absolute cursor-pointer"
          style={{ right: 16, top: 13.5, color: MUTED }}
        >
          <Icon name={show ? "show-eyes-default" : "hide-eyes-default"} size={20} />
        </button>
      }
      {...props}
    />
  );
};

/** ঘরের ডানে ছোট বোতাম — "কোড পাঠান" / গোনা */
const SideButton = ({ onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="absolute cursor-pointer"
    style={{
      right: 8,
      top: 8.5,
      height: 30,
      minWidth: 84,
      padding: "0 10px",
      borderRadius: 6,
      background: disabled ? "#3a4252" : "var(--auth-submit, var(--accent-bright))",
      color: disabled ? MUTED : "#fff",
      fontSize: 13,
      fontWeight: 600,
      cursor: disabled ? "default" : "pointer",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </button>
);

const SubmitButton = ({ busy, children }) => {
  const { t } = useLanguage();
  return (
    <button
      type="submit"
      disabled={busy}
      className="tb-hover-fade cursor-pointer"
      style={{
        width: 374,
        height: 58,
        borderRadius: 7,
        background: "var(--auth-submit, var(--accent-bright))",
        color: "var(--auth-modal-text, #fff)",
        fontSize: 18,
        fontWeight: 700,
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? t.auth.wait : children}
    </button>
  );
};

/** কোড চাওয়ার বোতামের লেখা — গোনা চললে "৫৯s" */
const codeLabel = (f, t, again) => (f.countdown > 0 ? `${f.countdown}s` : again ? t.auth.resend : t.auth.sendCode);

/* =========================
   লগইন / নিবন্ধন
   ========================= */

// আমন্ত্রণ লিংকের কোড — URL বা সাইট খোলার সময় রাখা কোড থেকে
const readRef = storedReferral;

const AuthForm = ({ mode, onDone, onForgot }) => {
  const { t } = useLanguage();
  const isLogin = mode === "login";
  const [refFromLink] = useState(readRef);
  const f = useAuthFlow(mode, { onDone, initialReferral: refFromLink, defaultRemember: !isLogin });
  const bind = (name) => ({
    value: f.values[name],
    onChange: (e) => f.setField(name, e.target.value),
    error: f.errors[name],
  });

  // লগইনের দ্বিতীয় ধাপ — ফোনে কোড
  if (isLogin && f.step === "otp") {
    return (
      <form onSubmit={f.submit} noValidate style={{ width: 374, marginTop: 40 }}>
        <div style={{ color: "var(--auth-modal-text, #fff)", fontSize: 18, fontWeight: 700 }}>{t.auth.otpTitle}</div>
        <div style={{ color: MUTED, fontSize: 14, marginTop: 8, marginBottom: 22 }}>
          {t.auth.otpSentTo} <span style={{ color: "var(--auth-modal-text, #fff)", fontWeight: 700 }}>{f.maskedPhone}</span>
        </div>
        <Field
          kind="sms"
          placeholder={t.auth.otp}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          trailingWidth={84}
          trailing={
            <SideButton onClick={f.sendCode} disabled={f.countdown > 0 || f.busy}>
              {codeLabel(f, t, true)}
            </SideButton>
          }
          {...bind("otp")}
        />
        <div style={{ paddingTop: 12, paddingBottom: 16 }}>
          <SubmitButton busy={f.busy}>{t.auth.confirm}</SubmitButton>
        </div>
        <div className="text-center" style={{ fontSize: 14 }}>
          <span className="cursor-pointer" style={{ color: "var(--auth-submit, var(--accent-bright))" }} onClick={f.backToForm}>
            {t.auth.back}
          </span>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={f.submit} noValidate style={{ width: 374, marginTop: 50 }}>
      <Field
        kind="user"
        placeholder={t.auth.username}
        autoComplete="username"
        title={isLogin ? undefined : t.auth.usernameHint}
        {...bind("username")}
      />
      <PasswordField
        placeholder={t.auth.password}
        autoComplete={isLogin ? "current-password" : "new-password"}
        {...bind("password")}
      />

      {!isLogin && (
        <>
          <PasswordField placeholder={t.auth.confirmPassword} autoComplete="new-password" {...bind("confirm")} />

          {/* admin নিবন্ধনে OTP চালু রাখলে তবেই নম্বর আর কোড */}
          {f.otpOnRegister && (
            <>
              <Field
                kind="phone"
                placeholder={`${t.auth.phone} (01XXXXXXXXX)`}
                inputMode="numeric"
                autoComplete="tel-national"
                trailingWidth={84}
                trailing={
                  <SideButton onClick={f.sendCode} disabled={f.countdown > 0 || f.busy}>
                    {codeLabel(f, t, f.otpSent)}
                  </SideButton>
                }
                {...bind("phone")}
              />
              {(f.otpSent || f.errors.otp) && (
                <Field
                  kind="sms"
                  placeholder={t.auth.otp}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  {...bind("otp")}
                />
              )}
            </>
          )}

          <Field
            kind="invite"
            placeholder={t.auth.referral}
            readOnly={Boolean(refFromLink)}
            {...bind("referral")}
          />

          <Field
            kind="captcha"
            placeholder={t.auth.captcha}
            inputMode="numeric"
            autoComplete="off"
            trailingWidth={84}
            trailing={
              <button
                type="button"
                tabIndex={-1}
                onClick={f.refreshCaptcha}
                title={t.auth.refreshCaptcha}
                className="absolute flex cursor-pointer items-center justify-center overflow-hidden"
                style={{ right: 10, top: 8.5, width: 78, height: 30, borderRadius: 4, background: "#eef3ea" }}
              >
                {f.captcha.image && (
                  <img
                    src={f.captcha.image}
                    alt="captcha"
                    draggable="false"
                    style={{ width: 78, height: 30, opacity: f.captcha.loading ? 0.4 : 1 }}
                  />
                )}
              </button>
            }
            {...bind("captcha")}
          />
        </>
      )}

      {isLogin && (
        <div className="flex items-center" style={{ height: 50 }}>
          <label
            className="flex cursor-pointer items-center"
            style={{ gap: 10, color: "var(--auth-submit, var(--accent-bright))", fontSize: 17, fontWeight: 500 }}
          >
            <input
              type="checkbox"
              checked={f.remember}
              onChange={(e) => f.setRemember(e.target.checked)}
              style={{ width: 30, height: 30, accentColor: "var(--auth-submit, var(--accent-bright))" }}
            />
            {t.auth.remember}
          </label>
          <span className="flex-1" />
          <span
            className="cursor-pointer"
            onClick={onForgot}
            style={{ color: "var(--auth-submit, var(--accent-bright))", fontSize: 17, fontWeight: 500 }}
          >
            {t.auth.forgot}
          </span>
        </div>
      )}

      <div style={{ paddingTop: 20, paddingBottom: 20 }}>
        <SubmitButton busy={f.busy}>{isLogin ? t.auth.loginTab : t.auth.registerTab}</SubmitButton>
      </div>

      <div style={{ fontSize: 14, color: "var(--auth-modal-text, #fff)", lineHeight: "16px" }}>{t.auth.terms}</div>
    </form>
  );
};

/* =========================
   পাসওয়ার্ড ফেরত
   ========================= */

const ForgotForm = ({ onLogin }) => {
  const { t } = useLanguage();
  const f = useAuthFlow("forgot");
  const bind = (name) => ({
    value: f.values[name],
    onChange: (e) => f.setField(name, e.target.value),
    error: f.errors[name],
  });

  const note = (text) => (
    <div style={{ color: "var(--auth-modal-text, #fff)", fontSize: 15, lineHeight: "22px", marginTop: 26, marginBottom: 26 }}>{text}</div>
  );

  return (
    <form onSubmit={f.submit} noValidate style={{ width: 374 }}>
      <div style={{ color: "var(--auth-modal-text, #fff)", fontSize: 30, fontWeight: 700, lineHeight: "36px" }}>{t.auth.forgotTitle}</div>
      <div style={{ color: "var(--auth-modal-text, #fff)", fontSize: 14, fontWeight: 700, marginTop: 10, marginBottom: 22 }}>
        {t.auth.forgotSub}
      </div>

      {f.step === "user" && (
        <>
          <Field kind="user" placeholder={t.auth.forgotUserPh} autoComplete="username" autoFocus {...bind("username")} />
          <div style={{ paddingTop: 20 }}>
            <SubmitButton busy={f.busy}>{t.auth.ok}</SubmitButton>
          </div>
        </>
      )}

      {f.step === "reset" && (
        <>
          <div style={{ color: MUTED, fontSize: 14, marginBottom: 14 }}>
            {t.auth.otpSentTo} <span style={{ color: "var(--auth-modal-text, #fff)", fontWeight: 700 }}>{f.maskedPhone}</span>
          </div>
          <Field
            kind="sms"
            placeholder={t.auth.otp}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            trailingWidth={84}
            trailing={
              <SideButton onClick={f.sendCode} disabled={f.countdown > 0 || f.busy}>
                {codeLabel(f, t, true)}
              </SideButton>
            }
            {...bind("otp")}
          />
          <PasswordField placeholder={t.auth.newPassword} autoComplete="new-password" {...bind("newPassword")} />
          <PasswordField placeholder={t.auth.newConfirm} autoComplete="new-password" {...bind("newConfirm")} />
          <div style={{ paddingTop: 12 }}>
            <SubmitButton busy={f.busy}>{t.auth.resetBtn}</SubmitButton>
          </div>
        </>
      )}

      {f.step === "unavailable" && (
        <>
          {note(t.auth.unavailable)}
          <button
            type="button"
            onClick={openSupport}
            className="tb-hover-fade cursor-pointer"
            style={{ width: 374, height: 58, borderRadius: 7, background: "var(--auth-submit, var(--accent-bright))", color: "var(--auth-modal-text, #fff)", fontSize: 18, fontWeight: 700 }}
          >
            {t.auth.support}
          </button>
        </>
      )}

      {f.step === "done" && (
        <>
          {note(t.auth.resetDone)}
          <button
            type="button"
            onClick={onLogin}
            className="tb-hover-fade cursor-pointer"
            style={{ width: 374, height: 58, borderRadius: 7, background: "var(--auth-submit, var(--accent-bright))", color: "var(--auth-modal-text, #fff)", fontSize: 18, fontWeight: 700 }}
          >
            {t.auth.loginNow}
          </button>
        </>
      )}

      {f.step !== "done" && (
        <div className="text-center" style={{ paddingTop: 19, fontSize: 14 }}>
          <span className="cursor-pointer" style={{ color: "var(--auth-submit, var(--accent-bright))" }} onClick={onLogin}>
            {t.auth.back}
          </span>
        </div>
      )}
    </form>
  );
};

/* =========================
   মডাল
   ========================= */

const AuthModal = ({ tab = "login", onClose, onDone, onSwitch }) => {
  const { t } = useLanguage();
  const isLogin = tab === "login";
  const isForgot = tab === "forgot";

  // Esc চাপলে বন্ধ — মূল সাইটের মতোই
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto"
      style={{ background: "rgb(0 0 0 / 0.6)", zIndex: 60, padding: "30px 0" }}
      onClick={onClose}
    >
      <div className="relative m-auto" style={{ width: 444 }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="tb-hover-fade absolute cursor-pointer"
          style={{ top: 25, right: 25, width: 22, height: 22, zIndex: 1, color: "var(--auth-modal-text, #fff)" }}
        >
          <Icon name="popup-close" size={22} />
        </button>

        <div
          style={{
            background: "var(--auth-modal-bg, #181f2b)",
            borderRadius: 20,
            padding: isForgot ? "70px 35px 30px" : "95px 35px 30px",
          }}
        >
          {isForgot ? (
            <ForgotForm onLogin={() => onSwitch?.("login")} />
          ) : (
            <>
              {/* ট্যাব */}
              <div className="flex" style={{ width: 374, height: 38 }}>
                {[
                  { key: "login", label: t.auth.loginTab },
                  { key: "register", label: t.auth.registerTab },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSwitch?.(item.key)}
                    className="cursor-pointer"
                    style={{
                      width: 120,
                      height: 38,
                      borderRadius: 10,
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--auth-modal-text, #fff)",
                      background: item.key === tab ? "var(--auth-submit, var(--accent-bright))" : "transparent",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* key — ট্যাব বদলালে ফর্ম নতুন করে, আগের লেখা-ভুল থাকে না */}
              <AuthForm key={tab} mode={tab} onDone={onDone || onClose} onForgot={() => onSwitch?.("forgot")} />

              {/* নিচের লিংক */}
              <div
                className="flex justify-center"
                style={{ width: 374, paddingTop: 19, fontSize: 14, color: "var(--auth-modal-text, #fff)", gap: 6 }}
              >
                <span>{isLogin ? t.auth.noAccount : t.auth.haveAccount}</span>
                <span
                  className="cursor-pointer"
                  style={{ color: "var(--auth-submit, var(--accent-bright))" }}
                  onClick={() => onSwitch?.(isLogin ? "register" : "login")}
                >
                  {isLogin ? t.auth.registerNow : t.auth.loginNow}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
