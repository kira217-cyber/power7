import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import DeskWithdraw from "./account/DeskWithdraw";
import { Trash2 } from "lucide-react";

import Icon from "../Icon/Icon";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import MemberShell from "./MemberShell";
import { assetUrl } from "../../features/deposit/useDepositFlow";
import { maskNumber, useWithdrawFlow } from "../../features/withdraw/useWithdrawFlow";
import PaymentModeGate from "./PaymentModeGate";
import { VerifyNowButton } from "./KycGate";

/**
 * উত্তোলন — মূল সাইটের নকশায় (`/m/withdraw`, ডেস্কটপে মডালের "উত্তোলন"),
 * BetChokkor এর কাজে, আর মূল সাইটের লেনদেন পাসওয়ার্ড সহ।
 *
 * মাপ মূল সাইট থেকে (মোবাইল ৭৫০-ডিজাইনে, `MoneySection.jsx` এর মন্তব্যে):
 *   উপরে "E wallet" ট্যাব ৮৭ উঁচু, নিচে লাল রেখা
 *   `আবদ্ধ E wallet (n/2)` fs ৩২ #595959; খালি কার্ড ৩৪০ উঁচু, লাল + বোতাম ৯১.৬
 *   তথ্যের সারি fs ২৪; রিফ্রেশ পিল ৭০ উঁচু radius ২৬ bg #D7E7FE
 *   পরিমাণ ও পাসওয়ার্ডের ঘর ১০৫ উঁচু radius ১০ border #CCC; জমা বোতাম ১০৫
 * ডেস্কটপে একই গঠন px এ, ১১১০ × ৬২০ এর মডালের ভিতরে।
 *
 * আটকে থাকলে (লেনদেন পাসওয়ার্ড নেই / টার্নওভার বাকি / আবেদন ঝুলে আছে)
 * ফর্মের বদলে কী করতে হবে সেটাই দেখায়।
 */

const RED = "var(--member-accent, #ec2529)";

const fmt = (n) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── মাপের সাহায্যকারী: ডেস্কটপ px, মোবাইল m() ── */
const useSize = () => {
  const isDesktop = useIsDesktop();
  // ডেস্কটপে সংখ্যাকেও "px" সহ — `${u(1, 2)} solid …` এর মতো লেখার ভিতরে
  // শুধু "1" বসলে ব্রাউজার বর্ডারটাই বাদ দিত
  return { isDesktop, u: (desk, mob) => (isDesktop ? (typeof desk === "number" ? `${desk}px` : desk) : m(mob)) };
};

const MethodLogo = ({ method, size }) =>
  method?.logoUrl ? (
    <img src={assetUrl(method.logoUrl)} alt="" style={{ width: size, height: size, objectFit: "contain", borderRadius: 6 }} />
  ) : (
    <span style={{ width: size, height: size, borderRadius: 6, background: "#f2f2f2", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "var(--member-muted, #888)" }}>
      {String(method?.methodId || "?").slice(0, 2)}
    </span>
  );

/** একটা ইনপুটের সারি — বাঁয়ে লেবেল, ডানে ঘর (মূল সাইটের মতো) */
const FieldRow = ({ label, ...input }) => {
  const { u } = useSize();
  return (
    <div
      className="flex items-center"
      style={{ marginTop: u(14, 30), height: u(46, 105), borderRadius: u(6, 10), border: `${u(1, 2)} solid #ccc`, padding: `0 ${u(14, 20)}` }}
    >
      <span style={{ width: u(170, 230), flexShrink: 0, fontSize: u(14, 29), color: "#0a0a0a", lineHeight: 1.15 }}>{label}</span>
      <input
        {...input}
        style={{ flex: 1, minWidth: 0, height: "100%", border: "none", outline: "none", background: "transparent", fontSize: u(14, 30), color: "var(--member-title, #333)" }}
      />
    </div>
  );
};

const PrimaryButton = ({ children, disabled, onClick, active = true }) => {
  const { u } = useSize();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full cursor-pointer"
      style={{ marginTop: u(22, 50), height: u(46, 105), borderRadius: u(6, 10), background: active && !disabled ? RED : "#dcdcdc", color: "#fff", fontSize: u(16, 32) }}
    >
      {children}
    </button>
  );
};

