import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import api from "../../api/axios";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { notify } from "../../utils/notify";
import { rangeOf } from "./dateRange";

/** মূল সাইটের গেমের ধরনের ট্যাব — ক্রমটা locale এর ট্যাবের সাথে মেলে */
export const BET_TABS = ["RNG", "FISH", "LIVE", "PVP", "SPORTS"];

const EMPTY = { rows: [], totals: { count: 0, bet: 0, validBet: 0, win: 0, net: 0 } };

/**
 * বেটিং রেকর্ড — গেম ধরে যোগফল (`/api/game-history/my?group=game`)।
 * ডেস্কটপ মডাল আর মোবাইল পেজ দুটোই এটা নেয়; ফিল্টার বদলালেই নতুন করে আনে।
 */
export const useBetRecords = ({ range, tab, enabled = true }) => {
  const loggedIn = useSelector(selectIsLoggedIn);
  const [state, setState] = useState({ ...EMPTY, loading: false });

  useEffect(() => {
    if (!enabled || !loggedIn) return undefined;
    let alive = true;
    const { from, to } = rangeOf(range);

    setState((s) => ({ ...s, loading: true }));
    api
      .get("/api/game-history/my", {
        params: { group: "game", tab, from: from.toISOString(), to: to.toISOString(), limit: 100 },
      })
      .then(({ data }) => {
        if (!alive) return;
        setState({ rows: data?.data?.rows || [], totals: data?.data?.totals || EMPTY.totals, loading: false });
      })
      .catch((error) => {
        if (!alive) return;
        setState({ ...EMPTY, loading: false });
        if (error?.response?.status !== 401) notify.error(error?.response?.data?.message || "Failed to load");
      });

    return () => {
      alive = false;
    };
  }, [range, tab, enabled, loggedIn]);

  return state;
};

export default useBetRecords;
