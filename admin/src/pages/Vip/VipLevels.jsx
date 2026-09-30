import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Crown, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { api } from "../../api/axios";
import { Switch } from "../Referral/ReferralProgram";

const fetchData = async () => {
  const { data } = await api.get("/api/vip/admin/levels");
  return data?.data?.levels || [];
};

const KINDS = [
  ["slot", "Slot"],
  ["fishing", "Fishing"],
  ["live", "Live"],
  ["poker", "Poker"],
  ["sports", "Sports"],
];

const blank = (lv) => ({
  lv,
  name: `VIP${lv}`,
  xpRequired: "",
  upgradeBonus: 0,
  rebate: Object.fromEntries(KINDS.map(([k]) => [k, 0])),
  isActive: true,
  isNew: true,
});

/**
 * VIP ধাপ — XP শর্ত (১ টাকা বাজি = XP সেটিং অনুযায়ী), ধাপে ওঠার বোনাস,
 * আর ম্যানুয়াল রিবেটের হার খেলার ধরন অনুযায়ী। VIP0 সবার শুরু।
 */
const VipLevels = () => {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setLevels(await fetchData());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchData()
      .then((next) => alive && setLevels(next))
      .catch((error) => toast.error(error?.response?.data?.message || "Failed to load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const edit = (i, patch) => setLevels((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch, dirty: true } : l)));
  const editRate = (i, kind, value) =>
    setLevels((prev) => prev.map((l, j) => (j === i ? { ...l, rebate: { ...l.rebate, [kind]: value }, dirty: true } : l)));

  const save = async (level) => {
    const key = level._id || `new-${level.lv}`;
    try {
      setBusy(key);
      const body = { lv: level.lv, name: level.name, xpRequired: level.xpRequired, upgradeBonus: level.upgradeBonus, rebate: level.rebate, isActive: level.isActive };
      if (level.isNew) await api.post("/api/vip/admin/levels", body);
      else await api.put(`/api/vip/admin/levels/${level._id}`, body);
      toast.success(`${level.name || `VIP${level.lv}`} saved`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const remove = async (level, i) => {
    if (level.isNew) {
      setLevels((prev) => prev.filter((_, j) => j !== i));
      return;
    }
    if (!window.confirm(`Delete ${level.name}?`)) return;
    try {
      setBusy(level._id);
      await api.delete(`/api/vip/admin/levels/${level._id}`);
      toast.success("Deleted");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setBusy("");
    }
  };

  const addLevel = () => {
    const lv = levels.reduce((m, l) => Math.max(m, Number(l.lv)), -1) + 1;
    setLevels((prev) => [...prev, blank(lv)]);
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">VIP Levels</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            XP comes from bets. Reaching a level pays its bonus once; the level sets the manual rebate rates.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={addLevel} className="ad-btn ad-btn--primary ad-btn--sm">
            <Plus size={15} /> Add level
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Level", "Name", "XP needed", "Level-up bonus ৳", ...KINDS.map(([, l]) => `${l} %`), "Players", "Active", ""].map((h) => (
                  <th key={h} className="px-2 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {levels.map((l, i) => {
                const key = l._id || `new-${l.lv}`;
                const base = l.lv === 0 && !l.isNew;
                return (
                  <tr key={key} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1 text-[14px] font-bold" style={{ color: "var(--primary500)" }}>
                        <Crown size={14} /> {l.lv}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <input className="ad-input" style={{ paddingInline: 12, width: 86, minWidth: 86 }} value={l.name} onChange={(e) => edit(i, { name: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" disabled={base} className="ad-input" style={{ paddingInline: 12, width: 110, minWidth: 110 }} value={l.xpRequired} onChange={(e) => edit(i, { xpRequired: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" className="ad-input" style={{ paddingInline: 12, width: 90, minWidth: 90 }} value={l.upgradeBonus} onChange={(e) => edit(i, { upgradeBonus: e.target.value })} />
                    </td>
                    {KINDS.map(([k]) => (
                      <td key={k} className="px-2 py-2">
                        <input type="number" min="0" max="5" step="0.01" className="ad-input" style={{ paddingInline: 10, width: 74, minWidth: 74 }} value={l.rebate?.[k] ?? 0} onChange={(e) => editRate(i, k, e.target.value)} />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-[13px] text-[var(--text-muted)]">{l.members ?? 0}</td>
                    <td className="px-2 py-2">
                      {base ? <span className="text-[12px] text-[var(--text-disabled)]">Always</span> : <Switch checked={l.isActive !== false} onChange={(v) => edit(i, { isActive: v })} />}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <button type="button" disabled={busy === key || !(l.dirty || l.isNew)} onClick={() => save(l)} className="ad-btn ad-btn--primary ad-btn--sm" title="Save">
                          {busy === key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        </button>
                        {!base ? (
                          <button type="button" disabled={busy === key} onClick={() => remove(l, i)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        A level with players on it cannot be deleted — turn it off instead. Rebate rates apply to bets since the
        player&apos;s last claim, at the level they hold when claiming.
      </p>
    </div>
  );
};

export default VipLevels;
