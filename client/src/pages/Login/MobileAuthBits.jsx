import React, { useState } from "react";
import { useNavigate } from "react-router";

import Icon from "../../components/Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { siteImage, useSiteSettings } from "../../site/siteSettings";

/**
 * মোবাইলের অথ পেজগুলোর (লগইন, নিবন্ধন, পাসওয়ার্ড ফেরত) ভাগের টুকরো।
 *
 * মূল সাইট থেকে মাপা (৭৫০-ডিজাইন ইউনিটে, `m()` সেটাই rem এ বদলায়):
 *   `.login-bg` পুরো পর্দা, bg #010E22
 *   `.page-goback` ৬০ × ৬০, (৩০, ৪০) এ
 *   `.form_logo` (৩৫, ১২০) ৬৮০ × ১৫৮; লোগো ৪৪৬ × ১৫০ মাঝে
 *   `.form_wrap` (৩৫, ৩০৮) ৬৮০ চওড়া
 *   `.form_title` ৬৮০ × ৬৯, fs ৬০ fw ৭০০, রঙ #D6E2F4
 *   `.form-group` ৬৮০ × ১২০ — ইনপুট ৬৮০ × ৯০, radius ২৪,
 *     bg #010E22, border 1px #D6E2F4, fs ৩৩, padding-left ১০০
 *     (ইনপুটের নিচে ২০ উঁচু এররের জায়গা, দুই গ্রুপের মাঝে ৩০ ফাঁক)
 *   `.input-icon` ৪৪ চওড়া, বাঁ থেকে ৭০
 *   সাবমিট ৬৮০ × ১০০, radius ৫০, bg #BC43F4, fs ৪২ fw ৬০০
 */

export const ERR = "#ff6b6b";

const ICONS = {
  user: "form-icon-name",
  pass: "form-icon-password",
  captcha: "form-icon-verify",
  phone: "form-icon-phone",
  sms: "form-icon-sms",
  invite: "form-icon-invitation",
};

/**
 * একটা ফিল্ড = ইনপুট ৯০ + ফাঁক ১০ + এররের জায়গা ২০ = ১২০ উঁচু।
 *
 * ইনপুটটা `display: block` না দিলে সেটা inline-box হিসেবে বেসলাইনে বসে
 * আর প্যারেন্টের line-height এর কারণে নিচে নেমে যায় — তাতে ভিতরের
 * আইকনও জায়গা মতো পড়ে না।
 */
export const MobileField = ({ kind, required, error, trailing, trailingWidth = 0, ...input }) => (
  <div style={{ minHeight: m(120), marginBottom: m(10), position: "relative" }}>
    {required && (
      <span style={{ position: "absolute", left: m(-20), top: m(28), color: "#ff4d4f", fontSize: m(30) }}>*</span>
    )}
    <div style={{ position: "relative", height: m(90) }}>
      <span
        className="pointer-events-none absolute flex items-center justify-center"
        style={{ left: m(35), top: m(23), width: m(44), height: m(44), color: "var(--auth-line, #d6e2f4)" }}
      >
        <Icon name={ICONS[kind]} size={m(44)} />
      </span>
      <input
        {...input}
        style={{
          display: "block",
          width: "100%",
          height: m(90),
          background: "var(--auth-field, #010e22)",
          border: `1px solid ${error ? ERR : "var(--auth-line, #d6e2f4)"}`,
          borderRadius: m(24),
          color: "var(--auth-line, #d6e2f4)",
          fontSize: m(33),
          padding: `0 calc(${m(30)} + ${m(trailingWidth)}) 0 ${m(100)}`,
          outline: "none",
          opacity: input.readOnly ? 0.75 : 1,
        }}
      />
      {trailing}
    </div>
    {error && (
      <div style={{ color: ERR, fontSize: m(24), lineHeight: 1.3, paddingTop: m(6), paddingLeft: m(10) }}>{error}</div>
    )}
  </div>
);

export const MobilePasswordField = (props) => {
  const [show, setShow] = useState(false);
  return (
    <MobileField
      kind="pass"
      type={show ? "text" : "password"}
      trailingWidth={50}
      trailing={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          aria-label="show password"
          className="absolute flex cursor-pointer items-center"
          style={{ right: m(30), top: m(23), color: "var(--auth-line, #d6e2f4)" }}
        >
          <Icon name={show ? "show-eyes-default" : "hide-eyes-default"} size={m(44)} />
        </button>
      }
      {...props}
    />
  );
};

/** ঘরের ডানে ছোট বোতাম — "কোড পাঠান" / গোনা */
export const MobileSideButton = ({ onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="absolute"
    style={{
      right: m(15),
      top: m(15),
      height: m(60),
      minWidth: m(170),
      padding: `0 ${m(18)}`,
      borderRadius: m(30),
      background: disabled ? "#27416a" : "var(--auth-submit, var(--accent-bright))",
      color: disabled ? "#a8b4c8" : "#fff",
      fontSize: m(26),
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </button>
);

export const MobileSubmit = ({ busy, children, width = "100%", type = "submit", onClick }) => {
  const { t } = useLanguage();
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy}
      className="cursor-pointer"
      style={{
        width,
        height: m(100),
        borderRadius: m(50),
        background: "var(--auth-submit, var(--accent-bright))",
        color: "#fff",
        fontSize: m(42),
        fontWeight: 600,
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? t.auth.wait : children}
    </button>
  );
};

/** ফিরে যাওয়ার তীর + লোগো — তিন পেজেই একই */
export const MobileAuthShell = ({ onBack, children }) => {
  const { t } = useLanguage();
  // লোগো admin এর "Site Identity" থেকে
  const { identify } = useSiteSettings();
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", background: "var(--auth-field, #010e22)", position: "relative", paddingBottom: m(80) }}>
      <button
        type="button"
        onClick={onBack || (() => navigate(-1))}
        aria-label="back"
        className="absolute flex cursor-pointer items-center"
        style={{ left: m(30), top: m(40), width: m(60), height: m(60), color: "#fff" }}
      >
        <Icon name="icon-back" size={m(44)} />
      </button>

      <div className="flex items-start justify-center" style={{ paddingTop: m(120), height: m(308) }}>
        <img src={siteImage(identify.mobileLogo)} alt={t.brand} style={{ width: m(446), height: m(150), objectFit: "contain" }} />
      </div>

      <div style={{ width: m(680), marginInline: "auto" }}>{children}</div>
    </div>
  );
};

export const codeLabel = (f, t, again) =>
  f.countdown > 0 ? `${f.countdown}s` : again ? t.auth.resend : t.auth.sendCode;
