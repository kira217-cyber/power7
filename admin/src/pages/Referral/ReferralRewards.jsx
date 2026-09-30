import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Gift, Loader2, RefreshCw, Search } from "lucide-react";

import { api } from "../../api/axios";
import { Pager, taka } from "../../components/HistoryBits/HistoryBits";

const TYPES = [
  { key: "all", label: "Every type" },
  { key: "invitation", label: "Invitation" },
  { key: "achievement", label: "Achievement" },
  { key: "deposit", label: "Deposit rebate" },
  { key: "betting", label: "Betting commission" },
];

const STATUS = [
  { key: "all", label: "All" },
  { key: "claimable", label: "Not claimed" },
  { key: "claimed", label: "Claimed" },
];

const fmt = (value) => (value ? new Date(value).toLocaleString() : "—");

/** কে কোন রেফারেল পুরস্কার পেলেন, দাবি করলেন কিনা */
const ReferralRewards = () => {
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (type !== "all") params.set("type", type);
        if (status !== "all") params.set("status", status);
        if (search) params.set("q", search);
        const { data } = await api.get(`/api/referral/admin/rewards?${params}`);
        if (!alive) return;
        setRows(data?.data?.rewards || []);
        setSummary(data?.data?.summary || {});
        setMeta(data?.data?.meta || {});
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [type, status, search, page, tick]);

  const change = (fn) => (value) => {
    setLoading(true);
    fn(value);
    setPage(1);
  };

  const detail = (r) => {
    if (r.type === "invitation") return `${r.fromUserIdText} qualified`;
    if (r.type === "achievement") return `${r.milestoneCount} friends in ${r.periodKey}`;
    if (r.type === "deposit") return `L${r.tier} · ${r.fromUserIdText} deposited ${r.base} · ${r.percent}%`;
    return `Bets on ${r.periodKey} · ${r.base} total`;
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">Referral Rewards</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">Everything players earned from inviting friends.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); setTick((t) => t + 1); }} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {[
          ["Not claimed yet", summary.claimable, summary.claimableCount, "var(--status-pending)"],
          ["Claimed (paid)", summary.claimed, summary.claimedCount, "var(--status-success)"],
        ].map(([label, amount, count, color]) => (
          <div key={label} className="ad-card py-4">
            <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-[24px] font-black" style={{ color }}>{taka(amount)}</p>
            <p className="text-[12px] text-[var(--text-disabled)]">{count || 0} rows</p>
          </div>
        ))}
      </div>

      <div className="ad-card mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS.map((item) => (
            <button key={item.key} type="button" onClick={() => change(setStatus)(item.key)} className={`ad-btn ad-btn--sm ${status === item.key ? "ad-btn--primary" : "ad-btn--ghost"}`}>
              {item.label}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => change(setType)(e.target.value)} className="ad-input" style={{ width: 200 }}>
          {TYPES.map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]" />
          <input value={search} onChange={(e) => change(setSearch)(e.target.value)} placeholder="Player or friend" style={{ paddingInlineStart: "38px" }} className="ad-input" />
        </div>
      </div>

      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <Gift size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">Nothing here</p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Player", "Type", "Detail", "Amount", "Status", "Earned", "Claimed"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-[14px] font-semibold text-[var(--neutral100)]">{r.userIdText}</td>
                  <td className="px-4 py-3 text-[13px] capitalize text-[var(--text-secondary)]">{TYPES.find((t) => t.key === r.type)?.label || r.type}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{detail(r)}</td>
                  <td className="px-4 py-3 text-[14px] text-[var(--primary500)]">{taka(r.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-[2px] text-[11px] font-bold"
                      style={{
                        background: `color-mix(in srgb, var(${r.status === "claimed" ? "--status-success" : "--status-pending"}), transparent 88%)`,
                        color: `var(${r.status === "claimed" ? "--status-success" : "--status-pending"})`,
                      }}
                    >
                      {r.status === "claimed" ? "Claimed" : "Not claimed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{fmt(r.createdAt)}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{fmt(r.claimedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={meta.page || 1} totalPages={meta.totalPages || 1} busy={loading} onChange={(next) => { setLoading(true); setPage(next); }} />
    </div>
  );
};

export default ReferralRewards;
