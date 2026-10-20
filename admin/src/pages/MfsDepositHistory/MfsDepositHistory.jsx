import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp, CircleCheck, Clock, Receipt, Search, ShieldAlert, XCircle } from "lucide-react";

import { api } from "../../api/axios";
import { HistoryHeader, Pager, StatCard, UserLink, taka } from "../../components/HistoryBits/HistoryBits";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { refreshPending } from "../../features/pending/usePending";

const METHOD = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", upay: "Upay" };

/** সারির অবস্থা — গেটওয়ে পেন্ডিং পাঠালে "Needs review" */
const statusOf = (row) => {
  if (row.status === "PAID") return { label: "Paid", color: "var(--status-success)" };
  if (row.status === "FAILED") return { label: "Failed", color: "var(--status-danger)" };
  if (row.needsReview) return { label: "Needs review", color: "var(--status-pending)" };
  return { label: "Waiting for payment", color: "var(--text-muted)" };
};

const when = (value) => (value ? new Date(value).toLocaleString() : "—");

const Field = ({ k, v }) => (
  <div className="flex justify-between gap-4 border-b border-white/[0.05] py-1.5 text-[13px]">
    <span className="text-[var(--text-muted)]">{k}</span>
    <span className="break-all text-right font-semibold text-[var(--neutral100)]">{v || "—"}</span>
  </div>
);

/**
 * পার্সোনাল অটো ডিপোজিট (MFSWallet) এর ইতিহাস।
 *
 * "Needs review" = MFSWallet নিজে মেলাতে পারেনি (পেন্ডিং webhook) — নিজের
 * bKash/Nagad… হিসাব দেখে নিশ্চিত (টাকা ঢোকে) বা বাতিল করুন।
 * "Waiting for payment" = খেলোয়াড় পেমেন্ট পাতা খুলেছিলেন, কিছু আসেনি।
 */
