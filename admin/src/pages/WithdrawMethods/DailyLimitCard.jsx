import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Save } from "lucide-react";

import { api } from "../../api/axios";

/**
 * দিনে একজন খেলোয়াড় সর্বোচ্চ কতবার উত্তোলনের আবেদন করতে পারবেন
 * (মূল সাইটের "আজ বাকি উত্তোলনের সংখ্যা: 99")। ০ = সীমা নেই।
 */
const DailyLimitCard = () => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/api/withdraw-requests/admin/setting")
      .then(({ data }) => setValue(String(data?.data?.setting?.dailyCount ?? 99)))
      .catch(() => {});
  }, []);

  const save = async () => {
    try {
      setBusy(true);
      await api.put("/api/withdraw-requests/admin/setting", { dailyCount: Number(value) || 0 });
      toast.success("Saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ad-card mb-4 flex flex-wrap items-end gap-4">
      <div style={{ width: 240 }}>
        <label className="ad-label">Withdrawals allowed per day</label>
        <input type="number" min={0} max={1000} className="ad-input" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <p className="flex-1 pb-2 text-[12px] text-[var(--text-muted)]">
        How many withdraw requests one player can make in a day (Bangladesh time). Rejected requests are not counted. 0 = no limit. Players see “withdrawals left today” next to the submit button.
      </p>
      <button type="button" disabled={busy || value === ""} onClick={save} className="ad-btn ad-btn--primary ad-btn--sm">
        <Save size={15} /> Save
      </button>
    </div>
  );
};

export default DailyLimitCard;
