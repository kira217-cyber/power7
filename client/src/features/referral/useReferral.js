import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { useRefreshBalance } from "../auth/useRefreshBalance";
import { rangeOf } from "../history/dateRange";

/**
 * "বন্ধুদের আমন্ত্রণ করুন" এর ডেটা — ডেস্কটপ মডাল আর মোবাইল পেজ দুটোই নেয়।
 *
 * `/api/referral/my` একবারে দেয়: কোড, নিয়ম, আজ/গতকাল/মোট আয় (ধরন
 * অনুযায়ী), বন্ধুর সংখ্যা, মাইলফলকের অবস্থা, কারা পেলেন, সাইটের মোট।
 */
export const useReferral = () => {
  const loggedIn = useSelector(selectIsLoggedIn);
  const { t } = useLanguage();
  const r = t.referralFlow;
  const { refresh: refreshBalance } = useRefreshBalance();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const { data: res } = await api.get("/api/referral/my");
      setData(res?.data || null);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.code === "notPlayer" ? r.notPlayer : e?.response?.data?.message || t.authErr.generic);
    }
  }, [loggedIn, r.notPlayer, t.authErr.generic]);

  useEffect(() => {
    load();
  }, [load]);

  /** মাইলফলকের বোনাস দাবি — `ids` না দিলে সব */
  const claim = async (ids) => {
    if (busy) return;
    setBusy(true);
    const done = notify.pending(t.auth.wait);
    try {
      const { data: res } = await api.post("/api/referral/claim", ids ? { ids } : {});
      done();
      notify.success(r.claimSuccess.replace("{n}", Number(res?.data?.total || 0).toFixed(2)));
      refreshBalance();
      await load();
    } catch (e) {
      done();
      notify.error(e?.response?.data?.code === "nothingToClaim" ? r.nothing : e?.response?.data?.message || t.authErr.generic);
    } finally {
      setBusy(false);
    }
  };

  return { data, error, busy, load, claim };
};

/** তালিকা আনার ছোট সাহায্যকারী — ফিল্টার বদলালেই নতুন করে */
const useList = (enabled, deps, fetcher, empty) => {
  const loggedIn = useSelector(selectIsLoggedIn);
  const [state, setState] = useState({ ...empty, loading: false });

  useEffect(() => {
    if (!enabled || !loggedIn) return undefined;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetcher()
      .then((next) => alive && setState({ ...next, loading: false }))
      .catch(() => alive && setState({ ...empty, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loggedIn, ...deps]);

  return state;
};

/** রেকর্ড — এক ধরনের পুরস্কার, তারিখের সীমায় (range: today/yesterday/days7/month) */
export const useReferralRecords = ({ type, range, enabled = true }) =>
  useList(
    enabled,
    [type, range],
    async () => {
      const { from, to } = rangeOf(range);
      const { data } = await api.get("/api/referral/rewards", {
        params: { type, from: from.toISOString(), to: to.toISOString(), limit: 50 },
      });
      return { rows: data?.data?.rewards || [], total: data?.data?.totalAmount || 0 };
    },
    { rows: [], total: 0 },
  );

/** আমন্ত্রিতদের তালিকা — range: today/yesterday/7d/all, status: all/qualified/unqualified */
export const useInvitees = ({ range, status, enabled = true }) =>
  useList(
    enabled,
    [range, status],
    async () => {
      const { data } = await api.get("/api/referral/invitees", {
        params: { range, status: status === "all" ? "" : status, limit: 50 },
      });
      return { rows: data?.data?.invitees || [], footer: data?.data?.footer || {} };
    },
    { rows: [], footer: {} },
  );

/** "৳ 1,234.00" */
export const tk = (value) =>
  `৳ ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pad = (n) => String(n).padStart(2, "0");
/** "2026-09-25 14:05" */
export const when = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default useReferral;