const MfsDepositHistory = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [expanded, setExpanded] = useState("");
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [trx, setTrx] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status !== "ALL") params.set("status", status);
      if (method) params.set("method", method);
      if (q) params.set("q", q);
      const { data } = await api.get(`/api/mfs-deposit/deposits/admin?${params}`);
      const payload = data?.data || {};
      setRows(payload.deposits || []);
      setSummary(payload.summary || {});
      setMeta(payload.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(fetchData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, method, q]);

  const act = async () => {
    if (!action) return;
    try {
      setBusy(true);
      const { data } = await api.post(`/api/mfs-deposit/deposits/${action.row._id}/${action.kind}`, { note, ...(action.kind === "confirm" && trx.trim() ? { transactionId: trx.trim() } : {}) });
      toast.success(data?.message || "Done");
      setAction(null);
      fetchData();
      // সাইডবারের লাল ব্যাজ সাথে সাথে
      refreshPending();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const open = (row, kind) => {
    setNote("");
    setTrx(row.transactionId || "");
    setAction({ row, kind });
  };

  return (
    <div className="mx-auto max-w-[1250px]">
      <HistoryHeader title="Personal Auto Deposit History" subtitle="MFSWallet payments — confirm or reject the ones MFSWallet could not match." Icon={Receipt} onRefresh={fetchData} loading={loading} />

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Paid" amount={taka(summary.paidAmount)} count={summary.paidCount} color="var(--status-success)" Icon={CircleCheck} />
        <StatCard title="Needs review" amount={`${summary.reviewCount || 0}`} count={summary.reviewCount} color="var(--status-pending)" Icon={ShieldAlert} />
        <StatCard title="Pending (all)" amount={taka(summary.pendingAmount)} count={summary.pendingCount} color="var(--text-muted)" Icon={Clock} />
        <StatCard title="Failed" amount={taka(summary.failedAmount)} count={summary.failedCount} color="var(--status-danger)" Icon={XCircle} />
      </div>

      <div className="ad-card mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_160px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQ(term.trim());
            }}
            className="relative"
          >
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search user / invoice / short code / TrxID / sender" style={{ paddingInlineStart: 38 }} className="ad-input" />
          </form>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="ad-input"
          >
            <option value="ALL">All status</option>
            <option value="REVIEW">Needs review</option>
            <option value="PENDING">Pending (all)</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={method}
            onChange={(e) => {
              setPage(1);
              setMethod(e.target.value);
            }}
            className="ad-input"
          >
            <option value="">All methods</option>
            {Object.entries(METHOD).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ad-card overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-white/[0.07] text-[12px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">TrxID / Sender</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[var(--text-disabled)]">
                  No payments yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const st = statusOf(row);
              const isOpen = expanded === row._id;
              return (
                <React.Fragment key={row._id}>
                  <tr className="border-b border-white/[0.05] text-[13px]">
                    <td className="px-4 py-3">
                      <UserLink user={row.user} name={row.userIdText || row.user?.userId} />
                      <p className="text-[11px] text-[var(--text-disabled)]">{row.invoiceNumber}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--neutral100)]">{METHOD[row.method] || row.method}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-[var(--neutral100)]">{taka(row.amount)}</p>
                      {row.calc?.bonusAmount > 0 && <p className="text-[11px] text-[var(--status-success)]">+{taka(row.calc.bonusAmount)} bonus</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color: st.color, background: `color-mix(in srgb, ${st.color}, transparent 88%)` }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[12px] text-[var(--neutral100)]">{row.transactionId || "—"}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{row.senderNumber || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{when(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {row.status === "PENDING" && (
                          <>
                            <button type="button" onClick={() => open(row, "confirm")} className="ad-btn ad-btn--primary ad-btn--sm">
                              Confirm
                            </button>
                            <button type="button" onClick={() => open(row, "reject")} className="ad-btn ad-btn--danger ad-btn--sm">
                              Reject
                            </button>
                          </>
                        )}
                        <button type="button" onClick={() => setExpanded(isOpen ? "" : row._id)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Details">
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid gap-x-10 md:grid-cols-2">
                          <div>
                            <Field k="Invoice" v={row.invoiceNumber} />
                            <Field k="MFSWallet short code" v={row.shortCode} />
                            <Field k="Gateway message" v={row.gatewayMessage} />
                            <Field k="Paid at" v={when(row.paidAt)} />
                            <Field k="Reviewed by" v={row.reviewedBy?.email} />
                            <Field k="Review note" v={row.reviewNote} />
                          </div>
                          <div>
                            <Field k="Bonus" v={row.selectedBonus?.title?.en || row.selectedBonus?.title?.bn} />
                            <Field k="Bonus amount" v={taka(row.calc?.bonusAmount)} />
                            <Field k="Credited" v={taka(row.calc?.creditedAmount)} />
                            <Field k="Turnover needed" v={row.calc?.targetTurnover ? `${taka(row.calc.targetTurnover)} (×${row.calc.turnoverMultiplier})` : "—"} />
                            <Field k="User balance now" v={row.user?.balance !== undefined ? taka(row.user.balance) : "—"} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={Number(meta.totalPages || 1)} busy={loading} onChange={setPage} />

      <ConfirmModal
        open={Boolean(action)}
        title={action?.kind === "confirm" ? `Confirm ${taka(action?.row.amount)} and credit it?` : "Reject this payment?"}
        message={
          action?.kind === "confirm"
            ? "Check your own bKash/Nagad/Rocket/Upay account first — the money (and any bonus) goes to the player's balance right away."
            : "The player is not credited."
        }
        confirmText={action?.kind === "confirm" ? "Confirm & credit" : "Reject"}
        danger={action?.kind === "reject"}
        busy={busy}
        onClose={() => !busy && setAction(null)}
        onConfirm={act}
      >
        {action?.kind === "confirm" && (
          <input value={trx} onChange={(e) => setTrx(e.target.value)} placeholder="Transaction ID (optional)" className="ad-input mb-2" />
        )}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="ad-input" />
      </ConfirmModal>
    </div>
  );
};

export default MfsDepositHistory;
