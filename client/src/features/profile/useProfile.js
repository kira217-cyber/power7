import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { refreshMe, setCredentials, updateUser } from "../auth/authSlice";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { isRemembered } from "../auth/tokenStore";

/**
 * "আমার অ্যাকাউন্ট" / "সুরক্ষা কেন্দ্র" এর ডেটা আর কাজ।
 *
 * `/api/profile/overview` একবারে দেয়: ইউজার, নিরাপত্তা স্কোর (কোন কাজ
 * বাকি), অপেক্ষমাণ জমা/উত্তোলনের সংখ্যা, KYC এর অবস্থা। প্রতিটা কাজ
 * সফল হলে overview নতুন করে আনে, তাই স্কোর সাথে সাথে বদলায়।
 */
export const useProfile = () => {
  const dispatch = useDispatch();
  const loggedIn = useSelector(selectIsLoggedIn);
  const { t } = useLanguage();
  const p = t.profileFlow;

  const [overview, setOverview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const { data } = await api.get("/api/profile/overview");
      setOverview(data?.data || null);
      if (data?.data?.user) dispatch(updateUser(data.data.user));
    } catch {
      /* 401 হলে axios নিজেই লগআউট করায় */
    }
  }, [loggedIn, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const errorText = (error) => {
    const code = error?.response?.data?.code;
    return p.err?.[code] || t.withdrawFlow.err?.[code] || error?.response?.data?.message || t.authErr.generic;
  };

  /** একটা কাজ চালানো — ঘুরন্ত টোস্ট, সফলে বার্তা + নতুন overview; ফেরত true/false */
  const run = async (fn, successText) => {
    if (busy) return false;
    setBusy(true);
    const done = notify.pending(t.auth.wait);
    try {
      const result = await fn();
      done();
      if (successText) notify.success(successText);
      await load();
      return result ?? true;
    } catch (error) {
      done();
      notify.error(errorText(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveInfo = (values) =>
    run(async () => {
      const { data } = await api.put("/api/profile/info", values);
      dispatch(updateUser(data?.data?.user));
    }, p.saved);

  const sendPhoneCode = async ({ phone, loginPassword }) => {
    try {
      const { data } = await api.post("/api/profile/phone/send-otp", { phone, loginPassword });
      if (data?.data?.required) notify.success(p.codeSent);
      return { ok: true, required: Boolean(data?.data?.required) };
    } catch (error) {
      notify.error(errorText(error));
      return { ok: false };
    }
  };

  const savePhone = (values) =>
    run(async () => {
      const { data } = await api.put("/api/profile/phone", values);
      dispatch(updateUser(data?.data?.user));
    }, p.saved);

  /** লগইন পাসওয়ার্ড — server নতুন টোকেন দেয়; আগের মতোই (মনে রাখুন বা না) রাখা */
  const changePassword = ({ currentPassword, newPassword }) =>
    run(async () => {
      const { data } = await api.put("/api/profile/password", { currentPassword, newPassword });
      dispatch(setCredentials({ token: data?.data?.token, user: data?.data?.user, remember: isRemembered() }));
    }, p.pwChanged);

  const saveTxPassword = ({ hasTx, loginPassword, oldTx, newTx }) =>
    run(async () => {
      if (hasTx) await api.put("/api/profile/tx-password", { oldTxPassword: oldTx, txPassword: newTx });
      else await api.post("/api/profile/tx-password", { loginPassword, txPassword: newTx });
      dispatch(refreshMe());
    }, hasTx ? p.txChanged : t.withdrawFlow.txSaved);

  const loadKyc = async () => {
    try {
      const { data } = await api.get("/api/verification/my");
      return data?.data || null;
    } catch {
      return null;
    }
  };

  const submitKyc = (form) =>
    run(async () => {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) body.append(key, value);
      });
      await api.post("/api/verification", body);
    }, p.kycSent);

  return { overview, busy, load, saveInfo, sendPhoneCode, savePhone, changePassword, saveTxPassword, loadKyc, submitKyc };
};

export default useProfile;
