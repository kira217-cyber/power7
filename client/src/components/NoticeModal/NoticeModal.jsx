import React, { useState } from "react";

import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { useNavigate } from "react-router";
import { followLink } from "../../utils/siteLink";

/**
 * সাইট খুললেই যে "Notice" পপআপ আসে।
 *
 * মূল সাইট থেকে মাপা —
 * **ডেস্কটপ** (`.popup_modal_wrap`): ১১৪৭ × ৬৪৮; ক্লোজ ২২ × ২২ (১১০০, ২৫);
 *   `.popup-content` এর ব্যাকগ্রাউন্ডে ছবি, padding `30 24 30 17`;
 *   `.popup-main` ১১০৬ × ৫৮৮ — বাঁয়ে তালিকা ২৪০.৬ চওড়া,
 *   ডানে বিস্তারিত ৮৪৫.৪ চওড়া, padding `60 20 20`
 * **মোবাইল** (`.popup_content`): ৫৬২ × ১১৬০ (৭৫০-ডিজাইনে), bg #1B2132,
 *   radius ১২; ক্লোজ ১০০ × ১০০ উপরে-ডানে, bg rgba(255,255,255,.2);
 *   শিরোনাম (৩০, ৩০) fs ৩২ fw ৮০০; লেখা (৩০, ১০২) fs ২৬
 */
