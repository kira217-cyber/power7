import React, { useMemo, useState } from "react";

import { useIsDesktop } from "../../hook/useIsDesktop";
import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { useInbox } from "../../features/inbox/useInbox";
import { when } from "../../features/referral/useReferral";
import MemberShell from "./MemberShell";

/**
 * "অভ্যন্তরীণ বার্তা" / মেইল — ডেস্কটপে মডালের ট্যাব, মোবাইলে
 * `/member/mail` (মূল সাইটের `/m/webEmail`)।
 *
 * বার্তা admin পাঠান (সবাইকে বা নির্দিষ্ট খেলোয়াড়দের); প্রতিটা আলাদা
 * করে পড়া আর মোছা যায়। খুললেই পড়া হয়ে যায়।
 */

/** মোছার আইকন — স্প্রাইটে নেই, তাই এখানে */
const Trash = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

const pick = (value, lang) => (lang === "en" && value?.en) || value?.bn || value?.en || "";

/* ─────────────────── ডেস্কটপ (মডালের ভিতরে) ─────────────────── */
/** মূল সাইটের চেকবক্স — ২০ এর সাদা গোলচে বাক্স, বাছলে লাল টিক */
const Box = ({ on }) => (
  <span className="grid shrink-0 place-items-center" style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${on ? "var(--member-accent, #fd2f2f)" : "#dcdde2"}`, background: on ? "var(--member-accent, #fd2f2f)" : "var(--member-surface, #fff)" }}>
    {on && (
      <svg viewBox="0 0 10 8" style={{ width: 10, height: 8 }} aria-hidden="true">
        <path d="M1 4l3 3 5-6" fill="none" stroke="#fff" strokeWidth="1.8" />
      </svg>
    )}
  </span>
);

/** খামের উপর টিক — "সব পড়া হয়েছে" */
const MailRead = () => (
  <svg viewBox="0 0 24 20" style={{ width: 22, height: 18 }} aria-hidden="true">
    <path d="M2 2h18v8.5a6 6 0 0 0-8 6.5H2z" fill="currentColor" />
    <path d="M2 2l9 7 9-7" fill="none" stroke="#eef0f4" strokeWidth="1.6" />
    <path d="M14 16l2.5 2.5L22 13" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const Desktop = () => {
  const { t, lang } = useLanguage();
  const page = t.member.desk.inbox;
  const f = t.inboxFlow;
  const inbox = useInbox();
  const [selected, setSelected] = useState([]);
  const [openId, setOpenId] = useState(null);

  const open = inbox.messages.find((msg) => msg._id === openId);
  const allChecked = inbox.messages.length > 0 && selected.length === inbox.messages.length;

  const show = (msg) => {
    setOpenId(msg._id);
    if (!msg.read) inbox.markRead([msg._id]);
  };

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const removeSelected = async () => {
    if (await inbox.remove(selected)) {
      if (selected.includes(openId)) setOpenId(null);
      setSelected([]);
    }
  };

  return (
    <div className="flex flex-col" style={{ width: 1110, height: 620, background: "var(--member-surface, #fff)" }}>
      {/* মূল সাইটের মতো — লেখা গাঢ়, শুধু দাগটা লাল */}
      <div className="flex items-center" style={{ height: 47, padding: "0 60px 0 30px" }}>
        <span className="relative h-full" style={{ display: "grid", placeItems: "center", padding: "0 12px", fontSize: 14, color: "var(--member-title, #333)" }}>
          {page.inbox}
          <span className="absolute bottom-0 left-0 right-0" style={{ height: 2, background: "var(--member-accent, #fd2f2f)" }} />
        </span>
      </div>

      <div className="flex" style={{ flex: 1, minHeight: 0 }}>
        {/* বাঁ — বার্তার তালিকা */}
        <div className="relative flex flex-col" style={{ width: 452, background: "#f4f5f9", boxShadow: "2px 0 6px rgba(0,0,0,.06)", zIndex: 1 }}>
          {/* ধূসর টুলবার — সব নির্বাচন | মুছুন, সব পড়া | সময় অনুযায়ী সাজান */}
          <div className="flex items-center" style={{ height: 39, background: "#eef0f4", padding: "0 30px", gap: 14, fontSize: 14, color: "var(--member-muted, #888)", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            <label className="flex cursor-pointer items-center" style={{ gap: 16 }}>
              <input type="checkbox" className="hidden" checked={allChecked} onChange={() => setSelected(allChecked ? [] : inbox.messages.map((msg) => msg._id))} />
              <Box on={allChecked} />
              {page.selectAll}
            </label>
            <span style={{ width: 1, height: 20, background: "#dcdde2" }} />
            <button type="button" title={f.delete} onClick={removeSelected} disabled={!selected.length} className="cursor-pointer" style={{ color: selected.length ? "var(--member-accent, #fd2f2f)" : "var(--member-text, #666)" }}>
              <Trash size={20} />
            </button>
            <button type="button" title={f.markAllRead} onClick={inbox.markAllRead} className="cursor-pointer" style={{ color: "var(--member-text, #666)" }}>
              <MailRead />
            </button>
            <button type="button" onClick={() => inbox.setSort(inbox.sort === "desc" ? "asc" : "desc")} className="flex cursor-pointer items-center" style={{ gap: 8, fontSize: 13, color: "var(--member-text, #666)", marginLeft: 12 }}>
              {f.sortByTime}
              <span className="grid place-items-center" style={{ width: 16, height: 16, borderRadius: "50%", background: "#d8d9de", transform: inbox.sort === "asc" ? "rotate(180deg)" : "none" }}>
                <svg viewBox="0 0 10 6" style={{ width: 8, height: 5 }} aria-hidden="true">
                  <path d="M1 1l4 4 4-4" fill="none" stroke="#555" strokeWidth="1.5" />
                </svg>
              </span>
            </button>
          </div>

          <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
            {inbox.loaded && inbox.messages.length === 0 ? null : (
              inbox.messages.map((msg) => (
                <div
                  key={msg._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => show(msg)}
                  className="flex cursor-pointer items-start"
                  style={{ padding: "12px 30px", gap: 14, borderBottom: "1px solid #e8e9ee", background: msg._id === openId ? "var(--member-surface, #fff)" : "transparent" }}
                >
                  <span
                    role="checkbox"
                    aria-checked={selected.includes(msg._id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(msg._id);
                    }}
                    style={{ marginTop: 1 }}
                  >
                    <Box on={selected.includes(msg._id)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center" style={{ gap: 6 }}>
                      {!msg.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--member-accent, #e8474c)", flexShrink: 0 }} />}
                      <span className="truncate" style={{ fontSize: 14, color: msg.read ? "var(--member-text, #666)" : "var(--member-title, #222)", fontWeight: msg.read ? 400 : 600 }}>{pick(msg.title, lang)}</span>
                    </div>
                    <div className="truncate" style={{ fontSize: 12, color: "var(--member-muted, #999)", marginTop: 4 }}>{pick(msg.body, lang)}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>{when(msg.createdAt).slice(5)}</span>
                </div>
              ))
            )}
          </div>

          {/* নিচের বার — মুছুন */}
          <div className="flex items-center" style={{ height: 48, background: "var(--member-surface, #fff)", borderTop: "1px solid var(--member-line, #eee)", padding: "0 30px", gap: 16 }}>
            <button type="button" title={f.delete} onClick={removeSelected} disabled={!selected.length} className="cursor-pointer" style={{ color: selected.length ? "var(--member-accent, #fd2f2f)" : "var(--member-text, #666)" }}>
              <Trash size={20} />
            </button>
            <span style={{ width: 1, height: 20, background: "#e5e5e5" }} />
          </div>
        </div>

        {/* ডান — বিস্তারিত */}
        <div className="hide-scrollbar" style={{ flex: 1, background: "var(--member-surface, #fff)", overflowY: "auto", padding: open ? "24px 28px" : 0 }}>
          {open ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--member-title, #222)" }}>{pick(open.title, lang)}</div>
              <div style={{ fontSize: 12, color: "var(--member-muted, #999)", marginTop: 6 }}>{when(open.createdAt)}</div>
              <div style={{ fontSize: 14, color: "#444", lineHeight: 1.8, marginTop: 18, whiteSpace: "pre-line" }}>{pick(open.body, lang)}</div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center" style={{ color: "#bbb", fontSize: 13 }}>{inbox.messages.length ? f.pick : ""}</div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────── মোবাইল (আলাদা পেজ) ─────────────────── */

/** মূল সাইটের খালি মেইলবক্স — ধূসর মন-খারাপ মুখ */
const EmptyFace = ({ text }) => (
  // মূল সাইটের মাপ — মুখ ১৮০, ট্যাবের নিচে ১৬০ ফাঁক
  <div className="flex flex-col items-center" style={{ padding: `${m(160)} 0`, gap: m(10), background: "var(--member-surface, #fff)" }}>
    <svg viewBox="0 0 120 120" style={{ width: m(180), height: m(180), color: "#d8d8dc" }} aria-hidden="true">
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="6" />
      <circle cx="43" cy="50" r="5" fill="currentColor" />
      <circle cx="77" cy="50" r="5" fill="currentColor" />
      <path d="M40 82c6-10 34-10 40 0" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
    <span style={{ fontSize: m(36), color: "var(--member-muted, #999)" }}>{text}</span>
  </div>
);

const Mobile = () => {
  const { t, lang } = useLanguage();
  const page = t.memberPage.pages.mail;
  const f = t.inboxFlow;
  const inbox = useInbox();
  const [openId, setOpenId] = useState(null);
  const open = useMemo(() => inbox.messages.find((msg) => msg._id === openId), [inbox.messages, openId]);

  const show = (msg) => {
    setOpenId(msg._id);
    if (!msg.read) inbox.markRead([msg._id]);
  };

  if (open) {
    return (
      <MemberShell title={page.title}>
        <div style={{ background: "var(--member-surface, #fff)", minHeight: "70vh", padding: `${m(34)} ${m(30)}` }}>
          <button type="button" onClick={() => setOpenId(null)} className="cursor-pointer" style={{ color: "var(--member-link, #1e9bf0)", fontSize: m(28), marginBottom: m(24) }}>
            ‹ {f.back}
          </button>
          <div style={{ fontSize: m(34), fontWeight: 700, color: "var(--member-title, #222)" }}>{pick(open.title, lang)}</div>
          <div style={{ fontSize: m(24), color: "var(--member-muted, #999)", marginTop: m(10) }}>{when(open.createdAt)}</div>
          <div style={{ fontSize: m(28), color: "#444", lineHeight: 1.7, marginTop: m(30), whiteSpace: "pre-line" }}>{pick(open.body, lang)}</div>
          <button
            type="button"
            onClick={async () => {
              if (await inbox.remove([open._id])) setOpenId(null);
            }}
            className="w-full cursor-pointer"
            style={{ marginTop: m(60), height: m(88), borderRadius: m(12), border: "1px solid #f3c2c2", color: "var(--member-accent, #e60012)", fontSize: m(30), background: "var(--member-surface, #fff)" }}
          >
            {f.delete}
          </button>
        </div>
      </MemberShell>
    );
  }

  return (
    <MemberShell title={page.title}>
      <div className="relative flex items-center justify-center" style={{ height: m(96), background: "var(--member-surface, #fff)" }}>
        <span style={{ color: "var(--member-link, #1e9bf0)", fontSize: m(32) }}>{page.inbox}</span>
        <span className="absolute bottom-0 left-0" style={{ width: "100%", height: m(4), background: "var(--member-link, #1e9bf0)" }} />
        {inbox.messages.some((msg) => !msg.read) && (
          <button type="button" onClick={inbox.markAllRead} className="absolute cursor-pointer" style={{ right: m(24), fontSize: m(24), color: "var(--member-muted, #888)" }}>
            {f.markAllRead}
          </button>
        )}
      </div>

      {inbox.loaded && inbox.messages.length === 0 ? (
        <EmptyFace text={page.empty} />
      ) : (
        <div style={{ background: "var(--member-surface, #fff)", minHeight: "70vh" }}>
          {inbox.messages.map((msg) => (
            <div key={msg._id} role="button" tabIndex={0} onClick={() => show(msg)} className="flex cursor-pointer items-start" style={{ padding: `${m(26)} ${m(30)}`, gap: m(18), borderBottom: "1px solid #f0f0f0" }}>
              <span className="grid shrink-0 place-items-center" style={{ width: m(70), height: m(70), borderRadius: "50%", background: msg.read ? "#f0f0f3" : "#e8f3ff", color: msg.read ? "#aaa" : "var(--member-link, #1e9bf0)" }}>
                <Icon name="mailcen" size={m(36)} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center" style={{ gap: m(10) }}>
                  {!msg.read && <span style={{ width: m(14), height: m(14), borderRadius: "50%", background: "var(--member-accent, #e60012)", flexShrink: 0 }} />}
                  <span className="truncate" style={{ fontSize: m(30), color: msg.read ? "var(--member-text, #666)" : "var(--member-title, #222)", fontWeight: msg.read ? 400 : 600 }}>{pick(msg.title, lang)}</span>
                </div>
                <div className="truncate" style={{ fontSize: m(24), color: "var(--member-muted, #999)", marginTop: m(8) }}>{pick(msg.body, lang)}</div>
              </div>
              <span style={{ fontSize: m(22), color: "#aaa", flexShrink: 0 }}>{when(msg.createdAt).slice(5, 10)}</span>
            </div>
          ))}
        </div>
      )}
    </MemberShell>
  );
};

const InboxSection = (props) => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <Desktop {...props} /> : <Mobile {...props} />;
};

export default InboxSection;
