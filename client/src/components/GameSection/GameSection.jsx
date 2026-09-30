import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";

import GameCard from "../GameCard/GameCard";
import Icon from "../Icon/Icon";
import { m } from "../../hook/useUnits";
import { NoData } from "../Loader/Loader";
import CardPlaceholders from "../GameCard/CardPlaceholders";
import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { selectGameSource } from "../../features/globalGame/globalGameSelectors";
import { useSectionGames } from "../../features/globalGame/useSectionGames";
import { useDragScroll } from "../../hook/useDragScroll";

/**
 * হোমের একটা গেম সেকশন — ডেস্কটপ ও মোবাইলে গঠন **সম্পূর্ণ আলাদা**,
 * তাই দুটো আলাদা শাখা।
 *
 * ── ডেস্কটপ (px, মাপা) ──
 *   `.main-title` ৫৪ উঁচু, `.title-label` gap ১৩, span fs ২৫
 *   ভেন্ডর চিপ ১৫২ × ৫০ (ছবি ১৫০ × ৪৮ contain), margin-top ৩০
 *   গ্রিড ৬ কলাম × ১৬৪.২, গ্যাপ ২০, **কলাম-মেজর** ২ সারি
 *   নিচে `.pagination-container` — ‹ ৪০ › তীর + ৯৬ × ৪০ "More"
 *
 * ── মোবাইল (৭৫০-ডিজাইন, মাপা) ──
 *   বাইরে `.game-content-wrap` padding `0 12`
 *   প্যানেল `.hot-game-container` / `.classify-container` ৭২৬ চওড়া,
 *     `background: url(section-bg) 50%/cover` (উপরে-বাঁয়ে ট্যাবের খাঁজ),
 *     padding `0 22 20 24` → ভিতরের কনটেন্ট ৬৮০
 *   `.game-title` ৬৮০ × ৫০, উপরে ১৫
 *     `.title-text` ২০৫ × ৫০, radius `10 10 0 0`, লেখা fs ৩০ bold
 *     `.btn-navigation` ডানে ভাসে ১৬৩.৫ × ২৮ —
 *        `.btn-prev`/`.btn-next` ২৬ × ২৮ radius ৫ bg rgba(251,208,41,.15)
 *        `.more-games` ৮৭.১ × ২৮ radius ৫০, ভিতরে fs ১৬ রঙ #FBD029
 *        ফাঁক ১২ করে; **"গরম খেলা" সেকশনে এই সারি থাকে না**
 *   ভেন্ডর চিপ `li.classify-item` ১১৯.৫ × ৮০, radius ৫,
 *     border `2px solid #BC43F4`; ছবি ৯৫.৭ × ৪৫.৭ contain **উপরে**,
 *     নাম fs ২০ সাদা **নিচে**; সক্রিয় হলে bg rgba(188,67,244,.3) +
 *     নিচে ১৯ × ১০ তীরচিহ্ন
 *   গ্রিড ৩ কলাম × ২১৬.৭, গ্যাপ ১৫, উপরে ৩০;
 *     "গরম খেলা" ৩ সারি (নেভ নেই), বাকিগুলো ২ সারি (নেভ আছে)
 */
const DESKTOP_ROWS = 2;
const DESKTOP_COLS = 6;
const MOBILE_COLS = 3;
const MOBILE_HOT_ROWS = 3;
const MOBILE_ROWS = 2;

