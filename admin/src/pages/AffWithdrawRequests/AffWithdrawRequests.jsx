import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Handshake, Loader2, RefreshCw, Search, X } from "lucide-react";

import { api } from "../../api/axios";
import { UserCell } from "../../components/HistoryBits/HistoryBits";

const fetchRequests = async (status, q, page) => {
  const params = new URLSearchParams({ page: String(page), limit: "20" });

  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);

  const { data } = await api.get(`/api/aff-withdraw/admin?${params}`);
  return data?.data || { requests: [], summary: {}, meta: {} };
};

const money = (value) => Number(value || 0).toFixed(2);

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
 * অ্যাফিলিয়েটের টাকা তোলার আবেদন — খেলোয়াড়ের থেকে আলাদা তালিকা।
 *
 * খেলোয়াড় সেভ করা নম্বরে টাকা নেন, তাই ওখানে দেখার মতো একটাই জিনিস।
 * অ্যাফিলিয়েট ব্যাংকে নেন, আর কোন ঘরগুলো চাওয়া হয়েছিল সেটা অ্যাডমিনই
 * ঠিক করে দিয়েছেন — তাই এখানে আবেদনের সাথে তুলে রাখা নাম ধরেই
 * সবগুলো ঘর দেখানো হয়। উপায়টা পরে বদলে গেলেও পুরোনো আবেদন যেমন ছিল
 * তেমনই থাকে।
 *
 * টাকাটা আবেদনের সময়েই কেটে রাখা, তাই অনুমোদন মানে "পাঠিয়ে দিয়েছি";
 * বাতিল করলে ব্যালেন্সে ফেরত যায় বলে কারণ লেখা বাধ্যতামূলক।
 */
const AffWithdrawRequests = () => {
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;

    const timer = setTimeout(() => {
      fetchRequests(tab, search, page)
        .then((data) => {
          if (!alive) return;

          setRequests(data.requests || []);
          setSummary(data.summary || {});
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
      setMeta(data.meta || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const review = async (action) => {
    if (action === "reject" && !note.trim()) {
      toast.error("Write why it is rejected — the affiliate sees this");
      return;
    }

    try {
      setBusy(action);

      const { data } = await api.patch(
        `/api/aff-withdraw/admin/${open._id}/${action}`,
        { note: note.trim() },
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

  /** আবেদনের সাথে তুলে রাখা নাম — উপায় বদলালেও পুরোনোটা ঠিক থাকে */
  const labelOf = (request, key) => {
    const field = (request.methodSnapshot?.fields || []).find(
      (item) => item.key === key,
    );

    return field?.label?.en || field?.label?.bn || key;
  };

  const totalPages = Math.ceil((meta.total || 0) / (meta.limit || 20)) || 1;

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            Affiliate Withdraws
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Money affiliates want to take out of their commission.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ad-btn ad-btn--ghost ad-btn--sm"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {["pending", "approved", "rejected"].map((key) => (
          <div key={key} className="ad-card py-4">
            <p className="text-[13px] capitalize text-[var(--text-muted)]">
              {key}
            </p>
            <p
              className="mt-1 text-[24px] font-black"
              style={{ color: STATUS_COLOR[key] }}
            >
              {summary[key] ?? 0}
            </p>
          </div>
        ))}

        <div className="ad-card py-4">
          <p className="text-[13px] text-[var(--text-muted)]">Amount shown</p>
          <p className="mt-1 text-[24px] font-black text-[var(--primary500)]">
            {money(summary.amount)}
          </p>
        </div>
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

        <div className="relative ml-auto min-w-[240px] flex-1 sm:flex-none">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]"
          />
          <input
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by affiliate username"
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
          <Handshake size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            Nothing here
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            No {tab === "all" ? "" : tab} affiliate withdraw to show.
          </p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {[
                  "Affiliate",
                  "Method",
                  "Details",
                  "Amount",
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
                    <UserCell user={request.user} userId={request.userIdText} />
                  </td>

                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    {request.methodSnapshot?.name?.en || request.methodId}
                  </td>

                  <td className="max-w-[260px] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
                    {Object.keys(request.fields || {}).length === 0
                      ? "—"
                      : Object.entries(request.fields).map(([key, value]) => (
                          <span key={key} className="block truncate">
                            {labelOf(request, key)}: {value}
                          </span>
                        ))}
                  </td>

                  <td className="px-4 py-3 text-[14px] font-bold text-[var(--primary500)]">
                    {money(request.amount)}
                  </td>

                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-[var(--text-muted)]">
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

      {meta.total > (meta.limit || 20) && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => {
              setLoading(true);
              setPage((prev) => prev - 1);
            }}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            Previous
          </button>

          <span className="text-[13px] text-[var(--text-muted)]">
            {meta.page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => {
              setLoading(true);
              setPage((prev) => prev + 1);
            }}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            Next
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            className="ad-card max-h-[86vh] w-full max-w-[520px] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-extrabold text-[var(--neutral100)]">
                  {open.user?.userId || open.userIdText}
                </h2>
                <p className="text-[13px] text-[var(--text-muted)]">
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

            <div className="rounded-[14px] border border-white/[0.07] p-4">
              <Row label="Method">
                {open.methodSnapshot?.name?.en || open.methodId}
              </Row>

              {/* অ্যাফিলিয়েট যা যা ভরেছেন */}
              {Object.entries(open.fields || {}).map(([key, value]) => (
                <Row key={key} label={labelOf(open, key)}>
                  {value}
                </Row>
              ))}

              <div className="mt-2 border-t border-white/[0.07] pt-2">
                <Row label="Amount" strong>
                  {money(open.amount)} {open.currency}
                </Row>

                <Row label="Balance before">{money(open.balanceBefore)}</Row>
                <Row label="Balance after">{money(open.balanceAfter)}</Row>
              </div>
            </div>

            {open.status === "pending" ? (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-[12px] text-[var(--text-disabled)]">
                  The money is already held out of the affiliate&apos;s balance.
                  Approving records that you sent it; rejecting puts it back.
                </p>

                <div>
                  <label className="ad-label" htmlFor="awr-note">
                    Note / reject reason
                  </label>
                  <textarea
                    id="awr-note"
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Sent via bank transfer · or why it was rejected"
                    className="ad-input h-auto py-3"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => review("approve")}
                    className="ad-btn ad-btn--primary flex-1"
                  >
                    {busy === "approve" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
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
                    ) : null}
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[14px] border border-white/[0.07] p-4">
                <Row label="Reviewed">
                  <span
                    className="capitalize"
                    style={{ color: STATUS_COLOR[open.status] }}
                  >
                    {open.status}
                  </span>
                </Row>

                {open.adminNote ? (
                  <Row label="Note">{open.adminNote}</Row>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AffWithdrawRequests;
