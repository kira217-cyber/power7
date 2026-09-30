import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { refreshMe } from "../auth/authSlice";

/**
 * উত্তোলন — ডেস্কটপ মডাল আর মোবাইল পেজের একই যুক্তি।
 *
 * পাতা খুললে তিনটে জিনিস একসাথে আসে: শর্ত (টার্নওভার বাকি / আগের আবেদন
 * ঝুলে আছে / লেনদেন পাসওয়ার্ড আছে কিনা + ব্যালেন্স), বাঁধা ই-ওয়ালেট, আর
 * উত্তোলনের মেথড (লোগো, সীমা)। মূল সাইটের মতো মেথড ওয়ালেটের সাথেই বাঁধা।
 *
 * `view`: main | addWallet | setTx — ওয়ালেট যোগ আর লেনদেন পাসওয়ার্ড বসানো
 * একই পাতার ভিতরে আলাদা ধাপ।
 *
 * `mode: "auto"` — অটো উত্তোলন: একই বাঁধা ই-ওয়ালেট, একই শর্ত আর লেনদেন
 * পাসওয়ার্ড; শুধু সীমা অটোর সেটিং থেকে, আবেদন যায় `/api/auto-withdraw/create`
 * এ। অটো যে ওয়ালেট সমর্থন করে না (যেমন উপায় ছাড়া অন্য কিছু) সেটা বাছলে
 * জমা দেওয়ার আগেই বলে দেওয়া হয়।
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** নম্বর শূন্য ছাড়া রাখা (1711…) — দেখানো হয় 017****0111 */
export const maskNumber = (value = "") => {
  const full = /^1\d{9}$/.test(String(value)) ? `0${value}` : String(value);
  return full.length >= 8 ? `${full.slice(0, 3)}****${full.slice(-4)}` : full;
};

const TX_RULE = /^[A-Za-z0-9]{6,12}$/;

