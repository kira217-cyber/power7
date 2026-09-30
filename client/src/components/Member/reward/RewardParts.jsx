import React, { useState } from "react";
import { useNavigate } from "react-router";

import { useLanguage } from "../../../Context/LanguageProvider";
import { m } from "../../../hook/useUnits";
import { useIsDesktop } from "../../../hook/useIsDesktop";
import { dotDate, useCountdown, useRewardActions } from "../../../features/reward/useRewards";

/**
 * পুরস্কার কেন্দ্রের ভাগ করা অংশ — টিকিটের কার্ড, লাল প্যাকেট, চাকা, টেমুর
 * পপআপ। ছবি ও মাপ মূল সাইটের মোবাইল বিল্ড (`/m/receivingCenter`) থেকে;
 * ডেস্কটপেও একই জিনিস, তাই মাপ `z()` দিয়ে — মোবাইলে ৭৫০-ডিজাইনের rem,
 * ডেস্কটপে সেটাই ৩৯০px ফোনের মাপে px।
 */
export const IMG = "/assets/reward";

export const useZ = () => {
  const desk = useIsDesktop();
  return (n) => (desk ? `${Math.round(n * 5.2) / 10}px` : m(n));
};

/** টাকা — "1,088.00" */
export const money = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ভাষা অনুযায়ী লেখা (`{ bn, en }`) */
export const useTv = () => {
  const { lang } = useLanguage();
  return (v) => (lang === "en" ? v?.en || v?.bn : v?.bn || v?.en) || "";
};

/* ─────────────────── টিকিটের কার্ড ─────────────────── */

// মূল সাইটের `.ticket-item.<TYPE>` — পটভূমি আর বাঁয়ের কুপনের রঙ
const LOOK = {
  temu: { bg: "tiket_bg_orange.jpg", card: "linear-gradient(0deg,#ff773b,#ff1e31)", shadow: "rgba(255,117,59,.35)" },
  wheel: { bg: "tiket_bg_orange.jpg", card: "linear-gradient(0deg,#ff7282,#f52644)", shadow: "rgba(255,114,130,.35)" },
  redPacket: { bg: "tiket_bg_red.jpg", card: "linear-gradient(0deg,#ff73c3,#f425d4)", shadow: "rgba(254,52,216,.35)" },
};

const Countdown = ({ endAt, z, rf }) => {
  const c = useCountdown(endAt);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <>
      <p className="flex items-end justify-center" style={{ flex: 1, color: "var(--member-text, #666)", fontSize: z(68), fontWeight: 700, lineHeight: 1 }}>
        {c.days}
        <i style={{ fontSize: z(22), fontStyle: "normal", marginBottom: z(6) }}>{rf.days}</i>
      </p>
      <span style={{ color: "var(--member-text, #666)", fontSize: z(24), fontWeight: 700, margin: `${z(6)} 0 ${z(10)}` }}>
        {pad(c.h)}:{pad(c.m)}:{pad(c.s)}
      </span>
    </>
  );
};

/**
 * একটা টিকিট — বাঁয়ে রঙিন কুপন (ধরন, নাম, শেষ তারিখ), মাঝে নাম ও
 * পুরস্কার, ডানে সাদা অংশে বাকি দিন/সময় আর "দাবি" বোতাম। রেকর্ডে
 * (`history`) ডানে পাওয়া টাকা বা "মেয়াদোত্তীর্ণ"।
 */
