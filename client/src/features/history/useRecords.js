import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import api from "../../api/axios";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { notify } from "../../utils/notify";
import { rangeOf } from "./dateRange";
import { autoDepositRow, autoWithdrawRow } from "../payment/usePaymentModes";

/**
 * রেকর্ডের ডেটা — অ্যাকাউন্ট রেকর্ড (টাকার খাতা), লাভ-ক্ষতি, আর মোবাইলের
 * জমা/উত্তোলন রেকর্ড (আবেদনের তালিকা, অবস্থাসহ)। ডেস্কটপ মডাল আর
 * মোবাইল পেজ দুটোই এগুলো নেয়; ফিল্টার বদলালেই নতুন করে আনে।
 */

/** মূল সাইটের অ্যাকাউন্ট রেকর্ডের ট্যাব → server এর ধরন */
export const ACCOUNT_TABS = ["all", "deposit", "withdraw", "rebate", "promotion"];

/** লাভ-ক্ষতির ট্যাব — "সব" তারপর গেমের ধরন */
export const PL_TABS = ["ALL", "RNG", "FISH", "LIVE", "PVP", "SPORTS"];

const useLoad = (enabled, deps, fetcher, empty) => {
  const loggedIn = useSelector(selectIsLoggedIn);
  const [state, setState] = useState({ ...empty, loading: false });

  useEffect(() => {
    if (!enabled || !loggedIn) return undefined;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetcher()
      .then((data) => alive && setState({ ...data, loading: false }))
      .catch((error) => {
        if (!alive) return;
        setState({ ...empty, loading: false });
        if (error?.response?.status !== 401) notify.error(error?.response?.data?.message || "Failed to load");
      });
    return () => {
      alive = false;
    };
    // fetcher প্রতিবার নতুন — নির্ভরতা deps দিয়েই
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loggedIn, ...deps]);

  return state;
};

const iso = (range) => {
  const { from, to } = rangeOf(range);
  return { from: from.toISOString(), to: to.toISOString() };
};

export const useAccountRecords = ({ range, type = "all", enabled = true }) =>
  useLoad(
    enabled,
    [range, type],
    async () => {
      const { data } = await api.get("/api/account-records/my", {
        params: { ...iso(range), type: type === "all" ? "" : type, limit: 100 },
      });
      return { rows: data?.data?.rows || [], totals: data?.data?.totals || { amount: 0, count: 0 } };
    },
    { rows: [], totals: { amount: 0, count: 0 } },
  );

const PL_EMPTY = { deposit: 0, withdraw: 0, bet: 0, win: 0, rebate: 0, promotion: 0, profit: 0 };

export const useProfitLoss = ({ range, tab = "ALL", enabled = true }) =>
  useLoad(
    enabled,
    [range, tab],
    async () => {
      const { data } = await api.get("/api/account-records/profit-loss/my", {
        // ব্রাউজারের সময় অঞ্চল — দিনের সীমা খেলোয়াড়ের নিজের
        params: { ...iso(range), tab: tab === "ALL" ? "" : tab, tz: -new Date().getTimezoneOffset() },
      });
      return { rows: data?.data?.rows || [], totals: data?.data?.totals || PL_EMPTY };
    },
    { rows: [], totals: PL_EMPTY },
  );

/** মোবাইলের জমা/উত্তোলন রেকর্ড — আবেদনগুলো অবস্থাসহ, তারিখের সীমা ব্রাউজারেই ছাঁকা */
export const useRequestRecords = ({ kind, range, enabled = true }) =>
  useLoad(
    enabled,
    [kind, range],
    async () => {
      const url = kind === "withdraw" ? "/api/withdraw-requests/my" : "/api/deposit-requests/my";
      // অটো লেনদেনও একই তালিকায় — একই রূপে এনে সময় ধরে সাজানো
      const autoUrl = kind === "withdraw" ? "/api/auto-withdraw/history/my" : "/api/auto-deposit/history/my";
      const [{ data }, auto] = await Promise.all([
        api.get(url, { params: { limit: 100 } }),
        api.get(autoUrl, { params: { limit: 100 } }).catch(() => null),
      ]);
      const autoRows = kind === "withdraw" ? (auto?.data?.data?.withdrawals || []).map(autoWithdrawRow) : (auto?.data?.data?.deposits || []).map(autoDepositRow);
      const { from, to } = rangeOf(range);
      const rows = [...(data?.data?.requests || data?.data?.rows || []), ...autoRows]
        .filter((r) => {
          const at = new Date(r.createdAt);
          return at >= from && at <= to;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { rows };
    },
    { rows: [] },
  );

/** টার্নওভার রেকর্ড — বোনাসের খেলার শর্ত, অগ্রগতি আর প্রোভাইডারসহ (তারিখ server এ ছাঁকা) */
export const useTurnoverRecords = ({ range, enabled = true }) =>
  useLoad(
    enabled,
    [range],
    async () => {
      const { data } = await api.get("/api/turnover/my", { params: { ...iso(range), limit: 100 } });
      return { rows: data?.data?.turnovers || [] };
    },
    { rows: [] },
  );
