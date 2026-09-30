import React, { useState } from "react";
import { useSelector } from "react-redux";

import Icon from "../../Icon/Icon";
import { useLanguage } from "../../../Context/LanguageProvider";
import { useUI } from "../../../Context/uiContext";
import { selectUser } from "../../../features/auth/authSelectors";
import { useRefreshBalance } from "../../../features/auth/useRefreshBalance";
import { selectRewardAvailable } from "../../../features/reward/rewardSlice";
import { slashDateTime, useCountdown, useTickets } from "../../../features/reward/useRewards";
import { copyText } from "../../../utils/referralLink";
import { notify } from "../../../utils/notify";
import { Drawer } from "../account/DeskDrawer";
import { IMG, money, useTicketPopups, useTv } from "./RewardParts";
import { SignInBody } from "./SignInPage";
import { TemuHistoryBody } from "./TemuHistory";

/**
 * ডেস্কটপ মডালের "পুরস্কার কেন্দ্র" — মূল সাইটের মাপে (১১১০ × ৬২০):
 *
 *   বাঁয়ে ৩৩৭ ধূসর স্তম্ভে ২৯০ চওড়া কার্ড — উপরে নীল-বেগুনি অংশ (২১২ উঁচু)
 *     অবতার, নাম, ইউজারনেমের পিল (কপি), রিফ্রেশ, "প্রাপ্ত হিসাব" আর টাকা;
 *     নিচে দুটো কাজ (টেমু টিকিট / সাইন-ইন কাজ) আর সাদা "দেখুন" পিল।
 *   ডানে উপরে "▌প্রাপ্তি কেন্দ্র (n)" আর বেগুনি "টিকিটের রেকর্ড" পিল;
 *     তারপর ২০০ উঁচু সারি — বড় বাঁকা ক্রমিক সংখ্যা, নাম, "বর্ণনা ⓘ", আর
 *     ৩১০ × ১২৬ কুপন (রঙিন অংশ + সাদা "বাকি" অংশ, মাঝে ছিদ্রের দাগ)।
 *
 * টিকিটের রেকর্ড, টেমু আর সাইন-ইন মূল সাইটের মতো বাঁ দিক থেকে ড্রয়ারে।
 */
const LOOK = {
  temu: { row: "radial-gradient(circle at 42% 30%,#fff7a8 0,transparent 30%),radial-gradient(circle at 70% 85%,#fff3a0 0,transparent 28%),linear-gradient(90deg,#fffbe6,#fffdf2)", card: "linear-gradient(200deg,#ff8f00,#ffd21f)" },
  wheel: { row: "radial-gradient(circle at 40% 70%,#ffe0c4 0,transparent 30%),linear-gradient(90deg,#fff3ea,#fffaf5)", card: "linear-gradient(200deg,#ff4d6d,#ff9a5a)" },
  redPacket: { row: "radial-gradient(circle at 45% 80%,#f9c7ee 0,transparent 30%),radial-gradient(circle at 80% 20%,#fbd6f1 0,transparent 25%),linear-gradient(90deg,#fdeef9,#fff6fc)", card: "linear-gradient(200deg,#ff0a4f,#ff1493)" },
};

