import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  Coins,
  ExternalLink,
  Filter,
  Gift,
  Percent,
  Receipt,
  RefreshCw,
  Search,
  Target,
  User,
  Phone,
  Wallet,
  XCircle,
} from "lucide-react";

import { api } from "../../api/axios";
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
  PAID: { color: "var(--status-success)", Icon: CircleCheck },
  PENDING: { color: "var(--status-pending)", Icon: Clock },
  FAILED: { color: "var(--status-danger)", Icon: XCircle },
};

const tone = (status) => STATUS[String(status || "PENDING").toUpperCase()] || STATUS.PENDING;

/* সোনালি গ্রেডিয়েন্ট হেডার */
const headerBg = {
  background:
    "linear-gradient(90deg, var(--neutral1000), color-mix(in srgb, var(--primary500), transparent 82%), var(--neutral1000))",
  borderColor: "color-mix(in srgb, var(--primary500), transparent 78%)",
};

const iconBoxBg = {
  background: "linear-gradient(135deg, var(--primary400), var(--primary500))",
  color: "var(--neutral1000)",
};

/** বিস্তারিত অংশের এক সারি */
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

/** সারাংশ কার্ড — টাকা + রেকর্ড সংখ্যা */
const SummaryCard = ({ title, amount, count, color, icon }) => (
  <div className="ad-card">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </div>
        <div className="mt-2 text-[24px] font-black" style={{ color }}>
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
 * অটো ডিপোজিটের ইতিহাস — Bajiman এর auto-deposit-history পাতার মতো,
 * শুধু রঙ আমাদের সাইটের (গোল্ড/ডার্ক)।
 *
 * এখানে অনুমোদন/বাতিলের কিছু নেই — গেটওয়েই সিদ্ধান্ত নেয়। PENDING মানে
 * ব্যবহারকারী পেমেন্ট শুরু করেছিলেন কিন্তু গেটওয়ে নিশ্চিত করেনি, তাই
 * টাকাও যায়নি। প্রতিটা সারি খুলে বিস্তারিত দেখা যায়, আর Footprint লিংকে
 * গেটওয়ের রসিদ পাওয়া যায়।
 */
const AutoDepositHistory = () => {
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

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status !== "ALL") params.set("status", status);
      if (q) params.set("q", q);

      const { data } = await api.get(`/api/auto-deposit/deposits/admin?${params}`);
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
  }, [page, limit, status, q]);

  const onSearch = (event) => {
    event.preventDefault();
    setExpanded("");
    setPage(1);
    setQ(term.trim());
  };

  const totalPages = Math.max(Number(meta.totalPages || 1), 1);

  const headerStats = useMemo(
    () => ({ total: Number(meta.total || 0), showing: rows.length }),
    [meta.total, rows.length],
  );

  return (
    <div className="mx-auto max-w-[1250px] space-y-5">
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
              <Receipt size={26} />
            </span>
            <div>
              <h1 className="text-[24px] font-black tracking-tight text-[var(--neutral100)] md:text-[30px]">
                Auto Deposit History
              </h1>
              <p className="mt-1 text-[13px] font-medium text-[var(--text-muted)]">
                Payment records, bonus, credited amount, turnover and footprint.
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Paid"
          amount={summary.paidAmount}
          count={summary.paidCount}
          color="var(--status-success)"
          icon={<CircleCheck size={22} />}
        />
        <SummaryCard
          title="Total Pending"
          amount={summary.pendingAmount}
          count={summary.pendingCount}
          color="var(--status-pending)"
          icon={<Clock size={22} />}
        />
        <SummaryCard
          title="Total Failed"
          amount={summary.failedAmount}
          count={summary.failedCount}
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
              placeholder="Search userId / phone / invoice / transaction"
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
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
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
          <Receipt size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No records found
          </p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {[
                  "Invoice",
                  "User",
                  "Deposit",
                  "Bonus",
                  "Credited",
                  "Turnover",
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
              {rows.map((item) => {
                const isOpen = expanded === item._id;
                const st = tone(item.status);
                const bonusTitle =
                  item?.selectedBonus?.title?.en ||
                  item?.selectedBonus?.title?.bn ||
                  "No Bonus";
                const bonusType = item?.selectedBonus?.bonusType || "";
                const bonusScope = item?.selectedBonus?.bonusScope || "";

                return (
                  <React.Fragment key={item._id}>
                    <tr className="border-b border-white/[0.05] hover:bg-white/[0.03]">
                      <td className="break-all px-5 py-4 text-[13px] font-bold text-[var(--neutral100)]">
                        {item.invoiceNumber || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-[var(--primary500)]" />
                          <UserLink user={item.user} name={item.user?.userId || item.userIdText} />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                          <Phone size={12} />
                          {item.user?.phone || "—"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[14px] font-extrabold text-[var(--primary500)]">
                        {money(item.amount)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--neutral100)]">
                          {bonusType === "percent" ? (
                            <Percent size={13} className="text-[var(--primary500)]" />
                          ) : (
                            <Gift size={13} className="text-[var(--primary500)]" />
                          )}
                          {bonusTitle}
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                          +{money(item?.calc?.bonusAmount || 0)}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/20 px-2 py-[1px] text-[10px] font-bold text-[var(--text-muted)]">
                          <Target size={9} />
                          {bonusScope === "first-deposit"
                            ? "First Deposit"
                            : bonusScope === "all-time"
                              ? "All Time"
                              : "No Scope"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[14px] font-extrabold text-[var(--status-success)]">
                        {money(item?.calc?.creditedAmount || item.amount)}
                      </td>

                      <td className="px-5 py-4 text-[13px] text-[var(--text-secondary)]">
                        x{Number(item?.calc?.turnoverMultiplier ?? 1)} /{" "}
                        {money(item?.calc?.targetTurnover ?? item.amount)}
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
                          {String(item.status || "PENDING").toUpperCase()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {item.footprint ? (
                            <a
                              href={item.footprint}
                              target="_blank"
                              rel="noreferrer"
                              className="ad-btn ad-btn--ghost ad-btn--sm"
                              title="Open gateway footprint"
                            >
                              <ExternalLink size={13} />
                              Footprint
                            </a>
                          ) : (
                            <span className="text-[12px] text-[var(--text-disabled)]">
                              No link
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? "" : item._id)}
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
                                Payment
                              </div>
                              <FieldRow k="Invoice" v={item.invoiceNumber || "—"} />
                              <FieldRow k="Deposit" v={money(item.amount)} />
                              <FieldRow k="Method" v={item.bank || "—"} />
                              <FieldRow k="Status" v={item.status || "—"} />
                              <FieldRow
                                k="Paid At"
                                v={
                                  item.paidAt
                                    ? new Date(item.paidAt).toLocaleString()
                                    : "—"
                                }
                              />
                            </div>

                            <div className="rounded-[16px] border border-white/[0.08] bg-black/20 p-4">
                              <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[var(--primary500)]">
                                <Gift size={14} />
                                Bonus & Turnover
                              </div>
                              <FieldRow k="Bonus Title" v={bonusTitle} />
                              <FieldRow k="Bonus Type" v={bonusType || "none"} />
                              <FieldRow k="Bonus Scope" v={bonusScope || "none"} />
                              <FieldRow
                                k="Bonus Amount"
                                v={money(item?.calc?.bonusAmount || 0)}
                              />
                              <FieldRow
                                k="Credited"
                                v={money(item?.calc?.creditedAmount || item.amount)}
                              />
                              <FieldRow
                                k="Target Turnover"
                                v={money(item?.calc?.targetTurnover || item.amount)}
                              />
                            </div>

                            <div className="rounded-[16px] border border-white/[0.08] bg-black/20 p-4">
                              <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[var(--primary500)]">
                                <Receipt size={14} />
                                Transaction
                              </div>
                              <FieldRow
                                k="Transaction ID"
                                v={item.transactionId || "—"}
                              />
                              <FieldRow k="Session Code" v={item.sessionCode || "—"} />
                              <FieldRow
                                k="Balance Added"
                                v={item.balanceAdded ? "YES" : "NO"}
                              />
                              <FieldRow
                                k="Footprint"
                                v={
                                  item.footprint ? (
                                    <a
                                      href={item.footprint}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[var(--primary500)] underline underline-offset-2"
                                    >
                                      Open
                                    </a>
                                  ) : (
                                    "—"
                                  )
                                }
                              />
                            </div>

                            <div className="rounded-[16px] border border-white/[0.08] bg-black/20 p-4">
                              <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-[var(--primary500)]">
                                <Coins size={14} />
                                User
                              </div>
                              <FieldRow
                                k="User ID"
                                v={item.user?.userId || item.userIdText || "—"}
                              />
                              <FieldRow k="Phone" v={item.user?.phone || "—"} />
                              <FieldRow k="Role" v={item.user?.role || "user"} />
                              <FieldRow
                                k="When"
                                v={new Date(item.createdAt).toLocaleString()}
                              />
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
    </div>
  );
};

export default AutoDepositHistory;