/** ডেস্কটপের More এর দুপাশের বৃত্তাকার তীর */
const DeskArrow = ({ dir, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={dir}
    className="flex shrink-0 cursor-pointer items-center justify-center"
    style={{
      width: 40,
      height: 40,
      borderRadius: "50%",
      background: "rgb(251 208 41 / 0.15)",
      color: "var(--gold)",
      opacity: disabled ? 0.35 : 1,
      pointerEvents: disabled ? "none" : "auto",
      [dir === "prev" ? "marginInlineEnd" : "marginInlineStart"]: 40,
      [dir === "prev" ? "paddingInlineEnd" : "paddingInlineStart"]: 5,
    }}
  >
    <Icon name={dir === "prev" ? "arrow-left" : "arrow-right"} size={16} />
  </button>
);

/** মোবাইলের টাইটেল সারির ডানের ছোট চৌকো তীর */
const MobArrow = ({ dir, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={dir}
    className="flex shrink-0 cursor-pointer items-center justify-center"
    style={{
      // মূল মাপ (২৬ × ২৮) মোবাইলে চাপতে ছোট লাগে — দেড়গুণ
      width: m(40),
      height: m(42),
      borderRadius: m(8),
      background: "rgb(251 208 41 / 0.15)",
      color: "var(--gold)",
      opacity: disabled ? 0.35 : 1,
      pointerEvents: disabled ? "none" : "auto",
    }}
  >
    {/* `classify-arrow-*` — সোনালি গ্রেডিয়েন্ট শেভরন, ১০ × ১৮ */}
    <img
      src={`/assets/mobile/icons/nav-${dir === "prev" ? "prev" : "next"}.svg`}
      alt=""
      style={{ width: m(14), height: m(25) }}
    />
  </button>
);

const GameSection = ({
  section,
  vendors = [],
  games = [],
  total,
  loading = false,
  // ডেস্কটপ হোমের ট্যাব খুললে: শিরোনাম নেই, প্রথমে ৪ সারি (মূল সাইট মাপা)
  hideTitle = false,
  initialRows = DESKTOP_ROWS,
  // "আমার প্রিয়" — ব্রাউজারের তালিকা, server থেকে কিছু আনা হয় না
  offline = false,
}) => {
  const { t } = useLanguage();
  const isDesktop = useIsDesktop();
  const [vendor, setVendor] = useState(null);
  // মূল সাইটে "More" নতুন পেজে নেয় না — সেকশনেই আরও সারি যোগ হয়
  const [rows, setRows] = useState(initialRows);
  // তীর দুটো তালিকার পাতা বদলায়
  const [page, setPage] = useState(0);

  const apiMode = useSelector(selectGameSource) === "api" && !offline;
  const navigate = useNavigate();
  // ডেস্কটপের প্রোভাইডার সারি — মাউসে টেনে / চাকায় সরানো যায়
  const chipRow = useDragScroll();
  const isHot = section.type === "hot" || section.key === "hot";
  const mobRows = isHot ? MOBILE_HOT_ROWS : MOBILE_ROWS;

  // চিপগুলো ট্যাবের মতো — দুই ডিজাইনেই একটা সবসময় বাছা থাকে, শুরুতে
  // প্রথমটা (মূল সাইটে ডেস্কটপেও PG/JILI আগে থেকে বাছা, গ্রিডে শুধু তার
  // গেম)। ভেন্ডর তালিকা ডেটার সাথে পরে আসে বলে initial value দিয়ে হয় না।
  const active = vendor ?? vendors[0]?.code ?? null;

  // API থেকে এলে ভেন্ডরের গেম আর পরের পাতা server থেকে আসে
  const { list, hasMore, loadMore, loading: moreLoading } = useSectionGames({
    sectionKey: section.key,
    games,
    total,
    vendor: active,
    apiMode,
  });
  const busy = loading || (moreLoading && !list.length);

  // মোবাইলের "গরম খেলা": ৮টা গেম + শেষ ঘরে "অধিক" (মূল সাইট মাপা)
  const hotMoreTile = !isDesktop && isHot && apiMode;
  const perPage = isDesktop ? rows * DESKTOP_COLS : MOBILE_COLS * mobRows - (hotMoreTile ? 1 : 0);
  const filtered = useMemo(() => {
    const start = Math.min(page * perPage, Math.max(0, list.length - perPage));
    return list.slice(start, start + perPage);
  }, [list, perPage, page]);

  const atStart = page === 0;
  const atEnd = (page + 1) * perPage >= list.length && !hasMore;

  // পরের পাতা/সারিতে হাতে থাকা গেম না কুলালে server থেকে আরও আনা
  const nextPage = () => {
    if ((page + 2) * perPage > list.length) loadMore();
    setPage((n) => n + 1);
  };
  const moreRows = () => {
    if ((rows + 2) * DESKTOP_COLS > list.length) loadMore();
    setRows((n) => n + 2);
  };

  const cards = filtered.map((game) => <GameCard key={game.id} game={game} />);

  /* ─────────────────────────── মোবাইল ─────────────────────────── */
  if (!isDesktop) {
    return (
      <section
        id={`section-${section.key}`}
        style={{
          scrollMarginTop: "calc(var(--header-h) + 0.2rem)",
          paddingInline: m(12),
          marginBottom: m(60),
        }}
      >
        <div
          style={{
            backgroundImage: "url(/assets/mobile/section-bg.png)",
            backgroundSize: "cover",
            backgroundPosition: "50%",
            padding: `0 ${m(22)} ${m(20)} ${m(24)}`,
          }}
        >
          {/* ── টাইটেল সারি ── */}
          <div className="relative flex items-center" style={{ height: m(50), marginTop: m(15) }}>
            <div
              className="flex items-center"
              style={{
                // ২০৫ মূল মাপ, লম্বা নামে ("ক্র্যাশ গেমস") চওড়া হয়
                minWidth: m(205),
                height: m(50),
                paddingInline: m(10),
                borderRadius: `${m(10)} ${m(10)} 0 0`,
              }}
            >
              <span
                className="whitespace-nowrap"
                style={{
                  paddingInlineStart: m(14),
                  fontSize: m(30),
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {section.title}
              </span>
            </div>

            {/* "গরম খেলা" ছাড়া বাকি সব সেকশনে ডানে নেভ সারি */}
            {!isHot && (
              <div
                className="absolute flex items-center"
                // প্যানেলের ছবির ডান দিকটা ৬৫ ইউনিট নিচ থেকে শুরু — বোতামের সারি
                // উপরের খাঁজের ভিতরে (৭–৪৯) রাখি, নইলে প্যানেলের কিনারায় লেগে যায়
                style={{ right: 0, top: m(-8), height: m(42), gap: m(14) }}
              >
                <MobArrow
                  dir="prev"
                  disabled={atStart}
                  onClick={() => setPage((n) => Math.max(0, n - 1))}
                />
                <button
                  type="button"
                  // পুরো তালিকা খেলার কেন্দ্রে — বাছা প্রোভাইডার সহ
                  onClick={() =>
                    apiMode &&
                    navigate(`/games/${section.key}${active ? `?vendor=${encodeURIComponent(active)}` : ""}`)
                  }
                  className="tb-more-btn flex cursor-pointer items-center justify-center"
                  style={{
                    height: m(42),
                    padding: `0 ${m(20)}`,
                    borderRadius: m(50),
                    background: "rgb(251 208 41 / 0.15)",
                    color: "var(--gold)",
                    fontSize: m(24),
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.seeAll}
                </button>
                <MobArrow dir="next" disabled={atEnd} onClick={nextPage} />
              </div>
            )}
          </div>

          {/* ── ভেন্ডর চিপ ── */}
          {vendors.length > 0 && (
            <div
              className="hide-scrollbar flex overflow-x-auto"
              // নিচে একটু জায়গা — নইলে সক্রিয় চিপের তীরচিহ্নটা
              // overflow-x: auto এর কারণে কেটে যায়
              style={{ paddingTop: m(22), paddingBottom: m(14), gap: m(9.7) }}
            >
              {vendors.map((v) => {
                const isActive = active === v.code;

                return (
                  <button
                    key={v.code}
                    type="button"
                    // ট্যাবের মতো — আবার চাপলে বন্ধ হয় না
                    onClick={() => {
                      setVendor(v.code);
                      setPage(0);
                    }}
                    className="tb-vendor-chip relative flex shrink-0 cursor-pointer flex-col items-center justify-center"
                    style={{
                      width: m(119.5),
                      height: m(80),
                      paddingInline: m(10),
                      borderRadius: m(5),
                      border: `${m(2)} solid var(--accent-bright)`,
                      background: isActive ? "rgb(188 67 244 / 0.3)" : "transparent",
                    }}
                  >
                    {v.icon && (
                      <img
                        src={v.icon}
                        alt={v.name}
                        loading="lazy"
                        style={{ width: m(95.7), height: m(45.7), objectFit: "contain" }}
                      />
                    )}
                    {/* লম্বা নাম দুই লাইনে ভাঙে (মূল সাইটে
                        "Crash Games" ঠিক এভাবেই ৪৬ উঁচু হয়) */}
                    <span
                      className="w-full text-center"
                      style={{
                        fontSize: m(20),
                        color: "#fff",
                        lineHeight: m(23),
                        maxHeight: m(46),
                        overflow: "hidden",
                      }}
                    >
                      {v.name}
                    </span>

                    {/* সক্রিয় চিপের নিচে ছোট তীরচিহ্ন */}
                    {isActive && (
                      <span
                        className="absolute"
                        style={{
                          bottom: m(-10),
                          width: m(19),
                          height: m(10),
                          backgroundImage: "url(/assets/mobile/chip-caret.png)",
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "50%",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── গেম গ্রিড ── */}
          <div
            style={{
              paddingTop: m(30),
              display: "grid",
              gridTemplateColumns: `repeat(${MOBILE_COLS}, minmax(0, 1fr))`,
              gap: m(15),
            }}
          >
            {busy ? <CardPlaceholders count={perPage} /> : cards}
            {hotMoreTile && filtered.length > 0 && !busy && (
              <button
                type="button"
                onClick={() => navigate(`/games/${section.key}`)}
                className="flex cursor-pointer flex-col items-center justify-center"
                style={{
                  // কার্ডের ছবির সমান উঁচু (২১৭:২৪৫) + নামের সারি
                  aspectRatio: "217 / 280.8",
                  borderRadius: m(20),
                  border: "1px solid var(--accent-bright)",
                  gap: m(14),
                  color: "#fff",
                  fontSize: m(32),
                }}
              >
                <svg style={{ width: m(50), height: m(50) }} viewBox="0 0 24 24" aria-hidden="true">
                  <g fill="#fff">
                    <rect x="2" y="2" width="9" height="9" rx="2.5" />
                    <rect x="13" y="2" width="9" height="9" rx="2.5" />
                    <rect x="2" y="13" width="9" height="9" rx="2.5" />
                    <rect x="13" y="13" width="9" height="9" rx="2.5" />
                  </g>
                </svg>
                {t.games.more}
              </button>
            )}
          </div>

          {!busy && !filtered.length && <NoData />}
        </div>
      </section>
    );
  }

  /* ─────────────────────────── ডেস্কটপ ─────────────────────────── */
  return (
    <section
      // সাইডবারের "গেম সেন্টার" থেকে এই id ধরে স্ক্রল করা হয়
      id={`section-${section.key}`}
      style={{
        scrollMarginTop: "calc(var(--header-h) + 20px)",
        marginBottom: "var(--section-mb)",
      }}
    >
      {/* `.main-title` ৫৪ উঁচু, কিন্তু চিপ থাকা সেকশনে ৩৩ (মাপা) */}
      {!hideTitle && (
      <div
        className="flex items-center"
        style={{ height: vendors.length ? 33 : "var(--section-title-h)", gap: 13 }}
      >
        {(section.titleIconUrl || section.titleIcon) && (
          <img
            src={section.titleIconUrl || `/assets/icons/title/${section.titleIcon}.png`}
            alt=""
            style={{ width: 34, height: 34, objectFit: "contain" }}
          />
        )}
        <span style={{ fontSize: 25, color: "var(--home-title, #fff)" }}>{section.title}</span>
      </div>
      )}

      {vendors.length > 0 && (
        <div
          ref={chipRow}
          className="hide-scrollbar flex overflow-x-auto"
          style={{ marginTop: 30, height: "var(--vendor-h)", gap: 10 }}
        >
          {vendors.map((v) => {
            const isActive = active === v.code;

            return (
              <button
                key={v.code}
                type="button"
                onClick={() => {
                  setVendor(v.code);
                  setPage(0);
                  setRows(initialRows);
                }}
                className="flex shrink-0 cursor-pointer items-center justify-center"
                style={{
                  width: "var(--vendor-w)",
                  height: "var(--vendor-h)",
                  borderRadius: "var(--vendor-radius)",
                  // মূল সাইটে বর্ডারটা সবসময় থাকে, শুধু সক্রিয় হলে
                  // ভিতরে বেগুনি টিন্ট বসে
                  background: isActive ? "var(--accent-soft-strong)" : "transparent",
                  border: "1.5px solid var(--accent-bright)",
                  overflow: "hidden",
                }}
              >
                {v.icon ? (
                  <img
                    src={v.icon}
                    alt={v.name}
                    // `.game-vendor-menu--item img` — ১৫০ চওড়া, পূর্ণ উচ্চতা
                    style={{ width: 150, height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <span style={{ color: "var(--text-dim)", fontSize: 16 }}>{v.name}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* সারি ধরে ভরে — একটা সারি (৬টা) পূর্ণ হলে তবেই পরের সারি; কম গেম
          থাকলে ফাঁকা থাকে শুধু শেষ সারির ডানদিকে */}
      <div
        style={{
          marginTop: "var(--section-gap)",
          display: "grid",
          gridTemplateColumns: `repeat(${DESKTOP_COLS}, var(--card-w))`,
          gap: "var(--card-gap)",
          justifyContent: "start",
        }}
      >
        {busy ? <CardPlaceholders count={DESKTOP_COLS * rows} desktop /> : cards}
      </div>

      {/* ডেটা আসার আগে স্পিনার, না এলে "কোন ডেটা নেই" — মূল সাইটের মতোই */}
      {!busy && !filtered.length && <NoData />}

      {!busy && filtered.length > 0 && (
        <div className="flex items-center justify-center" style={{ marginTop: 24 }}>
          <DeskArrow
            dir="prev"
            disabled={atStart}
            onClick={() => setPage((n) => Math.max(0, n - 1))}
          />

          <button
            type="button"
            onClick={moreRows}
            disabled={filtered.length >= list.length && !hasMore}
            className="tb-more-btn flex cursor-pointer items-center justify-center"
            style={{
              width: 96,
              height: 40,
              borderRadius: 10,
              background: "rgb(251 208 41 / 0.15)",
              color: "var(--gold)",
              fontSize: 20,
              opacity: filtered.length >= list.length && !hasMore ? 0.4 : 1,
            }}
          >
            {t.more}
          </button>

          <DeskArrow dir="next" disabled={atEnd} onClick={nextPage} />
        </div>
      )}
    </section>
  );
};

export default GameSection;
