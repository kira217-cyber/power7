import { useEffect } from "react";

import { API_URL } from "../../api/axios";

/**
 * API বন্ধ থাকায় রক্ষণাবেক্ষণের পর্দা দেখালে (outage) — প্রতি ১৫ সেকেন্ডে
 * দেখা হয় API ফিরেছে কিনা; ঠিকঠাক উত্তর পেলেই পাতা নতুন করে লোড, যাতে
 * সব ডেটা (গেম, ব্যানার, লগইন) আবার আসে। admin এর রক্ষণাবেক্ষণ চালু
 * থাকলে নতুন লোডে সেটাই দেখায়।
 */
export const useApiRecovery = (outage) => {
  useEffect(() => {
    if (!outage) return undefined;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/maintenance/status`, { cache: "no-store" });
        const body = await res.json();
        if (!stopped && res.ok && body?.success) window.location.reload();
      } catch {
        /* এখনো বন্ধ */
      }
    };
    const id = setInterval(check, 15000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [outage]);
};

export default useApiRecovery;
