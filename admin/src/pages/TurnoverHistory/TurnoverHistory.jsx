import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { History, Loader2, RefreshCw, Search } from "lucide-react";

import { api } from "../../api/axios";
import { Pager, UserCell } from "../../components/HistoryBits/HistoryBits";
import ProviderChips from "../../components/ProviderPicker/ProviderChips";

const fetchTurnovers = async (status, source, q, page) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
  });

  if (status !== "all") params.set("status", status);
  if (source !== "all") params.set("sourceType", source);
  if (q) params.set("q", q);

  const { data } = await api.get(`/api/turnover/admin?${params}`);
  return data?.data || { turnovers: [], summary: {} };
};

const TABS = [
  { key: "running", label: "Running" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

const SOURCES = [
  { key: "all", label: "Every source" },
  { key: "deposit", label: "Deposit" },
  { key: "auto-deposit", label: "Auto deposit" },
  { key: "admin-manual-deposit", label: "Manual deposit" },
  { key: "register-bonus", label: "Register bonus" },
];

/**
 * সব টার্নওভারের ইতিহাস।
 *
 * প্রতিটা বোনাস বা ডিপোজিটের সাথে যে "এত টাকার খেলা খেলতে হবে" শর্তটা
 * আসে, তার অগ্রগতি এখানে দেখা যায় — কার কোন শর্ত কতদূর, এক জায়গায়।
 */
const TurnoverHistory = () => {
  const [tab, setTab] = useState("running");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [turnovers, setTurnovers] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const timer = setTimeout(() => {
      fetchTurnovers(tab, source, search, page)
        .then((data) => {
          if (!alive) return;

          setTurnovers(data.turnovers || []);
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
  }, [tab, source, search, page]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchTurnovers(tab, source, search, page);

      setTurnovers(data.turnovers || []);
      setSummary(data.summary || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            All Turnover History
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            How much play is still owed on each bonus and deposit.
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

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {["running", "completed"].map((key) => (
          <div key={key} className="ad-card py-4">
            <p className="text-[13px] capitalize text-[var(--text-muted)]">{key}</p>
            <p
              className="mt-1 text-[24px] font-black"
              style={{
                color:
                  key === "running"
                    ? "var(--status-pending)"
                    : "var(--status-success)",
              }}
            >
              {summary[key] ?? 0}
            </p>
          </div>
        ))}
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

        <select
          value={source}
          onChange={(e) => {
            setLoading(true);
            setSource(e.target.value);
            setPage(1);
          }}
          className="ad-input w-auto min-w-[170px]"
        >
          {SOURCES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>

        <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
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
            placeholder="Search by username"
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
      ) : turnovers.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <History size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            Nothing here
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            No turnover matches this filter.
          </p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {[
                  "Player",
                  "Source",
                  "Credited",
                  "Required",
                  "Progress",
                  "Providers",
                  "Status",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {turnovers.map((row) => (
                <tr
                  key={row._id}
                  className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <UserCell user={row.user} />
                  </td>

                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    {row.sourceType}
                  </td>

                  <td className="px-4 py-3 text-[14px] text-[var(--primary500)]">
                    {row.creditedAmount}
                  </td>

                  <td className="px-4 py-3 text-[14px] text-[var(--neutral100)]">
                    {row.required}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-[6px] w-[90px] overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--primary400)] to-[var(--primary600)]"
                          style={{ width: `${row.percent || 0}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-[var(--text-muted)]">
                        {row.percent || 0}%
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">
                    <ProviderChips list={row.eligibleProviders} />
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-[2px] text-[11px] font-bold capitalize"
                      style={{
                        background:
                          row.status === "completed"
                            ? "color-mix(in srgb, var(--status-success), transparent 88%)"
                            : "color-mix(in srgb, var(--status-pending), transparent 88%)",
                        color:
                          row.status === "completed"
                            ? "var(--status-success)"
                            : "var(--status-pending)",
                      }}
                    >
                      {row.status}
                    </span>
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

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        A turnover&apos;s rules are copied from the config when it is created, so
        changing a bonus later never rewrites one that is already running.
      </p>
    </div>
  );
};

export default TurnoverHistory;
