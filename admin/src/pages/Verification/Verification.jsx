import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  BadgeCheck,
  Check,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { api } from "../../api/axios";
import { Pager, SummaryCards, UserCell } from "../../components/HistoryBits/HistoryBits";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const imageUrl = (url) =>
  !url ? "" : url.startsWith("http") ? url : `${API_URL}${url}`;

const fetchRows = async (status, q, page, role) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    role,
  });

  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);

  const { data } = await api.get(`/api/verification/admin?${params}`);
  return data?.data || { rows: [], meta: {}, counts: {} };
};

const when = (value) => (value ? new Date(value).toLocaleString() : "—");

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

const DOC_LABEL = {
  nid: "NID",
  passport: "Passport",
  driving: "Driving licence",
};

/**
 * পরিচয় যাচাইয়ের আবেদন।
 *
 * কাগজপত্র দেখে অ্যাডমিন অনুমোদন বা বাতিল করেন। বাতিল করতে কারণ
 * লিখতেই হয় — নইলে ব্যবহারকারী জানবেন না কী ঠিক করতে হবে, আর একই
 * ভুল নিয়ে বারবার পাঠাতে থাকবেন।
 *
 * উপরে সুইচ দুটো ঠিক করে দেয় যাচাই ছাড়া ডিপোজিট/উইথড্র করা যাবে
 * কিনা। শুরুতে দুটোই বন্ধ — চালু করার দিনই পুরোনো সব ব্যবহারকারী যেন
 * আটকে না যান।
 */
