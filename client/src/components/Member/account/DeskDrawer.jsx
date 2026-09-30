import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { useLanguage } from "../../../Context/LanguageProvider";
import { selectUser } from "../../../features/auth/authSelectors";
import { useWithdrawFlow, maskNumber } from "../../../features/withdraw/useWithdrawFlow";
import { notify } from "../../../utils/notify";
import { KycForm, PhoneForm } from "../ProfileForms";

/**
 * ডেস্কটপের "আমার অ্যাকাউন্ট" এর ড্রয়ার — মূল সাইটের `.setting-modal`।
 *
 * আলাদা মডাল নয়: সদস্য মডালের ডান প্যানেলের (১১১০ × ৬২০) ভিতরেই ডান
 * কিনারা থেকে পুরো উচ্চতায় খোলে; বাকি প্যানেল কালো ৫০% মাস্কে ঢাকে।
 * মূল সাইটের CSS থেকে:
 *   `.setting-item` padding `0 30px`, বাঁয়ে ছায়া `-18px 0 40px -18px rgba(0,0,0,.2)`
 *   শিরোনাম `.caption-text` — বাঁয়ে ৪px দাগ (সবুজ #23E63A / লাল #FD2F2F),
 *     margin `17 0 15`, line-height ১৫
 *   ফুটার ৪৭ উঁচু, উপরে #EFEFEF দাগ, padding-left ৩০
 *   বোতাম ৯৮ × ৩৪, radius ২০, #FD2F2F, ছায়া `0 0 10px #FFD3D3`
 *   ইনপুট ৩৪ উঁচু, radius ৫, bg #F5F5F5, দাগ #E5E5E5, fs ১২, ভিতরে হালকা ছায়া
 *   বাঁ-উপরে বাইরের দিকে সাদা খাঁজ (৩০ চওড়া, নিচটা তেরছা) আর লাল ১৮px ক্রস
 * প্রস্থ: ব্যক্তিগত তথ্য ৫২৫, পাসওয়ার্ড ৪২৩, ই-ওয়ালেট ৭৮০ (মাপা)।
 */

const RED = "var(--member-accent, #fd2f2f)";
const IMG = "/assets/member-desk";

