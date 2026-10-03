import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Check,
  CircleCheck,
  Clock,
  Loader2,
  Receipt,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { api } from "../../api/axios";
import {
  HistoryHeader,
  Pager,
  StatCard,
  taka,
  UserCell,
} from "../../components/HistoryBits/HistoryBits";
import ProviderChips from "../../components/ProviderPicker/ProviderChips";

const fetchRequests = async (status, q, page) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
  });

  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);

  const { data } = await api.get(`/api/deposit-requests/admin?${params}`);
  return data?.data || { requests: [], summary: {} };
};

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const STATUS_COLOR = {
  pending: "var(--status-pending)",
  approved: "var(--status-success)",
  rejected: "var(--status-danger)",
};

const Row = ({ label, children, strong }) => (
  <div className="flex items-baseline justify-between gap-4 py-1">
    <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
    <span
      className={`break-all text-right ${
        strong
          ? "text-[18px] font-black text-[var(--primary500)]"
          : "text-[14px] font-semibold text-[var(--neutral100)]"
      }`}
    >
      {children}
    </span>
  </div>
);

/**
 * ডিপোজিট রিকোয়েস্ট।
 *
 * বোনাস ও টার্নওভারের হিসাব ব্যবহারকারী জমা দেওয়ার মুহূর্তেই বসে গেছে,
 * তাই এখানে কিছু গোনা হয় না — শুধু তথ্য মিলিয়ে হ্যাঁ বা না বলা হয়।
 */
