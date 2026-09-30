import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";

/**
 * ম্যানুয়াল ডিপোজিট — ডেস্কটপ মডাল আর মোবাইল পেজের একই যুক্তি।
 *
 * দুই ধাপ (মূল সাইটের মতো):
 *   ১. `form` — মেথড, চ্যানেল, (থাকলে) প্রমোশন, পরিমাণ
 *   ২. `pay`  — কোন নম্বরে পাঠাবেন, বোনাস-টার্নওভারের হিসাব, TrxID এর মতো
 *               admin এর চাওয়া ঘর → জমা দিলে অনুমোদনের অপেক্ষায়
 *
 * বোনাসের হিসাব server এর `buildDepositCalc` এর মতোই — এখানে শুধু দেখানোর
 * জন্য; আসল অঙ্ক server জমার সময় নিজে কষে রেকর্ডে বসায়।
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (v) => Math.round(num(v) * 100) / 100;

// লোগো `/uploads/…` হলে server এর ঠিকানা সামনে — এক জায়গায় (utils/siteLink)
export { assetUrl } from "../../utils/siteLink";

const channelPercent = (channel) => {
  if (num(channel?.bonusPercent) > 0) return num(channel.bonusPercent);
  const tag = String(channel?.tagText || "");
  const parsed = tag.includes("%") ? parseFloat(tag.replace("+", "").replace("%", "")) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const PRESET_AMOUNTS = [100, 300, 500, 1000, 2000, 5000, 8000, 10000, 20000, 30000];

export const useDepositFlow = () => {
  const { t, lang } = useLanguage();
  const d = t.depositFlow;
  const tv = useCallback((v) => (v && typeof v === "object" ? v[lang] || v.bn || v.en || "" : v || ""), [lang]);

  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodId, setMethodId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [promoId, setPromoId] = useState("none");
  const [amount, setAmount] = useState("");
  const [fields, setFields] = useState({});
  const [step, setStep] = useState("form");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/api/deposit-methods/public")
      .then(({ data }) => {
        if (!alive) return;
        const list = data?.data?.methods || [];
        setMethods(list);
        if (list[0]) {
          setMethodId(list[0].methodId);
          setChannelId(list[0].channels?.[0]?.id || "");
        }
      })
      .catch(() => alive && notify.error(d.loadFailed))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // শুধু একবার
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const method = methods.find((m) => m.methodId === methodId) || null;
  const channel = method?.channels?.find((c) => c.id === channelId) || null;
  const promo = promoId !== "none" ? method?.promotions?.find((p) => p.id === promoId) || null : null;
  const min = num(method?.minDepositAmount);
  const max = num(method?.maxDepositAmount);

  // মেথড বদলালে তার প্রথম চ্যানেল, প্রমোশন নেই, ঘর খালি
  const chooseMethod = (id) => {
    const next = methods.find((m) => m.methodId === id);
    setMethodId(id);
    setChannelId(next?.channels?.[0]?.id || "");
    setPromoId("none");
    setFields({});
  };

  const setAmountText = (v) => setAmount(String(v).replace(/[^\d.]/g, "").slice(0, 9));

  /** ছাড় দেওয়া প্রিসেট — মেথডের সীমার বাইরেরগুলো বাদ */
  const presets = useMemo(
    () => PRESET_AMOUNTS.filter((v) => (!min || v >= min) && (!max || v <= max)),
    [min, max],
  );

  const preview = useMemo(() => {
    const amt = money(amount);
    const pct = channelPercent(channel);
    const percentBonus = money((amt * pct) / 100);
    const promoBonus = promo ? money(promo.bonusType === "percent" ? (amt * num(promo.bonusValue)) / 100 : num(promo.bonusValue)) : 0;
    const totalBonus = money(percentBonus + promoBonus);
    const multiplier = promo ? num(promo.turnoverMultiplier ?? 1) : num(method?.turnoverMultiplier ?? 1);
    const credited = money(amt + totalBonus);
    return { amount: amt, channelPercent: pct, totalBonus, credited, multiplier, target: money(credited * multiplier) };
  }, [amount, channel, promo, method]);

  const contact = (method?.contacts || []).slice().sort((a, b) => num(a.sort) - num(b.sort))[0] || null;

  /** ধাপ ১ → ২ */
  const next = () => {
    if (!method || !channel) return notify.warning(d.chooseMethod);
    const amt = money(amount);
    if (!amt) return notify.warning(d.enterAmount);
    if ((min && amt < min) || (max && amt > max)) {
      return notify.warning(d.limitErr.replace("{min}", min.toLocaleString("en-US")).replace("{max}", max.toLocaleString("en-US")));
    }
    setStep("pay");
    return undefined;
  };

  const back = () => setStep("form");

  const setField = (key, value) => setFields((f) => ({ ...f, [key]: String(value).slice(0, 200) }));

  /** ধাপ ২ → জমা */
  const submit = async () => {
    if (busy) return;
    const missing = (method?.inputs || []).filter((i) => i.required && !String(fields[i.key] || "").trim());
    if (missing.length) return notify.warning(d.fillFields, missing.map((i) => tv(i.label) || i.key).join(", "));

    setBusy(true);
    const done = notify.pending(d.submitting);
    try {
      await api.post("/api/deposit-requests", { methodId, channelId, promoId, amount: money(amount), fields });
      done();
      notify.success(d.submitted, d.submittedHint);
      setStep("form");
      setAmount("");
      setFields({});
      setPromoId("none");
    } catch (error) {
      done();
      const code = error?.response?.data?.code;
      // টোকেনের মেয়াদ শেষ হলে axios নিজেই লগআউট করায়; এখানে শুধু কারণটা
      if (error?.response?.status === 401) notify.warning(t.games.needLogin);
      else notify.error(d.err?.[code] || error?.response?.data?.message || t.authErr.generic);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(d.copied, value);
    } catch {
      notify.warning(d.copyFailed);
    }
  };

  return {
    loading,
    methods,
    method,
    channel,
    promo,
    methodId,
    channelId,
    promoId,
    amount,
    fields,
    step,
    busy,
    min,
    max,
    presets,
    preview,
    contact,
    tv,
    chooseMethod,
    setChannelId,
    setPromoId,
    setAmount: setAmountText,
    setField,
    next,
    back,
    submit,
    copy,
  };
};

export default useDepositFlow;
