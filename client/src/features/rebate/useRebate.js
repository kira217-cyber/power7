import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { useRefreshBalance } from "../auth/useRefreshBalance";

/** খেলার ধরন — মূল সাইটের rng/fish/live/pvp/sports এর ক্রমে */
export const REBATE_KINDS = ["slot", "fishing", "live", "poker", "sports"];

/**
 * "ম্যানুয়াল রিবেট" — শেষ দাবির পর থেকে কত রিবেট জমেছে (খেলার ধরন
 * অনুযায়ী) আর দাবি। হার VIP স্তর থেকে, হিসাব server এ।
 */
export const useRebate = () => {
  const loggedIn = useSelector(selectIsLoggedIn);
  const { t } = useLanguage();
  const rb = t.rebateFlow;
  const { refresh: refreshBalance } = useRefreshBalance();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!loggedIn) return;
    setLoading(true);
    try {
      const { data: res } = await api.get("/api/vip/rebate", { params: { tz: -new Date().getTimezoneOffset() } });
      setData(res?.data || null);
    } catch {
      /* 401 হলে axios লগআউট করায় */
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    const done = notify.pending(t.auth.wait);
    try {
      const { data: res } = await api.post("/api/vip/rebate/claim");
      done();
      notify.success(rb.claimed.replace("{n}", Number(res?.data?.amount || 0).toFixed(2)));
      refreshBalance();
      await load();
    } catch (e) {
      done();
      const code = e?.response?.data?.code;
      const text = rb.err[code]?.replace("{n}", data?.minClaim ?? 0);
      notify.error(text || e?.response?.data?.message || t.authErr.generic);
    } finally {
      setBusy(false);
    }
  };

  const total = Number(data?.totals?.total || 0);
  const canClaim = Boolean(data?.enabled) && total > 0 && total >= Number(data?.minClaim || 0);

  return { data, loading, busy, load, claim, canClaim };
};

export default useRebate;
