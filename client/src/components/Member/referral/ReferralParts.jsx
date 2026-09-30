import React, { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import { useIsDesktop } from "../../../hook/useIsDesktop";
import { m } from "../../../hook/useUnits";
import { useLanguage } from "../../../Context/LanguageProvider";
import { notify } from "../../../utils/notify";
import { copyText, inviteLinkOf } from "../../../utils/referralLink";
import { tk, useInvitees, useReferralRecords, when } from "../../../features/referral/useReferral";

/**
 * "বন্ধুদের আমন্ত্রণ করুন" এর যে অংশগুলো ডেস্কটপ মডাল আর মোবাইল পেজে
 * একই — শুধু মাপ আলাদা। `u(ডেস্কটপ, মোবাইল)`: ডেস্কটপে px,
 * মোবাইলে ৭৫০-ডিজাইনের rem।
 */
export const useU = () => {
  const isDesktop = useIsDesktop();
  // ডেস্কটপের সংখ্যায় "px" — `${u(5, 12)} 0` এর মতো লেখার ভিতরেও যাতে ঠিক থাকে
  return { isDesktop, u: (desk, mob) => (isDesktop ? (typeof desk === "number" ? `${desk}px` : desk) : m(mob)) };
};

const fill = (text, map) => Object.entries(map).reduce((s, [k, v]) => s.replace(`{${k}}`, v), text);

/* ───────────── শেয়ার বাক্স — QR, লিংক, সোশ্যাল ───────────── */

const SOCIALS = [
  { key: "facebook", bg: "#1877f2", href: (l) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(l)}` },
  { key: "x", bg: "#000", icon: "share-x", href: (l, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(l)}` },
  { key: "telegram", bg: "#29a9eb", icon: "share-telegram", href: (l, t) => `https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent(t)}` },
  { key: "whatsapp", bg: "#25d366", icon: "share-whatsapp", href: (l, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${l}`)}` },
  { key: "sms", bg: "#4caf50", icon: "share-sms", href: (l, t) => `sms:?&body=${encodeURIComponent(`${t} ${l}`)}` },
  { key: "line", bg: "#06c755", icon: "share-line", href: (l) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(l)}` },
  { key: "threads", bg: "#000", icon: "share-threads", href: (l, t) => `https://www.threads.net/intent/post?text=${encodeURIComponent(`${t} ${l}`)}` },
];

export const ShareBox = ({ code, domain, title }) => {
  const { t } = useLanguage();
  const r = t.referralFlow;
  const { isDesktop, u } = useU();
  const link = inviteLinkOf(code, domain);

  const copy = async (value, text) => {
    if (await copyText(value)) notify.success(text);
  };

  /** QR টা ছবি হিসেবে নামানো — "কোড সংরক্ষণ" */
  const saveQr = () => {
    const canvas = document.getElementById("tb-invite-qr");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `power7-invite-${code}.png`;
    a.click();
  };

  return (
    <div style={{ background: isDesktop ? "#eef1f7" : "#f0f2f8", borderRadius: isDesktop ? 0 : m(10), padding: isDesktop ? "4px 6px 6px" : `${m(10)} ${m(14)} ${m(14)}` }}>
      <div style={{ fontSize: u(12, 24), fontWeight: 700, color: isDesktop ? "#2b2e83" : "#3b2785", marginBottom: u(2, 6) }}>{title}</div>

      <div className="flex" style={{ gap: u(12, 24) }}>
        <button type="button" onClick={saveQr} className="shrink-0 cursor-pointer self-start" title={r.myCode}>
          <div style={{ background: "var(--member-surface, #fff)", padding: u(3, 8), lineHeight: 0 }}>
            <QRCodeCanvas id="tb-invite-qr" value={link || " "} size={isDesktop ? 58 : 132} marginSize={0} style={{ width: u(58, 116), height: u(58, 116) }} />
          </div>
          <div className="text-center" style={{ background: "#4c2a85", color: "#fff", fontSize: u(8, 20), padding: `${u(2, 8)} 0`, lineHeight: 1.3 }}>
            {t.member.desk.referral.saveCode}
          </div>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="flex items-center"
            style={{ height: u(28, 48), borderRadius: u(14, 24), background: "var(--member-surface, #fff)", padding: isDesktop ? "0 4px 0 12px" : `0 ${m(6)} 0 ${m(20)}`, gap: u(6, 10), overflow: "hidden" }}
          >
            <span className="flex-1 truncate" style={{ fontSize: u(11, 20), color: "#444", fontWeight: isDesktop ? 400 : 600 }}>{link}</span>
            <button
              type="button"
              aria-label={t.memberPage.pages.referral.copy}
              onClick={() => copy(link, r.copied)}
              className="grid shrink-0 cursor-pointer place-items-center"
              style={{ width: u(22, 38), height: u(22, 38), borderRadius: "50%", background: "#4c2a85", color: "#fff", fontSize: u(11, 20) }}
            >
              ⧉
            </button>
          </div>

          <div className="hide-scrollbar flex overflow-x-auto" style={{ marginTop: u(6, 16), gap: u(4, 10) }}>
            {SOCIALS.map((s) => (
              <a
                key={s.key}
                href={s.href(link, r.shareText)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.key}
                className="grid shrink-0 place-items-center"
                style={{ width: u(40, 66), height: u(34, 66), borderRadius: u(4, 12), background: s.bg, color: "#fff", fontSize: u(15, 36), fontWeight: 700 }}
              >
                {s.icon ? <img src={`/assets/referral/${s.icon}.png`} alt="" style={{ width: "62%", height: "62%" }} /> : "f"}
              </a>
            ))}
          </div>

          {/* মোবাইলে মূল সাইটের মতো শুধু লিংক আর বোতাম — কোড লিংকেই আছে */}
          {/* মূল সাইটে ডেস্কটপেও আলাদা কোডের লাইন নেই — কোড লিংকেই */}
          {false ? (
            <button
              type="button"
              onClick={() => copy(code, r.codeCopied)}
              className="cursor-pointer"
              style={{ marginTop: u(8, 18), fontSize: u(11, 24), color: "#4c2a85" }}
            >
              {r.myCode}: <b>{code}</b> ⧉
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ───────────── প্রোগ্রামের কার্ড — মূল সাইটের বাঘের ব্যানারের লেখা ───────────── */

export const ProgramCard = ({ setting }) => {
  const { t } = useLanguage();
  const r = t.referralFlow;
  const { u } = useU();
  if (!setting) return null;
  const maxMilestone = Math.max(0, ...(setting.achievement?.milestones || []).map((x) => x.amount));
  const boxes = [
    setting.invitation?.enabled && [r.perInvite, `৳${setting.invitation.amount}`],
    setting.depositRebate?.enabled && [r.perDeposit, `${setting.depositRebate.total}%`],
    setting.bettingRebate?.enabled && [r.betTiers, `${setting.bettingRebate.total}%`],
    setting.achievement?.enabled && maxMilestone > 0 && [r.milestoneMax, `৳${maxMilestone.toLocaleString("en-US")}`],
  ].filter(Boolean);

  return (
    <div style={{ borderRadius: u(10, 14), background: "linear-gradient(120deg,#1b1450 0%,#3a1c7a 55%,#24124f 100%)", padding: u("14px 16px", 24), position: "relative", overflow: "hidden" }}>
      <div style={{ color: "#fff", fontSize: u(14, 28), fontWeight: 700 }}>{r.programTitle}</div>
      <div style={{ color: "#fbbf24", fontSize: u(11, 22), marginTop: u(3, 6) }}>{r.agentLink}</div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: u(8, 14), marginTop: u(10, 18), maxWidth: u(360, 470) }}>
        {boxes.map(([label, value]) => (
          <div key={label} className="text-center" style={{ border: "2px solid #fbbf24", borderRadius: u(8, 14), background: "linear-gradient(180deg,#7b2ff7,#5b21b6)", padding: `${u(5, 10)} ${u(4, 8)}` }}>
            <div style={{ color: "#fff", fontSize: u(11, 21) }}>{label}</div>
            <div style={{ color: "#fde047", fontSize: u(17, 32), fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ color: "#e9d5ff", fontSize: u(11, 21), marginTop: u(8, 14) }}>{r.programSub}</div>
      <img src="/assets/referral/logo-coin.png" alt="" style={{ position: "absolute", right: u(14, 18), bottom: u(12, 20), width: u(96, 140), opacity: 0.95 }} />
    </div>
  );
};

/* ───────────── মাইলফলক ("পুরস্কার" ট্যাব) ───────────── */

const MEDAL = ["#ef6b6b", "#8bd36b", "#6b8bef", "#f0b429", "#39c6d6", "#c77dff", "#ff8fab"];

const Medal = ({ color, size }) => (
  <svg viewBox="0 0 64 80" style={{ width: size, height: `calc(${size} * 1.25)` }} aria-hidden="true">
    <path d="M14 2h14l6 22-10 8z" fill={color} opacity=".85" />
    <path d="M50 2H36l-6 22 10 8z" fill={color} />
    <circle cx="32" cy="52" r="22" fill="#f6c343" />
    <circle cx="32" cy="52" r="15" fill="#f9d977" />
    <path d="M32 42l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7L22 49.5l7-.5z" fill="#f0a92b" />
  </svg>
);

export const MilestoneList = ({ milestones = [], busy, onClaim }) => {
  const { t } = useLanguage();
  const r = t.referralFlow;
  const { u } = useU();

  if (!milestones.length) return <Empty />;

  return (
    <div>
      <div className="text-right" style={{ fontSize: u(12, 26), color: "var(--member-text, #666)", margin: `${u(4, 10)} 0 ${u(8, 16)}` }}>{r.notExpired}</div>
      {milestones.map((ms, i) => {
        const claimable = ms.state === "claimable";
        const claimed = ms.state === "claimed";
        return (
          <div key={ms.count} className="flex items-center" style={{ background: "linear-gradient(180deg,#f4f6fb,#e9edf6)", borderRadius: u(8, 12), padding: u("10px 14px", 24), marginBottom: u(8, 18), gap: u(14, 26) }}>
            <Medal color={MEDAL[i % MEDAL.length]} size={u(40, 90)} />
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: u(13, 27), color: "#777" }}>{fill(r.milestoneText, { n: ms.count })}</div>
              <div style={{ fontSize: u(13, 27), color: "var(--member-text, #555)", marginTop: u(4, 10) }}>🪙 {Number(ms.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="shrink-0 text-center">
              <div style={{ color: "#8b8cf7" }}>
                <span style={{ fontSize: u(20, 40) }}>{ms.progress}</span>
                <span style={{ fontSize: u(11, 20) }}> / {ms.count}</span>
              </div>
              <button
                type="button"
                disabled={!claimable || busy}
                onClick={() => onClaim([ms.rewardId])}
                className={claimable ? "cursor-pointer" : ""}
                style={{
                  marginTop: u(4, 8),
                  minWidth: u(74, 150),
                  height: u(28, 56),
                  borderRadius: u(6, 10),
                  fontSize: u(12, 24),
                  color: "#fff",
                  background: claimable ? "linear-gradient(90deg,var(--member-accent, #f5333f),#ff6b6b)" : claimed ? "#b9bcc8" : "linear-gradient(90deg,#8ec5fc,#b28dff)",
                  opacity: claimable || claimed ? 1 : 0.75,
                }}
              >
                {r.state[ms.state]}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ───────────── আয় ───────────── */

const TYPE_KEYS = ["invitation", "achievement", "deposit", "betting"];

const IncomeBlock = ({ title, amount, rows, counts, u }) => (
  <div style={{ background: "#f5f5f7", borderRadius: u(10, 16), padding: u("14px 16px", 20), marginBottom: u(12, 30) }}>
    <div className="text-center" style={{ fontSize: u(15, 30), color: "var(--member-text, #555)", paddingBottom: u(10, 24), borderBottom: "1px solid #ddd" }}>
      {title} <b style={{ color: "#2b2e83", fontSize: u(17, 34) }}>{tk(amount)}</b>
    </div>
    <div style={{ background: "linear-gradient(180deg,#f4f6fb,#e4eaf4)", borderRadius: u(8, 12), marginTop: u(10, 24), padding: u("8px 16px", 26) }}>
      {[...rows, ...counts].map(([label, value, money]) => (
        <div key={label} className="flex items-center justify-between" style={{ fontSize: u(14, 29), color: "#444", padding: `${u(5, 12)} 0` }}>
          <span>{label}</span>
          <b style={{ color: "#2b2e83", fontWeight: 600 }}>{money ? tk(value) : value}</b>
        </div>
      ))}
    </div>
  </div>
);

export const IncomePanel = ({ data }) => {
  const { t } = useLanguage();
  const r = t.referralFlow;
  const { u } = useU();
  const ov = data?.overview || {};
  const today = ov.todayByType || {};
  const totals = ov.totals || {};

  return (
    <div>
      <IncomeBlock
        u={u}
        title={r.todayIncome}
        amount={ov.todayIncome}
        rows={TYPE_KEYS.map((k) => [r.types[k], today[k], true])}
        counts={[
          [r.members, ov.todayMemberCount ?? 0],
          [r.qualified, ov.todayQualifiedCount ?? 0],
          [r.depositors, ov.todayDepositorCount ?? 0],
        ]}
      />
      <IncomeBlock
        u={u}
        title={r.totalIncome}
        amount={ov.totalEarned}
        rows={TYPE_KEYS.map((k) => [r.types[k], totals[k], true])}
        counts={[
          [r.members, ov.memberCount ?? 0],
          [r.qualified, ov.qualifiedCount ?? 0],
          [r.depositors, ov.depositorCount ?? 0],
        ]}
      />
      <div style={{ fontSize: u(12, 24), color: "var(--member-muted, #999)" }}>{r.note}</div>
    </div>
  );
};

/* ───────────── ফিল্টারের ছোট অংশ ───────────── */

export const Empty = () => {
  const { t } = useLanguage();
  const { u } = useU();
  return (
    <div className="flex flex-col items-center justify-center" style={{ padding: `${u(60, 160)} 0`, gap: u(10, 20) }}>
      <img src="/assets/mobile/no-data.svg" alt="" style={{ width: u(120, 300), height: u(120, 300) }} />
      <span style={{ fontSize: u(13, 34), color: "var(--member-link, #1e9bf0)" }}>{t.referralFlow.noData || t.noData}</span>
    </div>
  );
};

const Select = ({ value, onChange, options, u }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="cursor-pointer"
    style={{ height: u(32, 64), border: "1px solid var(--member-link, #1e9bf0)", borderRadius: u(4, 8), color: "var(--member-link, #1e9bf0)", fontSize: u(13, 28), padding: `0 ${u(8, 16)}`, background: "var(--member-surface, #fff)", outline: "none" }}
  >
    {options.map(([key, label]) => (
      <option key={key} value={key}>
        {label}
      </option>
    ))}
  </select>
);

const Chips = ({ value, onChange, options, u }) => (
  <div className="flex flex-wrap" style={{ gap: u(6, 12) }}>
    {options.map(([key, label]) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        className="cursor-pointer"
        style={{
          height: u(32, 64),
          padding: `0 ${u(14, 24)}`,
          borderRadius: u(4, 8),
          border: `1px solid ${key === value ? "var(--member-link, #1e9bf0)" : "#d6dbe3"}`,
          background: key === value ? "var(--member-link, #1e9bf0)" : "var(--member-surface, #fff)",
          color: key === value ? "#fff" : "var(--member-text, #555)",
          fontSize: u(13, 26),
        }}
      >
        {label}
      </button>
    ))}
  </div>
);

const Table = ({ heads, rows, u, footer }) => (
  <div>
    <div className="grid" style={{ gridTemplateColumns: `repeat(${heads.length}, 1fr)`, background: "#f4f5f7", color: "var(--member-text, #666)", fontSize: u(13, 26), textAlign: "center" }}>
      {heads.map((h) => (
        <div key={h} style={{ padding: `${u(10, 22)} ${u(4, 6)}` }}>{h}</div>
      ))}
    </div>
    {rows.length === 0 ? (
      <Empty />
    ) : (
      rows.map((cells, i) => (
        <div key={i} className="grid" style={{ gridTemplateColumns: `repeat(${heads.length}, 1fr)`, borderBottom: "1px solid #f0f0f0", fontSize: u(12, 25), color: "#444", textAlign: "center" }}>
          {cells.map((c, j) => (
            <div key={j} className="min-w-0 break-words" style={{ padding: `${u(9, 20)} ${u(4, 6)}` }}>{c}</div>
          ))}
        </div>
      ))
    )}
    {footer}
  </div>
);

/* ───────────── রেকর্ড ───────────── */

const RANGE_KEYS = ["today", "yesterday", "days7", "month"];

export const RecordsPanel = () => {
  const { t } = useLanguage();
  const r = t.referralFlow;
  const { u } = useU();
  const [type, setType] = useState("invitation");
  const [range, setRange] = useState("days7");
  const { rows, total, loading } = useReferralRecords({ type, range });

  const rangeLabel = { today: r.ranges.today, yesterday: r.ranges.yesterday, days7: r.ranges["7d"], month: r.currentMonth };
  const who = (row) => {
    if (row.type === "betting") return r.friendsBets;
    if (row.type === "achievement") return fill(r.milestoneText, { n: row.milestoneCount });
    return row.fromUser || "—";
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between" style={{ gap: u(10, 16), marginBottom: u(12, 24) }}>
        <Select u={u} value={type} onChange={setType} options={TYPE_KEYS.map((k) => [k, r.types[k]])} />
        <Chips u={u} value={range} onChange={setRange} options={RANGE_KEYS.map((k) => [k, rangeLabel[k]])} />
      </div>
      <Table
        u={u}
        heads={[r.cols.date, r.cols.user, r.cols.amount]}
        rows={loading ? [] : rows.map((row) => [when(row.createdAt), who(row), `${Number(row.amount).toFixed(2)}${row.tier > 1 ? ` (${fill(r.tierLine, { n: row.tier })})` : ""}`])}
        footer={
          <div className="flex justify-between" style={{ padding: `${u(12, 26)} ${u(20, 60)}`, fontSize: u(14, 30), color: "var(--member-text, #555)", borderTop: "1px solid var(--member-line, #eee)" }}>
            <span>{r.total}</span>
            <span>{Number(total || 0).toFixed(2)}</span>
          </div>
        }
      />
    </div>
  );
};

/* ───────────── আমন্ত্রিতদের তালিকা ───────────── */

export const InviteesPanel = ({ vipName }) => {
  const { t } = useLanguage();
  const r = t.referralFlow;
  const { isDesktop, u } = useU();
  const [range, setRange] = useState("today");
  const [status, setStatus] = useState("all");
  const { rows, footer, loading } = useInvitees({ range, status });

  const summary = (
    <div className="flex" style={{ gap: u(10, 14), marginBottom: u(12, 24) }}>
      <div className="flex flex-1 items-center" style={{ background: "#e3f1ff", borderRadius: u(10, 18), padding: u(12, 20), gap: u(14, 20) }}>
        <div className="text-center" style={{ width: u(60, 110) }}>
          <div style={{ fontSize: u(34, 70), lineHeight: 1 }}>💎</div>
          <div style={{ fontSize: u(13, 26), fontWeight: 800, fontStyle: "italic", color: "#1d3a6b", marginTop: u(4, 8) }}>{vipName || "VIP0"}</div>
        </div>
        <div className="flex-1" style={{ fontSize: u(13, 25), color: "#1d3a6b" }}>
          <div className="text-center">{r.members}</div>
          <div className="text-center" style={{ background: "var(--member-surface, #fff)", borderRadius: u(12, 24), margin: `${u(4, 6)} 0 ${u(8, 14)}`, color: "#4a90e2" }}>{footer.totalInviteeCount ?? 0}</div>
          <div className="text-center">{r.qualified}</div>
          <div className="text-center" style={{ background: "var(--member-surface, #fff)", borderRadius: u(12, 24), marginTop: u(4, 6), color: "#4a90e2" }}>{footer.totalQualifiedCount ?? 0}</div>
        </div>
      </div>
      <div className="flex flex-col justify-between" style={{ width: isDesktop ? 220 : "44%", gap: u(6, 10) }}>
        {[
          [r.ranges.today, footer.currentDayQualifiedCount],
          [r.ranges.yesterday, footer.previousDayQualifiedCount],
          [r.currentMonth, footer.currentMonthQualifiedCount],
        ].map(([label, n]) => (
          <div key={label} className="flex flex-1 items-center justify-between" style={{ background: "#fff7e8", border: "1px solid #fde7c0", borderRadius: u(8, 14), padding: `0 ${u(12, 20)}`, color: "#b7791f", fontSize: u(13, 26) }}>
            <span>{label}</span>
            <span>+{n ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {summary}
      <div className="flex flex-wrap items-center" style={{ gap: u(10, 16), marginBottom: u(12, 24) }}>
        <Select u={u} value={status} onChange={setStatus} options={["all", "qualified", "unqualified"].map((k) => [k, r.statusFilter[k]])} />
        <Chips u={u} value={range} onChange={setRange} options={["today", "yesterday", "7d", "all"].map((k) => [k, r.ranges[k]])} />
      </div>
      <Table
        u={u}
        heads={[r.cols.registered, r.cols.user, r.cols.status]}
        rows={loading ? [] : rows.map((row) => [when(row.registeredAt), row.user, <span key="s" style={{ color: row.qualified ? "var(--member-success, #16a34a)" : "var(--member-muted, #999)" }}>{row.qualified ? r.isQualified : r.notQualified}</span>])}
      />
    </div>
  );
};

/* ───────────── নিয়মাবলী ───────────── */

export const Rules = ({ setting }) => {
  const { t, lang } = useLanguage();
  const r = t.referralFlow;
  const { u } = useU();
  const text = setting?.rules?.[lang === "en" ? "en" : "bn"] || setting?.rules?.bn || "";
  const inv = setting?.invitation;
  if (!text && !inv) return null;
  return (
    <div style={{ background: "#f7f8fb", borderRadius: u(8, 14), padding: u(14, 24), marginTop: u(14, 24) }}>
      <div style={{ fontSize: u(14, 30), fontWeight: 700, color: "var(--member-title, #333)", marginBottom: u(6, 12) }}>{r.rulesTitle}</div>
      {inv?.enabled ? (
        <div style={{ fontSize: u(12, 25), color: "var(--member-accent, #e8474c)", marginBottom: u(6, 12) }}>{fill(r.qualifyRule, { d: inv.requireDeposit, b: inv.requireTurnover })}</div>
      ) : null}
      <div style={{ fontSize: u(12, 25), color: "var(--member-text, #666)", whiteSpace: "pre-line", lineHeight: 1.6 }}>{text}</div>
    </div>
  );
};
