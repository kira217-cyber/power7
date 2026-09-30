import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { useRefreshBalance } from "../auth/useRefreshBalance";
import { fetchRewardSummary } from "./rewardSlice";

/**
 * পুরস্কার কেন্দ্রের ডেটা — টিকিট (দাবি করা / রেকর্ড), সাইন-ইন, টেমুর
 * ইতিহাস, VIP অগ্রগতি। টাকা আসার পর ব্যালেন্স আর ব্যাজ আবার আনা হয়।
 */

/** একটা GET — `{ data, loading, reload }` */
const useGet = (url, params) => {
  const loggedIn = useSelector(selectIsLoggedIn);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params || {});

  const reload = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const { data: res } = await api.get(url, { params: JSON.parse(key) });
      setData(res?.data ?? null);
    } catch {
      /* 401 হলে axios লগআউট করায় */
    } finally {
      setLoading(false);
    }
  }, [loggedIn, url, key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
};

export const useTickets = (status = "available") => {
  const { data, loading, reload } = useGet("/api/rewards/tickets", { status });
  return { tickets: data?.tickets || [], loading, reload };
};

export const useSignIn = () => useGet("/api/rewards/signin");
export const useTemuHistory = () => useGet("/api/rewards/temu-history");
export const useVipProgress = () => useGet("/api/vip/my").data;

/** ভুলের কোড → লেখা */
const errText = (t, e) => t.rewardFlow.err[e?.response?.data?.code] || e?.response?.data?.message || t.authErr.generic;

/**
 * টিকিট খোলা/দাবি আর সাইন-ইন। প্রতিটা সফল কাজের পর `after()` চলে
 * (তালিকা আবার আনা) আর ব্যালেন্স + ব্যাজ তাজা হয়।
 */
export const useRewardActions = (after) => {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { refresh: refreshBalance } = useRefreshBalance();
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    if (busy) return null;
    setBusy(true);
    try {
      const { data } = await fn();
      refreshBalance();
      dispatch(fetchRewardSummary());
      return data?.data ?? {};
    } catch (e) {
      notify.error(errText(t, e));
      return null;
    } finally {
      setBusy(false);
      after?.();
    }
  };

  return {
    busy,
    /** লাল প্যাকেট / চাকা — `{ amount, segment }` */
    open: (id) => run(() => api.post(`/api/rewards/tickets/${id}/open`)),
    /** টেমুর পুরো টাকা */
    claimTemu: (id) => run(() => api.post(`/api/rewards/tickets/${id}/claim`)),
    signIn: () => run(() => api.post("/api/rewards/signin")),
  };
};

/** মেয়াদের বাকি — `{ days, h, m, s, over }`, প্রতি সেকেন্ডে */
export const useCountdown = (endAt) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, new Date(endAt).getTime() - now);
  const sec = Math.floor(left / 1000);
  return {
    days: Math.floor(sec / 86400),
    h: Math.floor((sec % 86400) / 3600),
    m: Math.floor((sec % 3600) / 60),
    s: sec % 60,
    over: left <= 0,
  };
};

/** "2026.09.28" */
export const dotDate = (value) => {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

/** "2026/09/24 19:35:47" */
export const slashDateTime = (value) => {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