const Verification = ({ kind = "users" }) => {
  const affiliate = kind === "affiliates";
  const role = affiliate ? "aff-user" : "user";

  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const [setting, setSetting] = useState(null);
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    api
      .get("/api/verification/admin/setting")
      .then(({ data }) => setSetting(data?.data?.setting || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;

    const timer = setTimeout(() => {
      fetchRows(tab, search, page, role)
        .then((data) => {
          if (!alive) return;

          setRows(data.rows || []);
          setMeta(data.meta || {});
          setCounts(data.counts || {});
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
  }, [tab, search, page, role]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchRows(tab, search, page, role);

      setRows(data.rows || []);
      setMeta(data.meta || {});
      setCounts(data.counts || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (key) => {
    try {
      setBusy(key);

      const { data } = await api.put("/api/verification/admin/setting", {
        [key]: !setting?.[key],
      });

      setSetting(data?.data?.setting || null);
      toast.success("Saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const review = async (row, action) => {
    if (action === "reject" && !note.trim()) {
      toast.error("Please say why it was rejected");
      return;
    }

    try {
      setBusy(row._id);

      await api.patch(`/api/verification/admin/${row._id}/${action}`, {
        note: note.trim(),
      });

      toast.success(action === "approve" ? "Approved" : "Rejected");
      setOpen(null);
      setNote("");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            {affiliate ? "Affiliate Verification" : "Identity Verification"}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Check the documents {affiliate ? "affiliates" : "players"} send in,
            then approve or reject.
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

      {/* ── কোথায় বাধ্যতামূলক ── */}
      <div className="ad-card mb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[var(--primary500)]/25 bg-[var(--primary500)]/10 text-[var(--primary500)]">
            <ShieldCheck size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              Where verification is required
            </h2>

            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              {affiliate
                ? "Affiliates do not deposit — they take commission out, so only the withdraw gate applies. Turning it on immediately blocks every affiliate who has not been verified yet."
                : "Both are off to begin with — turning one on immediately blocks every player who has not been verified yet."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {(affiliate
                ? [["affiliateRequireForWithdraw", "Before withdraw"]]
                : [
                    ["requireForDeposit", "Before deposit"],
                    ["requireForWithdraw", "Before withdraw"],
                  ]
              ).map(([key, label]) => {
                const on = Boolean(setting?.[key]);

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!setting || Boolean(busy)}
                    onClick={() => toggle(key)}
                    className={`ad-btn ad-btn--sm ${
                      on ? "ad-btn--primary" : "ad-btn--ghost"
                    }`}
                  >
                    {busy === key ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {label}: {on ? "required" : "off"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <SummaryCards
        columns={3}
        items={[
          ["Waiting", counts.pending ?? 0, "var(--status-pending)"],
          ["Approved", counts.approved ?? 0, "var(--status-success)"],
          ["Rejected", counts.rejected ?? 0, "var(--status-danger)"],
        ]}
      />

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
            placeholder="Username, name or document number"
            style={{ paddingInlineStart: "38px" }}
            className="ad-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <BadgeCheck size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            Nothing here
          </p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {[
                  "Sent",
                  "Player",
                  "Name",
                  "Document",
                  "Status",
                  "Reviewed",
                  "",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-3 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row._id}
                  className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-3 text-[12px] text-[var(--text-muted)]">
                    {when(row.submittedAt || row.createdAt)}
                  </td>

                  <td className="px-3 py-3">
                    <UserCell user={row.user} userId={row.userIdText} />
                  </td>

                  <td className="px-3 py-3 text-[13px] text-[var(--text-primary)]">
                    {row.fullName}
                  </td>

                  <td className="px-3 py-3 text-[12px]">
                    <p className="font-semibold text-[var(--text-secondary)]">
                      {DOC_LABEL[row.documentType] || row.documentType}
                    </p>
                    <p className="mt-0.5 break-all text-[var(--text-disabled)]">
                      {row.documentNumber}
                    </p>
                  </td>

                  <td
                    className="px-3 py-3 text-[12px] font-bold uppercase"
                    style={{ color: STATUS_COLOR[row.status] }}
                  >
                    {row.status}
                  </td>

                  <td className="px-3 py-3 text-[12px] text-[var(--text-muted)]">
                    {row.reviewedAt ? when(row.reviewedAt) : "—"}
                    {row.reviewNote ? (
                      <p className="mt-0.5 text-[var(--status-danger)]">
                        {row.reviewNote}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(row);
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

      {/* ── কাগজপত্র দেখা ও সিদ্ধান্ত ── */}
      {open ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <div className="ad-card w-full max-w-[720px]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-extrabold text-[var(--neutral100)]">
                  {open.fullName}
                </h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  {open.userIdText} ·{" "}
                  {DOC_LABEL[open.documentType] || open.documentType} ·{" "}
                  {open.documentNumber}
                </p>
                {open.dateOfBirth ? (
                  <p className="mt-1 text-[12px] text-[var(--text-disabled)]">
                    Born {String(open.dateOfBirth).slice(0, 10)}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="close"
                className="cursor-pointer text-[var(--text-muted)] transition hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["frontImage", "Front"],
                ["backImage", "Back"],
                ["selfieImage", "Selfie"],
              ].map(([key, label]) =>
                open[key] ? (
                  <a
                    key={key}
                    href={imageUrl(open[key])}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-[12px] border border-white/[0.07]"
                  >
                    <img
                      src={imageUrl(open[key])}
                      alt={label}
                      className="h-[150px] w-full bg-black/30 object-contain"
                    />
                    <p className="py-2 text-center text-[12px] text-[var(--text-muted)]">
                      {label}
                    </p>
                  </a>
                ) : null,
              )}
            </div>

            {open.status === "pending" ? (
              <>
                <label className="ad-label mt-4" htmlFor="verify-note">
                  Note (required when rejecting)
                </label>

                <input
                  id="verify-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. the photo is blurry, please send it again"
                  className="ad-input"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => review(open, "approve")}
                    className="ad-btn ad-btn--primary ad-btn--sm"
                  >
                    {busy === open._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => review(open, "reject")}
                    className="ad-btn ad-btn--danger ad-btn--sm"
                  >
                    <X size={14} />
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-[13px] text-[var(--text-muted)]">
                Already {open.status}
                {open.reviewNote ? ` — ${open.reviewNote}` : ""}.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Verification;
