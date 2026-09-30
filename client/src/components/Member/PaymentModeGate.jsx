import React, { useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronRight, Headset, Wallet, Zap } from "lucide-react";

import { useIsDesktop } from "../../hook/useIsDesktop";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import MemberShell from "./MemberShell";
import { usePaymentModes } from "../../features/payment/usePaymentModes";
import { getSupportUrl } from "../../data/contact";

/**
 * ডিপোজিট / উত্তোলনের প্রথম ধাপ — কোন পথে।
 *
 *   ম্যানুয়াল + অটো দুটোই চালু → দুটো কার্ড, যেটায় চাপবেন সেই পাতা
 *   একটাই চালু                → সরাসরি সেই পাতা (কার্ড দেখায় না)
 *   কোনোটাই নয়                → "সাময়িকভাবে বন্ধ"
 *
 * মোবাইলে বেছে নেওয়াটা ঠিকানায় (`?mode=auto`) — পেছনের তীর চাপলে আবার
 * কার্ডে ফেরে; ডেস্কটপ মডালে ঠিকানা নেই, তাই সেখানে state, আর পাতার
 * উপরে "পদ্ধতি বদলান"।
 *
 * `render(mode, onChange)` — `onChange` শুধু দুটো পথ খোলা থাকলে দেওয়া হয়।
 */

const RED = "var(--member-accent, #ec2529)";

const useMode = () => {
  const isDesktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const [deskMode, setDeskMode] = useState("");

  if (isDesktop) return [deskMode, setDeskMode];
  const mode = params.get("mode") || "";
  const setMode = (next) => {
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set("mode", next);
    else nextParams.delete("mode");
    // বেছে নেওয়া নতুন ধাপ (পেছনে ফেরা যায়); বদলানো বা মুছে ফেলা আগেরটার জায়গায়
    setParams(nextParams, { replace: !next || Boolean(mode) });
  };
  return [mode, setMode];
};

const Card = ({ Icon, color, title, hint, onClick, desktop }) => {
  const { t } = useLanguage();
  const u = (d, mob) => (desktop ? d : m(mob));
  return (
    <button
      type="button"
      onClick={onClick}
      className="tb-hover-fade flex w-full cursor-pointer items-center text-left"
      style={{
        minHeight: u(150, 190),
        padding: `${u(18, 28)} ${u(26, 34)}`,
        gap: u(20, 28),
        borderRadius: u(12, 18),
        border: `${u("1px", m(2))} solid var(--member-line, #eee)`,
        background: `linear-gradient(90deg, var(--member-surface, #fff) 0%, color-mix(in srgb, ${color} 7.84%, transparent) 100%)`,
        boxShadow: "0 6px 20px rgb(0 0 0 / 0.06)",
      }}
    >
      <span className="grid shrink-0 place-items-center" style={{ width: u(64, 96), height: u(64, 96), borderRadius: "50%", background: color, color: "#fff" }}>
        <Icon size={desktop ? 30 : 26} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block" style={{ fontSize: u(20, 32), fontWeight: 700, color: "var(--member-title, #222)" }}>
          {title}
        </span>
        <span className="block" style={{ marginTop: u(6, 10), fontSize: u(13, 24), color: "var(--member-muted, #888)", lineHeight: 1.45 }}>
          {hint}
        </span>
      </span>
      <span className="flex shrink-0 items-center" style={{ gap: u(4, 6), color: RED, fontSize: u(14, 26), fontWeight: 700 }}>
        {t.payMode.go}
        <ChevronRight size={desktop ? 18 : 16} />
      </span>
    </button>
  );
};

const Frame = ({ desktop, title, children }) =>
  desktop ? (
    <div className="flex flex-col" style={{ width: 1110, height: 620, background: "var(--member-surface, #fff)" }}>
      <div className="flex items-center" style={{ height: 47, padding: "0 20px", gap: 8, borderBottom: "1px solid var(--member-line, #eee)", flexShrink: 0 }}>
        <span style={{ width: 4, height: 16, background: "#23e63a" }} />
        <span style={{ fontSize: 16, color: "#000" }}>{title}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: "0 120px", gap: 22 }}>
        {children}
      </div>
    </div>
  ) : (
    <MemberShell title={title}>
      <div className="flex flex-col" style={{ padding: `${m(40)} ${m(30)}`, gap: m(26), background: "var(--member-surface, #fff)" }}>
        {children}
      </div>
    </MemberShell>
  );

