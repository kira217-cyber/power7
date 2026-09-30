import React, { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router";

import Loader from "../../components/Loader/Loader";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { useLanguage } from "../../Context/LanguageProvider";
import {
  selectGameCategories,
  selectGlobalGameLoaded,
} from "../../features/globalGame/globalGameSelectors";
import GameCenterDesktop from "./GameCenterDesktop";
import GameCenterMobile from "./GameCenterMobile";

/**
 * খেলার কেন্দ্র — `/games/:category?vendor=PG&q=...`
 *
 * মূল সাইটে মোবাইলের `/m/slot-games` আর ডেস্কটপের `/rng` দুটো একদম
 * আলাদা পেজ, তাই এখানেও ডিজাইন দুটো আলাদা কম্পোনেন্ট। কোন ক্যাটাগরি,
 * কোন প্রোভাইডার, কী খোঁজা হচ্ছে — এই অবস্থাটা URL এ থাকে, দুই
 * ডিজাইনই একই জায়গা থেকে পড়ে।
 */
const GameCenter = () => {
  const { category: key } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { lang } = useLanguage();

  const loaded = useSelector(selectGlobalGameLoaded);
  const categories = useSelector(selectGameCategories);

  const vendor = params.get("vendor") || "";
  const search = params.get("q") || "";

  const category = categories.find((c) => c.key === key) || null;

  const label = (c) => c?.name?.[lang] || c?.name?.bn || c?.key || "";

  // ট্যাবের তালিকা — admin এর "ডেস্কটপে/মোবাইলে দেখাও" অনুযায়ী।
  // মোবাইলের খেলার কেন্দ্রে মূল সাইটের মতো "গরম খেলা" সবার আগে থাকে।
  const tabs = useMemo(() => {
    // ডেস্কটপের খেলার কেন্দ্রে মূল সাইটের মতো শুধু প্রোভাইডার-ভিত্তিক
    // ক্যাটাগরি (স্লট, ফিশিং, লাইভ, পোকার, স্পোর্টস) — "আমার প্রিয়",
    // শর্টকাট আর মেশানো ক্যাটাগরি (ক্র্যাশ) নয়
    if (isDesktop) {
      return categories.filter(
        (c) => c.type === "sports" || (c.type === "games" && c.showProviders !== false),
      );
    }
    const hot = categories.filter((c) => c.type === "hot");
    return [...hot, ...categories.filter((c) => c.showOnMobile && c.type !== "hot")];
  }, [categories, isDesktop]);

  const setQuery = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  // ট্যাব বদলানো — স্পোর্টসও অন্য ক্যাটাগরির মতো তালিকা দেখায়
  const goCategory = (c) => navigate(`/games/${c.key}`);

  // ভুল key এ এলে প্রথম ট্যাবে
  useEffect(() => {
    if (!loaded || !categories.length || category) return;
    const first = tabs[0] || categories[0];
    if (first) navigate(`/games/${first.key}`, { replace: true });
  }, [loaded, categories, category, tabs, navigate]);

  // ক্যাটালগ আসা পর্যন্ত পুরো পাতার লোডার
  if (!loaded) return <Loader scope="site" />;

  const props = {
    category,
    tabs,
    label,
    vendor,
    search,
    setVendor: (code) => setQuery({ vendor: code }),
    setSearch: (q) => setQuery({ q }),
    goCategory,
  };

  return isDesktop ? <GameCenterDesktop {...props} /> : <GameCenterMobile {...props} />;
};

export default GameCenter;
