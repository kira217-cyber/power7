import React, { useState } from "react";
import { useIsDesktop } from "../../hook/useIsDesktop";
import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectUser } from "../../features/auth/authSelectors";
import { m } from "../../hook/useUnits";
import MemberShell from "./MemberShell";
import { useSelector } from "react-redux";
import { useProfile } from "../../features/profile/useProfile";
import { ProfileSheet } from "./ProfileForms";
import DeskAccount from "./account/DeskAccount";
import { notify } from "../../utils/notify";

/**
 * "আমার অ্যাকাউন্ট" — ডেস্কটপে মডালের ট্যাব, মোবাইলে `/member/account`।
 *
 * দুটোই একই ফিচার, শুধু লেআউট আলাদা (মূল সাইটেও তাই):
 *   ডেস্কটপ — তিন কলাম: প্রোফাইল কার্ড, নিরাপত্তা স্কোর, করণীয়ের তালিকা
 *   মোবাইল — উপরে ব্যবহারকারীর নাম, তারপর ইনপুটের সারি, নিচে জমা বোতাম
 */

/** মূল সাইটের ধূসর ইনপুটের সারি */
const Row = ({ icon, children, onClick }) => (
  <div
    className="relative flex items-center"
    onClick={onClick}
    style={{ height: m(100), marginBottom: m(22), borderRadius: m(12), background: "#f2f2f4", padding: `0 ${m(24)}`, gap: m(20), cursor: onClick ? "pointer" : "default" }}
  >
    <span style={{ color: "#b4b4bc", display: "grid", placeItems: "center" }}>
      <Icon name={icon} size={m(44)} />
    </span>
    {children}
  </div>
);

const inputStyle = (disabled) => ({
  flex: 1,
  minWidth: 0,
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: m(30),
  color: disabled ? "var(--member-muted, #999)" : "var(--member-title, #333)",
});


const Mobile = () => {
  const { t } = useLanguage();
  const user = useSelector(selectUser) || {};
  const page = t.memberPage.pages.account;
  const p = t.profileFlow;
  const profile = useProfile();
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    email: user.email || "",
    dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : "",
  });
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const submit = async () => {
    const body = {};
    if (!user.fullName && form.fullName) body.fullName = form.fullName;
    if (!user.dateOfBirth && form.dateOfBirth) body.dateOfBirth = form.dateOfBirth;
    if (form.email !== (user.email || "")) body.email = form.email;
    if (!Object.keys(body).length) return notify.info(p.saved);
    await profile.saveInfo(body);
    return undefined;
  };

  return (
    <MemberShell title={page.title}>
      <div style={{ padding: `${m(30)} ${m(30)} ${m(60)}` }}>
        <div style={{ fontSize: m(34), color: "var(--member-title, #222)", marginBottom: m(24) }}>
          {page.usernameLabel} <span style={{ marginInlineStart: m(10) }}>{user.username ?? "-"}</span>
        </div>

        {/* প্রত্যাহারকারীর নাম = পুরো নাম, একবারই */}
        <Row icon="form-icon-id">
          <input value={form.fullName} onChange={set("fullName")} disabled={Boolean(user.fullName)} placeholder={page.payee} maxLength={60} style={inputStyle(Boolean(user.fullName))} />
        </Row>
        <div style={{ color: "var(--member-accent, #e60012)", fontSize: m(28), fontWeight: 700, lineHeight: 1.45, marginBottom: m(26) }}>{page.payeeWarn}</div>

        <Row icon="form-icon-name">
          <input value={user.username || ""} disabled placeholder={page.nickname} style={inputStyle(true)} />
        </Row>
        <Row icon="form-icon-email">
          <input type="email" value={form.email} onChange={set("email")} placeholder={page.email} maxLength={80} style={inputStyle(false)} />
        </Row>
        {/* ফোন আলাদা শিটে — বদলাতে পাসওয়ার্ড/OTP লাগে */}
        <Row icon="form-icon-phone" onClick={() => setSheet("phone")}>
          <span style={{ ...inputStyle(!user.phone), display: "flex", alignItems: "center" }}>{user.phone ? `0${user.phone}` : page.phone}</span>
          <Icon name="common-arrow" size={m(30)} />
        </Row>
        <Row icon="discount-calender">
          <input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} disabled={Boolean(user.dateOfBirth)} style={inputStyle(Boolean(user.dateOfBirth))} />
        </Row>

        <div style={{ marginTop: m(16) }}>
          <div style={{ color: "#4a9df5", fontSize: m(32) }}>{page.privacyTitle}</div>
          <div style={{ color: "var(--member-muted, #888)", fontSize: m(24), marginTop: m(10), lineHeight: 1.5 }}>{page.privacyDesc}</div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={profile.busy}
          className="w-full cursor-pointer"
          style={{ marginTop: m(40), height: m(100), borderRadius: m(14), background: "var(--member-accent, #f5333f)", color: "#fff", fontSize: m(34), boxShadow: `0 0 ${m(24)} rgb(245 51 63 / 0.45)` }}
        >
          {page.submit}
        </button>
      </div>

      {sheet && <ProfileSheet which={sheet} profile={profile} onClose={() => setSheet(null)} />}
    </MemberShell>
  );
};

const AccountSection = () => {
  const isDesktop = useIsDesktop();

  // ডেস্কটপ: মূল সাইটের মতো তিন কার্ড + প্যানেলের ভিতরে ড্রয়ার (account/DeskAccount)
  return isDesktop ? <DeskAccount /> : <Mobile />;
};

export default AccountSection;
