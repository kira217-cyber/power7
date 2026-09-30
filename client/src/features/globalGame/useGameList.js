import { useEffect, useRef, useState } from "react";

import api from "../../api/axios";
import { adaptGame } from "./gameAdapter";

/**
 * খেলার কেন্দ্রের গেম তালিকা — server থেকে পাতা ধরে।
 *
 *   ডেস্কটপ: `append: false` — পাতার নম্বর বদলালে তালিকা বদলায়
 *   মোবাইল:  `append: true`  — নিচে নামলে পরের পাতা আগেরটার সাথে জোড়ে
 *
 * ক্যাটাগরি / প্রোভাইডার / খোঁজ বদলালে সব আবার শুরু থেকে।
 * `category` আর `search` দুটোই খালি হলে কিছুই আনা হয় না; শুধু `search`
 * থাকলে সাইটের সব গেমে খোঁজে (মোবাইলের খোঁজ)।
 */
export const useGameList = ({ category, provider = "", search = "", page = 1, limit = 30, append = false }) => {
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const filterKey = `${category}|${provider}|${search}|${limit}`;
  const lastFilter = useRef(filterKey);

  useEffect(() => {
    if (!category && !search) {
      setGames([]);
      setTotal(0);
      return;
    }

    const reset = lastFilter.current !== filterKey;
    lastFilter.current = filterKey;

    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    if (reset || !append) setGames((prev) => (reset ? [] : prev));

    api
      .get("/api/games/game-list", { params: { category, provider, search, page, limit } })
      .then((res) => {
        // পুরোনো অনুরোধের দেরিতে আসা উত্তর নতুনটাকে মুছে দিতে না পারে
        if (id !== requestId.current) return;

        const data = res.data?.data;
        if (!data?.configured || !data.data) {
          setGames([]);
          setTotal(0);
          return;
        }

        const next = data.data.games.map(adaptGame);
        setTotal(data.data.meta.total);
        setGames((prev) => {
          if (!append || page === 1) return next;
          const seen = new Set(prev.map((g) => g.id));
          return [...prev, ...next.filter((g) => !seen.has(g.id))];
        });
      })
      .catch(() => id === requestId.current && setError(true))
      .finally(() => id === requestId.current && setLoading(false));
    // filterKey এ category/provider/search/limit সব আছে
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, append]);

  return { games, total, loading, error, hasMore: games.length < total };
};