const PaymentModeGate = ({ kind, render }) => {
  const { t } = useLanguage();
  const p = t.payMode;
  const desktop = useIsDesktop();
  const modes = usePaymentModes(kind);
  const [chosen, setChosen] = useMode();
  const isDeposit = kind === "deposit";
  const pageTitle = isDeposit ? t.money.depositTitle : t.money.withdrawTitle;

  if (modes.loading) {
    return (
      <Frame desktop={desktop} title={pageTitle}>
        <div style={{ color: "var(--member-muted, #999)", fontSize: desktop ? 14 : m(26) }}>{p.loading}</div>
      </Frame>
    );
  }

  if (!modes.manual && !modes.auto) {
    return (
      <Frame desktop={desktop} title={pageTitle}>
        <div className="flex flex-col items-center text-center" style={{ gap: desktop ? 14 : m(24), padding: desktop ? 0 : `${m(80)} 0` }}>
          <span className="grid place-items-center" style={{ width: desktop ? 84 : m(140), height: desktop ? 84 : m(140), borderRadius: "50%", background: "#fff1f1", color: RED }}>
            <Wallet size={desktop ? 38 : 34} />
          </span>
          <div style={{ fontSize: desktop ? 20 : m(34), fontWeight: 700, color: "var(--member-title, #222)" }}>{isDeposit ? p.depositOffTitle : p.withdrawOffTitle}</div>
          <div style={{ maxWidth: desktop ? 460 : "100%", fontSize: desktop ? 14 : m(26), color: "var(--member-muted, #888)", lineHeight: 1.6 }}>
            {isDeposit ? p.depositOffHint : p.withdrawOffHint}
          </div>
          <button
            type="button"
            onClick={() => window.open(getSupportUrl(), "_blank", "noopener")}
            className="tb-hover-fade flex cursor-pointer items-center"
            style={{ marginTop: desktop ? 6 : m(10), height: desktop ? 38 : m(80), padding: desktop ? "0 22px" : `0 ${m(40)}`, gap: 8, borderRadius: 99, background: RED, color: "#fff", fontSize: desktop ? 14 : m(28) }}
          >
            <Headset size={desktop ? 16 : 16} />
            {p.support}
          </button>
        </div>
      </Frame>
    );
  }

  // একটাই খোলা — সরাসরি সেটা
  if (!(modes.manual && modes.auto)) return render(modes.manual ? "manual" : "auto", null);

  // দুটোই খোলা — বেছে নেওয়া থাকলে সেটা, সাথে "পদ্ধতি বদলান"
  if (chosen === "manual" || chosen === "auto") return render(chosen, () => setChosen(""));

  return (
    <Frame desktop={desktop} title={isDeposit ? p.depositChoose : p.withdrawChoose}>
      <Card
        desktop={desktop}
        Icon={Wallet}
        color="#f5a623"
        title={isDeposit ? p.manualDeposit : p.manualWithdraw}
        hint={isDeposit ? p.manualDepositHint : p.manualWithdrawHint}
        onClick={() => setChosen("manual")}
      />
      <Card
        desktop={desktop}
        Icon={Zap}
        color={RED}
        title={isDeposit ? p.autoDeposit : p.autoWithdraw}
        hint={isDeposit ? p.autoDepositHint : p.autoWithdrawHint}
        onClick={() => setChosen("auto")}
      />
    </Frame>
  );
};

/** "পদ্ধতি বদলান" — দুটো পথ খোলা থাকলে পাতার উপরে */
export const ChangeModeButton = ({ onChange, desktop }) => {
  const { t } = useLanguage();
  if (!onChange) return null;
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex cursor-pointer items-center"
      style={
        desktop
          ? { height: 30, padding: "0 12px", gap: 4, borderRadius: 15, border: `1px solid ${RED}`, color: RED, fontSize: 13 }
          : { height: m(56), padding: `0 ${m(20)}`, gap: m(6), borderRadius: m(28), border: "1px solid #fff", color: "#fff", fontSize: m(22) }
      }
    >
      {t.payMode.change}
    </button>
  );
};

export default PaymentModeGate;
