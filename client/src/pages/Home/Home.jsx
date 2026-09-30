import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router";

import Slider from "../../components/Slider/Slider";
import Notice from "../../components/Notice/Notice";
import Categories from "../../components/Categories/Categories";
import GameSection from "../../components/GameSection/GameSection";

import { selectBanners, selectNotices } from "../../features/global/globalSelectors";
import {
  selectGlobalGameLoading,
  selectSections,
  selectVendors,
  selectHotGames,
  selectGamesByType,
  selectGameTotals,
  selectGameCategories,
  selectMobileSections,
} from "../../features/globalGame/globalGameSelectors";
import { mergeFavorites, useFavorites } from "../../features/game/favorites";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";

/**
 * হোমপেজ।
 *
 * মূল সাইটের ভার্টিক্যাল ছন্দ (ডেস্কটপে মাপা):
 *   কলামের padding-top ২৫.৭
 *   ব্যানার y=৮৮.৭ h=৩৭০.৭ → নোটিশ বার y=৪৭৯.৪ h=৫০ (মাঝে gap ২০)
 *   ব্যানার ব্লকের নিচে margin-bottom ২২
 *   ক্যাটাগরি ট্যাব y=৫৫১.৪ h=১১৬.৬
 *   প্রথম সেকশন টাইটেল y=৭০২
 *
 * ডেস্কটপে ট্যাব চাপলে মূল সাইটের মতো পাতা বদলায় না — ট্যাবের নিচেই সেই
 * ক্যাটাগরি: শিরোনাম ছাড়া, প্রোভাইডার চিপ + ৪ সারি গেম (ক্র্যাশে চিপ নেই)।
 * "হোম" এ আবার সব সেকশন। "আমার প্রিয়" তে ♥ দেওয়া গেম।
 */
const TAB_ROWS = 4;
/**
 * মোবাইলের "স্পোর্টস" সেকশন — অন্য সেকশনের মতো প্যানেল (শিরোনাম সহ),
 * ভিতরে স্পোর্টস বেটিংয়ের ব্যানার। মূল সাইট মাপা: ছবি ৬৭৪ × ২৭৫ (৭৫০-ডিজাইন)।
 */
const SportsPanel = ({ title, onOpen }) => (
  <section id="section-sports" style={{ paddingInline: m(12), marginBottom: m(40) }}>
    <div
      style={{
        backgroundImage: "url(/assets/mobile/section-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "50%",
        padding: `0 ${m(22)} ${m(20)} ${m(24)}`,
      }}
    >
      <div className="flex items-center" style={{ height: m(50), marginTop: m(15) }}>
        <span style={{ paddingInlineStart: m(24), fontSize: m(30), fontWeight: 700, color: "var(--home-title, #fff)" }}>{title}</span>
      </div>
      <img
        src="/assets/site/sports-entrance.webp"
        alt="sports"
        loading="lazy"
        onClick={onOpen}
        className="cursor-pointer"
        style={{ width: "100%", display: "block", marginTop: m(20), borderRadius: m(3) }}
      />
    </div>
  </section>
);

