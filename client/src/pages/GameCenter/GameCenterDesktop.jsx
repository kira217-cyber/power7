import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import GameCard from "../../components/GameCard/GameCard";
import Loader, { NoData } from "../../components/Loader/Loader";
import CardPlaceholders from "../../components/GameCard/CardPlaceholders";
import { useLanguage } from "../../Context/LanguageProvider";
import { useGameList } from "../../features/globalGame/useGameList";
import { mergeFavorites, useFavorites } from "../../features/game/favorites";
import { useDragScroll } from "../../hook/useDragScroll";

/**
 * ডেস্কটপের খেলার কেন্দ্র — মূল সাইটের `/rng` মেপে (১৯২০ তে):
 *
 *   সাইডবার নেই, কলাম ১২৩৬ চওড়া
 *   ক্যাটাগরি বার  ১২৩৬ × ৬২, bg #1C2638, radius ১০, padding ২.৮, gap ৭
 *     আইটেম ৭৬.৮ × ৫৬.৪, padding `6 14.7`, radius ৭, লেখা ১৭ #5C677A;
 *     সক্রিয় হলে বেগুনি-নীল ছবির পটভূমি আর সাদা লেখা
 *   তার নিচে ২৫.৭ ফাঁকে ৬১.৩ উঁচু সারি — বাঁয়ে Back (১৫১ × ৪২.৮,
 *     #222A38, radius ১০, লেখা ১৪ #5C677A), ডানে খোঁজ (২৩০ × ৪৩,
 *     #222A38, border 1px #5D6C87, radius ১০, padding-left ৩৫)
 *   গ্রিড ৬ কলাম × ১৯০, gap `30 19.4`, কার্ডের ছবি ১৯০ বর্গ
 *   প্রতি পাতায় ৩ সারি = ১৮টা; নিচে পাতার নম্বর ৩৪ × ২৪, margin `0 3`,
 *     সক্রিয় #DA394F radius ২
 *
 * মূল সাইটে ক্যাটাগরি আর গ্রিডের মাঝে প্রোভাইডারের সারিটা ভাঙা (ছবি
 * আসে না) — এখানে হোমের মতো লোগো-চিপ বসানো।
 */
const PER_PAGE = 18;
const COLS = 6;

const pageList = (current, last) => {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, 2, last - 1, last, current - 1, current, current + 1]);
  if (current <= 4) [3, 4, 5].forEach((p) => pages.add(p));
  if (current >= last - 3) [last - 2, last - 3, last - 4].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
};

