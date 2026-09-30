import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

import { useLanguage } from "../../Context/LanguageProvider";
import { setCredentials } from "./authSlice";
import { notify } from "../../utils/notify";
import {
  fetchCaptcha,
  fetchOtpFlows,
  forgotRequest,
  loginRequest,
  registerRequest,
  sendOtp,
  verifyOtp,
} from "./authApi";

/**
 * লগইন / নিবন্ধন / পাসওয়ার্ড ফেরত — সব যুক্তি এখানে।
 *
 * ডেস্কটপের মডাল আর মোবাইলের পেজ দেখতে একদম আলাদা (মূল সাইটের মতো),
 * কিন্তু নিয়ম একই; তাই দুটোই এই hook থেকে মান, ভুল আর কাজগুলো নেয় —
 * নিজেরা শুধু আঁকে। ফর্ম বদলালে (লগইন ↔ নিবন্ধন) কম্পোনেন্টটা নতুন
 * `key` দিয়ে বসে, তাই এখানে আলাদা করে সব মুছতে হয় না।
 *
 * বার্তা: ঘরের ভুল ঘরের নিচে লাল লেখায় থাকে, আর সব ভুল/সফলতা/চলমান
 * কাজ SweetAlert2 টোস্টে (`utils/notify`) — ডেস্কটপ-মোবাইল একই।
 *
 * OTP কখন: admin এর OTP Setting এ যে ধাপ চালু (`/api/otp-setting/flows`)।
 *   - নিবন্ধন: চালু থাকলে তবেই মোবাইল নম্বর ও কোডের ঘর দেখায়
 *   - লগইন: server `otpRequired` বললে পাসওয়ার্ডের পর কোডের ধাপ
 *   - পাসওয়ার্ড ফেরত: সবসময় কোড; OTP বন্ধ বা নম্বর না থাকলে গ্রাহক সেবা
 */

const RESEND_SECONDS = 60;
const COUNTRY_CODE = "+880";

const USERNAME_RE = /^[a-z0-9]{4,15}$/;
const PHONE_RE = /^01[3-9]\d{8}$/;

/** server এর কোড → কোন ঘরের নিচে দেখাবে (না থাকলে ফর্মের উপরে) */
const FIELD_OF = {
  usernameTaken: "username",
  usernameLength: "username",
  usernameChars: "username",
  noAccount: "username",
  passwordTooShort: "password",
  phoneTaken: "phone",
  badPhone: "phone",
  captchaWrong: "captcha",
  captchaExpired: "captcha",
  otpWrong: "otp",
  otpExpired: "otp",
  otpNotAsked: "otp",
  otpTooManyTries: "otp",
  otpNotVerified: "otp",
  badReferral: "referral",
};

/** server এর কিছু কোড একই বার্তায় যায় */
const MESSAGE_OF = {
  usernameLength: "usernameRule",
  usernameChars: "usernameRule",
  passwordTooShort: "passwordShort",
  badPhone: "phoneRule",
  noPhone: "forgotUnavailable",
};

const EMPTY = {
  username: "",
  password: "",
  confirm: "",
  phone: "",
  otp: "",
  captcha: "",
  referral: "",
  newPassword: "",
  newConfirm: "",
};

/** ঘরে যা টাইপ হয় তা আগে থেকেই ছেঁটে নেওয়া — ভুল অক্ষর ঢুকতেই পারে না */
const clean = (name, value) => {
  const v = String(value ?? "");
  if (name === "username") return v.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
  if (name === "phone") return v.replace(/\D/g, "").slice(0, 11);
  if (name === "otp") return v.replace(/\D/g, "").slice(0, 6);
  if (name === "captcha") return v.replace(/\D/g, "").slice(0, 5);
  if (name === "referral") return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return v.slice(0, 20);
};