const DepositRequests = () => {
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");

  // টাইপ করার সময় প্রতি অক্ষরে রিকোয়েস্ট না গিয়ে একটু থেমে যায়
  useEffect(() => {
    let alive = true;

    const timer = setTimeout(() => {
      fetchRequests(tab, search, page)
        .then((data) => {
          if (!alive) return;

          setRequests(data.requests || []);
          setSummary(data.summary || {});
      setMeta(data.meta || {});
          setMeta(data.meta || {});
        })
        .catch((error) =>
          toast.error(error?.response?.data?.message || "Failed to load"),
        )
        .finally(() => alive && setLoading(false));
    }, 300);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [tab, search, page]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchRequests(tab, search, page);

      setRequests(data.requests || []);
      setSummary(data.summary || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const review = async (action) => {
    if (action === "reject" && !note.trim()) {
      toast.error("Write why it is rejected — the player sees this");
      return;
    }

    try {
      setBusy(action);

      const { data } = await api.patch(
        `/api/deposit-requests/admin/${open._id}/${action}`,
        { adminNote: note.trim() },
      );

      toast.success(data?.message || "Done");
      setOpen(null);
      setNote("");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || `${action} failed`);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1150px]">
      <HistoryHeader
        title="Manual Deposit History"
        subtitle="Money players say they have sent — check, approve or reject."
        Icon={Receipt}
        onRefresh={load}
        loading={loading}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Pending"
          amount={taka(summary.pendingAmount)}
          count={summary.pending}
          color="var(--status-pending)"
          Icon={Clock}
        />
        <StatCard
          title="Approved"
          amount={taka(summary.approvedAmount)}
          count={summary.approved}
          color="var(--status-success)"
          Icon={CircleCheck}
        />
        <StatCard
          title="Rejected"
          amount={taka(summary.rejectedAmount)}
          count={summary.rejected}
          color="var(--status-danger)"
          Icon={XCircle}
        />
      </div>

      <div className="ad-card mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setLoading(true);
                setTab(item.key);
                setPage(1);
              }}
              className={`ad-btn ad-btn--sm ${
                tab === item.key ? "ad-btn--primary" : "ad-btn--ghost"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto min-w-[220px] flex-1 sm:flex-none">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]"
          />
          <input
            value={search}
            onChange={(e) => {
              setLoading(true);
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username or phone"
            style={{ paddingInlineStart: "38px" }}
            className="ad-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading requests…
        </div>
      ) : requests.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <Receipt size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            Nothing here
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            No {tab === "all" ? "" : tab} deposit request to show.
          </p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {[
                  "Player",
                  "Method",
                  "Amount",
                  "Bonus",
                  "Credited",
                  "When",
                  "Status",
                  "",
                ].map((head, index) => (
                  <th
                    key={`${head}-${index}`}
                    className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {requests.map((request) => (
                <tr
                  key={request._id}
                  className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <UserCell
                      user={request.user}
                      userId={request.display?.userId}
                    />
                  </td>

                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    {request.display?.methodName?.en || request.methodId}
                    <span className="ml-2 text-[11px] text-[var(--text-disabled)]">
                      {request.display?.channelTagText}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-[14px] text-[var(--neutral100)]">
                    {request.amount}
                  </td>

                  <td className="px-4 py-3 text-[13px] text-[var(--status-success)]">
                    {request.calc?.totalBonus || 0}
                  </td>

                  <td className="px-4 py-3 text-[14px] font-bold text-[var(--primary500)]">
                    {request.calc?.creditedAmount || request.amount}
                  </td>

                  <td className="px-4 py-3 text-[13px] text-[var(--text-muted)]">
                    {new Date(request.createdAt).toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-[2px] text-[11px] font-bold capitalize"
                      style={{
                        background: `color-mix(in srgb, ${
                          STATUS_COLOR[request.status]
                        }, transparent 88%)`,
                        color: STATUS_COLOR[request.status],
                      }}
                    >
                      {request.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(request);
                        setNote("");
                      }}
                      className="ad-btn ad-btn--ghost ad-btn--sm"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
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

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            className="ad-card ad-modal max-h-[86vh] w-full max-w-[560px] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-extrabold text-[var(--neutral100)]">
                  {open.user?.userId || open.display?.userId}
                </h2>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {open.display?.source || "User Deposit"} ·{" "}
                  {new Date(open.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(null)}
                className="ad-btn ad-btn--ghost ad-btn--sm"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── ব্যবহারকারী যা লিখেছে ── */}
            <div className="rounded-[14px] border border-white/[0.07] p-4">
              <Row label="Method">
                {open.display?.methodName?.en || open.methodId}
              </Row>

              <Row label="Channel">
                {open.display?.channelName?.en || open.channelId}{" "}
                {open.display?.channelTagText}
              </Row>

              {open.promoId && open.promoId !== "none" && (
                <Row label="Promotion">
                  {open.display?.promoName?.en || open.promoId}
                </Row>
              )}

              {open.display?.channelNumber && (
                <Row label="Sent to">{open.display.channelNumber}</Row>
              )}

              {Object.entries(open.fields || {}).map(([key, value]) => (
                <Row key={key} label={key}>
                  {String(value)}
                </Row>
              ))}
            </div>

            {/* ── হিসাব ── */}
            <div className="mt-3 rounded-[14px] border border-white/[0.07] p-4">
              <Row label="Deposit">{open.amount}</Row>

              <Row label={`Channel bonus (${open.calc?.channelPercent || 0}%)`}>
                {open.calc?.percentBonus || 0}
              </Row>

              {Number(open.calc?.promoBonus) > 0 && (
                <Row label="Promotion bonus">{open.calc.promoBonus}</Row>
              )}

              <div className="mt-2 border-t border-white/[0.07] pt-2">
                <Row label="Goes to balance" strong>
                  {open.calc?.creditedAmount || open.amount}
                </Row>

                <Row label={`Turnover (${open.calc?.turnoverMultiplier || 0}×)`}>
                  {open.calc?.targetTurnover || "none"}
                </Row>
              </div>

              {open.calc?.eligibleProviders?.length > 0 && (
                <Row label="Eligible providers">
                  <ProviderChips list={open.calc.eligibleProviders} />
                </Row>
              )}

              {Number(open.calc?.affiliateDepositCommission?.commissionAmount) >
                0 && (
                <Row label="Affiliate commission">
                  {open.calc.affiliateDepositCommission.affiliatorUserId} gets{" "}
                  {open.calc.affiliateDepositCommission.commissionAmount} (
                  {open.calc.affiliateDepositCommission.percent}%)
                </Row>
              )}
            </div>

            {open.status === "pending" ? (
              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <label className="ad-label" htmlFor="dr-note">
                    Note / reject reason
                  </label>
                  <textarea
                    id="dr-note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="ad-input h-auto py-3"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => review("approve")}
                    className="ad-btn ad-btn--primary flex-1"
                  >
                    {busy === "approve" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => review("reject")}
                    className="ad-btn ad-btn--danger flex-1"
                  >
                    {busy === "reject" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <X size={16} />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-[14px] border border-white/[0.07] p-4 text-[13px]">
                <p
                  className="font-bold"
                  style={{ color: STATUS_COLOR[open.status] }}
                >
                  <span className="capitalize">{open.status}</span>
                  {open.approvedAt || open.rejectedAt
                    ? ` on ${new Date(
                        open.approvedAt || open.rejectedAt,
                      ).toLocaleString()}`
                    : ""}
                  {open.approvedBy?.email || open.rejectedBy?.email
                    ? ` by ${open.approvedBy?.email || open.rejectedBy?.email}`
                    : ""}
                </p>

                {open.adminNote && (
                  <p className="mt-2 text-[var(--text-muted)]">{open.adminNote}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositRequests;
