import React, { useState } from "react";
import { maskNumber } from "../../features/withdraw/useWithdrawFlow";
import { useIsDesktop } from "../../hook/useIsDesktop";
import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import MemberShell, { EmptyState } from "./MemberShell";
import { BET_TABS, useBetRecords } from "../../features/history/useBetRecords";
import { rangeOf, shortDate } from "../../features/history/dateRange";
import {
  ACCOUNT_TABS,
  PL_TABS,
  useAccountRecords,
  useProfitLoss,
  useRequestRecords,
  useTurnoverRecords,
} from "../../features/history/useRecords";

/** "09/25 16:12:30" — রেকর্ডের সময় */
const fmtTime = (value) => {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** + জমা সবুজ, − কাটা লাল, চিহ্ন সহ */
const signed = (n, decimal = true) => `${Number(n) > 0 ? "+" : ""}${fmt(n, decimal)}`;

/** টাকার লেখা — ডেসিমাল টগল বন্ধ থাকলে পূর্ণসংখ্যা (মূল সাইটের মতো) */
const fmt = (value, decimal = true) => {
  const n = Number(value) || 0;
  return decimal
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(n).toLocaleString("en-US");
};

/**
 * টার্নওভারের প্রোভাইডার — ছবি (নাম tooltip এ), `withName` দিলে পাশে নামও।
 * খালি তালিকা মানে যে কোনো প্রোভাইডারে খেললেই গোনে।
 */
const ProviderIcons = ({ list, size, withName = false, anyText }) => {
  if (!list?.length) return <span>{anyText}</span>;
  return (
    <span className="inline-flex flex-wrap items-center" style={{ gap: withName ? "4px 10px" : 4, justifyContent: "inherit" }}>
      {list.map((p) => (
        <span key={p.providerCode} title={`${p.providerName || p.providerCode} ${p.percent ?? 100}%`} className="inline-flex items-center" style={{ gap: 4 }}>
          {p.image ? (
            <img src={p.image} alt={p.providerName || p.providerCode} style={{ width: size, height: size, objectFit: "contain", borderRadius: 4, background: "#2b2b2b" }} />
          ) : (
            <span style={{ fontWeight: 600 }}>{p.providerCode}</span>
          )}
          {withName && (
            <span>
              {p.providerName || p.providerCode} {p.percent ?? 100}%
            </span>
          )}
        </span>
      ))}
    </span>
  );
};

/** লাভ/ক্ষতির রঙ — লাভ সবুজ, ক্ষতি লাল */
const plColor = (n) => (n > 0 ? "var(--member-success, #16a34a)" : n < 0 ? "var(--member-accent, #e8474c)" : undefined);

/**
 * রেকর্ড দেখানোর ফিচার — বেটিং রেকর্ড, অ্যাকাউন্ট রেকর্ড,
 * লাভ ও ক্ষতি, জমা/উত্তোলন রেকর্ড।
 *
 *   ডেস্কটপ — মডালে চওড়া টেবিল + তারিখের ফিল্টার
 *   মোবাইল — আলাদা পেজ, চিপের ফিল্টার + খালি অবস্থার ছবি
 */

/* ─────────────────── ডেস্কটপ (মডালের ভিতরে) ─────────────────── */
/**
 * ডেস্কটপ মডালের রেকর্ড ট্যাব — বেটিং রেকর্ড, অ্যাকাউন্ট রেকর্ড,
 * লাভ ও ক্ষতি।
 *
 * মূল সাইট থেকে মাপা:
 *   উপরে গেমের ট্যাব সারি (সক্রিয়টা লাল #E8474C, নিচে লাল রেখা),
 *     বেটিং রেকর্ডে ডানে লাল পিল "বর্জিত টার্নওভার তালিকা"
 *   ফিল্টার সারি — রেডিও (আজ / গতকাল / ৭ দিন / ○), ক্যালেন্ডার সহ
 *     তারিখের বাক্স, কোথাও "বিক্রেতা: সব" ড্রপডাউন, লাল "অন্যান্য"
 *     বোতাম, আর গিয়ার আইকন
 *   টেবিলের শিরোনাম সারি ধূসর (#FAFAFA), নিচে খালি বার্তা মাঝখানে
 *   নিচে "মোট" সারি, আর একদম নিচে "ডেসিমাল পয়েন্ট" টগল
 */
const RANGES = ["today", "yesterday", "days7", "custom"];

/** "স্থিতি: সব ▾" — মূল সাইটের ফিল্টারের ড্রপডাউন */
const FilterSelect = ({ label, value, onChange, options }) => (
  <span className="flex items-center" style={{ gap: 4, marginRight: 10 }}>
    {label}:
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer appearance-none"
      style={{
        height: 34,
        minWidth: 111,
        padding: "0 34px 0 5px",
        border: "1px solid var(--member-line, #e5e5e5)",
        borderRadius: 5,
        color: "#646464",
        fontSize: 14,
        outline: "none",
        // মূল সাইটের `.select-control` — ডানে ধূসর চেভরন
        background: `#fbfbfb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23555' stroke-width='1.8'/%3E%3C/svg%3E") right 12px center / 12px 8px no-repeat`,
      }}
    >
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  </span>
);

/** মূল সাইটের কলাম — `w` চওড়া, `pad` ভিতরের ফাঁক, `align` */
const COL_SPECS = {
  betRecord: [
    { w: 95, pad: "0 0 0 5px" },
    { w: 130, pad: "0 0 0 20px" },
    { w: 130, pad: "0 0 0 20px" },
    { w: 130, pad: "0 0 0 20px" },
    { w: 187, pad: "0 0 0 60px" },
    { w: 200, pad: "0 0 0 20px" },
    { w: 65 },
  ],
  profitLoss: [{ w: 110, pad: "0 12px 0 8px", align: "right" }, ...Array(7).fill({ w: 110, pad: "0 12px 0 0", align: "right" })],
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

const CalendarIcon = () => (
  <svg viewBox="0 0 16 17" style={{ position: "absolute", left: 9, width: 15, height: 17 }} aria-hidden="true">
    <rect x="1" y="2.5" width="14" height="13.5" rx="1.5" fill="none" stroke="#555" strokeWidth="1.4" />
    <rect x="1" y="2.5" width="14" height="4" fill="#555" />
    <path d="M4.5 1v3M11.5 1v3" stroke="#555" strokeWidth="1.4" />
    <text x="8" y="14" fontSize="6.5" textAnchor="middle" fill="#555" fontWeight="700">31</text>
  </svg>
);

const GearIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} aria-hidden="true">
    <path
      fill="currentColor"
      d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1l-.4-2.7h-4l-.4 2.7a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.7h4l.4-2.7a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
    />
  </svg>
);