export const Drawer = ({ width, onClose, children }) => (
  <div className="absolute inset-0" style={{ zIndex: 11 }}>
    <div className="absolute inset-0 cursor-pointer" style={{ background: "rgb(0 0 0 / 0.5)" }} onClick={onClose} />
    <div
      className="absolute top-0 right-0 flex h-full flex-col"
      style={{ width, background: "var(--member-surface, #fff)", boxShadow: "-18px 0 40px -18px rgba(0,0,0,.2)", animation: "tb-drawer-in .25s ease-out" }}
    >
      {/* বাঁ-উপরের খাঁজ + ক্রস */}
      <div
        className="absolute"
        style={{ left: -30, top: 0, width: 31, height: 40, background: "var(--member-surface, #fff)", clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 75%)" }}
      />
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute grid cursor-pointer place-items-center"
        style={{ left: -24, top: 7, width: 18, height: 18, borderRadius: "50%", background: "var(--member-accent, #ff1f2d)", color: "#fff", fontSize: 13, lineHeight: 1 }}
      >
        ×
      </button>
      {children}
    </div>
  </div>
);

export const Caption = ({ children, color = "#23e63a", style }) => (
  <div style={{ borderLeft: `4px solid ${color}`, lineHeight: "15px", paddingLeft: 9, margin: "17px 0 15px", fontSize: 14, color: "var(--member-title, #333)", ...style }}>{children}</div>
);

/** লেবেল বাঁয়ে, ঘর ডানে — মূল সাইটের `.form-group` */
export const Row = ({ label, children, labelWidth = 125, top = false }) => (
  <div className="flex" style={{ marginBottom: 16, alignItems: top ? "flex-start" : "center" }}>
    <span className="shrink-0" style={{ width: labelWidth, minHeight: 34, display: "flex", alignItems: "center", fontSize: 14, color: "var(--member-title, #333)", paddingRight: 6, lineHeight: 1.25 }}>
      {label}:
    </span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export const inputStyle = (disabled) => ({
  display: "block",
  width: "100%",
  height: 34,
  borderRadius: 5,
  border: "1px solid var(--member-line, #e5e5e5)",
  background: "#f5f5f5",
  color: disabled ? "var(--member-muted, #999)" : "#646464",
  outline: "none",
  padding: "0 10px",
  fontSize: 12,
  boxShadow: "0 1px 5px rgba(0,0,0,.08) inset",
});

export const Input = (props) => <input {...props} style={{ ...inputStyle(props.disabled), ...(props.style || {}) }} />;

export const Warn = ({ children }) => (
  <div style={{ color: "#ea0f0f", fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginTop: 5, whiteSpace: "normal" }}>{children}</div>
);

/** নিচের ফুটার আর লাল "জমা দিন" */
export const Footer = ({ onClick, busy, disabled, children }) => (
  <div className="absolute bottom-0 left-0 flex w-full items-center" style={{ height: 47, borderTop: "1px solid #efefef", paddingLeft: 30, background: "var(--member-surface, #fff)" }}>
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="cursor-pointer"
      style={{
        minWidth: 98,
        height: 34,
        padding: "0 10px",
        borderRadius: 20,
        background: busy || disabled ? "#d5d5d5" : RED,
        boxShadow: `0 0 10px ${busy || disabled ? "#d5d5d5" : "#ffd3d3"}`,
        color: "#fff",
        fontSize: 14,
        opacity: busy ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  </div>
);

/** ড্রয়ারের দেহ — শিরোনাম, স্ক্রল করা ঘর, ফুটারের জায়গা */
const Body = ({ title, children, padding = "0 30px" }) => (
  <div className="flex h-full flex-col" style={{ padding }}>
    <Caption>{title}</Caption>
    <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: 60 }}>
      {children}
    </div>
  </div>
);

const ymd = (value) => (value ? String(value).slice(0, 10) : "");

/* ─────────────── ব্যক্তিগত তথ্য ─────────────── */

export const InfoDrawer = ({ profile, onClose, onPhone }) => {
  const { t } = useLanguage();
  const d = t.deskAcc;
  const user = useSelector(selectUser) || {};
  const [form, setForm] = useState({ fullName: user.fullName || "", dateOfBirth: ymd(user.dateOfBirth), email: user.email || "" });
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const save = async () => {
    const body = {};
    if (!user.fullName && form.fullName) body.fullName = form.fullName;
    if (!user.dateOfBirth && form.dateOfBirth) body.dateOfBirth = form.dateOfBirth;
    if (form.email !== (user.email || "")) body.email = form.email;
    if (!Object.keys(body).length) return onClose();
    if (await profile.saveInfo(body)) onClose();
    return undefined;
  };

  return (
    <Drawer width={525} onClose={onClose}>
      <Body title={t.member.actions.profile.title}>
        <div style={{ padding: "22px 0 26px" }}>
          <img src={`${IMG}/avatar-0.png`} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", background: "#b1b8b6" }} />
        </div>
        <Row label={d.payee} top>
          <Input value={form.fullName} onChange={set("fullName")} disabled={Boolean(user.fullName)} maxLength={100} placeholder={d.ph100} />
          <Warn>{t.memberPage.pages.account.payeeWarn}</Warn>
        </Row>
        <Row label={d.nickname}>
          <Input value={user.username || ""} disabled placeholder={d.ph50} />
        </Row>
        <Row label={d.birthday}>
          <Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} disabled={Boolean(user.dateOfBirth)} />
        </Row>
        <Row label={d.email}>
          <Input type="email" value={form.email} onChange={set("email")} maxLength={255} placeholder={d.ph255} />
        </Row>
        <Row label={d.phone}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Input value={user.phone ? `0${user.phone}` : ""} disabled placeholder={d.ph10} />
            <button type="button" onClick={onPhone} className="shrink-0 cursor-pointer" style={{ height: 34, padding: "0 12px", borderRadius: 20, border: "1px solid #ddd", color: "#747474", fontSize: 12, background: "var(--member-surface, #fff)" }}>
              {user.phone ? d.change : d.bind}
            </button>
          </div>
        </Row>
      </Body>
      <Footer onClick={save} busy={profile.busy}>
        {d.submit}
      </Footer>
    </Drawer>
  );
};

/* ─────────────── লগইন পাসওয়ার্ড ─────────────── */

const Secret = ({ value, onChange, placeholder, maxLength }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <Input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} autoComplete="new-password" style={{ paddingRight: 36 }} />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute cursor-pointer" style={{ right: 10, top: 8 }} aria-label="show">
        <img src={`${IMG}/${show ? "eyes-icon-open" : "eyes-icon-close"}.svg`} alt="" style={{ width: 18, height: 18 }} />
      </button>
    </span>
  );
};