export const TicketCard = ({ ticket, onClaim, onInfo, history = false }) => {
  const { t } = useLanguage();
  const rf = t.rewardFlow;
  const tv = useTv();
  const z = useZ();
  const look = LOOK[ticket.kind] || LOOK.temu;
  const off = history;

  return (
    <div
      className="relative flex items-center"
      style={{
        height: z(250),
        marginBottom: z(20),
        boxShadow: `0 ${z(8)} ${z(80)} rgba(0,0,0,.1)`,
        background: `url(${IMG}/${look.bg}) 0 0 / 100% 100% no-repeat`,
      }}
    >
      <div className="relative flex items-center" style={{ flex: 1, margin: `0 ${z(30)}`, gap: z(12), zIndex: 1, minWidth: 0 }}>
        {/* কুপন */}
        <div
          className="flex shrink-0 items-center text-center"
          style={{
            width: z(218),
            minHeight: z(150),
            borderRadius: z(20),
            padding: `${z(15)} ${z(9)}`,
            color: "#fff",
            backgroundImage: off ? "linear-gradient(0deg,#a2a2a2,#cdcdcd)" : look.card,
            boxShadow: `0 ${z(5)} ${z(20)} ${look.shadow}`,
          }}
        >
          <div className="flex flex-1 flex-col" style={{ gap: z(6) }}>
            <span style={{ fontSize: z(22) }}>{rf.coupon}</span>
            <span style={{ fontSize: z(25) }}>{tv(ticket.label) || rf.kinds[ticket.kind]}</span>
            <span style={{ fontSize: z(24) }}>{dotDate(ticket.endAt)}</span>
          </div>
        </div>

        {/* নাম */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: z(5), paddingRight: z(14) }}>
          <h3 style={{ color: "#737373", fontSize: z(28), fontWeight: 700, lineHeight: 1.5 }}>{tv(ticket.name)}</h3>
          <span style={{ color: "var(--member-text, #666)", fontSize: z(24), lineHeight: 1.5 }}>
            {rf.prize} :
            <br />
            {tv(ticket.name)}
          </span>
          {tv(ticket.description) && (
            <button
              type="button"
              onClick={() => onInfo?.(ticket)}
              className="inline-flex cursor-pointer items-center"
              style={{ gap: z(6), color: "var(--member-muted, #888)", fontSize: z(20), borderRadius: z(50), background: "rgba(255,255,255,.8)", padding: `${z(6)} ${z(12)}`, width: "fit-content" }}
            >
              {rf.desc}
              <span className="grid place-items-center" style={{ width: z(22), height: z(22), borderRadius: "50%", background: "#888", color: "#fff", fontSize: z(16), fontWeight: 700 }}>
                i
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ডানের সাদা অংশ */}
      <div className="flex h-full flex-col items-center text-center" style={{ width: z(175), background: "var(--member-surface, #fff)", padding: `${z(17)} ${z(8)}`, color: "#bababa", fontSize: z(24) }}>
        {history ? (
          <>
            <span style={{ marginBottom: z(8) }}>{ticket.status === "claimed" ? rf.claimedLabel : rf.expired}</span>
            <p className="flex flex-1 items-center justify-center" style={{ color: ticket.status === "claimed" ? "var(--member-accent, #f32246)" : "var(--member-muted, #999)", fontSize: z(30), fontWeight: 700 }}>
              {ticket.status === "claimed" ? `৳ ${money(ticket.amount)}` : "—"}
            </p>
            <span style={{ fontSize: z(20) }}>{dotDate(ticket.claimedAt || ticket.endAt)}</span>
          </>
        ) : (
          <>
            <span className="w-full truncate">{rf.due}</span>
            <Countdown endAt={ticket.endAt} z={z} rf={rf} />
            <button
              type="button"
              onClick={() => onClaim?.(ticket)}
              className="flex cursor-pointer items-center justify-center"
              style={{ width: z(160), minHeight: z(60), borderRadius: z(40), background: "#30d005", boxShadow: `0 ${z(3)} ${z(8)} rgba(53,213,106,.48)`, color: "#fff", fontSize: z(26) }}
            >
              {rf.claim}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ─────────────────── পপআপের খোলস ─────────────────── */

const Overlay = ({ onClose, children, z, closable = true }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ zIndex: 1000, background: "rgba(0,0,0,.8)" }}>
    {closable && (
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute grid cursor-pointer place-items-center"
        style={{ top: z(40), right: z(30), width: z(60), height: z(60), borderRadius: "50%", background: "var(--member-surface, #fff)", color: "#000", fontSize: z(40), lineHeight: 1 }}
      >
        ×
      </button>
    )}
    {children}
  </div>
);

/** পাওয়া টাকা — সোনালি ঢেউয়ে বড় সংখ্যা */
const Won = ({ amount, z, rf, onClose }) => (
  <div className="flex flex-col items-center" style={{ gap: z(20), marginTop: z(30) }}>
    <span style={{ color: "#ffe9b0", fontSize: z(34), fontWeight: 700 }}>{rf.congrats}</span>
    <span style={{ color: "#fff3a6", fontSize: z(72), fontWeight: 900, textShadow: "0 0 12px rgba(255,160,0,.8)" }}>৳ {money(amount)}</span>
    <button
      type="button"
      onClick={onClose}
      className="cursor-pointer"
      style={{ width: z(420), height: z(118), background: `url(${IMG}/temu-popup-btn.png) center / 100% 100% no-repeat`, color: "#fffbd6", fontSize: z(30), fontWeight: 900 }}
    >
      {rf.ok}
    </button>
  </div>
);

/* ─────────────────── লাল প্যাকেট ─────────────────── */

const RedPacket = ({ ticket, actions, onClose, z, rf, tv }) => {
  const [won, setWon] = useState(null);
  const open = async () => {
    const res = await actions.open(ticket.id);
    if (res) setWon(res.amount);
  };
  return (
    <Overlay onClose={onClose} z={z}>
      <div style={{ color: "#ffe7a8", fontSize: z(40), fontWeight: 900, marginBottom: z(10) }}>{tv(ticket.name)}</div>
      <div className="relative" style={{ width: z(690), height: z(645), background: `url(${IMG}/ticket-type-redenvelope.webp) center / contain no-repeat` }}>
        {won === null ? (
          <button
            type="button"
            disabled={actions.busy}
            onClick={open}
            aria-label={rf.openNow}
            className="absolute grid cursor-pointer place-items-center"
            style={{ left: "50%", top: z(413), width: z(150), height: z(150), borderRadius: "50%", transform: "translate(-50%,-50%)", color: "#a0360a", fontSize: z(34), fontWeight: 900 }}
          >
            {rf.open}
          </button>
        ) : (
          <div className="absolute left-0 w-full text-center" style={{ top: z(200), color: "#fff", fontSize: z(80), fontWeight: 900 }}>
            ৳ {money(won)}
          </div>
        )}
      </div>
      {won !== null && <Won amount={won} z={z} rf={rf} onClose={onClose} />}
    </Overlay>
  );
};

/* ─────────────────── চাকা ─────────────────── */

const Wheel = ({ ticket, actions, onClose, z, rf, tv }) => {
  const segs = ticket.wheel || [];
  const n = Math.max(2, segs.length);
  const slice = 360 / n;
  const [angle, setAngle] = useState(0);
  const [won, setWon] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const spin = async () => {
    if (spinning || won !== null) return;
    setSpinning(true);
    const res = await actions.open(ticket.id);
    if (!res) {
      setSpinning(false);
      return;
    }
    // ঘরটার মাঝখান উপরের কাঁটার নিচে আসে
    setAngle(360 * 6 + (360 - (res.segment * slice + slice / 2)));
    setTimeout(() => {
      setWon(res.amount);
      setSpinning(false);
    }, 4300);
  };

  const R = 150;
  const point = (deg, r) => [R + r * Math.sin((deg * Math.PI) / 180), R - r * Math.cos((deg * Math.PI) / 180)];

  return (
    <Overlay onClose={onClose} z={z} closable={!spinning}>
      <div style={{ color: "#ffe7a8", fontSize: z(40), fontWeight: 900, marginBottom: z(10) }}>{tv(ticket.name)}</div>
      <div className="relative grid place-items-center" style={{ width: z(690), height: z(645) }}>
        <img src={`${IMG}/ticket-type-wheel-bg.png`} alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
        <img src={`${IMG}/ticket-type-wheel-bg2.png`} alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative" style={{ width: z(470), height: z(470) }}>
          <svg
            viewBox="0 0 300 300"
            className="h-full w-full"
            style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 4.2s cubic-bezier(.17,.67,.21,1)" : "none" }}
          >
            <circle cx={R} cy={R} r={R} fill="#f39a1d" />
            <circle cx={R} cy={R} r={R - 6} fill="#ffcb52" />
            {Array.from({ length: n }, (_, i) => {
              const [x1, y1] = point(i * slice, R - 16);
              const [x2, y2] = point((i + 1) * slice, R - 16);
              const [tx, ty] = point(i * slice + slice / 2, R - 58);
              return (
                <g key={i}>
                  <path d={`M${R} ${R} L${x1} ${y1} A${R - 16} ${R - 16} 0 0 1 ${x2} ${y2} Z`} fill={i % 2 ? "#fff3d6" : "#ffe09a"} stroke="#f0b24a" strokeWidth="1" />
                  <text x={tx} y={ty} fill="#c2410c" fontSize="15" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${i * slice + slice / 2} ${tx} ${ty})`}>
                    ৳{segs[i] ?? 0}
                  </text>
                </g>
              );
            })}
            {Array.from({ length: 24 }, (_, i) => {
              const [x, y] = point(i * 15, R - 8);
              return <circle key={`d${i}`} cx={x} cy={y} r="3" fill={i % 2 ? "#fff" : "#ffe28a"} />;
            })}
          </svg>
          {/* কাঁটা আর মাঝের GO */}
          <span className="absolute" style={{ left: "50%", top: z(-18), transform: "translateX(-50%)", width: 0, height: 0, borderLeft: `${z(22)} solid transparent`, borderRight: `${z(22)} solid transparent`, borderTop: `${z(46)} solid #e11d48` }} />
          <button
            type="button"
            onClick={spin}
            disabled={spinning || won !== null}
            className="absolute grid cursor-pointer place-items-center"
            style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: z(120), height: z(120), borderRadius: "50%", background: "radial-gradient(circle at 40% 35%,#ff6b6b,#d4151f)", border: `${z(8)} solid #ffd35c`, color: "#fff", fontSize: z(36), fontWeight: 900, boxShadow: "0 4px 10px rgba(0,0,0,.35)" }}
          >
            GO
          </button>
        </div>
      </div>
      {won !== null ? <Won amount={won} z={z} rf={rf} onClose={onClose} /> : <div style={{ color: "#fff", fontSize: z(28), marginTop: z(20) }}>{rf.spinHint}</div>}
    </Overlay>
  );
};

/* ─────────────────── টেমু ─────────────────── */

const TASK_ICON = { wallet: 4, invite: 2, deposit: 1 };

const TemuPopup = ({ ticket, actions, onClose, onGo, z, rf, tv }) => {
  const c = useCountdown(ticket.endAt);
  const [tab, setTab] = useState("task");
  const [won, setWon] = useState(null);
  const target = Number(ticket.temu?.target || 0);
  const score = Number(ticket.temu?.score || 0);
  const left = Math.max(0, target - score);
  const reached = left <= 0;
  const pct = target ? Math.min(100, (score / target) * 100) : 0;
  const [whole, cents] = money(score).split(".");
  const pad = (v) => String(v).padStart(2, "0");

  const claim = async () => {
    const res = await actions.claimTemu(ticket.id);
    if (res) setWon(res.amount);
  };

  if (won !== null) {
    return (
      <Overlay onClose={onClose} z={z}>
        <img src={`${IMG}/temu-history-box.gif`} alt="" style={{ width: z(424) }} />
        <Won amount={won} z={z} rf={rf} onClose={onClose} />
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose} z={z}>
      <div className="hide-scrollbar relative overflow-y-auto" style={{ width: z(698), maxHeight: "86vh", marginTop: z(60), background: "#ffe9c4", borderRadius: z(20), padding: `0 ${z(24)} ${z(40)}` }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: `url(${IMG}/temu-condition-bg.png) center top / 100% no-repeat` }} />

        {/* মাথা — নাম, সিন্দুক, দাবিকৃত */}
        <div className="relative flex flex-col items-center overflow-hidden" style={{ height: z(720), margin: `0 ${z(-24)}` }}>
          <div className="absolute inset-0" style={{ background: `url(${IMG}/temu-condition-amount-bg.png) center bottom / cover no-repeat` }} />
          <div className="relative flex items-center justify-center text-center" style={{ zIndex: 2, height: z(165), marginTop: z(52), padding: `0 ${z(40)}`, color: "#f8600e", fontSize: z(72), fontWeight: 900, lineHeight: 1.1, textShadow: "0 0 5px #fff, 0 0 5px #fff" }}>
            {tv(ticket.name)}
          </div>
          <img src={`${IMG}/temu-history-box.gif`} alt="" className="relative" style={{ zIndex: 2, width: z(424), marginTop: z(-60) }} />
          <div className="relative flex items-center justify-center text-center" style={{ zIndex: 2, width: "50%", minHeight: z(80), marginTop: z(-60), color: "#feeac7", fontSize: z(28), fontWeight: 600 }}>
            ৳ {money(0)} {rf.claimedSoFar}
          </div>
        </div>

        {/* অগ্রগতি */}
        <div className="relative flex flex-col items-center" style={{ zIndex: 1, marginTop: z(-50), height: z(440), background: `url(${IMG}/temu-condition-count-bg.png) center / 100% 100% no-repeat` }}>
          <div className="flex items-center" style={{ marginTop: z(14), height: z(66), padding: `0 ${z(30)}`, gap: z(14), color: "#fff", fontSize: z(30), fontWeight: 700, background: "linear-gradient(180deg,#ee5a16,#e0300f)" }}>
            <span className="grid place-items-center" style={{ width: z(36), height: z(36), borderRadius: "50%", background: "var(--member-surface, #fff)", color: "#e0300f", fontSize: z(22) }}>
              ⏱
            </span>
            {c.days} {rf.days} {pad(c.h)} : {pad(c.m)} : {pad(c.s)} {rf.ends}
          </div>
          <div className="relative flex items-end" style={{ marginTop: z(40), color: "#f8600e", fontWeight: 700 }}>
            <span style={{ fontSize: z(44), marginRight: z(20) }}>৳</span>
            <span style={{ fontSize: z(120), lineHeight: 1 }}>{whole}</span>
            <span style={{ fontSize: z(70), lineHeight: 1.1 }}>.{cents}</span>
            {!reached && (
              <span className="absolute" style={{ left: "100%", top: z(-4), marginLeft: z(40), width: z(130), padding: `${z(6)} ${z(8)}`, borderRadius: z(8), background: "#ff6a00", color: "#fff", fontSize: z(20), lineHeight: 1.2, textAlign: "center" }}>
                {rf.soon}
              </span>
            )}
          </div>
          <div style={{ width: "82%", height: z(22), borderRadius: z(11), background: "#fde7c6", marginTop: z(26), overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: z(11), background: "linear-gradient(90deg,#ff5a00,#ff9d00)" }} />
          </div>
          <div style={{ marginTop: z(20), color: "#6b3a1a", fontSize: z(28), fontWeight: 700 }}>
            {reached ? (
              rf.reached
            ) : (
              <>
                {rf.away1} <span style={{ color: "#e11d48" }}>৳ {money(left)}</span> {rf.away2}
              </>
            )}
          </div>
          <button
            type="button"
            disabled={actions.busy}
            onClick={reached ? claim : () => onGo("invite")}
            className="cursor-pointer"
            style={{ marginTop: z(18), width: z(606), height: z(106), background: `url(${IMG}/temu-condition-button.png) center / 100% 100% no-repeat`, color: "#fff", fontSize: z(32), fontWeight: 900, padding: `0 ${z(60)}`, lineHeight: 1.15 }}
          >
            {reached ? rf.claimNow : rf.inviteFaster}
          </button>
        </div>

        {/* কাজ / বর্ণনা / বিস্তারিত */}
        <div className="relative" style={{ zIndex: 1, marginTop: z(24), background: "#fff4df", borderRadius: z(16), overflow: "hidden" }}>
          <div className="flex" style={{ background: "#ffe0b0", height: z(96) }}>
            {["task", "desc", "detail"].map((key, i) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="relative flex-1 cursor-pointer"
                style={{ color: tab === key ? "#e11d48" : "#6b3a1a", fontSize: z(32), fontWeight: 700, borderLeft: i ? "1px solid #e8c38e" : "none", lineHeight: 1.1 }}
              >
                {rf.tabs[key]}
                {tab === key && <span className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 0, width: 0, height: 0, borderLeft: `${z(14)} solid transparent`, borderRight: `${z(14)} solid transparent`, borderBottom: `${z(14)} solid #fff4df` }} />}
              </button>
            ))}
          </div>
          <div style={{ padding: z(20) }}>
            {tab === "task" &&
              (ticket.temu?.tasks || []).map((task) => {
                const done = task.key === "invite" ? task.done >= task.max : task.done;
                return (
                  <button
                    key={task.key}
                    type="button"
                    onClick={() => !done && onGo(task.key)}
                    className="flex w-full cursor-pointer items-center text-left"
                    style={{ background: "#ffe9c4", borderRadius: z(16), padding: z(20), marginBottom: z(16), gap: z(20) }}
                  >
                    <img src={`${IMG}/temu-condition-icon${TASK_ICON[task.key]}.png`} alt="" style={{ width: z(130), height: z(130) }} />
                    <span className="flex-1" style={{ borderLeft: `${z(2)} dashed #d9a86a`, paddingLeft: z(24) }}>
                      <span className="block" style={{ color: "#6b3a1a", fontSize: z(30), fontWeight: 700, lineHeight: 1.25 }}>
                        {rf.tasks[task.key]}
                        {task.key === "invite" ? ` (${task.done}/${task.max})` : ""}
                      </span>
                      <span className="block" style={{ color: "#8a6a4a", fontSize: z(24), marginTop: z(8) }}>
                        <b style={{ color: "#e11d48" }}>1</b> {rf.randomReward}
                      </span>
                    </span>
                    <span className="grid shrink-0 place-items-center" style={{ width: z(90), height: z(90), borderRadius: "50%", background: done ? "#30d005" : "#b8b8b8", color: "#fff", fontSize: z(40), fontWeight: 900 }}>
                      {done ? "✓" : "›"}
                    </span>
                  </button>
                );
              })}
            {tab === "desc" && <p style={{ color: "#6b3a1a", fontSize: z(26), lineHeight: 1.5, whiteSpace: "pre-line" }}>{tv(ticket.description) || tv(ticket.name)}</p>}
            {tab === "detail" && <p style={{ color: "#6b3a1a", fontSize: z(26), lineHeight: 1.5, whiteSpace: "pre-line" }}>{rf.temuRules.replace("{target}", money(target))}</p>}
          </div>
        </div>
      </div>
    </Overlay>
  );
};

