import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ListFilter, Search, X } from "lucide-react";

import GameCard from "../../components/GameCard/GameCard";
import Loader, { NoData } from "../../components/Loader/Loader";
import CardPlaceholders from "../../components/GameCard/CardPlaceholders";
import { useLanguage } from "../../Context/LanguageProvider";
import { useGameList } from "../../features/globalGame/useGameList";
import { mergeFavorites, useFavorites } from "../../features/game/favorites";
import { m } from "../../hook/useUnits";

/**
 * মোবাইলের খেলার কেন্দ্র — মূল সাইটের `/m/slot-games` মেপে (৭৫০-ডিজাইন):
 *
 *   হেডার ৭৫০ × ১০০, fixed, bg #181F2B, padding `0 20`, নিচে সরু সাদা রেখা
 *     বাঁয়ে ‹ (৬৮), পাশে বাছা প্রোভাইডারের পিল "PG ✕"; ডানে 🔍 ও ফিল্টার (৪৪)
 *   ক্যাটাগরি সারি ১৫০ উঁচু, padding `20 0 0 15`; আইটেম ১২০ × ১৩০,
 *     margin-right ২০, আইকন ৬৪ (পিছনে হোমের সেই বেগুনি বৃত্ত), নাম ২০ bold
 *   বাঁয়ে প্রোভাইডারের কলাম ১৩৫ চওড়া, padding `15 0 0 15`;
 *     আইটেম ১২০ × ৫৪, ফাঁক ২৮, radius ১৫, bg #282B34, border 1px #484B5A,
 *     লোগো ১০০ × ৫০; সক্রিয় হলে সবুজ-নীল গ্রেডিয়েন্ট
 *   ডানে গ্রিড ৩ কলাম, padding `0 17 20 21`, gap `25 20`
 *   ফিল্টার: পুরো পর্দা rgba(0,0,0,.7), padding `110 40 80`, শিরোনাম ৪০
 *     (800), প্রোভাইডারের বোতাম ৩ কলাম (gap `20 35`) ৮৬ উঁচু #3E4247
 *     radius ১২, নিচে "নিশ্চিত করুন" ৮০ উঁচু সবুজ-নীল
 *
 * নিচে নামলে পরের ৩০টা আসে (মূল সাইটও তাই করে)।
 */
const PAGE = 30;
const GRADIENT = "linear-gradient(270deg, #39BEE9 9.48%, #50D2AE 51.57%, #66E578)";
const BG = "var(--games-panel-bg, #181F2B)";

const ring = (active) => `url(/assets/mobile/cat/${active ? "ring-active" : "ring"}.png)`;

