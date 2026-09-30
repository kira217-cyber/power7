import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import Icon from "../Icon/Icon";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import api, { API_URL } from "../../api/axios";
import { selectUser } from "../../features/auth/authSelectors";
import { notify } from "../../utils/notify";

/**
 * "আমার অ্যাকাউন্ট" / "সুরক্ষা কেন্দ্র" থেকে খোলা এডিটের শিট — ব্যক্তিগত
 * তথ্য, ফোন, লগইন পাসওয়ার্ড, লেনদেন পাসওয়ার্ড, পরিচয় যাচাই (KYC)।
 *
 * ডেস্কটপে সদস্য মডালের উপরে ছোট সাদা কার্ড, মোবাইলে পুরো পর্দা (উপরে
 * সদস্য পাতার মতো গাঢ় হেডার আর ফিরে যাওয়ার তীর)। মাপ ডেস্কটপে px,
 * মোবাইলে ৭৫০-ডিজাইনের `m()`।
 */

const RED = "var(--member-accent, #f5333f)";

const useSize = () => {
  const isDesktop = useIsDesktop();
  return { isDesktop, u: (desk, mob) => (isDesktop ? (typeof desk === "number" ? `${desk}px` : desk) : m(mob)) };
};

/* ─────────────── শিট ─────────────── */

export const Sheet = ({ title, onClose, children }) => {
  const { isDesktop } = useSize();

  if (isDesktop) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 80, background: "rgb(0 0 0 / 0.45)" }} onClick={onClose}>
        <div
          className="hide-scrollbar"
          onClick={(e) => e.stopPropagation()}
          style={{ width: 480, maxHeight: "86vh", overflowY: "auto", background: "var(--member-surface, #fff)", borderRadius: 12, padding: "22px 26px 26px" }}
        >
          <div className="flex items-center" style={{ marginBottom: 14 }}>
            <span className="flex-1" style={{ fontSize: 18, fontWeight: 700, color: "var(--member-title, #222)" }}>
              {title}
            </span>
            <button type="button" onClick={onClose} aria-label="close" className="cursor-pointer" style={{ color: "var(--member-muted, #999)" }}>
              <Icon name="popup-close" size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 80, background: "var(--member-page-bg, #f5f5f9)" }}>
      <div className="relative flex shrink-0 items-center justify-center" style={{ height: m(100), background: "var(--member-header-bg, #180836)", color: "#fff" }}>
        <button type="button" onClick={onClose} aria-label="back" className="absolute cursor-pointer" style={{ left: m(30), color: "#fff" }}>
          <Icon name="icon-back" size={m(44)} />
        </button>
        <span style={{ fontSize: m(34) }}>{title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: `${m(30)} ${m(30)} ${m(60)}`, background: "var(--member-surface, #fff)" }}>
        {children}
      </div>
    </div>
  );
};

/* ─────────────── ঘর ও বোতাম ─────────────── */

const Field = ({ label, hint, trailing, ...input }) => {
  const { u } = useSize();
  return (
    <label className="block" style={{ marginBottom: u(14, 26) }}>
      <span className="block" style={{ fontSize: u(13, 26), color: "var(--member-text, #666)", marginBottom: u(6, 10) }}>
        {label}
      </span>
      <span className="relative block">
        <input
          {...input}
          style={{
            display: "block",
            width: "100%",
            height: u(42, 90),
            borderRadius: u(6, 12),
            border: `${u(1, 2)} solid #e4e4e8`,
            background: input.disabled ? "#f4f4f6" : "var(--member-surface, #fff)",
            padding: `0 ${u(12, 24)}`,
            paddingRight: trailing ? u(110, 200) : u(12, 24),
            fontSize: u(14, 28),
            color: input.disabled ? "var(--member-muted, #999)" : "var(--member-title, #333)",
            outline: "none",
          }}
        />
        {trailing}
      </span>
      {hint && (
        <span className="block" style={{ fontSize: u(12, 22), color: "#aaa", marginTop: u(4, 8) }}>
          {hint}
        </span>
      )}
    </label>
  );
};

const SideButton = ({ children, onClick, disabled }) => {
  const { u } = useSize();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="absolute cursor-pointer"
      style={{
        right: u(6, 10),
        top: u(6, 12),
        height: u(30, 66),
        padding: `0 ${u(12, 20)}`,
        borderRadius: u(4, 8),
        background: disabled ? "#ddd" : RED,
        color: "#fff",
        fontSize: u(12, 24),
      }}
    >
      {children}
    </button>
  );
};

