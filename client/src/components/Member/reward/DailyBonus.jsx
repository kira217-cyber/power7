import React, { useEffect, useState } from "react";

import { useLanguage } from "../../../Context/LanguageProvider";
import { m } from "../../../hook/useUnits";
import { useCountdown } from "../../../features/reward/useRewards";
import { useDailyBonus } from "../../../features/reward/useDailyBonus";
import { IMG, money, useTv } from "./RewardParts";

/**
 * ডেইলি বোনাস — "দাবি করা" পাতার উপরে (মোবাইলে ClaimCenter, ডেস্কটপে
 * DeskReward এর ডান পাশে)। ৭টা দিনের টাইল: পাওয়া (সবুজ টিক), মিস (ধূসর),
 * আজ (কমলা, জ্বলজ্বলে) আর সামনের দিন; নিচে "দাবি করুন" বা পরের বোনাসের ঘড়ি।
 *
 * মাপ মোবাইলের ৭৫০ ডিজাইনে (`m`); ডেস্কটপে তার অর্ধেক px।
 */
const LOOK = {
  claimed: { bg: "linear-gradient(160deg,#e9fbe9,#c9f2c9)", border: "#4cc24c", text: "#2b8a2b" },
  missed: { bg: "#eeeeee", border: "#d5d5d5", text: "#9a9a9a" },
  today: { bg: "linear-gradient(160deg,#fff4d6,#ffd36b)", border: "#ff9f1a", text: "#b25e00" },
  upcoming: { bg: "linear-gradient(160deg,#f3f0ff,#e4ddff)", border: "#cfc4ff", text: "#5b2bd8" },
};

const pad = (n) => String(n).padStart(2, "0");

const Countdown = ({ to, text, onDone, size }) => {
  const c = useCountdown(to);
  useEffect(() => {
    if (c.over) onDone?.();
  }, [c.over, onDone]);
  return <span style={{ fontSize: size }}>{text.replace("{t}", `${pad(c.days * 24 + c.h)}:${pad(c.m)}:${pad(c.s)}`)}</span>;
};

const DailyBonus = ({ desktop = false }) => {
  const { t } = useLanguage();
  const tx = t.dailyBonus;
  const tv = useTv();
  const { state, busy, claim, reload } = useDailyBonus();
  const [showRules, setShowRules] = useState(false);
  const u = (n) => (desktop ? `${n / 2}px` : m(n));

  if (!state?.enabled) return null;

  const today = state.days[state.todayNo - 1];
  const rules = tv(state.rules);

  return (
    <div
      style={{
        margin: desktop ? "10px 12px" : `0 ${m(24)} ${m(20)}`,
        padding: u(24),
        borderRadius: u(20),
        background: "var(--member-surface, #fff)",
        boxShadow: "0 4px 14px rgba(0,0,0,.08)",
      }}
    >
      {/* শিরোনাম */}
      <div className="flex items-center" style={{ gap: u(12), marginBottom: u(18) }}>
        <img src={`${IMG}/gift_icon.png`} alt="" style={{ width: u(44) }} />
        <span style={{ fontSize: u(32), fontWeight: 800, color: "var(--member-title, #333)" }}>{tv(state.title) || tx.title}</span>
        <span className="flex-1" />
        {rules && (
          <button type="button" onClick={() => setShowRules((v) => !v)} className="cursor-pointer" style={{ fontSize: u(24), color: "#5b2bd8", padding: `${u(4)} ${u(16)}`, borderRadius: u(20), background: "#ede7ff" }}>
            {tx.rules}
          </button>
        )}
      </div>

      {showRules && (
        <p style={{ whiteSpace: "pre-line", fontSize: u(24), lineHeight: 1.5, color: "var(--member-text, #555)", background: "#f7f5ff", borderRadius: u(12), padding: u(16), marginBottom: u(18) }}>
          {rules}
        </p>
      )}

      {/* ৭টা দিন — মোবাইলে ৪ + ৩ (দিন ৭ দুই ঘর জুড়ে), ডেস্কটপে এক সারিতে */}
      <div className="grid" style={{ gridTemplateColumns: desktop ? "repeat(7, 1fr)" : "repeat(4, 1fr)", gap: u(14) }}>
        {state.days.map((day) => {
          const look = LOOK[day.status] || LOOK.upcoming;
          const big = !desktop && day.dayNo === 7;
          return (
            <div
              key={day.dayNo}
              className="relative flex flex-col items-center justify-center text-center"
              style={{
                gridColumn: big ? "span 2" : undefined,
                minHeight: u(150),
                padding: `${u(12)} ${u(6)}`,
                borderRadius: u(16),
                background: look.bg,
                border: `${u(3)} solid ${look.border}`,
                color: look.text,
                boxShadow: day.status === "today" ? "0 0 0 3px rgba(255,159,26,.25)" : "none",
                opacity: day.status === "missed" ? 0.75 : 1,
              }}
            >
              <span style={{ fontSize: u(22), fontWeight: 700 }}>{day.status === "today" ? tx.today : tx.day.replace("{n}", day.dayNo)}</span>
              <img src={`${IMG}/${day.dayNo === 7 ? "gift" : "item-cash"}.png`} alt="" style={{ height: u(52), margin: `${u(8)} 0`, filter: day.status === "missed" ? "grayscale(1)" : "none" }} />
              <span style={{ fontSize: u(26), fontWeight: 800, textDecoration: day.status === "missed" ? "line-through" : "none" }}>৳{money(day.amount).replace(/\.00$/, "")}</span>
              <span style={{ fontSize: u(18), marginTop: u(4) }}>
                {day.status === "claimed" ? `✓ ${tx.claimed}` : day.status === "missed" ? tx.missed : day.status === "upcoming" ? tx.upcoming : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* দাবি বা পরের বোনাসের ঘড়ি */}
      <div className="flex flex-col items-center" style={{ marginTop: u(22), gap: u(10) }}>
        {state.canClaim ? (
          <button
            type="button"
            disabled={busy}
            onClick={claim}
            className="cursor-pointer disabled:opacity-60"
            style={{ width: "100%", maxWidth: desktop ? 360 : "none", height: u(84), borderRadius: u(42), background: "linear-gradient(90deg,#ff8a00,#ff3d00)", color: "#fff", fontSize: u(32), fontWeight: 800, boxShadow: "0 6px 16px rgba(255,90,0,.35)" }}
          >
            {tx.claim} ৳{money(today.amount)}
          </button>
        ) : (
          <span style={{ fontSize: u(26), fontWeight: 700, color: "var(--member-title, #333)" }}>
            {!state.depositOk ? tx.needDeposit.replace("{n}", state.minTotalDeposit) : state.claimedToday ? tx.doneToday : tx.nothingToday}
          </span>
        )}
        {!state.canClaim && state.depositOk && (
          // মোবাইলের rem বড় — ঘরের নিজের মাপ না দিলে লাইনটা অনেক উঁচু হয়
          <span style={{ color: "#ff6a00", fontWeight: 700, fontSize: u(26), lineHeight: 1.3 }}>
            <Countdown to={state.nextLocal} text={tx.nextIn} onDone={reload} size={u(26)} />
          </span>
        )}
        {state.turnoverMultiplier > 0 && <span style={{ fontSize: u(20), color: "var(--member-muted, #888)" }}>{tx.turnover.replace("{x}", state.turnoverMultiplier)}</span>}
        <span className="text-center" style={{ fontSize: u(20), color: "var(--member-muted, #888)", lineHeight: 1.4 }}>
          {tx.hint}
        </span>
      </div>
    </div>
  );
};

export default DailyBonus;