export const PasswordDrawer = ({ profile, onClose }) => {
  const { t } = useLanguage();
  const d = t.deskAcc;
  const p = t.profileFlow;
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const save = async () => {
    if (!form.currentPassword || !form.newPassword) return notify.warning(p.fillAll);
    if (form.newPassword.length < 6 || form.newPassword.length > 20) return notify.warning(p.err.passwordTooShort);
    if (form.newPassword !== form.confirm) return notify.warning(t.authErr.passwordMismatch);
    if (await profile.changePassword(form)) onClose();
    return undefined;
  };

  return (
    <Drawer width={423} onClose={onClose}>
      <Body title={d.loginPw}>
        <Row label={d.oldPw} labelWidth={135}>
          <Secret value={form.currentPassword} onChange={set("currentPassword")} placeholder={d.phOldPw} maxLength={20} />
        </Row>
        <Row label={d.newPw} labelWidth={135}>
          <Secret value={form.newPassword} onChange={set("newPassword")} placeholder={d.phNewPw} maxLength={20} />
        </Row>
        <Row label={d.confirmPw} labelWidth={135}>
          <Secret value={form.confirm} onChange={set("confirm")} placeholder={d.phConfirm} maxLength={20} />
        </Row>
        <div style={{ fontSize: 12, color: "var(--member-muted, #999)", lineHeight: 1.5 }}>{p.pwHint}</div>
      </Body>
      <Footer onClick={save} busy={profile.busy}>
        {d.submit}
      </Footer>
    </Drawer>
  );
};

/* ─────────────── লেনদেন পাসওয়ার্ড ─────────────── */

export const TxDrawer = ({ profile, onClose }) => {
  const { t } = useLanguage();
  const d = t.deskAcc;
  const p = t.profileFlow;
  const user = useSelector(selectUser) || {};
  const hasTx = Boolean(user.hasTxPassword);
  const [form, setForm] = useState({ loginPassword: "", oldTx: "", newTx: "", confirm: "" });
  const set = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const save = async () => {
    if ((hasTx ? !form.oldTx : !form.loginPassword) || !form.newTx) return notify.warning(p.fillAll);
    if (!/^[A-Za-z0-9]{6,12}$/.test(form.newTx)) return notify.warning(t.withdrawFlow.txRule);
    if (form.newTx !== form.confirm) return notify.warning(t.authErr.passwordMismatch);
    if (await profile.saveTxPassword({ hasTx, ...form })) onClose();
    return undefined;
  };

  return (
    <Drawer width={423} onClose={onClose}>
      <Body title={t.member.actions.payPassword.title}>
        {hasTx ? (
          <Row label={d.oldTx} labelWidth={135}>
            <Secret value={form.oldTx} onChange={set("oldTx")} placeholder={d.phOldPw} maxLength={12} />
          </Row>
        ) : (
          <Row label={d.loginPw} labelWidth={135}>
            <Secret value={form.loginPassword} onChange={set("loginPassword")} placeholder={d.phLoginPw} maxLength={20} />
          </Row>
        )}
        <Row label={d.newPw} labelWidth={135}>
          <Secret value={form.newTx} onChange={set("newTx")} placeholder={d.phNewPw} maxLength={12} />
        </Row>
        <Row label={d.confirmPw} labelWidth={135}>
          <Secret value={form.confirm} onChange={set("confirm")} placeholder={d.phConfirm} maxLength={12} />
        </Row>
        <div style={{ fontSize: 12, color: "var(--member-muted, #999)", lineHeight: 1.5 }}>{hasTx ? p.txForgot : t.withdrawFlow.txHint}</div>
      </Body>
      <Footer onClick={save} busy={profile.busy}>
        {d.submit}
      </Footer>
    </Drawer>
  );
};

