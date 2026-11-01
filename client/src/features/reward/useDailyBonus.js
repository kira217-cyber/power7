import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { useRefreshBalance } from "../auth/useRefreshBalance";
import { fetchRewardSummary } from "./rewardSlice";

/**
 * ডেইলি বোনাস — অবস্থা আর দাবি। দাবির পর ব্যালেন্স আর "দাবি করা" র ব্যাজ তাজা।
 *
 * পরের দিন কখন (`nextAt`) সার্ভারের ঘড়িতে আসে; ফোনের ঘড়ি আগে-পিছে থাকলেও
 * ঠিক দেখাতে সার্ভার-ঘড়ির ফারাকটা মিলিয়ে `nextLocal` বানানো হয়।
 */
export const useDailyBonus = () => {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const loggedIn = useSelector(selectIsLoggedIn);
  const { refresh: refreshBalance } = useRefreshBalance();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const { data } = await api.get("/api/daily-bonus");
      const next = data?.data || null;
      if (next) {
        const drift = Date.now() - new Date(next.serverTime).getTime();
        next.nextLocal = new Date(new Date(next.nextAt).getTime() + drift).toISOString();
      }
      setState(next);
    } catch {
      /* 401 হলে axios লগআউট করায় */
    }
  }, [loggedIn]);

  useEffect(() => {
    reload();
  }, [reload]);

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    const tx = t.dailyBonus;
    try {
      const { data } = await api.post("/api/daily-bonus/claim");
      const got = data?.data || {};
      notify.success(tx.got.replace("{n}", got.dayNo).replace("{a}", Number(got.amount || 0).toFixed(2)));
      refreshBalance();
      dispatch(fetchRewardSummary());
    } catch (e) {
      const code = e?.response?.data?.code;
      notify.error(tx.err[code] || e?.response?.data?.message || t.authErr.generic);
    } finally {
      setBusy(false);
      reload();
    }
  };

  return { state, busy, claim, reload };
};

export default useDailyBonus;