/* ─────────────────── বর্ণনা ─────────────────── */

const InfoPopup = ({ ticket, onClose, z, rf, tv }) => (
  <Overlay onClose={onClose} z={z}>
    <div style={{ width: z(620), background: "var(--member-surface, #fff)", borderRadius: z(20), padding: z(36) }}>
      <div style={{ color: "var(--member-title, #333)", fontSize: z(32), fontWeight: 700, marginBottom: z(20) }}>{tv(ticket.name)}</div>
      <p style={{ color: "var(--member-text, #666)", fontSize: z(26), lineHeight: 1.5, whiteSpace: "pre-line" }}>{tv(ticket.description)}</p>
      <button type="button" onClick={onClose} className="w-full cursor-pointer" style={{ marginTop: z(30), height: z(80), borderRadius: z(40), background: "#30d005", color: "#fff", fontSize: z(28) }}>
        {rf.ok}
      </button>
    </div>
  </Overlay>
);

/**
 * টিকিট খোলার সব পপআপ এক জায়গায়। `open(ticket)` ধরন দেখে ঠিক পপআপ
 * খোলে; `info(ticket)` বর্ণনা। টেমুর কাজে চাপলে `onGo(task)` — পাতা
 * ঠিক করে কোথায় যাবে (মোবাইলে রাউট, ডেস্কটপে মডালের ট্যাব)।
 */
export const useTicketPopups = ({ reload, onGo } = {}) => {
  const { t } = useLanguage();
  const rf = t.rewardFlow;
  const tv = useTv();
  const z = useZ();
  const navigate = useNavigate();
  const actions = useRewardActions(reload);
  const [current, setCurrent] = useState(null);

  const go =
    onGo ||
    ((task) => {
      setCurrent(null);
      navigate(task === "wallet" ? "/member/withdraw?add=1" : task === "deposit" ? "/member/deposit" : "/member/referral");
    });

  const close = () => setCurrent(null);
  const props = { actions, onClose: close, z, rf, tv };

  let node = null;
  if (current?.mode === "info") node = <InfoPopup ticket={current.ticket} {...props} />;
  else if (current?.ticket.kind === "redPacket") node = <RedPacket ticket={current.ticket} {...props} />;
  else if (current?.ticket.kind === "wheel") node = <Wheel ticket={current.ticket} {...props} />;
  else if (current?.ticket.kind === "temu") node = <TemuPopup ticket={current.ticket} onGo={go} {...props} />;

  return {
    open: (ticket) => setCurrent({ ticket, mode: "open" }),
    info: (ticket) => setCurrent({ ticket, mode: "info" }),
    popup: node,
    actions,
  };
};