export const useWithdrawFlow = ({ mode = "manual" } = {}) => {
  const isAuto = mode === "auto";
  const dispatch = useDispatch();
  const { t, lang } = useLanguage();
  const w = t.withdrawFlow;
  const tv = useCallback((v) => (v && typeof v === "object" ? v[lang] || v.bn || v.en || "" : v || ""), [lang]);

  const [loading, setLoading] = useState(true);
  const [elig, setElig] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [cap, setCap] = useState(2);
  const [methods, setMethods] = useState([]);
  const [autoStatus, setAutoStatus] = useState(null);
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [txPassword, setTxPassword] = useState("");
  const [view, setView] = useState("main");
  const [busy, setBusy] = useState(false);

  const errorText = useCallback(
    (error) => {
      const code = error?.response?.data?.code;
      if (error?.response?.status === 401) return t.games.needLogin;
      return w.err?.[code] || t.payMode?.err?.[code] || error?.response?.data?.message || t.authErr.generic;
    },
    [t, w],
  );

  const load = useCallback(async () => {
    try {
      const [e, list, m, auto] = await Promise.all([
        api.get("/api/withdraw-requests/eligibility"),
        api.get("/api/e-wallets"),
        api.get("/api/withdraw-methods/public"),
        isAuto ? api.get("/api/auto-withdraw/status") : Promise.resolve(null),
      ]);
      setAutoStatus(auto?.data?.data || null);
      setElig(e.data?.data || null);
      const ws = list.data?.data?.wallets || [];
      setWallets(ws);
      setCap(list.data?.data?.cap || 2);
      setMethods(m.data?.data?.methods || []);
      setWalletId((cur) => (ws.some((x) => x._id === cur) ? cur : ws[0]?._id || ""));
    } catch (error) {
      notify.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [errorText, isAuto]);

  useEffect(() => {
    load();
  }, [load]);

  const wallet = wallets.find((x) => x._id === walletId) || null;
  const method = methods.find((m) => m.methodId === wallet?.methodId) || null;
  // অটোতে সীমা অটোর মাধ্যম থেকে (না থাকলে অটোর সাধারণ সীমা)
  const autoMethods = autoStatus?.methods || [];
  const autoMethod = autoMethods.find((m) => m.code === String(wallet?.methodId || "").toLowerCase()) || null;
  const unsupported = isAuto && Boolean(wallet) && !autoMethod;
  const supportedList = autoMethods.map((m) => tv(m.name) || m.code).join(", ");
  const min = isAuto ? num(autoMethod?.minAmount) || num(autoStatus?.minAmount) : num(method?.minimumWithdrawAmount);
  const max = isAuto ? num(autoMethod?.maxAmount) || num(autoStatus?.maxAmount) : num(method?.maximumWithdrawAmount);
  const balance = num(elig?.balance);

  /** কেন আটকে আছে — null মানে তোলা যাবে */
  const block = useMemo(() => {
    if (!elig) return null;
    if (!elig.hasTxPassword) return "noTx";
    if (!elig.eligible) return elig.reason || "turnover";
    return null;
  }, [elig]);

  const setAmountText = (v) => setAmount(String(v).replace(/[^\d.]/g, "").slice(0, 9));

  /** ব্যালেন্স নতুন করে (হেডারেও) */
  const refreshBalance = async () => {
    dispatch(refreshMe());
    await load();
    notify.success(t.notify.balanceUpdated);
  };

  const submit = async () => {
    if (busy) return;
    if (!wallet) return notify.warning(w.chooseWallet);
    if (unsupported) return notify.warning(t.payMode.unsupported);
    const amt = num(amount);
    if (!amt) return notify.warning(w.enterAmount);
    if ((min && amt < min) || (max && amt > max)) {
      return notify.warning(w.limitErr.replace("{min}", min.toLocaleString("en-US")).replace("{max}", max.toLocaleString("en-US")));
    }
    if (amt > balance) return notify.warning(w.err.lowBalance);
    if (!txPassword) return notify.warning(w.enterTx);

    setBusy(true);
    const done = notify.pending(w.submitting);
    try {
      await api.post(isAuto ? "/api/auto-withdraw/create" : "/api/withdraw-requests", { walletId, amount: amt, txPassword });
      done();
      notify.success(w.submitted, w.submittedHint);
      setAmount("");
      setTxPassword("");
      dispatch(refreshMe());
      await load();
    } catch (error) {
      done();
      notify.error(errorText(error));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  /** প্রথমবার লেনদেন পাসওয়ার্ড — লগইন পাসওয়ার্ড দিয়ে নিশ্চিত */
  const saveTxPassword = async ({ loginPassword, newTx, confirmTx }) => {
    if (!loginPassword) return notify.warning(w.enterLogin);
    if (!TX_RULE.test(newTx || "")) return notify.warning(w.txRule);
    if (newTx !== confirmTx) return notify.warning(t.authErr.passwordMismatch);
    setBusy(true);
    try {
      await api.post("/api/profile/tx-password", { loginPassword, txPassword: newTx });
      notify.success(w.txSaved);
      dispatch(refreshMe());
      await load();
      setView("main");
      return true;
    } catch (error) {
      notify.error(errorText(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addWallet = async ({ methodId, walletNumber, accountName, tx }) => {
    if (!methodId) return notify.warning(w.chooseMethod);
    if (!/^01[3-9]\d{8}$/.test(walletNumber || "")) return notify.warning(t.authErr.phoneRule);
    if (!tx) return notify.warning(w.enterTx);
    setBusy(true);
    try {
      const { data } = await api.post("/api/e-wallets", { methodId, walletNumber, accountName, txPassword: tx });
      const ws = data?.data?.wallets || [];
      setWallets(ws);
      setWalletId(ws[ws.length - 1]?._id || "");
      notify.success(w.walletAdded);
      setView("main");
      return true;
    } catch (error) {
      notify.error(errorText(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const removeWallet = async (target) => {
    const tx = await notify.askPassword({
      title: w.removeTitle.replace("{number}", maskNumber(target.walletNumber)),
      placeholder: t.money.txPassword,
      confirmText: w.remove,
      cancelText: t.notify.cancel,
    });
    if (tx === null) return;
    try {
      const { data } = await api.delete(`/api/e-wallets/${target._id}`, { data: { txPassword: tx } });
      const ws = data?.data?.wallets || [];
      setWallets(ws);
      setWalletId(ws[0]?._id || "");
      notify.success(w.walletRemoved);
    } catch (error) {
      notify.error(errorText(error));
    }
  };

  return {
    mode,
    isAuto,
    unsupported,
    supportedList,
    reload: load,
    loading,
    elig,
    block,
    wallets,
    cap,
    methods,
    wallet,
    walletId,
    setWalletId,
    method,
    min,
    max,
    balance,
    amount,
    setAmount: setAmountText,
    txPassword,
    setTxPassword,
    view,
    setView,
    busy,
    tv,
    refreshBalance,
    submit,
    saveTxPassword,
    addWallet,
    removeWallet,
  };
};

export default useWithdrawFlow;