const Coupon = ({ ticket, onClaim, page, rf, tv }) => {
  const c = useCountdown(ticket.endAt);
  const pad = (n) => String(n).padStart(2, "0");
  const look = LOOK[ticket.kind] || LOOK.temu;
  const end = new Date(ticket.endAt);
  return (
    <div className="flex shrink-0 overflow-hidden" style={{ width: 310, height: 126, borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
      <div className="relative flex flex-col" style={{ width: 210, background: look.card, color: "#fff", padding: "8px 10px" }}>
        <span style={{ fontSize: 12 }}>{page.coupon}</span>
        <span className="flex flex-1 items-center justify-center text-center" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
          {tv(ticket.label) || rf.kinds[ticket.kind]}
        </span>
        <span style={{ fontSize: 12 }}>
          {page.endLabel} {end.getFullYear()}-{pad(end.getMonth() + 1)}-{pad(end.getDate())}
        </span>
        {/* ছিদ্রের দাগ */}
        <span className="absolute" style={{ right: -4, top: 6, bottom: 6, width: 8, background: "radial-gradient(circle,#f2c6ff 3px,transparent 3.5px) 0 0 / 8px 12px repeat-y" }} />
      </div>
      <div className="flex flex-1 flex-col items-center" style={{ background: "var(--member-surface, #fff)", padding: "6px 4px 8px" }}>
        <span style={{ fontSize: 12, color: "var(--member-muted, #888)" }}>{page.remaining}</span>
        <span style={{ color: "var(--member-text, #555)", fontWeight: 700, lineHeight: 1 }}>
          <b style={{ fontSize: 36 }}>{c.days}</b>
          <span style={{ fontSize: 14 }}>{page.days}</span>
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--member-text, #555)", margin: "2px 0 4px" }}>
          {pad(c.h)}:{pad(c.m)}:{pad(c.s)}
        </span>
        <button type="button" onClick={() => onClaim(ticket)} className="cursor-pointer" style={{ padding: "3px 10px", borderRadius: 12, background: "#28c914", color: "#fff", fontSize: 12, fontWeight: 700 }}>
          {page.claim}
        </button>
      </div>
    </div>
  );
};

/** "টিকিটের রেকর্ড" ড্রয়ার — তারিখ ও ধরনে ছাঁকা */
const RANGES = { today: 0, yesterday: 1, days7: 6 };
const RecordsDrawer = ({ onClose, rf, tv, t }) => {
  const { tickets, loading } = useTickets("history");
  const [range, setRange] = useState("today");
  const [kind, setKind] = useState("all");
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - RANGES[range]);
  const end = new Date(start);
  end.setDate(end.getDate() + (range === "yesterday" ? 1 : RANGES[range] + 1));
  const rows = tickets.filter((row) => {
    const at = new Date(row.claimedAt || row.endAt);
    return at >= start && at < end && (kind === "all" || row.kind === kind);
  });
  const labels = { today: t.member.ranges.today, yesterday: t.member.ranges.yesterday, days7: t.memberPage.pages.days7 };

  return (
    <Drawer width={1000} onClose={onClose}>
      <div style={{ padding: "12px 20px 0" }}>
        <div style={{ borderLeft: "4px solid var(--member-accent, #ff1f2d)", paddingLeft: 8, fontSize: 14, color: "var(--member-title, #333)", lineHeight: "15px" }}>{rf.records}</div>
        <div className="flex items-center" style={{ gap: 18, margin: "14px 0", fontSize: 14, color: "var(--member-title, #333)" }}>
          {Object.keys(RANGES).map((key) => (
            <label key={key} className="flex cursor-pointer items-center" style={{ gap: 6 }}>
              <span className="grid place-items-center" style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${range === key ? "var(--member-accent, #ff1f2d)" : "#ccc"}` }}>
                {range === key && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--member-accent, #ff1f2d)" }} />}
              </span>
              <input type="radio" className="hidden" checked={range === key} onChange={() => setRange(key)} />
              {labels[key]}
            </label>
          ))}
          <span style={{ width: 1, height: 26, background: "#ddd" }} />
          {rf.typeLabel}:
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ height: 34, minWidth: 130, border: "1px solid #ddd", borderRadius: 4, padding: "0 8px", background: "var(--member-surface, #fff)" }}>
            <option value="all">{t.promo.all}</option>
            {Object.keys(rf.kinds).map((k) => (
              <option key={k} value={k}>
                {rf.kinds[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "2fr 1.2fr 1.6fr 1fr 1fr", background: "#f0f0f0", padding: "8px 20px", fontSize: 13, color: "var(--member-text, #555)" }}>
        {rf.recordCols.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto" style={{ background: rows.length ? "var(--member-surface, #fff)" : "#eee" }}>
        {!loading && rows.length === 0 && <div className="grid h-full place-items-center" style={{ fontSize: 13, color: "var(--member-text, #555)" }}>{t.member.desk.noMatch}</div>}
        {rows.map((row) => (
          <div key={row.id} className="grid" style={{ gridTemplateColumns: "2fr 1.2fr 1.6fr 1fr 1fr", padding: "12px 20px", fontSize: 13, color: "var(--member-title, #333)", borderBottom: "1px solid #f0f0f0" }}>
            <span>{tv(row.name)}</span>
            <span>{tv(row.label) || rf.kinds[row.kind]}</span>
            <span>{slashDateTime(row.claimedAt || row.endAt)}</span>
            <span style={{ color: row.status === "claimed" ? "#28a70a" : "var(--member-muted, #999)" }}>{row.status === "claimed" ? rf.claimedLabel : rf.expired}</span>
            <span style={{ color: "var(--member-accent, #f32246)", fontWeight: 700 }}>{row.status === "claimed" ? `৳ ${money(row.amount)}` : "—"}</span>
          </div>
        ))}
      </div>
    </Drawer>
  );
};

const DeskReward = () => {
  const { t } = useLanguage();
  const page = t.member.desk.reward;
  const rf = t.rewardFlow;
  const tv = useTv();
  const { openMember } = useUI();
  const user = useSelector(selectUser);
  const available = useSelector(selectRewardAvailable);
  const { refresh, refreshing } = useRefreshBalance();
  const { tickets, reload } = useTickets("available");
  const [drawer, setDrawer] = useState(null);

  // টেমুর কাজ — ডেস্কটপে মডালের সেই ট্যাবে
  const onGo = (task) => openMember(task === "wallet" ? "withdraw" : task === "deposit" ? "deposit" : "referral");
  const popups = useTicketPopups({ reload, onGo });
  const [whole, cents] = money(user?.balance).split(".");

  const TASKS = [
    { key: "temu", icon: "temu_icon", bg: "linear-gradient(135deg,#ff9a3c,#ff5a1f)" },
    { key: "signin", icon: "task_icon", bg: "linear-gradient(135deg,#ffd34d,#ff9f1a)" },
  ];

  return (
    <div className="relative flex" style={{ width: 1110, height: 620, background: "var(--member-surface, #fff)" }}>
      {/* বাঁ স্তম্ভ */}
      <div style={{ width: 337, background: "#f5f5f5", padding: "39px 23px 42px 24px" }}>
        <div className="h-full overflow-hidden" style={{ width: 290, borderRadius: 10, background: "var(--member-surface, #fff)" }}>
          <div className="relative overflow-hidden" style={{ height: 212, background: "linear-gradient(160deg,#2b0bff 0%,#5a13f5 55%,#8a1de8 100%)", color: "#fff", padding: "14px 14px 0" }}>
            {/* মূল সাইটের মতো স্বচ্ছ রম্বস */}
            <span className="absolute" style={{ left: 30, bottom: 6, width: 40, height: 40, border: "8px solid rgba(255,255,255,.12)", transform: "rotate(45deg)" }} />
            <span className="absolute" style={{ right: -30, bottom: -40, width: 120, height: 120, border: "14px solid rgba(255,255,255,.1)", transform: "rotate(45deg)" }} />
            <div className="relative flex items-start" style={{ gap: 8 }}>
              <img src={user?.avatar || "/assets/member-desk/avatar-0.png"} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", background: "#b1b8b6" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{user?.username}</div>
                <div className="flex items-center whitespace-nowrap" style={{ fontSize: 12, gap: 4, marginTop: 3 }}>
                  {page.usernameLabel}
                  <button type="button" onClick={() => copyText(user?.username || "").then(() => notify.success(rf.copied))} className="flex cursor-pointer items-center" style={{ gap: 4, background: "rgba(255,255,255,.3)", borderRadius: 10, padding: "1px 7px", fontWeight: 700, maxWidth: 110 }}>
                    {user?.username}
                    <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} aria-hidden="true">
                      <rect x="8" y="3" width="13" height="15" rx="2" fill="#fff" />
                      <path d="M5 7v12a2 2 0 0 0 2 2h10" fill="none" stroke="#fff" strokeWidth="2.4" />
                    </svg>
                  </button>
                </div>
              </div>
              <button type="button" aria-label="refresh" onClick={refresh} className="cursor-pointer" style={{ transform: refreshing ? "rotate(180deg)" : "none", transition: "transform .4s" }}>
                <Icon name="refresh" size={22} />
              </button>
            </div>
            <div className="relative text-center" style={{ marginTop: 16, fontSize: 15 }}>
              {page.balanceLabel}
            </div>
            <div className="relative text-center" style={{ marginTop: 8, fontWeight: 700 }}>
              <span style={{ fontSize: 22 }}>৳ </span>
              <span style={{ fontSize: 24 }}>{whole}</span>
              <span style={{ fontSize: 18 }}>.{cents}</span>
            </div>
          </div>

          <div style={{ padding: "16px 8px 0 28px" }}>
            {TASKS.map((task, i) => (
              <div key={task.key} className="flex items-center" style={{ gap: 12, marginBottom: 22 }}>
                <span className="grid shrink-0 place-items-center" style={{ width: 50, height: 50, borderRadius: 10, background: task.bg, boxShadow: "0 3px 8px rgba(255,120,0,.35)" }}>
                  <img src={`${IMG}/${task.icon}.png`} alt="" style={{ width: 28, filter: "brightness(0) invert(1)" }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "var(--member-title, #333)", lineHeight: 1.15 }}>{page.tasks[i].title}</div>
                  <div style={{ fontSize: 12, color: "var(--member-muted, #888)", marginTop: 2, lineHeight: 1.1 }}>{page.tasks[i].desc}</div>
                </div>
                <button type="button" onClick={() => setDrawer(task.key)} className="shrink-0 cursor-pointer" style={{ width: 90, height: 32, borderRadius: 16, background: "var(--member-surface, #fff)", boxShadow: "0 2px 8px rgba(0,0,0,.15)", fontSize: 14, color: "var(--member-text, #555)" }}>
                  {page.view}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ডান পাশ */}
      <div className="flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div className="flex items-center" style={{ height: 39, padding: "0 12px", gap: 12, fontSize: 14 }}>
          <span className="flex items-center" style={{ gap: 6, borderLeft: "4px solid #5b2bd8", paddingLeft: 7, color: "var(--member-text, #555)" }}>
            {page.tabs[0]}
            {available > 0 && <span className="grid place-items-center" style={{ minWidth: 16, height: 16, borderRadius: 8, background: "#f00", color: "#fff", fontSize: 11 }}>{available}</span>}
          </span>
          <button type="button" onClick={() => setDrawer("records")} className="flex cursor-pointer items-center" style={{ gap: 6, background: "#ede7ff", color: "#5b2bd8", borderRadius: 12, padding: "2px 12px" }}>
            <svg viewBox="0 0 40 26" style={{ width: 16, height: 11 }} aria-hidden="true">
              <path d="M3 1h34a2 2 0 0 1 2 2v6a4 4 0 0 0 0 8v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-6a4 4 0 0 0 0-8V3a2 2 0 0 1 2-2z" fill="#5b2bd8" />
            </svg>
            {page.tabs[1]}
          </button>
        </div>

        <div className="hide-scrollbar flex-1 overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="grid h-full place-items-center" style={{ color: "var(--member-muted, #999)", fontSize: 13 }}>
              {t.member.desk.noMatch}
            </div>
          ) : (
            tickets.map((ticket, index) => (
              <div key={ticket.id} className="flex items-center" style={{ height: 200, background: (LOOK[ticket.kind] || LOOK.temu).row, padding: "0 88px 0 38px" }}>
                <span style={{ width: 88, fontSize: 36, fontWeight: 800, fontStyle: "italic", color: "var(--member-text, #555)", alignSelf: "flex-start", marginTop: 26 }}>{index + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#444" }}>{tv(ticket.name)}</div>
                  {tv(ticket.description) && (
                    <button type="button" onClick={() => popups.info(ticket)} className="inline-flex cursor-pointer items-center" style={{ marginTop: 10, gap: 5, padding: "2px 10px", borderRadius: 10, background: "rgba(0,0,0,.06)", color: "var(--member-muted, #888)", fontSize: 12 }}>
                      {rf.desc}
                      <span className="grid place-items-center" style={{ width: 13, height: 13, borderRadius: "50%", background: "#999", color: "#fff", fontSize: 9, fontWeight: 700 }}>
                        i
                      </span>
                    </button>
                  )}
                </div>
                <Coupon ticket={ticket} onClaim={popups.open} page={page} rf={rf} tv={tv} />
              </div>
            ))
          )}
        </div>
      </div>

      {drawer === "records" && <RecordsDrawer onClose={() => setDrawer(null)} rf={rf} tv={tv} t={t} />}
      {drawer === "temu" && (
        <Drawer width={520} onClose={() => setDrawer(null)}>
          <div className="hide-scrollbar h-full overflow-y-auto">
            <TemuHistoryBody />
          </div>
        </Drawer>
      )}
      {drawer === "signin" && (
        <Drawer width={520} onClose={() => setDrawer(null)}>
          <div className="hide-scrollbar h-full overflow-y-auto">
            <SignInBody onGo={onGo} />
          </div>
        </Drawer>
      )}
      {popups.popup}
    </div>
  );
};

export default DeskReward;
