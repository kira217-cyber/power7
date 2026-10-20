import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useSelector } from "react-redux";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { useRefreshBalance } from "../auth/useRefreshBalance";

/**
 * পার্সোনাল অটো ডিপোজিট (MFSWallet) এর পেমেন্ট পাতা থেকে ফেরা — `?mfs=<invoice>&result=…`।
 *
 * ঠিকানার `result` এর ওপর ভরসা না করে server থেকে লেনদেনের আসল অবস্থা পড়ে জানায়
 * (সফল / যাচাই হচ্ছে / হয়নি), ব্যালেন্স তাজা করে, তারপর ঠিকানা থেকে প্যারামিটার সরায়।
 */
const MfsReturnNotice = () => {
  const [params, setParams] = useSearchParams();
  const loggedIn = useSelector(selectIsLoggedIn);
  const { t } = useLanguage();
  const { refresh } = useRefreshBalance();
  const invoice = params.get("mfs");
  const result = params.get("result");

  useEffect(() => {
    if (!invoice || !loggedIn) return;
    const p = t.payMode;
    const clean = () => {
      const next = new URLSearchParams(params);
      next.delete("mfs");
      next.delete("result");
      setParams(next, { replace: true });
    };
    const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
    api
      .get(`/api/mfs-deposit/my/${encodeURIComponent(invoice)}`)
      .then(({ data }) => {
        const d = data?.data?.deposit;
        if (d?.status === "PAID") {
          notify.success(p.returnSuccess.replace("{amount}", fmt(d.calc?.creditedAmount || d.amount)));
          refresh();
        } else if (d?.status === "PENDING" && result !== "fail") notify.info(p.returnWaiting.replace("{amount}", fmt(d.amount)));
        else notify.warning(p.returnFail);
      })
      .catch(() => result === "fail" && notify.warning(p.returnFail))
      .finally(clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, loggedIn]);

  return null;
};

export default MfsReturnNotice;
