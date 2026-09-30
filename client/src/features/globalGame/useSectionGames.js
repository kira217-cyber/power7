import { useEffect, useState } from "react";

import api from "../../api/axios";
import { adaptGame } from "./gameAdapter";

const PAGE = 60;

/**
 * একটা হোম সেকশনের গেম — API থেকে এলে দরকার মতো বাকিটা আনে।
 *
 * game-data তে প্রতিটা সেকশনের শুধু প্রথম কয়েকটা গেম আসে। তাই:
 *   • ভেন্ডর চিপ বাছলে সেই ভেন্ডরের গেম server থেকে আনা হয়
 *     (হাতে থাকা প্রথম কয়েকটা থেকে ছাঁকলে প্রায় কিছুই পাওয়া যেত না)
 *   • "More"/তীর তালিকার শেষে পৌঁছালে পরের পাতা আনা হয়
 * স্ট্যাটিক ডেটায় সব গেম আগে থেকেই হাতে, তখন শুধু ছাঁকা হয়।
 */
export const useSectionGames = ({ sectionKey, games, total, vendor, apiMode }) => {
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(false);

  // ভেন্ডর বদলালে আগের আনা তালিকা বাতিল
  useEffect(() => {
    setFetched(null);
    if (!apiMode || !vendor) return;

    let alive = true;
    setLoading(true);

    api
      .get("/api/games/game-list", {
        params: { category: sectionKey, provider: vendor, page: 1, limit: PAGE },
      })
      .then((res) => {
        const data = res.data?.data?.data;
        if (alive && data) {
          setFetched({ games: data.games.map(adaptGame), total: data.meta.total, page: 1 });
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [apiMode, sectionKey, vendor]);

  const base = apiMode
    ? vendor
      ? fetched || { games: [], total: 0, page: 0 }
      : fetched || { games, total: total ?? games.length, page: 0 }
    : { games: vendor ? games.filter((g) => g.vendor === vendor) : games, total: null, page: 0 };

  const list = base.games;
  const hasMore = apiMode && list.length < base.total;

  const loadMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);

    // হোমে প্রথমে আসে ২৪টা, পাতা ৬০ এর — তাই হাতে যা আছে তার পরের
    // পুরো পাতাটা এনে আগে থেকে থাকাগুলো বাদ দিই
    const nextPage = Math.floor(list.length / PAGE) + 1;

    try {
      const res = await api.get("/api/games/game-list", {
        params: { category: sectionKey, provider: vendor || "", page: nextPage, limit: PAGE },
      });
      const data = res.data?.data?.data;
      if (data) {
        const seen = new Set(list.map((g) => g.id));
        const more = data.games.map(adaptGame).filter((g) => !seen.has(g.id));
        setFetched({ games: [...list, ...more], total: data.meta.total, page: nextPage });
      }
    } catch {
      /* পরের বার চাপলে আবার চেষ্টা হবে */
    } finally {
      setLoading(false);
    }
  };

  return { list, total: apiMode ? base.total : list.length, hasMore, loadMore, loading };
};