/* ─────────────── ফোন আর পরিচয় যাচাই (মূল সাইটে নেই — আমাদের বাড়তি) ─────────────── */

export const FormDrawer = ({ title, width = 470, children, onClose }) => (
  <Drawer width={width} onClose={onClose}>
    <div className="flex h-full flex-col" style={{ padding: "0 30px" }}>
      <Caption>{title}</Caption>
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: 24 }}>
        {children}
      </div>
    </div>
  </Drawer>
);

export const PhoneDrawer = ({ profile, onClose }) => {
  const { t } = useLanguage();
  return (
    <FormDrawer title={t.profileFlow.phoneTitle} onClose={onClose}>
      <PhoneForm profile={profile} onDone={onClose} />
    </FormDrawer>
  );
};

export const KycDrawer = ({ profile, onClose }) => {
  const { t } = useLanguage();
  return (
    <FormDrawer title={t.profileFlow.kycTitle} width={525} onClose={onClose}>
      <KycForm profile={profile} onDone={onClose} />
    </FormDrawer>
  );
};

/* ─────────────── ই-ওয়ালেট ─────────────── */

/**
 * মূল সাইটের `.bank-card-model.tab-add` (৭৮০) — বাঁয়ে যোগ করার ফর্ম
 * (`.addbank-form`, ন্যূনতম ৩৮৬, ডানে দাগ ও ছায়া), ডানে নিবন্ধিত
 * ওয়ালেটের তালিকা (`.banklist-warp` ৩৯৩)। খালি হলে ধূসর কার্ডের ছবি
 * আর "খালি ই-ওয়ালেট"। মূল সাইটের মতোই লেনদেন পাসওয়ার্ড লাগে।
 */
export const WalletDrawer = ({ onClose, onChanged }) => {
  const flow = useWithdrawFlow();
  return (
    <Drawer width={780} onClose={onClose}>
      <WalletPanel flow={flow} onChanged={onChanged} />
    </Drawer>
  );
};

/**
 * ওয়ালেট যোগ + নিবন্ধিত তালিকা — ড্রয়ারে আর উত্তোলনের "অ্যাকাউন্ট
 * ব্যবস্থাপনা" ট্যাবে একই জিনিস (মূল সাইটেও একই `.bank-card-model`)।
 * `flow` = `useWithdrawFlow()` — উত্তোলনের পাতার সাথে একই অবস্থা ভাগ হয়।
 */