const NoticeModal = ({ items = [], onClose }) => {
  const { t, lang } = useLanguage();
  const titleOf = (item) => (lang === "en" && item?.titleEn) || item?.title;
  const isDesktop = useIsDesktop();
  const [active, setActive] = useState(0);
  // বাঁ তালিকায় একবারে ৯টা (৫১০ ÷ ৫৩) — বেশি হলে নিচের পাতা বদল
  const PER_PAGE = 9;
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  // ছবিতে চাপলে পপআপের লিংক (প্রমোশন বা বাইরের) — খুললে পপআপ বন্ধ
  const open = (item) => {
    if (followLink(item?.link, navigate)) onClose?.();
  };

  if (!items.length) return null;

  const current = items[Math.min(active, items.length - 1)];
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const pageItems = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  if (!isDesktop) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "rgb(0 0 0 / 0.6)", zIndex: 70 }}
        onClick={onClose}
      >
        <div
          className="relative"
          style={{
            width: m(562),
            maxHeight: "82vh",
            background: "var(--popup-bg, #1b2132)",
            borderRadius: m(12),
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="absolute flex cursor-pointer items-center justify-center"
            style={{
              top: 0,
              right: 0,
              width: m(100),
              height: m(100),
              background: "rgb(255 255 255 / 0.2)",
              color: "#fff",
            }}
          >
            <Icon name="popup-close" size={m(40)} />
          </button>

          <div
            style={{
              padding: m(30),
              fontSize: m(32),
              fontWeight: 800,
              color: "#fff",
              width: m(442),
            }}
          >
            {titleOf(current)}
          </div>

          <div
            className="hide-scrollbar"
            style={{
              padding: `0 ${m(30)} ${m(30)}`,
              fontSize: m(26),
              color: "#fff",
              overflowY: "auto",
              maxHeight: "60vh",
            }}
          >
            {current.image && (
              <img src={current.image} alt="" onClick={() => open(current)} style={{ width: "100%", display: "block", cursor: current.link ? "pointer" : "default" }} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "rgb(0 0 0 / 0.6)", zIndex: 70 }}
      onClick={onClose}
    >
      <div
        className="relative"
        style={{ width: 1147, height: 648 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="tb-hover-fade absolute cursor-pointer"
          style={{ top: 22, right: 22, width: 28, height: 28, zIndex: 2, color: "#fff" }}
        >
          <Icon name="popup-close" size={28} />
        </button>

        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 5,
            overflow: "hidden",
            background: "var(--popup-bg, #1b2132) url(/assets/site/announce-bg.854443e2.png) 0 0 / 100% 100% no-repeat",
            padding: "30px 24px 30px 17px",
            display: "flex",
            gap: 19,
          }}
        >
          {/* বাঁয়ে — মূল সাইটের `.content-nav` (২৪১ × ৫১০, #21233A, radius ১৪) আর নিচে পাতা বদল */}
          <div className="flex shrink-0 flex-col" style={{ width: 241, height: 588 }}>
            <ul className="hide-scrollbar" style={{ height: 510, overflowY: "auto", background: "var(--popup-list-bg, #21233a)", borderRadius: 14 }}>
              {pageItems.map((item, j) => {
                const i = page * PER_PAGE + j;
                const on = i === active;
                return (
                  <li key={item.id ?? i}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      className="flex w-full cursor-pointer items-center text-left"
                      style={{ height: 53, padding: "0 13px", gap: 8, color: on ? "var(--popup-title, #f5df4b)" : "var(--popup-text, #a6a6a6)", fontSize: 15 }}
                    >
                      <img src="/assets/site/notice-item.png" alt="" style={{ width: 18, height: 18, flexShrink: 0 }} />
                      <span className="flex-1 truncate">{titleOf(item)}</span>
                      <svg viewBox="0 0 6 11" style={{ width: 6, height: 11, flexShrink: 0 }} aria-hidden="true">
                        <path d="M1 1l4 4.5L1 10" fill="none" stroke="#a6a6a6" strokeWidth="1.3" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-center" style={{ height: 36, marginTop: 23, background: "var(--popup-list-bg, #21233a)", borderRadius: 14, gap: 3 }}>
              <button type="button" aria-label="previous" disabled={page === 0} onClick={() => setPage((v) => v - 1)} className="grid cursor-pointer place-items-center" style={{ width: 34, height: 24, opacity: page === 0 ? 0.5 : 1 }}>
                <svg viewBox="0 0 8 14" style={{ width: 8, height: 14 }} aria-hidden="true">
                  <path d="M7 1L1 7l6 6" fill="none" stroke="#fff" strokeWidth="1.6" />
                </svg>
              </button>
              {Array.from({ length: pages }, (_, n) => (
                <button key={n} type="button" onClick={() => setPage(n)} className="cursor-pointer" style={{ width: 34, height: 24, fontSize: 15, color: n === page ? "var(--popup-title, #f5df4b)" : "var(--popup-text, #a6a6a6)" }}>
                  {n + 1}
                </button>
              ))}
              <button type="button" aria-label="next" disabled={page >= pages - 1} onClick={() => setPage((v) => v + 1)} className="grid cursor-pointer place-items-center" style={{ width: 34, height: 24, opacity: page >= pages - 1 ? 0.5 : 1 }}>
                <svg viewBox="0 0 8 14" style={{ width: 8, height: 14 }} aria-hidden="true">
                  <path d="M1 1l6 6-6 6" fill="none" stroke="#fff" strokeWidth="1.6" />
                </svg>
              </button>
            </div>
          </div>

          {/* ডানে — `.content-detail` ৮৪৫ চওড়া, উপরে "Notice" ছবি (২০২ × ৬০), শিরোনাম fs ৩০ fw ৭০০ #F5DF4B */}
          <div className="hide-scrollbar relative" style={{ width: 845, height: 588, padding: "60px 20px 20px", overflowY: "auto" }}>
            <img src="/assets/site/notice-title.png" alt={t.noticeTitle} className="absolute" style={{ left: 20, top: 0, width: 202, height: 60 }} />
            <div className="truncate" style={{ padding: "25px 0 30px", fontSize: 30, fontWeight: 700, color: "var(--popup-title, #f5df4b)", lineHeight: "40px" }}>
              {titleOf(current)}
            </div>
            {current.image && (
              <img
                src={current.image}
                alt=""
                onClick={() => open(current)}
                style={{ width: 785, display: "block", cursor: current.link ? "pointer" : "default" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticeModal;