const PageButton = ({ active, disabled, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex cursor-pointer items-center justify-center"
    style={{
      width: 34,
      height: 24,
      margin: "0 3px",
      borderRadius: 2,
      background: active ? "var(--games-active, #DA394F)" : "transparent",
      color: "var(--games-text, #fff)",
      fontSize: 14,
      opacity: disabled ? 0.35 : 1,
      pointerEvents: disabled || active ? "none" : "auto",
    }}
  >
    {children}
  </button>
);

const GameCenterDesktop = ({ category, tabs, label, vendor, search, setVendor, setSearch, goCategory }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(search);
  const chipRow = useDragScroll();
  const tabRow = useDragScroll();

  // ক্যাটাগরি/প্রোভাইডার/খোঁজ বদলালে প্রথম পাতা
  useEffect(() => setPage(1), [category?.key, vendor, search]);
  useEffect(() => setDraft(search), [search]);

  // খোঁজ — লেখা থামার একটু পরে
  useEffect(() => {
    const id = setTimeout(() => draft !== search && setSearch(draft.trim()), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const isFav = category?.type === "favorite";
  const favorites = useFavorites();
  // admin এর বাছাই করা প্রিয় গেম — একবারে সব (তালিকা ছোট), তারপর নিজের ♥ এর সাথে মিলিয়ে
  const picked = useGameList({ category: isFav ? category?.key : "", page: 1, limit: 100 });
  const favAll = mergeFavorites(favorites, picked.games);
  const list = useGameList({
    category: isFav ? "" : category?.key,
    provider: vendor,
    search: isFav ? "" : search,
    page,
    limit: PER_PAGE,
  });

  // "আমার প্রিয়" — ব্রাউজারের তালিকা থেকে, খোঁজ সহ
  const favFound = favAll.filter(
    (g) => !search || `${g.name} ${g.nameEn || ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const games = isFav ? favFound.slice((page - 1) * PER_PAGE, page * PER_PAGE) : list.games;
  const total = isFav ? favFound.length : list.total;
  const loading = isFav ? picked.loading && !favAll.length : list.loading;

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  // প্রথমবার গেম আসা পর্যন্ত পুরো পাতার লোডার; পরে শুধু কার্ডের লোডিং
  // (প্রথম রেন্ডারে লোড তখনো শুরু হয়নি — একবার শুরু হয়ে শেষ হলে তবেই বন্ধ)
  const [firstLoad, setFirstLoad] = useState(true);
  const sawLoading = useRef(false);
  useEffect(() => {
    if (loading) sawLoading.current = true;
    else if (sawLoading.current || isFav) setFirstLoad(false);
  }, [loading, isFav]);
  const providers = category?.providers || [];

  return (
    <div
      style={{
        width: 1236,
        margin: "0 auto",
        padding: "17px 0 60px",
        // কার্ড হোমের চেয়ে বড় — ১৯০
        "--card-w": "190px",
        "--card-img": "190px",
      }}
    >
      {/* ── ক্যাটাগরি বার ── */}
      <div
        ref={tabRow}
        className="hide-scrollbar flex overflow-x-auto"
        style={{ height: 62, padding: 2.8, gap: 7, borderRadius: 10, background: "var(--games-tab-bg, #1C2638)" }}
      >
        {[{ key: "__home", home: true }, ...tabs].map((c) => {
          const active = c.key === category?.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => (c.home ? navigate("/") : goCategory(c))}
              className="tb-more-btn flex shrink-0 cursor-pointer flex-col items-center justify-center whitespace-nowrap"
              style={{
                minWidth: 76.8,
                height: 56.4,
                padding: "6px 14.7px",
                borderRadius: 7,
                background: active ? "url(/assets/gamecenter/tab-active-bg.png) 50% / cover no-repeat" : "transparent",
                color: active ? "var(--games-text, #fff)" : "var(--games-tab-text, #5C677A)",
                fontSize: 17,
                fontWeight: 500,
                lineHeight: "25px",
              }}
            >
              {c.home ? (
                <svg width="21" height="19" viewBox="0 0 24 22" aria-hidden="true">
                  <path d="M12 1 1 10h3v11h6v-7h4v7h6V10h3z" fill="#e6485a" />
                </svg>
              ) : c.deskIcon ? (
                <img src={c.deskIcon} alt="" style={{ height: 20, width: 30, objectFit: "contain" }} />
              ) : (
                <span style={{ height: 20 }} />
              )}
              <span>{c.home ? t.games.home : label(c)}</span>
            </button>
          );
        })}
      </div>

      {/* ── Back + খোঁজ ── */}
      <div className="flex items-center justify-between" style={{ height: 61.3, marginTop: 25.7 }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="tb-more-btn flex cursor-pointer items-center justify-center"
          style={{ width: 151, height: 42.8, gap: 26, borderRadius: 10, background: "var(--games-tab-bg, #222A38)", color: "var(--games-tab-text, #5C677A)", fontSize: 14 }}
        >
          {/* মূল সাইটের ভরাট "reply" তীর */}
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill="currentColor" />
          </svg>
          {t.games.back}
        </button>

        <label
          className="relative flex items-center"
          style={{ width: 230, height: 43, borderRadius: 10, background: "var(--games-tab-bg, #222A38)", border: "1px solid #5D6C87" }}
        >
          <Search size={15} className="absolute" style={{ left: 13, color: "#8a93a6" }} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.games.searchDesk}
            className="h-full w-full bg-transparent outline-none"
            style={{ padding: "0 13px 0 35px", color: "var(--games-text, #fff)", fontSize: 14 }}
          />
        </label>
      </div>

      {/* ── প্রোভাইডার ── */}
      {providers.length > 0 && (
        <div ref={chipRow} className="hide-scrollbar flex overflow-x-auto" style={{ marginTop: 14, gap: 10, height: "var(--vendor-h)" }}>
          <button
            type="button"
            onClick={() => setVendor("")}
            className="flex shrink-0 cursor-pointer items-center justify-center"
            style={{
              width: 90,
              height: "var(--vendor-h)",
              borderRadius: "var(--vendor-radius)",
              border: "1.5px solid var(--accent-bright)",
              background: !vendor ? "var(--accent-soft-strong)" : "transparent",
              color: "var(--games-text, #fff)",
              fontSize: 16,
            }}
          >
            {t.games.all}
          </button>
          {providers.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => setVendor(vendor === p.code ? "" : p.code)}
              title={p.name}
              className="flex shrink-0 cursor-pointer items-center justify-center overflow-hidden"
              style={{
                width: "var(--vendor-w)",
                height: "var(--vendor-h)",
                borderRadius: "var(--vendor-radius)",
                border: "1.5px solid var(--accent-bright)",
                background: vendor === p.code ? "var(--accent-soft-strong)" : "transparent",
              }}
            >
              {p.icon ? (
                <img src={p.icon} alt={p.name} style={{ width: 150, height: "100%", objectFit: "contain" }} />
              ) : (
                <span style={{ color: "var(--games-text, #fff)", fontSize: 16 }}>{p.name}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── গ্রিড ── */}
      <div className="relative" style={{ marginTop: 22, minHeight: 240 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 190px)`,
            gap: "30px 19.4px",
          }}
        >
          {/* পাতা/প্রোভাইডার বদলালে কার্ডের জায়গায় লোডিং কার্ড */}
          {loading ? (
            <CardPlaceholders count={PER_PAGE} desktop />
          ) : (
            games.map((game) => <GameCard key={game.id} game={game} />)
          )}
        </div>

        {/* পাতাটা প্রথম খোলার সময় — পুরো পর্দার লোডার (মূল সাইটের মতো) */}
        {loading && firstLoad && <Loader scope="site" />}
        {!loading && !games.length && (isFav ? <EmptyNote text={t.games.favEmpty} /> : <NoData />)}
      </div>

      {/* ── পাতার নম্বর ── */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center" style={{ marginTop: 20 }}>
          <PageButton disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} />
          </PageButton>
          {pageList(page, lastPage).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} style={{ width: 34, textAlign: "center", color: "var(--games-text, #fff)", fontSize: 14 }}>
                …
              </span>
            ) : (
              <PageButton key={p} active={p === page} onClick={() => setPage(p)}>
                {p}
              </PageButton>
            ),
          )}
          <PageButton disabled={page === lastPage} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={16} />
          </PageButton>
        </div>
      )}
    </div>
  );
};

const EmptyNote = ({ text }) => (
  <div className="text-center" style={{ padding: "40px 0", color: "rgb(255 255 255 / 0.6)", fontSize: 15 }}>
    {text}
  </div>
);

export default GameCenterDesktop;