const GhostButton = ({ children, onClick }) => {
  const { u } = useSize();
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer"
      style={{ marginTop: u(12, 24), height: u(42, 95), borderRadius: u(6, 10), border: `${u(1, 2)} solid ${RED}`, color: RED, fontSize: u(15, 30), background: "var(--member-surface, #fff)" }}
    >
      {children}
    </button>
  );
};

/* ─────────────────── আটকে থাকার পর্দা ─────────────────── */

const BlockPanel = ({ f }) => {
  const { t } = useLanguage();
  const w = t.withdrawFlow;
  const { u, isDesktop } = useSize();
  const reason = f.block;

  const title = reason === "pendingWithdraw" ? w.pendingTitle : reason === "verification" ? w.verifyTitle : reason === "dailyLimit" ? w.dailyTitle : w.turnoverTitle;
  const hint =
    reason === "pendingWithdraw"
      ? w.pendingHint.replace("{amount}", fmt(f.elig?.pendingAmount))
      : reason === "verification"
        ? w.verifyHint
        : reason === "dailyLimit"
          ? w.dailyHint.replace("{n}", f.elig?.limit ?? 0)
          : w.turnoverHint.replace("{amount}", fmt(f.elig?.remaining));

  return (
    <div style={{ marginTop: u(16, 30), borderRadius: u(8, 16), background: "#fff6f6", border: `${u(1, 2)} solid #ffd0d1`, padding: isDesktop ? "16px 18px" : `${m(30)} ${m(30)}` }}>
      <div style={{ fontSize: u(16, 32), fontWeight: 700, color: RED }}>{title}</div>
      <div style={{ marginTop: u(6, 12), fontSize: u(13, 26), color: "var(--member-text, #555)", lineHeight: 1.5 }}>{hint}</div>
      {reason === "verification" && <VerifyNowButton status={f.elig?.verificationStatus} />}

      {reason === "turnover" &&
        (f.elig?.turnovers || []).map((item, index) => (
          <div key={index} style={{ marginTop: u(14, 26) }}>
            <div className="flex justify-between" style={{ fontSize: u(13, 24), color: "var(--member-title, #333)" }}>
              <span className="truncate">{item.title}</span>
              <span>
                ৳ {fmt(item.progress)} / ৳ {fmt(item.required)}
              </span>
            </div>
            <div style={{ marginTop: u(6, 10), height: u(8, 14), borderRadius: 99, background: "#f1d5d6", overflow: "hidden" }}>
              <div style={{ width: `${item.percent}%`, height: "100%", background: RED }} />
            </div>
          </div>
        ))}
    </div>
  );
};

/* ─────────────────── লেনদেন পাসওয়ার্ড বসানো ─────────────────── */

const TxForm = ({ f }) => {
  const { t } = useLanguage();
  const w = t.withdrawFlow;
  const { u } = useSize();
  const [form, setForm] = useState({ loginPassword: "", newTx: "", confirmTx: "" });
  const bind = (key) => ({
    value: form[key],
    type: "password",
    autoComplete: key === "loginPassword" ? "current-password" : "new-password",
    maxLength: 20,
    onChange: (e) => setForm((v) => ({ ...v, [key]: e.target.value })),
  });

  return (
    <div>
      <div style={{ marginTop: u(16, 30), fontSize: u(16, 32), fontWeight: 700, color: "var(--member-title, #333)" }}>{w.txTitle}</div>
      <div style={{ marginTop: u(6, 12), fontSize: u(13, 25), color: "var(--member-muted, #888)", lineHeight: 1.5 }}>{w.txHint}</div>
      <FieldRow label={w.loginPassword} placeholder={w.loginPassword} {...bind("loginPassword")} />
      <FieldRow label={w.newTx} placeholder="6–12" {...bind("newTx")} />
      <FieldRow label={w.confirmTx} placeholder={w.confirmTx} {...bind("confirmTx")} />
      <PrimaryButton disabled={f.busy} onClick={() => f.saveTxPassword(form)}>
        {w.save}
      </PrimaryButton>
    </div>
  );
};

