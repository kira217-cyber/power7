import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Crown, Loader2, RefreshCw, Search } from "lucide-react";

import { api } from "../../api/axios";
import { Pager, taka } from "../../components/HistoryBits/HistoryBits";

const TYPES = [
  { key: "all", label: "All" },
  { key: "upgrade", label: "Level-up" },
  { key: "rebate", label: "Rebate" },
  { key: "adjust", label: "Lowered" },
];

/** VIP ধাপে ওঠা (বোনাস সহ), ম্যানুয়াল রিবেট দাবি, admin এর নামানো */
const VipHistory = () => {
  const [type, setType] = useState("all");
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
        if (search) params.set("q", search);
        const { data } = await api.get(`/api/vip/admin/history?${params}`);
        if (!alive) return;
        setRows(data?.data?.history || []);
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
  }, [type, search, page, tick]);

  const label = (r) => {
    if (r.type === "upgrade") return `VIP${r.levelFrom} → VIP${r.levelTo}`;
    if (r.type === "adjust") return `VIP${r.levelFrom} → VIP${r.levelTo}`;
    return `At VIP${r.levelTo}`;
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">VIP History</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">Level-ups with their bonus, and manual rebate claims.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); setTick((t) => t + 1); }} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {[
          ["Level-up bonuses paid", summary.upgrade, "var(--primary500)"],
          ["Rebate paid", summary.rebate, "var(--status-success)"],
        ].map(([title, s, color]) => (
          <div key={title} className="ad-card py-4">
            <p className="text-[13px] text-[var(--text-muted)]">{title}</p>
            <p className="mt-1 text-[24px] font-black" style={{ color }}>{taka(s?.amount)}</p>
            <p className="text-[12px] text-[var(--text-disabled)]">{s?.count || 0} rows</p>
          </div>
        ))}
      </div>

      <div className="ad-card mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((item) => (
            <button key={item.key} type="button" onClick={() => { setLoading(true); setType(item.key); setPage(1); }} className={`ad-btn ad-btn--sm ${type === item.key ? "ad-btn--primary" : "ad-btn--ghost"}`}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]" />
          <input value={search} onChange={(e) => { setLoading(true); setSearch(e.target.value); setPage(1); }} placeholder="Search by username" style={{ paddingInlineStart: "38px" }} className="ad-input" />
        </div>
      </div>

      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <Crown size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">Nothing here</p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Player", "Type", "Level", "Amount", "Note", "By", "Time"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-[14px] font-semibold text-[var(--neutral100)]">{r.userIdText}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{TYPES.find((t) => t.key === r.type)?.label || r.type}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--primary500)]">{label(r)}</td>
                  <td className="px-4 py-3 text-[14px] text-[var(--neutral100)]">{taka(r.amount)}</td>
                  <td className="max-w-[260px] px-4 py-3 text-[12px] text-[var(--text-muted)]">{r.note || "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{r.reviewedBy?.email || "System"}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{new Date(r.createdAt).toLocaleString()}</td>
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

export default VipHistory;