const Submit = ({ children, busy, onClick }) => {
  const { u } = useSize();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full cursor-pointer"
      style={{ marginTop: u(8, 20), height: u(44, 96), borderRadius: u(6, 14), background: RED, color: "#fff", fontSize: u(16, 32), opacity: busy ? 0.7 : 1 }}
    >
      {children}
    </button>
  );
};

const Note = ({ children, color = "#888" }) => {
  const { u } = useSize();
  return <div style={{ fontSize: u(13, 25), color, lineHeight: 1.5, marginBottom: u(14, 24) }}>{children}</div>;
};

/** "YYYY-MM-DD" */
const ymd = (value) => (value ? String(value).slice(0, 10) : "");

/* ─────────────── ব্যক্তিগত তথ্য ─────────────── */

export const InfoForm = ({ profile, onDone }) => {
  const { t } = useLanguage();
  const p = t.profileFlow;
  const user = useSelector(selectUser) || {};
  const [form, setForm] = useState({ fullName: user.fullName || "", dateOfBirth: ymd(user.dateOfBirth), email: user.email || "" });
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const save = async () => {
    const body = {};
    if (!user.fullName && form.fullName) body.fullName = form.fullName;
    if (!user.dateOfBirth && form.dateOfBirth) body.dateOfBirth = form.dateOfBirth;
    if (form.email !== (user.email || "")) body.email = form.email;
    if (!Object.keys(body).length) return onDone();
    if (await profile.saveInfo(body)) onDone();
    return undefined;
  };

  return (
    <>
      <Field label={p.nickname} value={user.username || ""} disabled />
      <Field label={p.fullName} value={form.fullName} onChange={set("fullName")} disabled={Boolean(user.fullName)} hint={user.fullName ? p.lockedHint : ""} maxLength={60} />
      <Field label={p.birthday} type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} disabled={Boolean(user.dateOfBirth)} hint={user.dateOfBirth ? p.lockedHint : ""} />
      <Field label={p.email} type="email" value={form.email} onChange={set("email")} maxLength={80} />
      <Submit busy={profile.busy} onClick={save}>
        {p.save}
      </Submit>
    </>
  );
};

/* ─────────────── ফোন ─────────────── */

export const PhoneForm = ({ profile, onDone }) => {
  const { t } = useLanguage();
  const p = t.profileFlow;
  const user = useSelector(selectUser) || {};
  const [phone, setPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needOtp, setNeedOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const sendCode = async () => {
    const r = await profile.sendPhoneCode({ phone, loginPassword });
    if (r.ok) {
      setNeedOtp(r.required);
      if (r.required) setCountdown(60);
      else if (await profile.savePhone({ phone, loginPassword })) onDone();
    }
  };

  const save = async () => {
    if (!needOtp) return sendCode();
    if (await profile.savePhone({ phone, loginPassword, otp })) onDone();
    return undefined;
  };

  const current = user.phone ? `0${user.phone}` : "";

  return (
    <>
      <Note>{p.phoneHint}</Note>
      {current && <Field label={`${p.phone} (${t.profileFlow.done})`} value={current} disabled />}
      <Field
        label={p.phone}
        value={phone}
        inputMode="numeric"
        placeholder="01XXXXXXXXX"
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
        trailing={
          <SideButton onClick={sendCode} disabled={countdown > 0 || profile.busy}>
            {countdown > 0 ? `${countdown}s` : p.sendCode}
          </SideButton>
        }
      />
      {user.phone && <Field label={p.loginPassword} type="password" autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />}
      {needOtp && <Field label={p.otp} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />}
      <Submit busy={profile.busy} onClick={save}>
        {p.save}
      </Submit>
    </>
  );
};

/* ─────────────── লগইন পাসওয়ার্ড ─────────────── */

export const PasswordForm = ({ profile, onDone }) => {
  const { t } = useLanguage();
  const p = t.profileFlow;
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const save = async () => {
    if (!form.currentPassword || !form.newPassword) return notify.warning(p.fillAll);
    if (form.newPassword.length < 6 || form.newPassword.length > 20) return notify.warning(p.err.passwordTooShort);
    if (form.newPassword !== form.confirm) return notify.warning(t.authErr.passwordMismatch);
    if (await profile.changePassword(form)) onDone();
    return undefined;
  };

  return (
    <>
      <Note>{p.pwHint}</Note>
      <Field label={p.currentPassword} type="password" autoComplete="current-password" value={form.currentPassword} onChange={set("currentPassword")} maxLength={20} />
      <Field label={p.newPassword} type="password" autoComplete="new-password" value={form.newPassword} onChange={set("newPassword")} maxLength={20} />
      <Field label={p.confirmPassword} type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} maxLength={20} />
      <Submit busy={profile.busy} onClick={save}>
        {p.save}
      </Submit>
    </>
  );
};

