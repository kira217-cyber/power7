import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Ban, RefreshCw, Search, Ticket } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Pager } from "../../components/HistoryBits/HistoryBits";
import { Field, Loading, PageHead } from "../SiteContent/bits";
import { errorOf } from "../SiteContent/helpers";
import { KINDS, SOURCES } from "./kinds";

const STATUS = { available: ["Open", "--status-pending"], claimed: ["Claimed", "--status-success"], expired: ["Expired", "--text-disabled"] };

/** সব খেলোয়াড়ের টিকিট — কে কী পেল, কত টাকা গেল; না-খোলা টিকিট বাতিল করা যায় */
const RewardTickets = () => {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [paid, setPaid] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ status: "", kind: "", source: "", q: "" });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [cancel, setCancel] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ page, limit: 20 });
    Object.entries(filter).forEach(([k, v]) => v && params.set(k, v));
    api
      .get(`/api/rewards/admin/tickets?${params}`)
      .then(({ data }) => {
        if (!alive) return;
        setRows(data?.data?.tickets || []);
        setMeta(data?.data?.meta || {});
        setPaid(data?.data?.paid || 0);
      })
      .catch((e) => toast.error(errorOf(e, "Failed to load")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, filter, tick]);

  const change = (key) => (e) => {
    setLoading(true);
    setPage(1);
    setFilter((f) => ({ ...f, [key]: e.target.value }));
  };

  const doCancel = async () => {
    try {
      setBusy(true);
      await api.patch(`/api/rewards/admin/tickets/${cancel._id}/cancel`);
      toast.success("Ticket cancelled");
      setCancel(null);
      setLoading(true);
      setTick((x) => x + 1);
    } catch (err) {
      toast.error(errorOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHead title="Ticket History" subtitle="Every Reward Center ticket given to players.">
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setTick((x) => x + 1);
          }}
          disabled={loading}
          className="ad-btn ad-btn--ghost ad-btn--sm"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHead>

      <div className="ad-card mb-4 flex flex-wrap items-end gap-3">
        {[
          ["Status", "status", Object.fromEntries(Object.entries(STATUS).map(([k, [l]]) => [k, l])), 150],
          ["Type", "kind", KINDS, 190],
          ["From", "source", SOURCES, 170],
        ].map(([label, key, opts, width]) => (
          <div key={key} style={{ width }}>
            <Field label={label}>
              <select className="ad-input" value={filter[key]} onChange={change(key)}>
                <option value="">All</option>
                {Object.entries(opts).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ))}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setPage(1);
            setFilter((f) => ({ ...f, q: q.trim() }));
          }}
        >
          <div style={{ width: 190 }}>
            <Field label="Username">
              <input className="ad-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Exact username" />
            </Field>
          </div>
          <button type="submit" className="ad-btn ad-btn--ghost">
            <Search size={15} />
          </button>
        </form>
        <div className="ml-auto text-right">
          <p className="text-[12px] font-bold uppercase text-[var(--text-muted)]">Paid (this filter)</p>
          <p className="text-[22px] font-bold text-[var(--status-success)]">৳ {Number(paid).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
          <Ticket size={26} /> No tickets.
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Player", "Ticket", "Type", "From", "Progress / Won", "Status", "Given", "Ends", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const [label, color] = STATUS[row.status] || STATUS.available;
                return (
                  <tr key={row._id} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-4 py-3 text-[14px] font-semibold text-[var(--neutral100)]">{row.userIdText}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{row.name?.bn || row.name?.en}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{KINDS[row.kind]}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{SOURCES[row.source]}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                      {row.status === "claimed" ? `৳ ${row.amount}` : row.kind === "temu" ? `${row.temu?.score} / ${row.temu?.target}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-[2px] text-[11px] font-bold" style={{ background: `color-mix(in srgb, var(${color}), transparent 86%)`, color: `var(${color})` }}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{new Date(row.endAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {row.status === "available" && (
                        <button type="button" title="Cancel ticket" onClick={() => setCancel(row)} className="ad-btn ad-btn--ghost ad-btn--sm">
                          <Ban size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager
        page={meta.page || 1}
        totalPages={meta.totalPages || 1}
        busy={loading}
        onChange={(next) => {
          setLoading(true);
          setPage(next);
        }}
      />

      <ConfirmModal
        open={Boolean(cancel)}
        title="Cancel this ticket?"
        message="The player can no longer open it."
        confirmText="Cancel ticket"
        danger
        busy={busy}
        onConfirm={doCancel}
        onClose={() => setCancel(null)}
      />
    </div>
  );
};

export default RewardTickets;
