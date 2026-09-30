import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Power } from "lucide-react";

import { api } from "../../api/axios";

/**
 * ম্যানুয়াল ডিপোজিট / উত্তোলন চালু-বন্ধের সুইচ।
 *
 * ক্লায়েন্টে যা দেখায়: ম্যানুয়াল আর অটো দুটোই চালু → দুটো কার্ড;
 * একটা চালু → সরাসরি সেই পাতা; কোনোটাই নয় → "সাময়িকভাবে বন্ধ"।
 * অটোর সুইচ Auto Deposit / Auto Withdraw পাতায়।
 */
const ManualSwitch = ({ kind }) => {
  const key = kind === "withdraw" ? "withdrawManual" : "depositManual";
  const label = kind === "withdraw" ? "Manual withdraw" : "Manual deposit";
  const autoPage = kind === "withdraw" ? "Auto Withdraw" : "Auto Deposit";
  const [on, setOn] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/api/payment-modes/admin")
      .then(({ data }) => setOn(Boolean(data?.data?.[key])))
      .catch(() => {});
  }, [key]);

  const toggle = async () => {
    try {
      setBusy(true);
      const { data } = await api.put("/api/payment-modes/admin", { [key]: !on });
      setOn(Boolean(data?.data?.[key]));
      toast.success(data?.data?.[key] ? `${label} is on` : `${label} is off`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ad-card mb-4 flex flex-wrap items-center gap-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
        style={{
          background: on ? "color-mix(in srgb, var(--status-success), transparent 86%)" : "rgba(255,255,255,0.06)",
          color: on ? "var(--status-success)" : "var(--text-muted)",
        }}
      >
        <Power size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold text-[var(--neutral100)]">
          {label} {on === null ? "" : on ? "— On" : "— Off"}
        </p>
        <p className="mt-1 text-[12px] text-[var(--text-muted)]">
          Players see both cards when manual and auto are on, go straight to the one that is on otherwise, and see “temporarily unavailable” when both are off. The auto
          switch is on the {autoPage} page.
        </p>
      </div>
      <button
        type="button"
        disabled={busy || on === null}
        onClick={toggle}
        className={`ad-btn ad-btn--sm ${on ? "ad-btn--primary" : "ad-btn--ghost"}`}
      >
        {on ? "Turn off" : "Turn on"}
      </button>
    </div>
  );
};

export default ManualSwitch;
