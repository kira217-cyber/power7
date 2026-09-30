import React, { useState } from "react";

import { useIsDesktop } from "../../hook/useIsDesktop";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { REBATE_KINDS, useRebate } from "../../features/rebate/useRebate";
import { useAccountRecords } from "../../features/history/useRecords";
import { when } from "../../features/referral/useReferral";
import MemberShell, { EmptyState } from "./MemberShell";

/**
 * "ম্যানুয়াল রিবেট" — ডেস্কটপে মডালের ট্যাব, মোবাইলে `/member/rebate`
 * (মূল সাইটের `/m/member/manualRebate`)।
 *
 * শেষ দাবির পর থেকে খেলার ধরন অনুযায়ী কত রিবেট জমেছে (হার VIP স্তর
 * থেকে), নিচে "দাবি করুন"। "রিবেট ইতিহাস" = খাতার রিবেটের সারি।
 */

const pad = (n) => String(n).padStart(2, "0");
const day = (value) => {
  const d = value ? new Date(value) : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const HISTORY_RANGES = ["today", "days7", "month"];

/** রিবেট ইতিহাস — ডেস্কটপ আর মোবাইল দুটোতেই (মাপ `u` দিয়ে) */
const History = ({ u }) => {
  const { t } = useLanguage();
  const rb = t.rebateFlow;
  const [range, setRange] = useState("days7");
  const { rows, totals, loading } = useAccountRecords({ range, type: "rebate" });

  return (
    <div>
      <div className="flex" style={{ gap: u(8, 14), padding: `${u(12, 20)} ${u(20, 24)}` }}>
        {HISTORY_RANGES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className="cursor-pointer"
            style={{ height: u(30, 60), padding: `0 ${u(14, 26)}`, borderRadius: u(15, 30), fontSize: u(13, 26), border: `1px solid ${range === key ? "var(--member-accent, #e8474c)" : "#ddd"}`, color: range === key ? "var(--member-accent, #e8474c)" : "var(--member-text, #666)", background: "var(--member-surface, #fff)" }}
          >
            {rb.days[key]}
          </button>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1.3fr 1.4fr 1fr 1fr", background: "#f4f5f7", color: "var(--member-text, #666)", fontSize: u(13, 25), textAlign: "center" }}>
        {rb.historyCols.map((h) => (
          <div key={h} style={{ padding: `${u(10, 20)} ${u(4, 6)}` }}>{h}</div>
        ))}
      </div>
      {!loading && rows.length === 0 ? (
        <EmptyState />
      ) : (
        rows.map((row) => (
          <div key={row._id} className="grid" style={{ gridTemplateColumns: "1.3fr 1.4fr 1fr 1fr", borderBottom: "1px solid #f0f0f0", fontSize: u(12, 24), color: "#444", textAlign: "center" }}>
            <div style={{ padding: `${u(9, 18)} ${u(4, 6)}` }}>{when(row.createdAt)}</div>
            <div className="break-all" style={{ padding: `${u(9, 18)} ${u(4, 6)}` }}>{row.orderNo}</div>
            <div style={{ padding: `${u(9, 18)} ${u(4, 6)}`, color: "var(--member-success, #16a34a)" }}>+{Number(row.amount).toFixed(2)}</div>
            <div style={{ padding: `${u(9, 18)} ${u(4, 6)}` }}>{Number(row.balanceAfter).toFixed(2)}</div>
          </div>
        ))
      )}
      {rows.length > 0 ? (
        <div className="flex justify-between" style={{ padding: `${u(12, 24)} ${u(20, 40)}`, fontSize: u(13, 27), color: "var(--member-text, #555)" }}>
          <span>{rb.total}</span>
          <span>{Number(totals.amount || 0).toFixed(2)}</span>
        </div>
      ) : null}
    </div>
  );
};

/* ─────────────────── ডেস্কটপ (মডালের ভিতরে) ─────────────────── */
const Desktop = () => {
  const { t, lang } = useLanguage();
  const page = t.member.desk.rebate;
  const rb = t.rebateFlow;
  const [tab, setTab] = useState(0);
  const { data, loading, busy, load, claim, canClaim } = useRebate();
  const u = (desk) => `${desk}px`;
  // মূল সাইটের মতো শুধু আজকের তারিখ, বাংলায় বাংলা অঙ্কে
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const bnNum = (text) => (lang === "bn" ? String(text).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : text);

  const rows = [
    { key: "date", label: `${rb.date}:`, value: bnNum(ymd) },
    ...REBATE_KINDS.map((k) => ({ key: k, label: `${rb.kinds[k]}:`, value: Number(data?.totals?.[k] || 0).toFixed(2) })),
    { key: "total", label: `${rb.total}:`, value: Number(data?.totals?.total || 0).toFixed(2) },
  ];

  return (
    <div className="flex flex-col" style={{ width: 1110, height: 620, background: "var(--member-surface, #fff)" }}>
      {/* মূল সাইটের `.tab-nav` — ৪৭ উঁচু, বাঁয়ে ৩০ */}
      <div className="flex items-center" style={{ height: 47, borderBottom: "1px solid var(--member-line, #eee)", padding: "0 60px 0 30px", gap: 20 }}>
        {page.tabs.map((item, index) => (
          <button key={item} type="button" onClick={() => setTab(index)} className="relative h-full cursor-pointer" style={{ padding: "0 10px", fontSize: 14, color: index === tab ? "var(--member-accent, #fd2f2f)" : "var(--member-text, #666)" }}>
            {item}
            {index === tab && <span className="absolute bottom-0 left-0 right-0" style={{ height: 3, background: "var(--member-accent, #fd2f2f)" }} />}
          </button>
        ))}
      </div>

      {tab === 1 ? (
        <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
          <History u={u} />
        </div>
      ) : (
        <div style={{ flex: 1, padding: "16px 34px", overflowY: "auto" }}>
          {rows.map((row) => (
            <div key={row.key} className="flex items-center" style={{ marginBottom: 4 }}>
              <span style={{ width: 90, fontSize: 14, color: "var(--member-text, #666)" }}>{row.label}</span>
              <span
                className="flex items-center"
                style={{ width: 190, height: 34, background: "#f7f7f7", border: "1px solid var(--member-line, #eee)", borderRadius: 5, padding: "0 5px", fontSize: 12, color: row.key === "total" && Number(row.value) > 0 ? "var(--member-accent, #fd2f2f)" : "#b5b5b5" }}
              >
                {row.value}
              </span>
            </div>
          ))}
          {data && !data.enabled ? <div style={{ marginTop: 12, fontSize: 12, color: "var(--member-accent, #fd2f2f)" }}>{rb.err.rebateOff}</div> : null}
        </div>
      )}

      {tab === 0 ? (
        <div className="flex items-center" style={{ height: 48, borderTop: "1px solid var(--member-line, #eee)", margin: "0 0 0 34px", padding: "0 30px", gap: 10 }}>
          <button type="button" onClick={load} disabled={loading} className="cursor-pointer" style={{ width: 98, height: 34, borderRadius: 17, background: "var(--member-surface, #fff)", boxShadow: "0 2px 8px rgba(0,0,0,.15)", color: "var(--member-text, #555)", fontSize: 14 }}>
            {loading ? "…" : rb.refresh}
          </button>
          <button
            type="button"
            onClick={claim}
            disabled={!canClaim || busy}
            className={canClaim ? "cursor-pointer" : ""}
            style={{ width: 98, height: 34, borderRadius: 17, background: canClaim ? "var(--member-accent, #fd2f2f)" : "#d9d9d9", color: "#fff", fontSize: 14, fontWeight: 700 }}
          >
            {rb.claim}
          </button>
          {data && !canClaim && data.totals?.total > 0 ? <span style={{ fontSize: 12, color: "var(--member-muted, #999)" }}>{rb.err.rebateTooLow.replace("{n}", data.minClaim)}</span> : null}
        </div>
      ) : null}
    </div>
  );
};

/* ─────────────────── মোবাইল (আলাদা পেজ) ─────────────────── */
/**
 * মূল সাইটের `/m/member/manualRebate` — দুটো ট্যাব; রঙিন লেবেলের সারি
 * (বাঁয়ে রঙিন বাক্সে নাম, ডানে সাদা ঘরে কমলা মান, প্রান্তে রঙিন ফালি),
 * শেষে "দাবি" বোতাম আর নিচে লাল অস্বীকরণ বার।
 */
const ROWS = [
  { key: "date", color: "#fb7185", edge: "#fb923c" },
  { key: "slot", color: "#6366f1", edge: "#60a5fa" },
  { key: "fishing", color: "#c084fc", edge: "#a855f7" },
  { key: "live", color: "#14b8a6", edge: "#2dd4bf" },
  { key: "poker", color: "#f9a8d4", edge: "#ec4899" },
  { key: "sports", color: "#f87171", edge: "#fb923c" },
  { key: "total", color: "#6366f1", edge: "#60a5fa" },
];

const Mobile = () => {
  const { t } = useLanguage();
  const page = t.memberPage.pages.rebate;
  const rb = t.rebateFlow;
  const [tab, setTab] = useState(0);
  const { data, busy, claim, canClaim } = useRebate();
  const u = (_desk, mob) => m(mob);

  // মূল সাইটের মোবাইলের নাম (মাছ, খেলাধুলা …) আর শুধু আজকের তারিখ
  const KIND_TAB = { slot: "RNG", fishing: "FISH", live: "LIVE", poker: "PVP", sports: "SPORTS" };
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const label = (key) => (key === "date" ? page.date : key === "total" ? page.total : t.memberPage.pages.gameTabs[KIND_TAB[key]] || rb.kinds[key]);
  const value = (key) => (key === "date" ? `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` : Number(data?.totals?.[key] || 0).toFixed(2));

  return (
    <MemberShell title={page.title}>
      <div className="flex" style={{ background: "var(--member-surface, #fff)", height: m(85) }}>
        {page.tabs.map((item, index) => (
          <button key={item} type="button" onClick={() => setTab(index)} className="relative flex-1 cursor-pointer" style={{ color: index === tab ? "var(--member-link, #1e9bf0)" : "var(--member-title, #333)", fontSize: m(30) }}>
            {item}
            {index === tab && <span className="absolute bottom-0 left-0" style={{ width: "100%", height: m(5), background: "var(--member-link, #1e9bf0)" }} />}
          </button>
        ))}
      </div>

      {tab === 1 ? (
        <div style={{ background: "var(--member-surface, #fff)", minHeight: "60vh" }}>
          <History u={u} />
        </div>
      ) : (
        <div style={{ background: "var(--member-page-bg, #f5f5f9)", minHeight: `calc(100vh - ${m(185)})`, padding: `${m(16)} ${m(30)} ${m(260)}` }}>
          {ROWS.map((row) => (
            <div key={row.key} className="flex items-stretch" style={{ marginBottom: m(29), height: m(81) }}>
              <span className="grid place-items-center" style={{ width: m(165), borderRadius: `${m(8)} 0 0 ${m(8)}`, background: row.color, color: "#fff", fontSize: m(34) }}>
                {label(row.key)}
              </span>
              <span className="flex flex-1 items-center justify-end" style={{ background: "var(--member-surface, #fff)", color: "#f97a4a", fontSize: m(40), padding: `0 ${m(16)}` }}>
                {value(row.key)}
              </span>
              <span style={{ width: m(12), borderRadius: `0 ${m(8)} ${m(8)} 0`, background: row.edge }} />
            </div>
          ))}
          {data && !data.enabled ? <div style={{ fontSize: m(24), color: "var(--member-accent, #e60012)" }}>{rb.err.rebateOff}</div> : null}
          {data && data.totals?.total > 0 && !canClaim && data.enabled ? <div style={{ fontSize: m(24), color: "var(--member-muted, #888)" }}>{rb.err.rebateTooLow.replace("{n}", data.minClaim)}</div> : null}
        </div>
      )}

      {/* নিচে আটকানো — চওড়া "দাবি" আর তার নিচে অস্বীকরণ */}
      <div className="fixed bottom-0 left-0 w-full" style={{ zIndex: 5 }}>
        {tab === 0 && (
          <div style={{ padding: `0 ${m(50)} ${m(24)}` }}>
            <button
              type="button"
              onClick={claim}
              disabled={!canClaim || busy}
              className="w-full"
              style={{ height: m(87), borderRadius: m(8), background: canClaim ? "var(--member-accent, #f5333f)" : "#dedede", boxShadow: "0 4px 10px rgba(0,0,0,.18)", color: "#fff", fontSize: m(38) }}
            >
              {page.claim}
            </button>
          </div>
        )}
        <div className="flex items-center justify-center" style={{ height: m(60), background: "#fff5f5", borderTop: "1px solid #ffb3b3", color: "var(--member-accent, #e60012)", fontSize: m(24), gap: m(12) }}>
          <span className="grid place-items-center" style={{ width: m(34), height: m(34), borderRadius: "50%", background: "#ec1c24", color: "#fff", fontSize: m(24), fontWeight: 700 }}>
            !
          </span>
          {t.memberPage.pages.note}
        </div>
      </div>
    </MemberShell>
  );
};


const RebateSection = (props) => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <Desktop {...props} /> : <Mobile {...props} />;
};

export default RebateSection;
