import { useEffect, useState } from "react";

import api from "../../api/axios";

/**
 * admin "ডিপোজিটের আগে পরিচয় যাচাই" চালু রাখলে, যাচাই না হওয়া খেলোয়াড়কে
 * ডিপোজিট পাতা খোলার সময়েই জানানো — টাকা পাঠানোর আগে, জমা দেওয়ার
 * সময় নয় (server ও জমার সময় একই নিয়মে আটকায়)।
 *
 * `{ loading, blocked, status }` — status: none / pending / rejected
 */
export const useDepositGate = () => {
  const [state, setState] = useState({ loading: true, blocked: false, status: "none" });

  useEffect(() => {
    let alive = true;
    const check = () =>
      api
        .get("/api/verification/my")
        .then(({ data }) => {
          const info = data?.data || {};
          const status = info.verification?.status || "none";
          const blocked = Boolean(info.setting?.requireForDeposit) && status !== "approved";
          if (alive) setState({ loading: false, blocked, status });
        })
        // জানা না গেলে আটকানো নয় — server জমার সময় নিজেই দেখে
        .catch(() => alive && setState((prev) => ({ ...prev, loading: false })));

    check();
    // পাতা খোলা থাকতেই admin সুইচ বদলালে — ট্যাবে ফিরে এলে আবার দেখা
    const onVisible = () => document.visibilityState === "visible" && check();
    // জমা দিতে গিয়ে server আটকালে (needVerification) — পাতাও সাথে সাথে বার্তায়
    window.addEventListener("tb:kyc-required", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.removeEventListener("tb:kyc-required", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return state;
};

export default useDepositGate;
