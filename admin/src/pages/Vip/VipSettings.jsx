import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, RefreshCw, Save } from "lucide-react";

import { api } from "../../api/axios";
import { Switch } from "../Referral/ReferralProgram";

const fetchData = async () => {
  const { data } = await api.get("/api/vip/admin/setting");
  return data?.data?.setting || null;
};

/** VIP আর ম্যানুয়াল রিবেটের সাধারণ নিয়ম */
const VipSettings = () => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setForm(await fetchData());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchData()
      .then((next) => alive && setForm(next))
      .catch((error) => toast.error(error?.response?.data?.message || "Failed to load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await api.put("/api/vip/admin/setting", form);
      setForm(data?.data?.setting || form);
      toast.success("VIP settings saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">VIP Settings</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">How players earn XP and claim the manual rebate.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="ad-btn ad-btn--ghost ad-btn--sm">
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" onClick={save} disabled={saving} className="ad-btn ad-btn--primary ad-btn--sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
        </div>
      </div>

      <div className="ad-card mb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold text-[var(--neutral100)]">VIP levels</h2>
          <Switch checked={form.active} onChange={(v) => set("active", v)} label={form.active ? "On" : "Off"} />
        </div>
        <label className="ad-label">XP per ৳1 bet</label>
        <input type="number" min="0" step="0.1" className="ad-input" value={form.xpPerTurnover} onChange={(e) => set("xpPerTurnover", e.target.value)} />
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">When off, XP stops growing and nobody levels up (levels already reached stay).</p>
      </div>

      <div className="ad-card mb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold text-[var(--neutral100)]">Manual rebate</h2>
          <Switch checked={form.rebateEnabled} onChange={(v) => set("rebateEnabled", v)} label={form.rebateEnabled ? "On" : "Off"} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="ad-label">Minimum claim (৳)</label>
            <input type="number" min="0" className="ad-input" value={form.rebateMinClaim} onChange={(e) => set("rebateMinClaim", e.target.value)} />
          </div>
          <div>
            <label className="ad-label">Count bets from the last (days)</label>
            <input type="number" min="1" max="60" className="ad-input" value={form.rebateMaxDays} onChange={(e) => set("rebateMaxDays", e.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">
          Players claim from &quot;Manual rebate&quot;. Bets older than this window are no longer counted.
        </p>
      </div>
    </div>
  );
};

export default VipSettings;
