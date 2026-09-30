import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";
import { RefreshCw, Search } from "lucide-react";

import { api } from "../../api/axios";
import UserTable from "./UserTable";

const fetchUsers = async (kind, status, q, page) => {
  const params = new URLSearchParams({ page: String(page), limit: "20" });

  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);

  const { data } = await api.get(`/api/admin/manage/${kind}?${params}`);
  return data?.data || { users: [], meta: {}, stats: {} };
};

const TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Disabled" },
];

/* অ্যাফিলিয়েটের বাড়তি ফিল্টার — কারা এখনো অনুমোদনের অপেক্ষায় */
const AFFILIATE_TABS = [
  ...TABS,
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
];

/**
 * প্লেয়ার ও অ্যাফিলিয়েটের তালিকা — `kind` দিয়ে কোনটা ঠিক হয়।
 *
 * দুটো পেজের কাজ একই (খোঁজা, ফিল্টার, খুলে দেখা ও বদলানো), শুধু
 * কমিশনের কলামগুলো অ্যাফিলিয়েটেই দেখায়।
 */
const UserList = ({ kind, title, subtitle }) => {
  const isAffiliate = kind === "affiliates";
  const navigate = useNavigate();

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // টাইপ করার সময় প্রতি অক্ষরে রিকোয়েস্ট না গিয়ে একটু থেমে যায়
  useEffect(() => {
    let alive = true;

    const timer = setTimeout(() => {
      fetchUsers(kind, tab, search, page)
        .then((data) => {
          if (!alive) return;

          setRows(data.users || []);
          setMeta(data.meta || {});
          setStats(data.stats || {});
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
  }, [kind, tab, search, page]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers(kind, tab, search, page);

      setRows(data.users || []);
      setMeta(data.meta || {});
      setStats(data.stats || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1150px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">{title}</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">{subtitle}</p>
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

      <div
        className={`mb-4 grid gap-3 ${
          isAffiliate ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {[
          ["Total", stats.total, "var(--primary500)"],
          ["Active", stats.active, "var(--status-success)"],
          ["Disabled", stats.inactive, "var(--status-danger)"],
          // অপেক্ষায় থাকা আবেদন চোখে না পড়লে কেউ দিনের পর দিন আটকে থাকতেন
          ...(isAffiliate
            ? [["Waiting review", stats.pending, "var(--status-pending)"]]
            : []),
        ].map(([label, value, color]) => (
          <div key={label} className="ad-card py-4">
            <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-[24px] font-black" style={{ color }}>
              {value ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="ad-card mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {(isAffiliate ? AFFILIATE_TABS : TABS).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setLoading(true);
                setTab(item.key);
                // ফিল্টার বদলালে আবার প্রথম পাতা থেকেই শুরু
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
            placeholder="Username, phone, email or referral code"
            style={{ paddingInlineStart: "38px" }}
            className="ad-input"
          />
        </div>
      </div>

      <UserTable
        rows={rows}
        loading={loading}
        showCommission={isAffiliate}
        onOpen={(row) => navigate(`/${kind}/${row._id}`)}
      />

      {meta.totalPages > 1 && (
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
            {meta.page} / {meta.totalPages}
          </span>

          <button
            type="button"
            disabled={page >= meta.totalPages || loading}
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
    </div>
  );
};

export default UserList;