export const WalletPanel = ({ flow, onChanged }) => {
  const { t } = useLanguage();
  const d = t.deskAcc;
  const [methodId, setMethodId] = useState("");
  const [walletNumber, setWalletNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [tx, setTx] = useState("");

  // মূল সাইটের মতো প্রথম ধরনটা আগে থেকেই বাছা
  const firstMethod = flow.methods[0]?.methodId || "";
  useEffect(() => {
    if (!methodId && firstMethod) setMethodId(firstMethod);
  }, [methodId, firstMethod]);

  const chosen = flow.methods.find((m) => m.methodId === methodId) || null;
  const full = flow.wallets.length >= flow.cap;

  const save = async () => {
    if (full) return notify.warning(d.walletFull.replace("{n}", flow.cap));
    const ok = await flow.addWallet({ methodId, walletNumber, accountName, tx });
    if (ok) {
      setWalletNumber("");
      setTx("");
      onChanged?.();
    }
    return undefined;
  };

  return (
      <div className="flex h-full">
        {/* বাঁ — যোগ করা */}
        <div className="relative flex h-full flex-col" style={{ minWidth: 386, width: 386, paddingTop: 17, borderRight: "1px solid #efefef", boxShadow: "-18px 0 40px -18px rgba(0,0,0,.2)" }}>
          <Caption style={{ margin: "0 30px 15px" }}>{d.bindWallet}</Caption>
          <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto" style={{ padding: "0 30px 60px" }}>
            <Row label={d.walletLabel} labelWidth={100}>
              <select value="ewallet" disabled style={{ ...inputStyle(false), cursor: "default" }}>
                <option value="ewallet">E wallet</option>
              </select>
            </Row>
            <Row label={d.cardName} labelWidth={100} top>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} maxLength={60} placeholder={d.phCardName} />
              <Warn>{t.memberPage.pages.account.payeeWarn}</Warn>
            </Row>
            <div style={{ border: "1px solid var(--member-line, #e5e5e5)", borderRadius: 6, padding: "14px 10px 0", marginBottom: 16 }}>
              <Row label={d.walletType} labelWidth={90} top>
                <div className="grid" style={{ gap: 10 }}>
                  {flow.methods.map((m) => {
                    const on = m.methodId === methodId;
                    return (
                      <button
                        key={m.methodId}
                        type="button"
                        onClick={() => setMethodId(m.methodId)}
                        className="cursor-pointer"
                        style={{ height: 34, borderRadius: 5, fontSize: 12, border: `1px solid ${on ? "#ff7b7b" : "var(--member-line, #e5e5e5)"}`, background: on ? "#fff5f5" : "var(--member-surface, #fff)", color: on ? "#ea4c4c" : "var(--member-text, #666)" }}
                      >
                        {flow.tv(m.methodName) || m.methodId}
                      </button>
                    );
                  })}
                </div>
              </Row>
              <Row label={d.walletAddr} labelWidth={90}>
                <Input
                  value={walletNumber}
                  inputMode="numeric"
                  onChange={(e) => setWalletNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder={d.phAddr.replace("{m}", chosen ? flow.tv(chosen.methodName) : "")}
                />
              </Row>
            </div>
            <Row label={d.txPw} labelWidth={100}>
              <Secret value={tx} onChange={(e) => setTx(e.target.value)} placeholder={d.phTx} maxLength={12} />
            </Row>
          </div>
          <Footer onClick={save} busy={flow.busy} disabled={!methodId || !walletNumber}>
            {d.submit}
          </Footer>
        </div>

        {/* ডান — নিবন্ধিত */}
        <div className="relative h-full" style={{ width: 393, paddingTop: 17 }}>
          <Caption color={RED} style={{ margin: "0 20px 15px" }}>
            {d.registered} <span style={{ marginLeft: 10, color: "var(--member-text, #666)" }}>({flow.wallets.length}/{flow.cap})</span>
          </Caption>
          <div className="hide-scrollbar absolute overflow-y-auto" style={{ top: 57, bottom: 8, left: 0, width: 379, padding: "0 10px 0 20px" }}>
            {flow.wallets.length === 0 ? (
              <div style={{ width: 212, margin: "150px auto 0", textAlign: "center" }}>
                <div style={{ width: 212, height: 133, background: `url(${IMG}/no-bank-small.png) no-repeat`, backgroundSize: "100% 100%" }} />
                <p style={{ color: "#a9a9a9", fontSize: 14, position: "relative", top: -12 }}>{d.emptyWallet}</p>
              </div>
            ) : (
              flow.wallets.map((w) => {
                const m = flow.methods.find((x) => x.methodId === w.methodId);
                return (
                  <div key={w._id} className="flex items-center" style={{ maxWidth: 356, minHeight: 86, padding: 10, marginBottom: 10, borderRadius: 8, background: "linear-gradient(135deg,#fff6f6,var(--member-surface, #fff))", boxShadow: "0 2px 10px rgba(0,0,0,.08)", gap: 12 }}>
                    <div className="min-w-0 flex-1">
                      <div style={{ color: "var(--member-title, #333)", fontSize: 14, fontWeight: 500 }}>{flow.tv(m?.methodName) || w.methodId}</div>
                      <div style={{ color: "var(--member-text, #666)", fontSize: 14, marginTop: 6 }}>{maskNumber(w.walletNumber)}</div>
                      {w.accountName ? <div style={{ color: "var(--member-muted, #999)", fontSize: 12, marginTop: 4 }}>{w.accountName}</div> : null}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await flow.removeWallet(w);
                        onChanged?.();
                      }}
                      className="shrink-0 cursor-pointer"
                      style={{ height: 24, padding: "0 12px", borderRadius: 15, background: "#585468", color: "#fff", fontSize: 12 }}
                    >
                      {d.remove}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
  );
};