/* ─────────────── লেনদেন পাসওয়ার্ড ─────────────── */

export const TxForm = ({ profile, onDone }) => {
  const { t } = useLanguage();
  const p = t.profileFlow;
  const user = useSelector(selectUser) || {};
  const hasTx = Boolean(user.hasTxPassword);
  const [form, setForm] = useState({ loginPassword: "", oldTx: "", newTx: "", confirm: "" });
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const save = async () => {
    if ((hasTx ? !form.oldTx : !form.loginPassword) || !form.newTx) return notify.warning(p.fillAll);
    if (!/^[A-Za-z0-9]{6,12}$/.test(form.newTx)) return notify.warning(t.withdrawFlow.txRule);
    if (form.newTx !== form.confirm) return notify.warning(t.authErr.passwordMismatch);
    if (await profile.saveTxPassword({ hasTx, ...form })) onDone();
    return undefined;
  };

  return (
    <>
      <Note>{hasTx ? p.txForgot : t.withdrawFlow.txHint}</Note>
      {hasTx ? (
        <Field label={p.oldTx} type="password" autoComplete="off" value={form.oldTx} onChange={set("oldTx")} maxLength={12} />
      ) : (
        <Field label={p.loginPassword} type="password" autoComplete="current-password" value={form.loginPassword} onChange={set("loginPassword")} maxLength={20} />
      )}
      <Field label={p.newTx} type="password" autoComplete="new-password" value={form.newTx} onChange={set("newTx")} maxLength={12} />
      <Field label={p.confirmTx} type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} maxLength={12} />
      <Submit busy={profile.busy} onClick={save}>
        {p.save}
      </Submit>
    </>
  );
};

/* ─────────────── পরিচয় যাচাই (KYC) ─────────────── */

const ImagePick = ({ label, file, onPick, existing }) => {
  const { u } = useSize();
  const { t } = useLanguage();
  const preview = file ? URL.createObjectURL(file) : existing ? `${API_URL}${existing}` : "";
  return (
    <label className="flex cursor-pointer items-center" style={{ gap: u(12, 20), marginBottom: u(12, 22), padding: u(10, 18), border: `${u(1, 2)} dashed #ddd`, borderRadius: u(8, 14) }}>
      <span style={{ width: u(64, 120), height: u(46, 86), borderRadius: u(6, 10), background: "#f4f4f6", overflow: "hidden", flexShrink: 0 }}>
        {preview && <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </span>
      <span className="flex-1" style={{ fontSize: u(14, 26), color: "var(--member-title, #333)" }}>
        {label}
        <span className="block" style={{ fontSize: u(12, 22), color: RED, marginTop: u(2, 4) }}>
          {t.profileFlow.choose}
        </span>
      </span>
      <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onPick(e.target.files?.[0] || null)} />
    </label>
  );
};