/* ─────────────────── ওয়ালেট যোগ ─────────────────── */

const AddWalletForm = ({ f }) => {
  const { t } = useLanguage();
  const w = t.withdrawFlow;
  const { u } = useSize();
  const [methodId, setMethodId] = useState(f.methods[0]?.methodId || "");
  const [walletNumber, setWalletNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [tx, setTx] = useState("");

  return (
    <div>
      <div style={{ marginTop: u(16, 30), fontSize: u(16, 32), fontWeight: 700, color: "var(--member-title, #333)" }}>{w.addWallet}</div>

      <div style={{ marginTop: u(12, 24), fontSize: u(13, 26), color: "#595959" }}>{w.walletMethod}</div>
      <div className="flex flex-wrap" style={{ marginTop: u(8, 16), gap: u(10, 16) }}>
        {f.methods.map((item) => {
          const active = item.methodId === methodId;
          return (
            <button
              key={item.methodId}
              type="button"
              onClick={() => setMethodId(item.methodId)}
              className="flex cursor-pointer items-center"
              style={{
                height: u(46, 90),
                padding: `0 ${u(14, 24)}`,
                gap: u(8, 14),
                borderRadius: u(6, 10),
                border: `${u(1, 2)} solid ${active ? RED : "#e4e4e4"}`,
                color: active ? RED : "#333",
                fontSize: u(14, 26),
                fontWeight: 700,
                background: "var(--member-surface, #fff)",
              }}
            >
              <MethodLogo method={item} size={u(28, 50)} />
              {f.tv(item.name)}
            </button>
          );
        })}
      </div>

      <FieldRow
        label={w.walletNumber}
        placeholder="01XXXXXXXXX"
        inputMode="numeric"
        value={walletNumber}
        onChange={(e) => setWalletNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
      />
      <FieldRow label={w.accountName} placeholder={w.accountName} value={accountName} maxLength={60} onChange={(e) => setAccountName(e.target.value)} />
      <FieldRow label={t.money.txPassword} placeholder={t.money.txPassword} type="password" autoComplete="off" value={tx} onChange={(e) => setTx(e.target.value)} />

      <PrimaryButton disabled={f.busy} onClick={() => f.addWallet({ methodId, walletNumber, accountName, tx })}>
        {w.save}
      </PrimaryButton>
      <GhostButton onClick={() => f.setView("main")}>{w.back}</GhostButton>
    </div>
  );
};

/* ─────────────────── মূল উত্তোলনের ফর্ম ─────────────────── */

const WalletCards = ({ f }) => {
  const { t } = useLanguage();
  const w = t.withdrawFlow;
  const money = t.money;
  const { u, isDesktop } = useSize();
  const canAdd = f.wallets.length < f.cap;

  return (
    <>
      <div style={{ fontSize: u(16, 32), color: "#595959" }}>
        {money.bound} ({f.wallets.length}/{f.cap})
      </div>

      <div className="grid" style={{ marginTop: u(14, 30), gap: u(12, 24), gridTemplateColumns: isDesktop ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
        {f.wallets.map((item) => {
          const active = item._id === f.walletId;
          return (
            <div
              key={item._id}
              role="button"
              tabIndex={0}
              onClick={() => f.setWalletId(item._id)}
              className="relative flex cursor-pointer items-center"
              style={{
                height: u(86, 160),
                padding: `0 ${u(16, 30)}`,
                gap: u(14, 24),
                borderRadius: u(10, 16),
                border: `${u(2, 3)} solid ${active ? RED : "#eee"}`,
                background: active ? "#fff6f6" : "#fafafa",
              }}
            >
              <MethodLogo method={item.method} size={u(44, 80)} />
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: u(14, 26), color: "var(--member-muted, #888)" }}>{f.tv(item.method?.name) || item.methodId}</div>
                <div style={{ fontSize: u(20, 38), fontWeight: 700, color: "var(--member-title, #222)", letterSpacing: 1 }}>{maskNumber(item.walletNumber)}</div>
                {item.accountName && <div className="truncate" style={{ fontSize: u(12, 22), color: "var(--member-muted, #999)" }}>{item.accountName}</div>}
              </div>
              <button
                type="button"
                aria-label={w.remove}
                onClick={(e) => {
                  e.stopPropagation();
                  f.removeWallet(item);
                }}
                className="grid cursor-pointer place-items-center"
                style={{ width: u(30, 56), height: u(30, 56), borderRadius: "50%", color: "var(--member-muted, #999)" }}
              >
                <Trash2 size={f.isDesktop ? 16 : 18} />
              </button>
              {active && (
                <span className="absolute" style={{ right: u(6, 10), bottom: u(4, 6), color: RED }}>
                  <Icon name="achievement-done" size={u(18, 30)} />
                </span>
              )}
            </div>
          );
        })}

        {canAdd && (
          <button
            type="button"
            onClick={() => f.setView("addWallet")}
            className="relative grid cursor-pointer place-items-center"
            style={{
              height: u(86, f.wallets.length ? 160 : 340),
              borderRadius: u(10, 10),
              background: "#fafafa",
              color: "#a9a9a9",
              fontSize: u(15, 30),
              border: `${u(1, 2)} dashed #ddd`,
            }}
          >
            <span className="flex items-center" style={{ gap: u(10, 20) }}>
              <span
                className="grid place-items-center"
                style={{ width: u(34, 70), height: u(34, 70), borderRadius: "50%", background: "#fe0000", color: "#fff", fontSize: u(22, 44), lineHeight: 1 }}
              >
                +
              </span>
              {f.wallets.length ? w.addWallet : money.emptyWallet}
            </span>
          </button>
        )}
      </div>
    </>
  );
};

const MainForm = ({ f }) => {
  const { t } = useLanguage();
  const w = t.withdrawFlow;
  const money = t.money;
  const { u, isDesktop } = useSize();

  const info = [
    { key: "time", text: money.withdrawTime, dim: true },
    ...(f.elig?.today?.remaining != null ? [{ key: "daily", text: w.dailyLine.replace("{n}", f.elig.today.limit).replace("{left}", f.elig.today.remaining), dim: true }] : []),
    { key: "main", text: `${w.centralWallet} : ৳ ${fmt(f.balance)}` },
    ...(f.method || f.isAuto ? [{ key: "limit", text: `${w.limit} : ৳ ${fmt(f.min)} - ৳ ${fmt(f.max)}` }] : []),
    ...(f.isAuto && f.supportedList ? [{ key: "auto", text: t.payMode.supported.replace("{list}", f.supportedList), dim: true }] : []),
  ];

  return (
    <>
      <WalletCards f={f} />

      <div style={{ marginTop: u(22, 60) }}>
        {info.map((row) => (
          <div key={row.key} style={{ fontSize: u(13, 24), color: row.dim ? "#bababa" : "var(--member-title, #333)", lineHeight: isDesktop ? "22px" : m(34) }}>
            {row.text}
          </div>
        ))}
      </div>

      <div className="flex" style={{ marginTop: u(12, 20), justifyContent: isDesktop ? "flex-start" : "center" }}>
        <button
          type="button"
          onClick={f.refreshBalance}
          className="flex cursor-pointer items-center"
          style={{ height: u(34, 70), padding: `0 ${u(14, 24)}`, borderRadius: u(17, 26), background: "#d7e7fe", color: "#3b79f3", fontSize: u(13, 28), gap: u(8, 16) }}
        >
          <Icon name="refresh" size={u(20, 50)} />
          {money.refreshBalance}
        </button>
      </div>

      {f.unsupported && !f.block && (
        <div style={{ marginTop: u(14, 26), borderRadius: u(8, 14), background: "#fff6f6", border: `${u(1, 2)} solid #ffd0d1`, padding: u("10px 14px", 24), fontSize: u(13, 25), color: RED, lineHeight: 1.5 }}>
          {t.payMode.unsupported}
        </div>
      )}

      {f.block ? (
        <BlockPanel f={f} />
      ) : (
        <>
          <div style={{ marginTop: u(20, 40), fontSize: u(14, 26), color: "var(--member-title, #333)" }}>{money.withdrawAmount}</div>
          <FieldRow
            label={money.amount}
            placeholder={f.method ? `${fmt(f.min)} ~ ${fmt(f.max)}` : ""}
            inputMode="decimal"
            value={f.amount}
            onChange={(e) => f.setAmount(e.target.value)}
          />
          <div style={{ marginTop: u(6, 12), fontSize: u(12, 24), color: "var(--member-muted, #888)" }}>
            {w.receive} : ৳ {fmt(f.amount)}
          </div>
          <FieldRow
            label={money.txPassword}
            placeholder={money.txPassword}
            type="password"
            autoComplete="off"
            value={f.txPassword}
            onChange={(e) => f.setTxPassword(e.target.value)}
          />
          <PrimaryButton disabled={f.busy} active={Boolean(f.amount && f.txPassword && f.wallet && !f.unsupported)} onClick={f.submit}>
            {money.submit}
          </PrimaryButton>
        </>
      )}
    </>
  );
};

const Body = ({ f }) => {
  const { t } = useLanguage();
  const w = t.withdrawFlow;
  const { u } = useSize();

  if (f.loading) return <div style={{ padding: u(20, 40), color: "var(--member-muted, #999)", fontSize: u(13, 26) }}>{w.loading}</div>;
  // লেনদেন পাসওয়ার্ড নেই — আগে সেটা (ওয়ালেট বাঁধা আর তোলা দুটোতেই লাগে)
  if (f.block === "noTx") return <TxForm f={f} />;
  if (f.view === "addWallet") return f.methods.length ? <AddWalletForm f={f} /> : <div style={{ color: "var(--member-muted, #999)" }}>{w.noMethods}</div>;
  return <MainForm f={f} />;
};

/** "E wallet" ট্যাব — মূল সাইটের মতো একটাই */
const WalletTab = ({ auto }) => {
  const { t } = useLanguage();
  const { u } = useSize();
  return (
    <div className="flex items-center justify-center" style={{ height: u(52, 87), background: "var(--member-surface, #fff)", borderBottom: `${u(3, 4)} solid ${RED}`, gap: u(12, 20), flexShrink: 0 }}>
      <span className="grid place-items-center" style={{ width: u(34, 60), height: u(34, 60), borderRadius: "50%", background: "#ff2d9b" }}>
        <Icon name="cashback" size={u(20, 36)} />
      </span>
      <span style={{ fontSize: u(16, 30), color: RED }}>{auto ? `${t.money.wallet} · ${t.payMode.autoWithdraw}` : t.money.wallet}</span>
    </div>
  );
};

const Mobile = ({ mode }) => {
  const { t } = useLanguage();
  const f = useWithdrawFlow({ mode });
  const [params, setParams] = useSearchParams();
  const { setView } = f;
  // "আমার কার্ড" এর "+" থেকে এলে সরাসরি ওয়ালেট যোগের ফর্ম
  useEffect(() => {
    if (params.get("add") === "1") {
      setView("addWallet");
      setParams({}, { replace: true });
    }
  }, [params, setParams, setView]);
  return (
    <MemberShell title={f.isAuto ? t.payMode.autoWithdraw : t.money.withdrawTitle} headerIcon="withrec3">
      <WalletTab auto={f.isAuto} />
      <div style={{ background: "var(--member-surface, #fff)", padding: `${m(35)} ${m(40)} ${m(60)}` }}>
        <Body f={{ ...f, isDesktop: false }} />
      </div>
    </MemberShell>
  );
};

const WithdrawSection = () => {
  const isDesktop = useIsDesktop();
  // ডেস্কটপ: মূল সাইটের `.withdraw-page` (account/DeskWithdraw)।
  // আগে কোন পথ (ম্যানুয়াল/অটো) — PaymentModeGate; `key` দিয়ে পথ বদলালে
  // ফর্ম নতুন করে বসে, আগের পথের লেখা পরিমাণ/পাসওয়ার্ড থেকে যায় না
  return (
    <PaymentModeGate
      kind="withdraw"
      render={(mode, onChange) =>
        isDesktop ? <DeskWithdraw key={mode} mode={mode} onChangeMode={onChange} /> : <Mobile key={mode} mode={mode} />
      }
    />
  );
};

export default WithdrawSection;