const GameCenterMobile = ({ category, tabs, label, vendor, search, setVendor, setSearch, goCategory }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(Boolean(search));
  const [draft, setDraft] = useState(search);
  const [filterOpen, setFilterOpen] = useState(false);
  const sentinel = useRef(null);

  useEffect(() => setPage(1), [category?.key, vendor, search]);

  useEffect(() => {
    const id = setTimeout(() => draft !== search && setSearch(draft.trim()), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const isFav = category?.type === "favorite";
  const providers = category?.providers || [];
  const hasRail = providers.length > 0;

  const favorites = useFavorites();
  // admin এর বাছাই করা প্রিয় গেম — একবারে সব (তালিকা ছোট), তারপর নিজের ♥ এর সাথে মিলিয়ে
  const picked = useGameList({ category: isFav ? category?.key : "", page: 1, limit: 100 });
  const favAll = mergeFavorites(favorites, picked.games);
  // খোঁজ মোবাইলে পুরো সাইট জুড়ে — যে ক্যাটাগরি বা প্রোভাইডারেই থাকুক
  const searching = Boolean(search);
  const list = useGameList({
    category: searching || isFav ? "" : category?.key,
    provider: searching ? "" : vendor,
    search,
    page,
    limit: PAGE,
    append: true,
  });

  // খোঁজ চললে সব গেমের ফল; নইলে "আমার প্রিয়" বা ক্যাটাগরির তালিকা
  const games = searching || !isFav ? list.games : favAll;
  const loading = searching || !isFav ? list.loading : picked.loading && !favAll.length;
  const hasMore = (searching || !isFav) && list.hasMore;

  // প্রথমবার লোড শুরু হয়ে শেষ হলে তবেই পুরো পাতার লোডার বন্ধ
  const [firstLoad, setFirstLoad] = useState(true);
  const sawLoading = useRef(false);
  useEffect(() => {
    if (loading) sawLoading.current = true;
    else if (sawLoading.current || isFav) setFirstLoad(false);
  }, [loading, isFav]);

  // তালিকার শেষে পৌঁছালে পরের পাতা
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && hasMore && !loading && setPage((p) => p + 1),
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading]);

  const activeProvider = providers.find((p) => p.code === vendor);

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingTop: m(100) }}>
      {/* ── হেডার ── */}
      <div
        className="fixed left-0 right-0 top-0 flex items-center justify-between"
        style={{
          height: m(100),
          padding: `0 ${m(20)}`,
          background: BG,
          borderBottom: "1px solid rgb(255 255 255 / 0.85)",
          zIndex: 30,
        }}
      >
        <div className="flex min-w-0 items-center" style={{ gap: m(14) }}>
          <button
            type="button"
            aria-label="back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="flex shrink-0 cursor-pointer items-center justify-center"
            style={{ width: m(68), height: m(68), color: "var(--games-text, #fff)" }}
          >
            <ChevronLeft size={m(60)} strokeWidth={2} style={{ width: m(60), height: m(60) }} />
          </button>

          {activeProvider ? (
            <button
              type="button"
              onClick={() => setVendor("")}
              className="flex cursor-pointer items-center"
              style={{
                height: m(60),
                padding: `0 ${m(24)}`,
                gap: m(22),
                borderRadius: m(30),
                border: `${m(3)} solid #fff`,
                color: "var(--games-text, #fff)",
                fontSize: m(26),
              }}
            >
              {activeProvider.name}
              <X style={{ width: m(30), height: m(30) }} strokeWidth={3} />
            </button>
          ) : (
            <span className="truncate" style={{ color: "var(--games-text, #fff)", fontSize: m(36), fontWeight: 700 }}>
              {t.games.title}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center" style={{ gap: m(24), color: "var(--games-text, #fff)" }}>
          <button type="button" aria-label="search" onClick={() => setSearchOpen((v) => !v)} className="cursor-pointer">
            <Search style={{ width: m(48), height: m(48) }} />
          </button>
          {hasRail && (
            <button type="button" aria-label="filter" onClick={() => setFilterOpen(true)} className="cursor-pointer">
              <ListFilter style={{ width: m(48), height: m(48) }} />
            </button>
          )}
        </div>
      </div>

      {/* ── খোঁজ ── */}
      {searchOpen && (
        <label
          className="flex items-center"
          style={{
            margin: `${m(20)} ${m(20)} 0`,
            height: m(60),
            padding: `0 ${m(24)}`,
            gap: m(20),
            borderRadius: m(30),
            background: "#FBF6FF",
          }}
        >
          <Search style={{ width: m(38), height: m(38), color: "#222" }} />
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.games.search}
            className="min-w-0 flex-1 bg-transparent outline-none"
            style={{ fontSize: m(30), color: "#111" }}
          />
          {draft && (
            <button type="button" onClick={() => setDraft("")} className="cursor-pointer" aria-label="clear">
              <X style={{ width: m(32), height: m(32), color: "#555" }} />
            </button>
          )}
        </label>
      )}

      {/* ── ক্যাটাগরি সারি ── */}
      <ul
        className="hide-scrollbar flex overflow-x-auto"
        style={{ height: m(150), padding: `${m(20)} 0 0 ${m(15)}` }}
      >
        {tabs.map((c) => {
          const active = c.key === category?.key;
          return (
            <li key={c.key} className="shrink-0" style={{ marginRight: m(20) }}>
              <button
                type="button"
                onClick={() => goCategory(c)}
                className="flex cursor-pointer flex-col items-center"
                style={{ width: m(120), height: m(130) }}
              >
                <span className="relative block" style={{ width: m(100), height: m(76) }}>
                  <span
                    className="absolute"
                    style={{
                      left: 0,
                      top: m(20),
                      width: m(100),
                      height: m(56),
                      backgroundImage: ring(active),
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "50%",
                      backgroundSize: "contain",
                    }}
                  />
                  {c.mobIcon && (
                    <img
                      src={c.mobIcon}
                      alt=""
                      className="absolute"
                      style={{ left: m(18), top: 0, width: m(64), height: m(64), objectFit: "contain" }}
                    />
                  )}
                </span>
                <span
                  className="w-full truncate text-center"
                  style={{ marginTop: m(10), fontSize: m(20), fontWeight: 700, color: "#F2F4FE" }}
                >
                  {label(c)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* ── প্রোভাইডারের কলাম + গ্রিড ── */}
      <div className="flex items-start">
        {hasRail && !searching && (
          <div
            className="hide-scrollbar sticky flex shrink-0 flex-col overflow-y-auto"
            style={{
              top: m(100),
              width: m(135),
              maxHeight: `calc(100vh - ${m(100)} - ${m(110)})`,
              padding: `${m(15)} 0 ${m(20)} ${m(15)}`,
              gap: m(28),
            }}
          >
            {providers.map((p) => {
              const active = p.code === vendor;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setVendor(active ? "" : p.code)}
                  title={p.name}
                  className="flex shrink-0 cursor-pointer items-center justify-center"
                  style={{
                    width: m(120),
                    height: m(54),
                    borderRadius: m(15),
                    background: active ? GRADIENT : "#282B34",
                    border: active ? "1px solid transparent" : "1px solid #484B5A",
                  }}
                >
                  {p.icon ? (
                    <img src={p.icon} alt={p.name} style={{ width: m(100), height: m(50), objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: m(20), color: active ? "#000" : "var(--games-text, #fff)" }}>{p.name}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="relative min-w-0 flex-1" style={{ padding: `${m(20)} ${m(17)} ${m(140)} ${m(21)}` }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: `${m(25)} ${m(20)}` }}>
            {games.map((game) => (
              <GameCard key={game.id} game={game} showHot />
            ))}
            {/* লোড হওয়ার সময় (নিচে নামলে পরের পাতাও) লোডিং কার্ড */}
            {loading && <CardPlaceholders count={games.length ? 3 : 9} />}
          </div>

          {/* পাতাটা প্রথম খোলার সময় — পুরো পর্দার লোডার */}
          {loading && firstLoad && <Loader scope="site" />}
          {!loading && !games.length &&
            (isFav ? (
              <p className="text-center" style={{ padding: `${m(60)} ${m(20)}`, color: "rgb(255 255 255 / 0.6)", fontSize: m(26) }}>
                {t.games.favEmpty}
              </p>
            ) : (
              <NoData />
            ))}
          <div ref={sentinel} style={{ height: 1 }} />
        </div>
      </div>

      {filterOpen && (
        <FilterSheet
          providers={providers}
          value={vendor}
          onClose={() => setFilterOpen(false)}
          onApply={(code) => {
            setVendor(code);
            setFilterOpen(false);
          }}
        />
      )}
    </div>
  );
};

/* প্রোভাইডার বাছার পুরো-পর্দার ফিল্টার — বাছাই "নিশ্চিত করুন" চাপলে বসে */
const FilterSheet = ({ providers, value, onClose, onApply }) => {
  const { t } = useLanguage();
  const [picked, setPicked] = useState(value);

  const Item = ({ code, children }) => {
    const active = picked === code;
    return (
      <button
        type="button"
        onClick={() => setPicked(code)}
        className="flex cursor-pointer items-center justify-center truncate"
        style={{
          height: m(86),
          padding: `0 ${m(10)}`,
          borderRadius: m(12),
          background: active ? GRADIENT : "#3E4247",
          color: active ? "#000" : "var(--games-text, #fff)",
          fontSize: m(26),
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: 60, background: "rgb(0 0 0 / 0.7)", backdropFilter: "blur(6px)", padding: `${m(110)} ${m(40)} ${m(80)}` }}
    >
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute flex cursor-pointer items-center justify-center"
        style={{ top: m(60), right: m(40), width: m(50), height: m(50), borderRadius: "50%", background: "#3b1d7a", color: "#c9a5ff" }}
      >
        <X style={{ width: m(30), height: m(30) }} strokeWidth={3} />
      </button>

      <h2 className="text-center" style={{ fontSize: m(40), fontWeight: 800, color: "var(--games-text, #fff)", marginBottom: m(45) }}>
        {t.games.filterTitle}
      </h2>
      <p style={{ fontSize: m(34), color: "var(--games-text, #fff)", marginBottom: m(20) }}>{t.games.providers}</p>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: `${m(20)} ${m(35)}` }}>
        <Item code="">{t.games.all}</Item>
        {providers.map((p) => (
          <Item key={p.code} code={p.code}>
            {p.name}
          </Item>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onApply(picked)}
        className="w-full cursor-pointer"
        style={{ height: m(80), marginTop: m(40), borderRadius: m(12), background: GRADIENT, color: "#000", fontSize: m(30) }}
      >
        {t.games.confirm}
      </button>
    </div>
  );
};

export default GameCenterMobile;