const Desktop = ({ tab }) => {
  const { t } = useLanguage();
  const [range, setRange] = useState("today");
  // ডিপোজিটের "জমা রেকর্ড" বোতাম থেকে এলে সরাসরি জমার ট্যাব
  const [gameTab, setGameTab] = useState(() => {
    try {
      const sub = sessionStorage.getItem("tb_rec_sub");
      sessionStorage.removeItem("tb_rec_sub");
      return tab === "accountRecord" && sub ? Number(sub) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [decimal, setDecimal] = useState(false);

  const { lang } = useLanguage();
  // মূল সাইটের ডেস্কটপে বাংলায় সংখ্যাও বাংলা (৭ দিন, ০৯/২৬ …)
  const bnNum = (text) => (lang === "bn" ? String(text).replace(/[0-9]/g, (d) => BN_DIGITS[d]) : text);
  const [vendor, setVendor] = useState("all");
  const config = t.member.desk[tab];
  const dr = t.deskRec;
  const isAccTab = tab === "accountRecord";
  // অ্যাকাউন্ট রেকর্ড — মূল সাইটের মতো তিন ট্যাব: লেনদেন / জমা / উত্তোলন রেকর্ড
  const tabs = isAccTab ? dr.tabs : config.tabs ?? [];
  const columns = isAccTab ? dr.columns[gameTab] : config.columns;
  const [accType, setAccType] = useState("all");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");

  // বেটিং রেকর্ড server থেকে; অন্য রেকর্ডগুলো নিজ নিজ ধাপে আসবে
  const isBet = tab === "betRecord";
  const bet = useBetRecords({ range, tab: BET_TABS[gameTab], enabled: isBet });

  const span = rangeOf(range);
  const from = shortDate(span.from);
  const to = shortDate(span.to);

  const isAcc = tab === "accountRecord";
  const isPL = tab === "profitLoss";
  const acc = useAccountRecords({ range, type: accType, enabled: isAcc && gameTab === 0 });
  const reqKind = isAcc && gameTab === 1 ? "deposit" : isAcc && gameTab === 2 ? "withdraw" : null;
  const requests = useRequestRecords({ kind: reqKind || "deposit", range, enabled: Boolean(reqKind) });
  const nameOf = (v) => (v && typeof v === "object" ? v[lang] || v.bn || v.en || "" : v || "");
  const reqRows = requests.rows.filter(
    (r) => (status === "all" || r.status === status) && (method === "all" || r.methodId?.toLowerCase() === method),
  );
  const methodOptions = [...new Set(requests.rows.map((r) => r.methodId?.toLowerCase()).filter(Boolean))];
  const statusText = (st) => (
    <span style={{ color: st === "approved" ? "var(--member-success, #16a34a)" : st === "rejected" ? "var(--member-accent, #e8474c)" : "#f5a623" }}>{dr.status[st] || st}</span>
  );
  const shortId = (r) => String(r._id || "").slice(-10).toUpperCase();
  const pl = useProfitLoss({ range, tab: PL_TABS[gameTab], enabled: isPL });
  const isTurn = isAcc && gameTab === 3;
  const turn = useTurnoverRecords({ range, enabled: isTurn });
  const tv = dr.turnover;
  const turnRows = turn.rows.filter((r) => status === "all" || r.status === status);
  const turnStatus = (st) => (
    <span style={{ color: st === "completed" ? "var(--member-success, #16a34a)" : st === "cancelled" ? "var(--member-muted, #999)" : "#f5a623" }}>{tv.status[st] || st}</span>
  );
  const typeLabel = (type) => t.records.types[type] || type;

  const vendorOptions = [...new Set(bet.rows.map((row) => row.providerCode).filter(Boolean))];

  const betCells = (row) => [
    row.providerCode || "—",
    fmt(row.bet, decimal),
    fmt(row.validBet, decimal),
    fmt(row.win, decimal),
    <span key="pl" style={{ color: plColor(row.net) }}>{fmt(row.net, decimal)}</span>,
    (lang === "bn" && row.gameNameBn) || row.gameName || "—",
    row.count,
  ];

  /** যে রেকর্ডই হোক — সারি, মোট আর লোড হচ্ছে কিনা এক রূপে */
  const table = isBet
    ? {
        loading: bet.loading,
        rows: bet.rows.filter((row) => vendor === "all" || row.providerCode === vendor).map((row) => ({ key: row.gameUId, cells: betCells(row) })),
        totals: [
          t.member.desk.total,
          fmt(bet.totals.bet, true),
          fmt(bet.totals.validBet, true),
          fmt(bet.totals.win, true),
          <span key="pl" style={{ color: plColor(bet.totals.net) }}>{fmt(bet.totals.net, true)}</span>,
          "",
          bet.totals.count,
        ],
      }
    : isAcc && gameTab === 0
      ? {
          loading: acc.loading,
          rows: acc.rows.map((row) => ({
            key: row.orderNo,
            cells: [
              typeLabel(row.type),
              fmtTime(row.createdAt),
              <span key="a" style={{ color: plColor(row.amount) }}>{signed(row.amount, decimal)}</span>,
              fmt(row.balanceAfter, decimal),
              row.orderNo,
              row.note || "—",
            ],
          })),
          totals: [t.member.desk.total, "", <span key="t" style={{ color: plColor(acc.totals.amount) }}>{signed(acc.totals.amount, decimal)}</span>, "", "", ""],
        }
      : isAcc && gameTab === 1
        ? {
            loading: requests.loading,
            rows: reqRows.map((r) => ({
              key: r._id,
              cells: [
                shortId(r),
                nameOf(r.display?.methodName) || r.methodId,
                fmt(r.amount, decimal),
                r.status === "approved" ? fmt(r.calc?.creditedAmount ?? r.amount, decimal) : "—",
                fmt(r.calc?.totalBonus, decimal),
                fmt(0, decimal),
                fmtTime(r.createdAt),
                r.approvedAt ? fmtTime(r.approvedAt) : "—",
                statusText(r.status),
                r.adminNote || "—",
              ],
            })),
            totals: [
              t.member.desk.total,
              "",
              fmt(reqRows.reduce((sum, r) => sum + Number(r.amount || 0), 0), decimal),
              fmt(reqRows.filter((r) => r.status === "approved").reduce((sum, r) => sum + Number(r.calc?.creditedAmount ?? r.amount ?? 0), 0), decimal),
              "",
              "",
              "",
              "",
              "",
              "",
            ],
          }
        : isAcc && gameTab === 2
          ? {
              loading: requests.loading,
              rows: reqRows.map((r) => ({
                key: r._id,
                cells: [
                  shortId(r),
                  dr.eWallet,
                  fmt(r.amount, decimal),
                  `${nameOf(r.walletSnapshot?.methodName) || r.methodId} ${r.walletSnapshot?.walletNumber ? `· ${maskNumber(r.walletSnapshot.walletNumber)}` : ""}`,
                  fmtTime(r.createdAt),
                  statusText(r.status),
                  r.adminNote || (r.trxId ? `TrxID ${r.trxId}` : "—"),
                ],
              })),
              totals: [t.member.desk.total, "", fmt(reqRows.reduce((sum, r) => sum + Number(r.amount || 0), 0), decimal), "", "", "", ""],
            }
      : isTurn
        ? {
            loading: turn.loading,
            rows: turnRows.map((r) => ({
              key: r._id,
              cells: [
                tv.source[r.sourceType] || r.title || r.sourceType,
                fmt(r.creditedAmount, decimal),
                fmt(r.required, decimal),
                fmt(Math.min(r.progress, r.required), decimal),
                `${r.percent ?? 0}%`,
                <ProviderIcons key="p" list={r.eligibleProviders} size={20} anyText={tv.anyProvider} />,
                fmtTime(r.createdAt),
                turnStatus(r.status),
              ],
            })),
            totals: [
              t.member.desk.total,
              fmt(turnRows.reduce((sum, r) => sum + Number(r.creditedAmount || 0), 0), decimal),
              fmt(turnRows.reduce((sum, r) => sum + Number(r.required || 0), 0), decimal),
              fmt(turnRows.reduce((sum, r) => sum + Math.min(Number(r.progress || 0), Number(r.required || 0)), 0), decimal),
              "",
              "",
              "",
              "",
            ],
          }
      : isPL
        ? {
            loading: pl.loading,
            rows: pl.rows.map((row) => ({
              key: row.date,
              cells: [
                row.date,
                fmt(row.deposit, decimal),
                fmt(row.withdraw, decimal),
                fmt(row.bet, decimal),
                fmt(row.win, decimal),
                fmt(row.rebate, decimal),
                fmt(row.promotion, decimal),
                <span key="p" style={{ color: plColor(row.profit) }}>{fmt(row.profit, decimal)}</span>,
              ],
            })),
            totals: [
              t.member.desk.total,
              fmt(pl.totals.deposit, decimal),
              fmt(pl.totals.withdraw, decimal),
              fmt(pl.totals.bet, decimal),
              fmt(pl.totals.win, decimal),
              fmt(pl.totals.rebate, decimal),
              fmt(pl.totals.promotion, decimal),
              <span key="p" style={{ color: plColor(pl.totals.profit) }}>{fmt(pl.totals.profit, decimal)}</span>,
            ],
          }
        : null;

  // মূল সাইটের কলামের মাপ — বেটিং রেকর্ডে চওড়া আলাদা আর লেখা বাঁয়ে,
  // লাভ ও ক্ষতিতে ১১০ করে আর লেখা ডানে; বাকিগুলো সমান ভাগে মাঝখানে
  const spec = COL_SPECS[tab];
  const cellStyle = (index) => {
    const s = spec?.[index];
    if (!s) return { flex: 1, textAlign: "center", padding: "0 4px" };
    return { width: s.w, flex: "none", textAlign: s.align || "left", padding: s.pad || "0" };
  };
  const dateText = isPL ? `${from}~${to}` : `${from} 00:00:00~${to} 23:59:59`;

  return (
    <div className="flex flex-col" style={{ width: 1110, height: 620, background: "var(--member-surface, #fff)" }}>
      {/* গেমের ট্যাব — মূল সাইটের `.tab-nav` (৪৭ উঁচু, বাঁয়ে ৩০) */}
      <div className="flex items-center" style={{ height: 47, borderBottom: "1px solid var(--member-line, #eee)", padding: "0 60px 0 30px", gap: 20 }}>
        {tabs.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setGameTab(index);
              setStatus("all");
              setMethod("all");
            }}
            className="relative h-full cursor-pointer"
            style={{ padding: "0 10px", fontSize: 14, color: index === gameTab ? "var(--member-accent, #fd2f2f)" : "var(--member-text, #666)" }}
          >
            {label}
            {index === gameTab && <span className="absolute bottom-0 left-0 right-0" style={{ height: 3, background: "var(--member-accent, #fd2f2f)" }} />}
          </button>
        ))}

        <span className="flex-1" />

        {config.action && (
          <span className="flex cursor-pointer items-center justify-center" style={{ height: 30, padding: "0 10px", borderRadius: 20, background: "#f28989", color: "#fff", fontSize: 13 }}>
            {config.action}
          </span>
        )}
      </div>

      {/* ফিল্টার সারি — ৩৪ উঁচু ঘর, রেডিও ২০ */}
      <div className="flex items-center" style={{ height: 55, padding: "0 15px", fontSize: 14, color: "var(--member-text, #666)" }}>
        {RANGES.map((key) => (
          <label key={key} className="flex cursor-pointer items-center" style={{ gap: 5, marginRight: 15 }}>
            <input type="radio" className="hidden" checked={range === key} onChange={() => setRange(key)} />
            <span className="grid place-items-center" style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${range === key ? "#fb3232" : "#eaeaea"}`, background: "var(--member-surface, #fff)" }}>
              {range === key && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fb3232" }} />}
            </span>
            {key !== "custom" && <span>{bnNum(key === "days7" ? t.member.pages.days7 : t.member.ranges[key])}</span>}
          </label>
        ))}

        <span
          className="flex items-center"
          style={{ height: 34, width: isPL ? 136 : 235, marginLeft: -10, padding: "0 5px 0 30px", position: "relative", borderRadius: 5, border: "1px solid var(--member-line, #e5e5e5)", background: "#f5f5f5", color: "#646464", whiteSpace: "nowrap", overflow: "hidden" }}
        >
          <CalendarIcon />
          {bnNum(dateText)}
        </span>

        <span style={{ width: 1, height: 30, background: "#e5e5e5", margin: "0 10px" }} />

        {isAccTab && gameTab === 0 && <FilterSelect label={dr.orderType} value={accType} onChange={setAccType} options={dr.typeKeys.map((k) => [k, dr.types[k]])} />}
        {isTurn && (
          <FilterSelect label={dr.statusLabel} value={status} onChange={setStatus} options={["all", "running", "completed", "cancelled"].map((k) => [k, k === "all" ? dr.types.all : tv.status[k]])} />
        )}
        {isAccTab && gameTab > 0 && !isTurn && (
          <FilterSelect label={dr.statusLabel} value={status} onChange={setStatus} options={["all", "pending", "approved", "rejected"].map((k) => [k, k === "all" ? dr.types.all : dr.status[k]])} />
        )}
        {isAccTab && gameTab === 1 && <FilterSelect label={dr.methodLabel} value={method} onChange={setMethod} options={[["all", dr.types.all], ...methodOptions.map((k) => [k, k.toUpperCase()])]} />}
        {config.vendorSelect && !isAccTab && (
          <FilterSelect label={t.member.desk.vendorLabel.replace(/[:：]\s*$/, "")} value={vendor} onChange={setVendor} options={[["all", dr.types.all], ...vendorOptions.map((k) => [k, k])]} />
        )}

        <button
          type="button"
          onClick={() => setRange("today")}
          className="tb-hover-fade cursor-pointer"
          style={{ width: 98, height: 34, marginLeft: 10, borderRadius: 17, background: "linear-gradient(180deg,#ff4040,#f21d1d)", boxShadow: "0 3px 8px rgba(242,29,29,.35)", color: "#fff", fontSize: 14, fontWeight: 700 }}
        >
          {t.member.desk.other}
        </button>

        {config.gear && (
          <span className="grid cursor-pointer place-items-center" style={{ width: 36, height: 36, marginLeft: 10, borderRadius: "50%", background: "#e5e5e5", color: "#8a8a8a" }}>
            <GearIcon />
          </span>
        )}
      </div>

      {/* টেবিলের শিরোনাম — ২৯ উঁচু, #f6f6f6 */}
      <div className="flex items-center" style={{ height: 29, background: "#f6f6f6", padding: "0 25px", fontSize: 12, color: "#818181" }}>
        {columns.map((column, index) => (
          <span key={`${column}-${index}`} className="truncate" style={cellStyle(index)}>
            {column}
          </span>
        ))}
      </div>

      {/* সারিগুলো, নয়তো খালি অবস্থা */}
      {table && table.rows.length > 0 ? (
        <div className="flex-1 overflow-y-auto" style={{ background: "var(--member-surface, #fff)", padding: "0 25px" }}>
          {table.rows.map((row) => (
            <div key={row.key} className="flex items-center" style={{ height: 40, borderBottom: "1px solid #f0f0f0", fontSize: 12, color: "var(--member-title, #333)" }}>
              {row.cells.map((cell, index) => (
                <span key={index} className="truncate" style={cellStyle(index)}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 text-center" style={{ color: "var(--member-text, #666)", fontSize: 12, background: "#efefef", paddingTop: 190 }}>
          {table?.loading ? t.auth.wait : t.member.desk.noMatch}
        </div>
      )}

      {/* মোট সারি — ৩০ উঁচু, #e3e2e2 */}
      <div className="flex items-center" style={{ height: 30, background: "#e3e2e2", padding: "0 25px", fontSize: 12, color: "var(--member-text, #666)" }}>
        {(table ? table.totals : columns.map((_, index) => (index === 0 ? t.member.desk.total : (config.zero ?? "0.00")))).map((cell, index) => (
          <span key={`total-${index}`} className="truncate" style={cellStyle(index)}>
            {cell}
          </span>
        ))}
      </div>

      {/* নিচের বার — ৪৬ উঁচু */}
      <div className="flex items-center justify-end" style={{ height: 46, padding: "0 20px", gap: 10, fontSize: 12, color: "var(--member-text, #666)" }}>
        {config.note && <span style={{ color: "#fc5449" }}>{config.note}</span>}
        <span>{t.member.desk.decimal}</span>
        <button
          type="button"
          onClick={() => setDecimal((v) => !v)}
          className="relative cursor-pointer"
          style={{ width: 40, height: 24, borderRadius: 12, background: decimal ? "var(--member-accent, #fd2f2f)" : "#dcdce0", transition: "background .2s" }}
        >
          <span className="absolute" style={{ top: 2, left: decimal ? 18 : 2, width: 20, height: 20, borderRadius: "50%", background: "var(--member-surface, #fff)", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .2s" }} />
        </button>
      </div>
    </div>
  );
};

/* ─────────────────── মোবাইল (আলাদা পেজ) ─────────────────── */
/**
 * রেকর্ড দেখানোর সাব-পেজ — বেটিং রেকর্ড, লাভ ও লস, জমা/উত্তোলন রেকর্ড,
 * অ্যাকাউন্ট রেকর্ড।
 *
 * মূল সাইট থেকে মাপা:
 *   ফিল্টার সারি — সক্রিয় চিপ ভরাট নীল (#1E9BF0) সাথে ✓, বাকিগুলো
 *     সাদা পটভূমিতে নীল বর্ডার ও নীল লেখা; শেষে ক্যালেন্ডার আইকন সহ
 *     তারিখের সীমা
 *   বেটিং রেকর্ডে উপরে গেমের ট্যাব সারি (স্লট/মাছ/লাইভ/পোকার/খেলাধুলা)
 *   "লাভ এবং লস" পেজের শিরোনাম আসলে "ব্যক্তিগত প্রতিবেদন", আর
 *     ফিল্টারে "7 দিন" ও আছে
 *   ডেটা না থাকলে নীল ইলাস্ট্রেশন + "কোন ডেটা নেই"; কিছু পেজের নিচে
 *     লাল অস্বীকরণ বার
 */
const GAME_TABS = ["RNG", "FISH", "LIVE", "PVP", "SPORTS"];

const BLUE = "var(--member-link, #1e9bf0)";

/**
 * নীল রেখার বোতামের চেহারায় আসল `<select>` — মূল সাইটের "সব" / "প্রকার"
 * বোতাম চাপলে তালিকা খোলে; এখানে ব্রাউজারের নিজের তালিকা।
 */
const SelectChip = ({ value, onChange, options, children, filled = false, gray = false, style }) => (
  <span
    className="relative flex shrink-0 items-center"
    style={{
      height: m(62),
      padding: `0 ${m(26)}`,
      borderRadius: m(8),
      border: gray ? "none" : `1px solid ${BLUE}`,
      background: filled ? BLUE : gray ? "#e2e2e6" : "#fff",
      color: filled ? "#fff" : gray ? "var(--member-text, #555)" : BLUE,
      fontSize: m(28),
      gap: m(10),
      ...style,
    }}
  >
    {children}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute inset-0 cursor-pointer opacity-0"
      aria-label={typeof children === "string" ? children : undefined}
    >
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  </span>
);

const Chevron = () => (
  <svg viewBox="0 0 12 8" style={{ width: m(22), height: m(14) }} aria-hidden="true">
    <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const Mobile = ({ tab, titleKey, withGameTabs = false, withDays7 = false, pageTitle }) => {
  const { t, lang } = useLanguage();
  const [range, setRange] = useState("today");
  const [gameTab, setGameTab] = useState(GAME_TABS[0]);

  const isBet = tab === "betRecord";
  const bet = useBetRecords({ range, tab: gameTab, enabled: isBet });

  // মোবাইলে জমা/উত্তোলন রেকর্ড আলাদা পাতা — আবেদনের তালিকা, অবস্থাসহ
  const isTurn = titleKey === "turnoverRecord";
  // টার্নওভার রেকর্ডও জমা/উত্তোলনের মতো আলাদা পাতা, একই ফিল্টারের চেহারা
  const requestKind = titleKey === "depositRecord" ? "deposit" : titleKey === "withdrawRecord" ? "withdraw" : isTurn ? "turnover" : "";
  const isAcc = tab === "accountRecord" && !requestKind;
  const isPL = tab === "profitLoss";
  const [accType, setAccType] = useState("all");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [vendor, setVendor] = useState("all");
  const acc = useAccountRecords({ range, type: accType, enabled: isAcc });
  const rawRequests = useRequestRecords({ kind: requestKind, range, enabled: Boolean(requestKind) && !isTurn });
  const rawTurn = useTurnoverRecords({ range, enabled: isTurn });
  const turn = { ...rawTurn, rows: rawTurn.rows.filter((r) => status === "all" || r.status === status) };
  const requests = {
    ...rawRequests,
    rows: rawRequests.rows.filter(
      (r) => (status === "all" || r.status === status) && (method === "all" || r.methodId?.toLowerCase() === method),
    ),
  };
  const methodOptions = [...new Set(rawRequests.rows.map((r) => r.methodId?.toLowerCase()).filter(Boolean))];
  const betRows = vendor === "all" ? bet.rows : bet.rows.filter((row) => row.providerCode === vendor);
  const vendorOptions = [...new Set(bet.rows.map((row) => row.providerCode).filter(Boolean))];
  const dr = t.deskRec;
  const pl = useProfitLoss({ range, enabled: isPL });

  const keys = withDays7
    ? ["today", "yesterday", "days7"]
    : ["today", "yesterday", "week", "month"];

  const ranges = keys.map((key) => ({
    key,
    label: key === "days7" ? t.memberPage.pages.days7 : t.member.ranges[key],
  }));

  const tabs = withGameTabs
    ? GAME_TABS.map((key) => ({ key, label: t.memberPage.pages.gameTabs[key] }))
    : undefined;

  const span = rangeOf(range);

  return (
    <MemberShell
      title={pageTitle ? t.memberPage.pages[pageTitle].title : t.memberPage.items[titleKey]}
      tabs={tabs}
      onTab={setGameTab}
      // বেটিং রেকর্ডে মূল সাইটের মতো ডান-উপরে নীল "বর্জিত টার্নওভার তালিকা"
      action={isBet ? { label: t.member.desk.betRecord.action, onClick: () => {} } : undefined}
    >
      {/* ফিল্টার — মূল সাইটের প্রতিটা পাতার নিজের চেহারা */}
      {requestKind ? (
        <>
          {/* আজ / গতকাল / 7 দিন — নীল দাগের ট্যাব */}
          <div className="flex" style={{ background: "var(--member-surface, #fff)", height: m(96), borderBottom: "1px solid var(--member-line, #eee)" }}>
            {["today", "yesterday", "days7"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className="relative flex-1 cursor-pointer"
                style={{ color: range === key ? BLUE : "#333", fontSize: m(30) }}
              >
                {key === "days7" ? t.memberPage.pages.days7 : t.member.ranges[key]}
                {range === key && <span className="absolute bottom-0 left-0" style={{ width: "100%", height: m(5), background: BLUE }} />}
              </button>
            ))}
          </div>
          <div className="flex items-center" style={{ background: "#f0f0f2", padding: `${m(20)} ${m(32)}`, gap: m(40) }}>
            {isTurn ? (
              <SelectChip value={status} onChange={setStatus} options={["all", "running", "completed", "cancelled"].map((k) => [k, k === "all" ? dr.types.all : dr.turnover.status[k]])}>
                {status === "all" ? dr.types.all : dr.turnover.status[status]}
              </SelectChip>
            ) : (
              <SelectChip value={status} onChange={setStatus} options={["all", "pending", "approved", "rejected"].map((k) => [k, k === "all" ? dr.types.all : dr.status[k]])}>
                {status === "all" ? dr.types.all : dr.status[status]}
              </SelectChip>
            )}
            {requestKind === "deposit" && (
              <SelectChip value={method} onChange={setMethod} options={[["all", dr.types.all], ...methodOptions.map((k) => [k, k.toUpperCase()])]}>
                {method === "all" ? t.memberPage.pages.recordType : method.toUpperCase()}
              </SelectChip>
            )}
            <span className="flex shrink-0 items-center" style={{ height: m(62), padding: `0 ${m(26)}`, borderRadius: m(8), border: `1px solid ${BLUE}`, background: "var(--member-surface, #fff)", color: BLUE, fontSize: m(28), gap: m(12), marginLeft: requestKind === "deposit" ? "auto" : 0 }}>
              <Icon name="discount-calender" size={m(34)} />
              {shortDate(span.from)}- {shortDate(span.to)}
            </span>
          </div>
        </>
      ) : isAcc ? (
        <div className="flex items-center" style={{ background: "#f0f0f2", padding: `${m(14)} ${m(24)}`, gap: m(16) }}>
          <SelectChip gray value={accType} onChange={setAccType} options={dr.typeKeys.map((k) => [k, dr.types[k]])}>
            {dr.types[accType]}
            <Chevron />
          </SelectChip>
          <SelectChip filled value={range} onChange={setRange} options={keys.map((k) => [k, k === "days7" ? t.memberPage.pages.days7 : t.member.ranges[k]])}>
            <Icon name="achievement-done" size={m(32)} />
            {ranges.find((r) => r.key === range)?.label}
          </SelectChip>
          <span className="flex shrink-0 items-center" style={{ height: m(62), padding: `0 ${m(20)}`, borderRadius: m(8), background: "#e2e2e6", color: "var(--member-text, #555)", fontSize: m(28), gap: m(12) }}>
            <Icon name="discount-calender" size={m(34)} />
            {shortDate(span.from)}- {shortDate(span.to)}
          </span>
        </div>
      ) : isBet ? (
        <div className="flex items-center" style={{ background: "var(--member-surface, #fff)", padding: `${m(16)} ${m(20)}`, gap: m(16), borderBottom: "1px solid var(--member-line, #eee)" }}>
          <SelectChip value={range} onChange={setRange} options={keys.map((k) => [k, k === "days7" ? t.memberPage.pages.days7 : t.member.ranges[k]])} style={{ padding: `0 ${m(18)}` }}>
            <Icon name="discount-calender" size={m(34)} />
            {shortDate(span.from)} 00:00:00- {shortDate(span.to)} 23:59:59
          </SelectChip>
          <SelectChip value={vendor} onChange={setVendor} options={[["all", dr.types.all], ...vendorOptions.map((k) => [k, k])]} style={{ padding: `0 ${m(18)}` }}>
            <Chevron />
            {vendor === "all" ? dr.types.all : vendor}
          </SelectChip>
        </div>
      ) : (
      <div
        className="hide-scrollbar flex overflow-x-auto items-center"
        style={{ background: "var(--member-surface, #fff)", padding: `${m(20)} ${m(24)}`, gap: m(16) }}
      >
        {ranges.map((option) => {
          const active = option.key === range;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
              className="flex shrink-0 cursor-pointer items-center"
              style={{
                height: m(62),
                padding: `0 ${m(16)}`,
                borderRadius: m(12),
                background: active ? "var(--member-link, #1e9bf0)" : "var(--member-surface, #fff)",
                border: `1px solid ${active ? "var(--member-link, #1e9bf0)" : "var(--member-link, #1e9bf0)"}`,
                color: active ? "#fff" : "var(--member-link, #1e9bf0)",
                fontSize: m(26),
                gap: m(10),
              }}
            >
              {active && <Icon name="achievement-done" size={m(32)} />}
              {option.label}
            </button>
          );
        })}

        <span
          className="flex shrink-0 items-center"
          style={{
            height: m(62),
            padding: `0 ${m(16)}`,
            borderRadius: m(12),
            border: "1px solid var(--member-link, #1e9bf0)",
            color: "var(--member-link, #1e9bf0)",
            fontSize: m(26),
            gap: m(12),
          }}
        >
          <Icon name="discount-calender" size={m(34)} />
          {shortDate(span.from)}- {shortDate(span.to)}
        </span>
      </div>
      )}

      {!isBet ? (
        <MobileRows kind={requestKind || (isPL ? "pl" : isAcc ? "acc" : "")} acc={acc} requests={requests} pl={pl} turn={turn} />
      ) : betRows.length > 0 ? (
        <div style={{ padding: `${m(20)} ${m(24)} ${m(200)}`, background: "var(--member-page-bg, #f5f5f9)" }}>
          {betRows.map((row) => (
            <div
              key={row.gameUId}
              style={{ background: "var(--member-surface, #fff)", borderRadius: m(16), padding: m(24), marginBottom: m(16), fontSize: m(26), color: "var(--member-title, #333)" }}
            >
              <div className="flex items-center" style={{ gap: m(12), marginBottom: m(14) }}>
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: m(30), fontWeight: 700 }}>
                  {(lang === "bn" && row.gameNameBn) || row.gameName || "—"}
                </span>
                <span style={{ color: "var(--member-link, #1e9bf0)", fontSize: m(24) }}>{row.providerCode}</span>
              </div>
              {[
                [t.member.desk.betRecord.columns[1], fmt(row.bet)],
                [t.member.desk.betRecord.columns[2], fmt(row.validBet)],
                [t.member.desk.betRecord.columns[3], fmt(row.win)],
                [t.member.desk.betRecord.columns[4], <span key="pl" style={{ color: plColor(row.net) }}>{fmt(row.net)}</span>],
                [t.member.desk.betRecord.columns[6], row.count],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between" style={{ padding: `${m(6)} 0`, color: "var(--member-text, #666)" }}>
                  <span>{label}</span>
                  <span style={{ color: "var(--member-title, #333)", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* বেটিং রেকর্ডের নিচের ধূসর সারাংশ — মূল সাইটের মতো সবুজ সংখ্যা */}
      {isBet && (
        <div className="fixed bottom-0 left-0 grid w-full grid-cols-2" style={{ background: "#e8e8ea", padding: `${m(16)} ${m(60)}`, rowGap: m(4), zIndex: 5 }}>
          {[
            [t.member.desk.betRecord.columns[1], betRows.reduce((sum, r) => sum + Number(r.bet || 0), 0)],
            [t.member.desk.betRecord.columns[2], betRows.reduce((sum, r) => sum + Number(r.validBet || 0), 0)],
            [t.memberPage.pages.win, betRows.reduce((sum, r) => sum + Number(r.win || 0), 0)],
            [t.memberPage.pages.plLabel, betRows.reduce((sum, r) => sum + Number(r.net || 0), 0)],
          ].map(([label, value]) => (
            <div key={label} style={{ fontSize: m(26), color: "var(--member-title, #333)", lineHeight: 1.25 }}>
              {label}
              <div style={{ color: "#6cc31b" }}>{fmt(value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* অস্বীকরণ বার — মূল সাইটে লাভ-লস ও রিবেটে থাকে */}
      {withDays7 && (
        <div
          className="fixed bottom-0 left-0 flex w-full items-center justify-center"
          style={{
            zIndex: 5,
            background: "#fff5f5",
            borderTop: "1px solid #ffdcdc",
            color: "var(--member-accent, #e60012)",
            fontSize: m(26),
            padding: m(20),
            gap: m(12),
          }}
        >
          <span
            className="grid place-items-center"
            style={{
              width: m(34),
              height: m(34),
              borderRadius: "50%",
              background: "#f97316",
              color: "#fff",
              fontSize: m(24),
            }}
          >
            !
          </span>
          {t.memberPage.pages.note}
        </div>
      )}
    </MemberShell>
  );
};

/** মোবাইলের অ্যাকাউন্ট রেকর্ড / জমা-উত্তোলন রেকর্ড / লাভ-ক্ষতির কার্ড */
const MobileRows = ({ kind, acc, requests, pl, turn }) => {
  const { t } = useLanguage();
  const r = t.records;

  const card = (key, head, lines, right, footer = null) => (
    <div key={key} style={{ background: "var(--member-surface, #fff)", borderRadius: m(16), padding: m(24), marginBottom: m(16), fontSize: m(26), color: "var(--member-title, #333)" }}>
      <div className="flex items-center" style={{ gap: m(12), marginBottom: m(10) }}>
        <span className="min-w-0 flex-1 truncate" style={{ fontSize: m(30), fontWeight: 700 }}>{head}</span>
        {right}
      </div>
      {lines.map(([label, value]) => (
        <div key={label} className="flex justify-between" style={{ padding: `${m(6)} 0`, color: "var(--member-text, #666)" }}>
          <span>{label}</span>
          <span style={{ color: "var(--member-title, #333)", fontWeight: 600, textAlign: "right" }}>{value}</span>
        </div>
      ))}
      {footer}
    </div>
  );

  const badge = (status) => {
    const color = status === "approved" ? "var(--member-success, #16a34a)" : status === "rejected" ? "var(--member-accent, #e8474c)" : "#f59e0b";
    return (
      <span style={{ fontSize: m(22), color, border: `1px solid ${color}`, borderRadius: m(20), padding: `${m(4)} ${m(14)}` }}>
        {r.status[status] || status}
      </span>
    );
  };

  let list = [];
  let loading = false;

  if (kind === "acc") {
    loading = acc.loading;
    list = acc.rows.map((row) =>
      card(
        row.orderNo,
        r.types[row.type] || row.type,
        [
          [t.member.desk.accountRecord.columns[0], row.orderNo],
          [t.member.desk.accountRecord.columns[1], fmtTime(row.createdAt)],
          [r.balanceAfter, fmt(row.balanceAfter)],
          ...(row.note ? [[t.member.desk.accountRecord.columns[4], row.note]] : []),
        ],
        <span style={{ fontSize: m(30), fontWeight: 700, color: plColor(row.amount) }}>{signed(row.amount)}</span>,
      ),
    );
  } else if (kind === "deposit" || kind === "withdraw") {
    loading = requests.loading;
    list = requests.rows.map((row) =>
      card(
        row._id,
        `৳ ${fmt(row.amount)}`,
        [
          [t.member.desk.accountRecord.columns[1], fmtTime(row.createdAt)],
          ...(kind === "deposit"
            ? [
                [t.depositFlow.method, row.display?.methodName?.bn || row.methodId],
                ...(row.calc?.totalBonus > 0 ? [[r.bonus, `+৳ ${fmt(row.calc.totalBonus)}`]] : []),
                ...(row.fields?.trxId ? [["TrxID", row.fields.trxId]] : []),
              ]
            : [
                [t.depositFlow.method, `${row.walletSnapshot?.methodName?.bn || row.methodId} · 0${row.walletSnapshot?.walletNumber || ""}`],
                ...(row.trxId ? [["TrxID", row.trxId]] : []),
              ]),
          ...(row.status === "rejected" && row.adminNote ? [[r.reason, row.adminNote]] : []),
        ],
        badge(row.status),
      ),
    );
  } else if (kind === "turnover") {
    loading = turn.loading;
    const tv = t.deskRec.turnover;
    const cols = t.deskRec.columns[3];
    const color = (st) => (st === "completed" ? "var(--member-success, #16a34a)" : st === "cancelled" ? "#999" : "#f59e0b");
    list = turn.rows.map((row) =>
      card(
        row._id,
        tv.source[row.sourceType] || row.title || row.sourceType,
        [
          [cols[1], `৳ ${fmt(row.creditedAmount)}`],
          [cols[2], fmt(row.required)],
          [cols[3], fmt(Math.min(row.progress, row.required))],
          ...(row.status === "running" ? [[tv.remaining, fmt(Math.max(0, row.required - row.progress))]] : []),
          [cols[5], <ProviderIcons key="p" list={row.eligibleProviders} size={m(36)} withName anyText={tv.anyProvider} />],
          [cols[6], fmtTime(row.createdAt)],
          ...(row.completedAt ? [[tv.completedAt, fmtTime(row.completedAt)]] : []),
        ],
        <span style={{ fontSize: m(22), color: color(row.status), border: `1px solid ${color(row.status)}`, borderRadius: m(20), padding: `${m(4)} ${m(14)}` }}>
          {tv.status[row.status] || row.status}
        </span>,
        // অগ্রগতির দাগ — কতটা খেলা হয়েছে
        <div style={{ marginTop: m(12) }}>
          <div style={{ height: m(12), borderRadius: m(6), background: "#eee", overflow: "hidden" }}>
            <div style={{ width: `${row.percent ?? 0}%`, height: "100%", background: "var(--member-link, #1e9bf0)" }} />
          </div>
          <div style={{ textAlign: "right", fontSize: m(22), color: "var(--member-link, #1e9bf0)", marginTop: m(4) }}>{row.percent ?? 0}%</div>
        </div>,
      ),
    );
  } else if (kind === "pl") {
    loading = pl.loading;
    const cols = t.member.desk.profitLoss.columns;
    const rows = pl.rows.length ? [{ ...pl.totals, date: t.member.desk.total }, ...pl.rows] : [];
    list = rows.map((row) =>
      card(
        row.date,
        row.date,
        [
          [cols[1], fmt(row.deposit)],
          [cols[2], fmt(row.withdraw)],
          [cols[3], fmt(row.bet)],
          [cols[4], fmt(row.win)],
          [cols[5], fmt(row.rebate)],
          [cols[6], fmt(row.promotion)],
        ],
        <span style={{ fontSize: m(30), fontWeight: 700, color: plColor(row.profit) }}>{fmt(row.profit)}</span>,
      ),
    );
  }

  if (!list.length) {
    return loading ? <div style={{ padding: m(60), textAlign: "center", color: "var(--member-muted, #999)", fontSize: m(26) }}>{t.auth.wait}</div> : <EmptyState />;
  }
  return <div style={{ padding: `${m(20)} ${m(24)} ${m(30)}`, background: "var(--member-page-bg, #f5f5f9)" }}>{list}</div>;
};

const RecordSection = (props) => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <Desktop {...props} /> : <Mobile {...props} />;
};

export default RecordSection;