const Home = () => {
  const isDesktop = useIsDesktop();
  const { t, lang } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "HOME");

  // সাইডবারের গেম সেন্টার `/?tab=fishing` দিয়ে আসে — ট্যাব বদলে সেখানে নামি
  const urlTab = params.get("tab");
  useEffect(() => {
    if (!urlTab) return;
    setTab(urlTab);
    requestAnimationFrame(() =>
      document.getElementById("home-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    setParams({}, { replace: true });
  }, [urlTab, setParams]);

  const banners = useSelector(selectBanners);
  const notices = useSelector(selectNotices);
  const deskSections = useSelector(selectSections);
  const mobileSections = useSelector(selectMobileSections);
  // মোবাইলের সেকশন আলাদা ক্রমে (JILI আর স্পোর্টস সহ); স্ট্যাটিকে একই তালিকা
  const sections = !isDesktop && mobileSections ? mobileSections : deskSections;
  const sportsSection = sections.find((s) => s.type === "sports");
  const vendors = useSelector(selectVendors);
  const hotGames = useSelector(selectHotGames);
  const gamesByType = useSelector(selectGamesByType);
  const gamesLoading = useSelector(selectGlobalGameLoading);
  const totals = useSelector(selectGameTotals);
  const categories = useSelector(selectGameCategories);
  const favorites = useFavorites();
  const navigate = useNavigate();

  // ডেস্কটপ + API: ট্যাবের ক্যাটাগরি ট্যাবের নিচেই দেখায়
  const tabView = isDesktop && categories.length > 0;
  const tabCategory = tabView && tab !== "HOME" ? categories.find((c) => c.key === tab) : null;

  // মোবাইল (আর স্ট্যাটিক ডেটা): সেকশন থাকলে সেখানে নামি, নইলে খেলার কেন্দ্র
  const onTab = (key) => {
    setTab(key);
    if (tabView) return;
    const el = document.getElementById(`section-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (categories.some((c) => c.key === key)) navigate(`/games/${key}`);
  };

  const gamesFor = (section) =>
    gamesByType[section.key] || (section.key === "hot" ? hotGames : []);

  // API এর সেকশনে দুই ভাষার নাম আসে; স্ট্যাটিকে locale থেকে
  const titleFor = (section) =>
    section.name?.[lang] || section.name?.bn || t.sections[section.key] || section.title;

  return (
    <>
      {/* ── ব্যানার + নোটিশ ── */}
      <div
        className="flex flex-col"
        style={{
          gap: isDesktop ? 20 : 0,
          marginBottom: isDesktop ? "var(--banner-mb)" : 0,
        }}
      >
        <Slider banners={banners} />
        <Notice notices={notices} />
      </div>

      {/* ── ক্যাটাগরি ট্যাব ── */}
      <div id="home-tabs" style={{ scrollMarginTop: "calc(var(--header-h) + 10px)" }} />
      <Categories
        active={tab}
        onChange={onTab}
      />

      {/* ── ডেস্কটপ: একটা ট্যাবের ক্যাটাগরি ── */}
      {tabCategory?.type === "favorite" && (
        <GameSection
          key="favorite"
          section={{ key: tabCategory.key, type: "favorite", title: "" }}
          games={mergeFavorites(favorites, gamesByType[tabCategory.key])}
          hideTitle
          initialRows={TAB_ROWS}
          offline
        />
      )}
      {tabCategory && tabCategory.type !== "favorite" && (
        <GameSection
          key={tabCategory.key}
          section={{ key: tabCategory.key, type: tabCategory.type, name: tabCategory.name, lane: tabCategory.lane }}
          vendors={tabCategory.lane ? vendors[tabCategory.key] || [] : []}
          games={gamesByType[tabCategory.key] || []}
          total={totals[tabCategory.key]}
          loading={gamesLoading}
          hideTitle
          initialRows={TAB_ROWS}
        />
      )}

      {/* ── গেম সেকশন (হোম) ── */}
      {!tabCategory && sections.map((section) => section.type === "sports" ? (
        <SportsPanel key={section.key} title={titleFor(section)} onOpen={() => navigate(`/games/${section.key}`)} />
      ) : (
        <GameSection
          key={section.key}
          // ভাষা বদলালে সেকশনের নামও বদলায়
          section={{ ...section, title: titleFor(section) }}
          vendors={section.lane ? vendors[section.lane] || [] : []}
          games={gamesFor(section)}
          total={totals[section.key]}
          loading={gamesLoading}
        />
      ))}

      {/* ফুটারের ঠিক উপরে স্পোর্টস বেটিংয়ের ব্যানার —
          মূল সাইটে `.sports-container` ১০৮৫ × ৪৪২.২, ছবি ১০৮৩ চওড়া।
          মোবাইলে এটা "স্পোর্টস" সেকশনের ভিতরে থাকে (উপরে) */}
      {!(sportsSection && !tabCategory) && (
      <div
        onClick={() => categories.some((c) => c.type === "sports") && navigate("/games/sports")}
        className="cursor-pointer"
        style={{
          width: "100%",
          marginTop: isDesktop ? 0 : m(10),
          paddingInline: isDesktop ? 0 : m(24),
        }}
      >
        <img
          src="/assets/site/sports-entrance.webp"
          alt="sports-entrance"
          loading="lazy"
          style={{
            width: "100%",
            display: "block",
            borderRadius: isDesktop ? 10 : m(16),
          }}
        />
      </div>
      )}
    </>
  );
};

export default Home;
