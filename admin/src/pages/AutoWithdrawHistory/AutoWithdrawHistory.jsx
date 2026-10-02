import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  Coins,
  Filter,
  Hourglass,
  Phone,
  Receipt,
  Send,
  TriangleAlert,
  RefreshCw,
  Search,
  User,
  Wallet,
  XCircle,
} from "lucide-react";

import { api } from "../../api/axios";
import ImageLightbox from "../../components/ImageLightbox/ImageLightbox";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { UserLink } from "../../components/HistoryBits/HistoryBits";

const money = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "৳ 0.00";
  return `৳ ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const STATUS = {
  COMPLETED: { color: "var(--status-success)", Icon: CircleCheck },
  PROCESSING: { color: "var(--status-pending)", Icon: Hourglass },
  PENDING: { color: "var(--status-pending)", Icon: Clock },
  REJECTED: { color: "var(--status-danger)", Icon: XCircle },
};

/** টেবিলে যে নাম দেখায় — OraclePay এর COMPLETED = সফল */
const LABEL = { PENDING: "PENDING", PROCESSING: "PROCESSING", COMPLETED: "SUCCESS", REJECTED: "REJECTED" };

const tone = (status) =>
  STATUS[String(status || "PENDING").toUpperCase()] || STATUS.PENDING;

const headerBg = {
  background:
    "linear-gradient(90deg, var(--neutral1000), color-mix(in srgb, var(--primary500), transparent 82%), var(--neutral1000))",
  borderColor: "color-mix(in srgb, var(--primary500), transparent 78%)",
};

const iconBoxBg = {
  background: "linear-gradient(135deg, var(--primary400), var(--primary500))",
  color: "var(--neutral1000)",
};

const FieldRow = ({ k, v }) => (
  <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-2">
    <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
      {k}
    </div>
    <div className="break-all text-right text-[13px] font-bold text-[var(--neutral100)]">
      {v}
    </div>
  </div>
);

const SummaryCard = ({ title, amount, count, color, icon }) => (
  <div className="ad-card">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </div>
        <div className="mt-2 text-[22px] font-black" style={{ color }}>
          {money(amount)}
        </div>
        <div className="mt-1 text-[13px] font-semibold text-[var(--text-disabled)]">
          {Number(count || 0)} records
        </div>
      </div>
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]"
        style={{
          background: `color-mix(in srgb, ${color}, transparent 86%)`,
          color,
        }}
      >
        {icon}
      </span>
    </div>
  </div>
);

/**
 * অটো উইথড্রয়ের ইতিহাস — Bajiman এর ইতিহাস পাতার গড়নে।
 *
 * খেলোয়াড়ের আবেদন PENDING এ আসে (টাকা আটকে রাখা, OraclePay তে নয়)।
 * admin Approve চাপলে তবেই OraclePay তে যায় (PROCESSING); OraclePay এর
 * webhook এ SUCCESS (Trx ID, প্রমাণ লেখা ও ছবি) বা REJECTED (টাকা ফেরত)।
 * Reject শুধু PENDING এ — OraclePay তে যাওয়ার পর বাতিল সে-ই করে।
 */
const AutoWithdrawHistory = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [expanded, setExpanded] = useState("");

  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  const [zoom, setZoom] = useState("");
  const [confirmRow, setConfirmRow] = useState(null);
  const [approveRow, setApproveRow] = useState(null);
  const [acting, setActing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status !== "ALL") params.set("status", status);
      if (q) params.set("q", q);

      const { data } = await api.get(
        `/api/auto-withdraw/withdrawals/admin?${params}`,
      );
      const payload = data?.data || {};

      setRows(payload.withdrawals || []);
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
  }, [page, limit, status, q]);

  const onSearch = (event) => {
    event.preventDefault();
    setExpanded("");
    setPage(1);
    setQ(term.trim());
  };

  const doReject = async () => {
    if (!confirmRow) return;

    try {
      setActing(true);
      const { data } = await api.post(
        `/api/auto-withdraw/withdrawals/${confirmRow._id}/reject`,
      );
      toast.success(data?.message || "Rejected and refunded");
      setConfirmRow(null);
      await fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed");
    } finally {
      setActing(false);
    }
  };

  const doApprove = async () => {
    if (!approveRow) return;

    try {
      setActing(true);
      const { data } = await api.post(
        `/api/auto-withdraw/withdrawals/${approveRow._id}/approve`,
      );
      toast.success(data?.message || "Sent to OraclePay");
      setApproveRow(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Approve failed");
      setApproveRow(null);
    } finally {
      setActing(false);
      await fetchData();
    }
  };

  const totalPages = Math.max(Number(meta.totalPages || 1), 1);

  const headerStats = useMemo(
    () => ({ total: Number(meta.total || 0), showing: rows.length }),
    [meta.total, rows.length],
  );

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      {/* ── হেডার ── */}
      <div
        className="overflow-hidden rounded-[24px] border px-5 py-5 md:px-6 md:py-6"
        style={headerBg}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-[18px]"
              style={iconBoxBg}
            >
              <Banknote size={26} />
            </span>
            <div>
              <h1 className="text-[24px] font-black tracking-tight text-[var(--neutral100)] md:text-[30px]">
                Auto Withdraw History
              </h1>
              <p className="mt-1 text-[13px] font-medium text-[var(--text-muted)]">
                Approve a pending request to send it to OraclePay — then it settles as success or rejected.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="ad-btn ad-btn--primary"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── সারাংশ ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Success"
          amount={summary.completedAmount}
          count={summary.COMPLETED}
          color="var(--status-success)"
          icon={<CircleCheck size={22} />}
        />
        <SummaryCard
          title="Processing"
          amount={summary.processingAmount}
          count={summary.PROCESSING}
          color="var(--status-pending)"
          icon={<Hourglass size={22} />}
        />
        <SummaryCard
          title="Pending"
          amount={summary.pendingAmount}
          count={summary.PENDING}
          color="var(--status-pending)"
          icon={<Clock size={22} />}
        />
        <SummaryCard
          title="Rejected"
          amount={summary.rejectedAmount}
          count={summary.REJECTED}
          color="var(--status-danger)"
          icon={<XCircle size={22} />}
        />
      </div>

      {/* ── ছাঁকনি + খোঁজা ── */}
      <div className="ad-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_180px]">
          <form onSubmit={onSearch} className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]"
            />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search userId / wallet / withdrawal id"
              style={{ paddingInlineStart: "38px" }}
              className="ad-input"
            />
          </form>

          <div className="flex items-center gap-2">
            <Filter size={15} className="shrink-0 text-[var(--text-disabled)]" />
            <select
              value={status}
              onChange={(e) => {
                setExpanded("");
                setPage(1);
                setStatus(e.target.value);
              }}
              className="ad-input"
            >
              <option value="ALL">All status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Success</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <select
            value={limit}
            onChange={(e) => {
              setExpanded("");
              setPage(1);
              setLimit(Number(e.target.value) || 20);
            }}
            className="ad-input"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["Total Records", headerStats.total],
            ["Showing This Page", headerStats.showing],
            ["Current Page", `${meta.page || 1} / ${totalPages}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[14px] border border-white/[0.07] bg-black/20 p-3"
            >
              <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                {label}
              </div>
              <div className="mt-1 text-[22px] font-black text-[var(--neutral100)]">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── টেবিল ── */}
      {loading ? (
        <div className="ad-card p-10 text-center text-[var(--text-muted)]">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-12 text-center">
          <Banknote size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No records found
          </p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[1160px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {[
                  "User",
                  "Method",
                  "Wallet",
                  "Amount",
                  "Fee",
                  "Proof",
                  "Status",
                  "Action",
                ].map((head) => (
                  <th
                    key={head}
                    className={`px-5 py-4 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)] ${
                      head === "Action" ? "text-right" : ""
                    }`}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const isOpen = expanded === row._id;
                const st = tone(row.status);
                const pendingNew = row.status === "PENDING" && !row.withdrawalId && !row.approvedAt;
                const canApprove = row.status === "PENDING";
                const canReject = pendingNew;

                return (
                  <React.Fragment key={row._id}>
                    <tr className="border-b border-white/[0.05] hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-[var(--primary500)]" />
                          <UserLink user={row.user} name={row.user?.userId || row.userIdText} />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                          <Phone size={12} />
                          {row.user?.phone || "—"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[13px] font-semibold capitalize text-[var(--neutral100)]">
                        {row.paymentMethod || "—"}
                      </td>

                      <td className="px-5 py-4 text-[13px] text-[var(--text-secondary)]">
                        {row.accountNumber || row.userIdentityAddress || "—"}
                      </td>

                      <td className="px-5 py-4 text-[14px] font-extrabold text-[var(--primary500)]">
                        {money(row.amount)}
                      </td>

                      <td className="px-5 py-4 text-[13px] text-[var(--text-muted)]">
                        {row.feeAmount
                          ? `${money(row.feeAmount)} (${row.feePercentage || 0}%)`
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        {row.transactionId ? (
                          <div className="mb-1 font-mono text-[12px] font-bold text-[var(--neutral100)]">
                            {row.transactionId}
                          </div>
                        ) : null}
                        {row.proofImages?.length ? (
                          <div className="flex gap-1">
                            {row.proofImages.slice(0, 3).map((url) => (
                              <button
                                key={url}
                                type="button"
                                onClick={() => setZoom(url)}
                                className="cursor-pointer overflow-hidden rounded-md transition hover:brightness-110"
                              >
                                <img
                                  src={url}
                                  alt="proof"
                                  className="h-9 w-9 object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        ) : row.transactionId ? null : (
                          <span className="text-[12px] text-[var(--text-disabled)]">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black"
                          style={{
                            background: `color-mix(in srgb, ${st.color}, transparent 86%)`,
                            color: st.color,
                          }}
                        >
                          <st.Icon size={11} />
                          {LABEL[String(row.status || "PENDING").toUpperCase()] || row.status}
                        </span>
                        {row.status === "PENDING" && row.gatewayError ? (
                          <div
                            className="mt-1.5 flex max-w-[220px] items-start gap-1 text-[11px] font-semibold text-[var(--status-danger)]"
                            title={row.gatewayError}
                          >
                            <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{row.gatewayError}</span>
                          </div>
                        ) : null}
                        {row.status === "PROCESSING" ? (
                          <div className="mt-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                            Waiting for OraclePay
                          </div>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canApprove ? (
                            <button
                              type="button"
                              onClick={() => setApproveRow(row)}
                              className="ad-btn ad-btn--primary ad-btn--sm"
                              title="Approve & send to OraclePay"
                            >
                              <Send size={13} />
                              Approve
                            </button>
                          ) : null}

                          {canReject ? (
                            <button
                              type="button"
                              onClick={() => setConfirmRow(row)}
                              className="ad-btn ad-btn--danger ad-btn--sm"
                              title="Reject & refund"
                            >
                              <XCircle size={13} />
                              Reject
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? "" : row._id)}
                            className="ad-btn ad-btn--ghost ad-btn--sm"
                            aria-label="toggle details"
                          >
                            {isOpen ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="bg-black/25 p-0">
                          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-[16px] border border-white/[0.08] bg-black/20 p-4">
                              <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[var(--primary500)]">
                                <Wallet size={14} />
                                Payout
                              </div>
                              <FieldRow k="Amount" v={money(row.amount)} />
                              <FieldRow
                                k="Fee"
                                v={`${money(row.feeAmount)} (${row.feePercentage || 0}%)`}
                              />
                              <FieldRow
                                k="Deducted"
                                v={money(row.deductedAmount || row.amount)}
                              />
                              <FieldRow k="Method" v={row.paymentMethod || "—"} />
                              <FieldRow
                                k="Wallet"
                                v={row.accountNumber || row.userIdentityAddress || "—"}
                              />
                            </div>

                            <div className="rounded-[16px] border border-white/[0.08] bg-black/20 p-4">
                              <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[var(--primary500)]">
                                <Receipt size={14} />
                                Gateway
                              </div>
                              <FieldRow
                                k="Withdrawal ID"
                                v={row.withdrawalId || "—"}
                              />
                              <FieldRow k="Status" v={row.status || "—"} />
                              <FieldRow
                                k="Refunded"
                                v={row.refunded ? "YES" : "NO"}
                              />
                              <FieldRow
                                k="Transaction ID"
                                v={row.transactionId || "—"}
                              />
                              {row.proofText && row.proofText !== row.transactionId ? (
                                <FieldRow k="Proof Text" v={row.proofText} />
                              ) : null}
                              <FieldRow
                                k="Approved At"
                                v={
                                  row.approvedAt
                                    ? new Date(row.approvedAt).toLocaleString()
                                    : "—"
                                }
                              />
                              <FieldRow
                                k="Success At"
                                v={
                                  row.completedAt
                                    ? new Date(row.completedAt).toLocaleString()
                                    : "—"
                                }
                              />
                              {row.reason ? (
                                <FieldRow k="Reason" v={row.reason} />
                              ) : null}
                              {row.status === "PENDING" && row.gatewayError ? (
                                <FieldRow k="Gateway Error" v={row.gatewayError} />
                              ) : null}
                            </div>

                            <div className="rounded-[16px] border border-white/[0.08] bg-black/20 p-4">
                              <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[var(--primary500)]">
                                <Coins size={14} />
                                Balance
                              </div>
                              <FieldRow
                                k="Before"
                                v={money(row.balanceBefore)}
                              />
                              <FieldRow k="After" v={money(row.balanceAfter)} />
                              <FieldRow
                                k="When"
                                v={new Date(row.createdAt).toLocaleString()}
                              />
                            </div>

                            <div className="rounded-[16px] border border-white/[0.08] bg-black/20 p-4">
                              <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[var(--primary500)]">
                                <User size={14} />
                                User
                              </div>
                              <FieldRow
                                k="User ID"
                                v={row.user?.userId || row.userIdText || "—"}
                              />
                              <FieldRow k="Phone" v={row.user?.phone || "—"} />
                              <FieldRow k="Role" v={row.user?.role || "user"} />
                            </div>
                          </div>

                          {row.proofImages?.length ? (
                            <div className="flex flex-wrap gap-2 px-5 pb-5">
                              {row.proofImages.map((url) => (
                                <button
                                  key={url}
                                  type="button"
                                  onClick={() => setZoom(url)}
                                  className="cursor-pointer overflow-hidden rounded-[10px] border border-white/[0.08] transition hover:brightness-110"
                                >
                                  <img
                                    src={url}
                                    alt="proof"
                                    className="h-24 w-24 object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-white/[0.07] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-[13px] text-[var(--text-muted)]">
                Showing{" "}
                <span className="font-black text-[var(--neutral100)]">
                  {(meta.page - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-black text-[var(--neutral100)]">
                  {Math.min(meta.page * limit, meta.total)}
                </span>{" "}
                of{" "}
                <span className="font-black text-[var(--neutral100)]">
                  {meta.total}
                </span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                >
                  Previous
                </button>
                <span className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[13px] text-[var(--text-secondary)]">
                  {meta.page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={meta.page >= totalPages}
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ImageLightbox src={zoom} alt="proof" onClose={() => setZoom("")} />

      <ConfirmModal
        open={Boolean(approveRow)}
        busy={acting}
        title="Approve this withdrawal?"
        message={
          approveRow
            ? `${money(approveRow.amount)} will be sent through OraclePay to ${
                approveRow.paymentMethod || ""
              } ${approveRow.accountNumber || ""} (${
                approveRow.user?.userId || approveRow.userIdText || "the player"
              }). After this only OraclePay can complete or reject it.`
            : ""
        }
        confirmText="Approve & send"
        onConfirm={doApprove}
        onClose={() => !acting && setApproveRow(null)}
      />

      <ConfirmModal
        open={Boolean(confirmRow)}
        danger
        busy={acting}
        title="Reject this withdrawal?"
        message={
          confirmRow
            ? `${money(confirmRow.amount)} will be refunded to ${
                confirmRow.user?.userId || confirmRow.userIdText || "the player"
              }. This cannot be undone.`
            : ""
        }
        confirmText="Reject & refund"
        onConfirm={doReject}
        onClose={() => !acting && setConfirmRow(null)}
      />
    </div>
  );
};

export default AutoWithdrawHistory;