export const KycForm = ({ profile, onDone }) => {
  const { t } = useLanguage();
  const p = t.profileFlow;
  const { u } = useSize();
  const user = useSelector(selectUser) || {};
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ fullName: user.fullName || "", documentType: "nid", documentNumber: "", dateOfBirth: ymd(user.dateOfBirth) });
  const [files, setFiles] = useState({ frontImage: null, backImage: null, selfieImage: null });
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    let alive = true;
    profile.loadKyc().then((data) => alive && setInfo(data));
    return () => {
      alive = false;
    };
    // শুধু একবার
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const row = info?.verification;
  const status = row?.status || "none";
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const sendCode = async () => {
    try {
      await api.post("/api/user/otp/send", { flow: "profileVerify", userId: user.userId, site: "client" });
      setCodeSent(true);
      notify.success(p.codeSent);
    } catch (error) {
      notify.error(p.err?.[error?.response?.data?.code] || error?.response?.data?.message || t.authErr.generic);
    }
  };

  const submit = async () => {
    if (!form.fullName || !form.documentNumber) return notify.warning(p.fillAll);
    if (!row && (!files.frontImage || !files.selfieImage)) return notify.warning(p.needImages);
    if (info?.otpRequired) {
      if (!otp) return notify.warning(p.err.otpNotVerified);
      try {
        await api.post("/api/user/otp/verify", { flow: "profileVerify", userId: user.userId, otp, site: "client" });
      } catch (error) {
        return notify.error(p.err?.[error?.response?.data?.code] || t.authErr.generic);
      }
    }
    if (await profile.submitKyc({ ...form, ...files })) onDone();
    return undefined;
  };

  if (!info) return <Note>{t.auth.wait}</Note>;

  const badgeColor = status === "approved" ? "var(--member-success, #16a34a)" : status === "rejected" ? RED : status === "pending" ? "#f59e0b" : "#999";

  return (
    <>
      <div className="flex items-center" style={{ gap: u(10, 16), marginBottom: u(12, 22) }}>
        <span style={{ fontSize: u(13, 26), color: "var(--member-text, #666)" }}>{p.kycTitle}:</span>
        <span style={{ fontSize: u(13, 24), color: badgeColor, border: `1px solid ${badgeColor}`, borderRadius: 99, padding: `${u(2, 4)} ${u(10, 16)}` }}>{p.kycStatus[status]}</span>
      </div>

      {status === "approved" && <Note color="#16a34a">{p.kycApprovedHint}</Note>}
      {status === "pending" && <Note color="#f59e0b">{p.kycPendingHint}</Note>}
      {status === "rejected" && <Note color={RED}>{p.kycRejectedHint.replace("{note}", row?.reviewNote || "—")}</Note>}

      {(status === "none" || status === "rejected") && (
        <>
          <Note>{p.kycPrivacy}</Note>
          <Field label={p.fullName} value={form.fullName} onChange={set("fullName")} maxLength={80} />
          <label className="block" style={{ marginBottom: u(14, 26) }}>
            <span className="block" style={{ fontSize: u(13, 26), color: "var(--member-text, #666)", marginBottom: u(6, 10) }}>
              {p.docType}
            </span>
            <select
              value={form.documentType}
              onChange={set("documentType")}
              style={{ width: "100%", height: u(42, 90), borderRadius: u(6, 12), border: `${u(1, 2)} solid #e4e4e8`, padding: `0 ${u(10, 20)}`, fontSize: u(14, 28), background: "var(--member-surface, #fff)", color: "var(--member-title, #333)" }}
            >
              {Object.entries(p.docTypes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Field label={p.docNumber} value={form.documentNumber} onChange={set("documentNumber")} maxLength={40} />
          <Field label={p.birthday} type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          <ImagePick label={p.front} file={files.frontImage} existing={row?.frontImage} onPick={(f) => setFiles((v) => ({ ...v, frontImage: f }))} />
          <ImagePick label={p.back} file={files.backImage} existing={row?.backImage} onPick={(f) => setFiles((v) => ({ ...v, backImage: f }))} />
          <ImagePick label={p.selfie} file={files.selfieImage} existing={row?.selfieImage} onPick={(f) => setFiles((v) => ({ ...v, selfieImage: f }))} />
          {info.otpRequired && (
            <Field
              label={p.otp}
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              trailing={
                <SideButton onClick={sendCode} disabled={codeSent}>
                  {p.sendCode}
                </SideButton>
              }
            />
          )}
          <Submit busy={profile.busy} onClick={submit}>
            {p.submit}
          </Submit>
        </>
      )}
    </>
  );
};

/** কোন শিট — key → শিরোনাম আর ফর্ম */
export const ProfileSheet = ({ which, profile, onClose }) => {
  const { t } = useLanguage();
  const p = t.profileFlow;
  const map = {
    profile: [p.infoTitle, InfoForm],
    phone: [p.phoneTitle, PhoneForm],
    loginPassword: [p.pwTitle, PasswordForm],
    payPassword: [p.txTitle, TxForm],
    verification: [p.kycTitle, KycForm],
  };
  const entry = map[which];
  if (!entry) return null;
  const [title, Form] = entry;
  return (
    <Sheet title={title} onClose={onClose}>
      <Form profile={profile} onDone={onClose} />
    </Sheet>
  );
};
