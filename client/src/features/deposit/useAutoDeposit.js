import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { PRESET_AMOUNTS } from "./useDepositFlow";

/**
 * অটো ডিপোজিট — ডেস্কটপ মডাল আর মোবাইল পেজের একই যুক্তি।
 *
 * পরিমাণ আর (চাইলে) একটা বোনাস বেছে "পেমেন্ট করুন" → server লেনদেন বসিয়ে
 * গেটওয়ের পেমেন্ট পাতার ঠিকানা দেয় → সেখানে চলে যাওয়া। টাকা ঢোকে
 * গেটওয়ের নিশ্চিতকরণে, তাই এখানে ব্যালেন্সে কিছু যোগ করা হয় না।
 *
 * বোনাসের হিসাব server এর `computeBonus` এর মতোই — শুধু দেখানোর জন্য।
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (v) => Math.round(num(v) * 100) / 100;

export const useAutoDeposit = () => {
  const { t, lang } = useLanguage();
  const p = t.payMode;
  const tv = useCallback((v) => (v && typeof v === "object" ? v[lang] || v.bn || v.en || "" : v || ""), [lang]);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmountRaw] = useState("");
  const [bonusId, setBonusId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/api/auto-deposit/status")
      .then(({ data }) => alive && setStatus(data?.data || { active: false }))
      .catch(() => alive && setStatus({ active: false }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const min = num(status?.minAmount);
  const max = num(status?.maxAmount);
  const bonuses = useMemo(() => status?.bonuses || [], [status]);
  const bonus = bonuses.find((b) => b._id === bonusId) || null;
  const presets = PRESET_AMOUNTS.filter((v) => (!min || v >= min) && (!max || v <= max));

  const preview = useMemo(() => {
    const amt = money(amount);
    const bonusAmount = !bonus ? 0 : bonus.bonusType === "percent" ? money((amt * num(bonus.bonusValue)) / 100) : money(bonus.bonusValue);
    const credited = money(amt + bonusAmount);
    const multiplier = bonus ? num(bonus.turnoverMultiplier ?? 1) : 0;
    return { amount: amt, bonus: bonusAmount, credited, multiplier, target: money(credited * multiplier) };
  }, [amount, bonus]);

  const setAmount = (v) => setAmountRaw(String(v).replace(/[^\d.]/g, "").slice(0, 9));

  const errorText = (error) => {
    const code = error?.response?.data?.code;
    if (error?.response?.status === 401) return t.games.needLogin;
    return p.err?.[code] || t.withdrawFlow?.err?.[code] || error?.response?.data?.message || t.authErr.generic;
  };

  const pay = async () => {
    if (busy) return;
    const amt = money(amount);
    if (!amt) return notify.warning(p.enterAmount);
    if ((min && amt < min) || (max && amt > max)) {
      return notify.warning(p.limitErr.replace("{min}", min.toLocaleString("en-US")).replace("{max}", max.toLocaleString("en-US")));
    }

    setBusy(true);
    const done = notify.pending(p.starting);
    try {
      const { data } = await api.post("/api/auto-deposit/create", { amount: amt, bonusId: bonusId || undefined });
      done();
      const url = data?.data?.paymentUrl;
      if (url) window.location.assign(url);
      else notify.error(p.err.gateway);
    } catch (error) {
      done();
      notify.error(errorText(error));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return { loading, status, min, max, bonuses, bonus, bonusId, setBonusId, presets, amount, setAmount, preview, busy, pay, tv };
};

export default useAutoDeposit;