export const useAuthFlow = (mode, { onDone, initialReferral = "", defaultRemember = true } = {}) => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const msg = useCallback((key, fallback = "") => t.authErr?.[key] || fallback || t.authErr.generic, [t]);

  const [values, setValues] = useState(() => ({ ...EMPTY, referral: clean("referral", initialReferral) }));
  const [remember, setRemember] = useState(defaultRemember);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const [flows, setFlows] = useState(null);
  const [captcha, setCaptcha] = useState({ id: "", image: "", loading: false });

  // লগইন: form | otp ; পাসওয়ার্ড ফেরত: user | reset | unavailable | done
  const [step, setStep] = useState(mode === "forgot" ? "user" : "form");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* ---------- ধাপের সেটিং আর ক্যাপচা ---------- */

  useEffect(() => {
    fetchOtpFlows().then((f) => mounted.current && setFlows(f));
  }, []);

  const refreshCaptcha = useCallback(async () => {
    setCaptcha((c) => ({ ...c, loading: true }));
    const r = await fetchCaptcha();
    if (!mounted.current) return;
    setCaptcha(r.ok ? { id: r.data.captchaId, image: r.data.image, loading: false } : { id: "", image: "", loading: false });
    setValues((v) => ({ ...v, captcha: "" }));
  }, []);

  useEffect(() => {
    if (mode === "register") refreshCaptcha();
  }, [mode, refreshCaptcha]);

  /* ---------- আবার পাঠানোর গোনা ---------- */

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  /* ---------- ঘর ---------- */

  const setField = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: clean(name, value) }));
    setErrors((e) => (e[name] ? { ...e, [name]: "" } : e));
  }, []);

  /** server এর ভুল → টোস্ট, আর যে ঘরের ভুল তার নিচেও লাল লেখা */
  const showServerError = useCallback(
    (r) => {
      const key = MESSAGE_OF[r.code] || r.code;
      const text = msg(key, r.message);
      const field = FIELD_OF[r.code];
      if (field) setErrors((e) => ({ ...e, [field]: text }));
      notify.error(text);
    },
    [msg],
  );

  const otpOnRegister = Boolean(flows?.register);

  /* ---------- কোড পাঠানো ---------- */

  const sendCode = useCallback(async () => {
    if (countdown > 0 || busy) return;

    let body;
    if (mode === "register") {
      if (!PHONE_RE.test(values.phone)) {
        setErrors((e) => ({ ...e, phone: msg("phoneRule") }));
        notify.warning(msg("phoneRule"));
        return;
      }
      body = { flow: "register", countryCode: COUNTRY_CODE, phone: values.phone };
    } else {
      body = { flow: mode === "forgot" ? "forgotPassword" : "login", userId: values.username };
    }

    setBusy(true);
    const done = notify.pending(t.notify.sendingCode);
    const r = await sendOtp(body);
    done();
    if (!mounted.current) return;
    setBusy(false);

    if (!r.ok) {
      if (r.code === "otpWait") setCountdown(RESEND_SECONDS);
      // নিবন্ধনে কোডের ভুলগুলো নম্বরের ঘরেই — কোডের ঘর তখনো দেখা যায় না
      if (mode === "register" && !otpSent) {
        const text = msg(MESSAGE_OF[r.code] || r.code, r.message);
        setErrors((e) => ({ ...e, phone: text }));
        notify.error(text);
      } else showServerError(r);
      return;
    }

    notify.success(t.notify.codeSent, r.data.maskedPhone || undefined);
    setOtpSent(true);
    setMaskedPhone(r.data.maskedPhone || "");
    setCountdown(RESEND_SECONDS);
    setErrors((e) => ({ ...e, otp: "" }));
  }, [countdown, busy, mode, values.phone, values.username, otpSent, msg, showServerError, t]);

  /* ---------- যাচাই ---------- */

  const need = (list) => {
    const next = {};
    list.forEach(([name, ok, key]) => {
      if (!ok) next[name] = msg(values[name] ? key : "required");
    });
    setErrors(next);
    const ok = Object.keys(next).length === 0;
    // কোন ঘরে সমস্যা তা নিচে লাল লেখায়; টোস্ট শুধু একবার মনে করিয়ে দেয়
    if (!ok) notify.warning(Object.keys(next).length === 1 ? Object.values(next)[0] : t.notify.checkFields);
    return ok;
  };

  const finishLogin = (data) => {
    dispatch(setCredentials({ token: data.token, user: data.user, remember }));
    // রেজিস্টার বোনাস পেলে নিচের ছোট লেখায় সেটাই
    const bonusNote = data.bonus?.amount ? t.notify.registerBonus.replace("{amount}", data.bonus.amount) : "";
    notify.success(mode === "register" ? t.notify.registerOk : t.notify.loginOk, bonusNote || data.user?.userId);
    onDone?.({ type: mode });
  };

  /* ---------- জমা ---------- */

  const submitLogin = async () => {
    if (step === "form") {
      if (!need([
        ["username", Boolean(values.username), "required"],
        ["password", Boolean(values.password), "required"],
      ])) return;

      const r = await loginRequest({ userId: values.username, password: values.password });
      if (!r.ok) return showServerError(r);

      if (r.data.otpRequired) {
        // পাসওয়ার্ড ঠিক — এবার ফোনে কোড
        setMaskedPhone(r.data.maskedPhone || "");
        setStep("otp");
        const s = await sendOtp({ flow: "login", userId: values.username });
        if (!s.ok) return showServerError(s);
        notify.success(t.notify.codeSent, r.data.maskedPhone || undefined);
        setOtpSent(true);
        setCountdown(RESEND_SECONDS);
        return;
      }
      return finishLogin(r.data);
    }

    // কোডের ধাপ
    if (!need([["otp", values.otp.length >= 4, "otpRule"]])) return;
    const v = await verifyOtp({ flow: "login", userId: values.username, otp: values.otp });
    if (!v.ok) return showServerError(v);
    const r = await loginRequest({ userId: values.username, password: values.password });
    if (!r.ok) return showServerError(r);
    return finishLogin(r.data);
  };

  const submitRegister = async () => {
    const checks = [
      ["username", USERNAME_RE.test(values.username), "usernameRule"],
      ["password", values.password.length >= 6, "passwordShort"],
      ["confirm", Boolean(values.confirm) && values.confirm === values.password, "passwordMismatch"],
    ];
    if (otpOnRegister) {
      checks.push(["phone", PHONE_RE.test(values.phone), "phoneRule"]);
      checks.push(["otp", otpSent && values.otp.length >= 4, otpSent ? "otpRule" : "sendCodeFirst"]);
    }
    checks.push(["captcha", values.captcha.length === 5, "captchaRule"]);
    if (!need(checks)) {
      // কোড না চাওয়া থাকলে "এই ঘরটি পূরণ করুন" এর চেয়ে কাজের কথা বলা ভালো
      if (otpOnRegister && !otpSent) setErrors((e) => ({ ...e, otp: msg("sendCodeFirst") }));
      return;
    }

    if (otpOnRegister) {
      const v = await verifyOtp({ flow: "register", countryCode: COUNTRY_CODE, phone: values.phone, otp: values.otp });
      if (!v.ok) return showServerError(v);
    }

    const r = await registerRequest({
      userId: values.username,
      password: values.password,
      countryCode: COUNTRY_CODE,
      phone: otpOnRegister ? values.phone : "",
      referralCode: values.referral,
      captchaId: captcha.id,
      captcha: values.captcha,
    });

    if (!r.ok) {
      // ক্যাপচা একবারই চলে — যেকোনো ভুলে নতুনটা লাগবে
      refreshCaptcha();
      return showServerError(r);
    }
    return finishLogin(r.data);
  };

  const submitForgot = async () => {
    if (step === "user") {
      if (!need([["username", Boolean(values.username), "required"]])) return;
      const r = await sendOtp({ flow: "forgotPassword", userId: values.username });
      if (!r.ok) {
        if (r.code === "forgotUnavailable" || r.code === "noPhone" || r.code === "otpNotConfigured") {
          setStep("unavailable");
          notify.warning(msg("forgotUnavailable"));
          return;
        }
        if (r.code === "otpWait") {
          // আগেই কোড গেছে — সোজা পরের ধাপে, নতুন কোড গোনা শেষে
          setStep("reset");
          setOtpSent(true);
          setCountdown(RESEND_SECONDS);
          return;
        }
        return showServerError(r);
      }
      setMaskedPhone(r.data.maskedPhone || "");
      setOtpSent(true);
      setCountdown(RESEND_SECONDS);
      setStep("reset");
      return;
    }

    if (step !== "reset") return;
    if (!need([
      ["otp", values.otp.length >= 4, "otpRule"],
      ["newPassword", values.newPassword.length >= 6, "passwordShort"],
      ["newConfirm", Boolean(values.newConfirm) && values.newConfirm === values.newPassword, "passwordMismatch"],
    ])) return;

    const v = await verifyOtp({ flow: "forgotPassword", userId: values.username, otp: values.otp });
    if (!v.ok) return showServerError(v);
    const r = await forgotRequest({ userId: values.username, newPassword: values.newPassword });
    if (!r.ok) {
      if (r.code === "forgotUnavailable") return setStep("unavailable");
      return showServerError(r);
    }
    setStep("done");
    notify.success(t.notify.resetOk);
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    // শুধু আসল অনুরোধের সময় ঘুরন্ত টোস্ট — ঘর ফাঁকা থাকলে সাথে সাথে সতর্কবার্তা
    const pendingText = mode === "register" ? t.notify.registering : mode === "forgot" && step === "reset" ? t.notify.resetting : mode === "login" ? t.notify.signingIn : "";
    let closePending = () => {};
    const timer = pendingText ? setTimeout(() => { closePending = notify.pending(pendingText); }, 350) : null;
    try {
      if (mode === "login") await submitLogin();
      else if (mode === "register") await submitRegister();
      else await submitForgot();
    } finally {
      clearTimeout(timer);
      closePending();
      if (mounted.current) setBusy(false);
    }
  };

  /** লগইনের কোডের ধাপ থেকে ফেরা */
  const backToForm = () => {
    setStep(mode === "forgot" ? "user" : "form");
    setValues((v) => ({ ...v, otp: "" }));
    setErrors({});
  };

  return {
    values,
    setField,
    errors,
    busy,
    remember,
    setRemember,
    flows,
    otpOnRegister,
    captcha,
    refreshCaptcha,
    step,
    maskedPhone,
    otpSent,
    countdown,
    sendCode,
    submit,
    backToForm,
  };
};

export default useAuthFlow;
