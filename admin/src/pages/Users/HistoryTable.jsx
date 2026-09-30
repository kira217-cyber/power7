import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { api } from "../../api/axios";
import { Pager } from "../../components/HistoryBits/HistoryBits";

/**
 * বিস্তারিত পেজের একেকটা ইতিহাসের অংশ।
 *
 * Bajiman এর single-user সেকশনগুলোর গড়ন ধরে: উপরে আইকন-শিরোনাম আর
 * রিফ্রেশ, তারপর সারাংশের কার্ড, তারপর খোঁজা ও ছাঁকনির সারি, তারপর
 * চওড়া টেবিল, সবার নিচে "মোট কতগুলো" আর পাতা বদলানো।
 *
 * প্রতিটা নিজের পাতা নিজে ঘোরায়, তাই একটা ইতিহাস ঘাঁটলে বাকিগুলো
 * আবার লোড হয় না। কোন কলাম কীভাবে দেখাবে সেটা `columns` বলে দেয়, আর
 * সারাংশের ঘরগুলো `summaryCards` — সার্ভার যে অঙ্কগুলো পাঠায় সেগুলো
 * থেকে বেছে নেওয়া হয়।
 */
const HistoryTable = ({
  title,
  icon,
  subtitle,
  userId,
  path,
  columns,
  primaryKeys,
  statuses,
  summaryCards,
  minWidth = 900,
}) => {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [summary, setSummary] = useState({});
  const [counts, setCounts] = useState({});

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [expandedId, setExpandedId] = useState("");

  // টাইপ করার সাথে সাথেই খোঁজা হয় না — Search চাপলে বা এন্টার দিলে
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");

  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const params = new URLSearchParams({ page: String(page), limit: "10" });

    if (status !== "all") params.set("status", status);
    if (query) params.set("q", query);

    api
      .get(`/api/admin/manage/${userId}/history/${path}?${params}`)
      .then(({ data }) => {
        if (!alive) return;

        setRows(data?.data?.rows || []);
        setMeta(data?.data?.meta || {});
        setSummary(data?.data?.summary || {});
        setCounts(data?.data?.counts || {});
        setExpandedId("");
      })
      .catch((error) =>
        toast.error(error?.response?.data?.message || `Failed to load ${title}`),
      )
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [userId, path, page, status, query, reload, title]);

  const refresh = () => {
    setLoading(true);
    setReload((prev) => prev + 1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setQuery(term.trim());
  };

  const clear = () => {
    setLoading(true);
    setTerm("");
    setQuery("");
    setStatus("all");
    setPage(1);
  };

  const cards = (summaryCards || []).map((card) => card(summary, counts));

  /*
   * ব্যবহারকারী-বান্ধব: টেবিলে শুধু জরুরি কলামগুলো (`primary`) দেখানো হয়,
   * বাকি সব তথ্য সারি খুললে পরিষ্কার লেবেল-মান জোড়ায় দেখা যায়। কোনো
   * কলামে `primary` না থাকলে আগের মতোই সব কলাম দেখায়।
   */
  const keySet = Array.isArray(primaryKeys) ? primaryKeys : [];
  const compactCols = keySet.length
    ? columns.filter((col) => keySet.includes(col.key))
    : columns;
  const hasDetail = compactCols.length < columns.length;
  const compactMinWidth = hasDetail ? Math.min(minWidth, 760) : minWidth;

  return (
    <div className="ad-card mt-4">
      {/* ── শিরোনাম ── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[var(--primary500)]/25 bg-[var(--primary500)]/10 text-[var(--primary500)]">
              {icon}
            </span>
          ) : null}

          <div>
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {title}
              {meta.total > 0 ? (
                <span className="ml-2 text-[13px] font-normal text-[var(--text-muted)]">
                  {meta.total}
                </span>
              ) : null}
            </h2>

            {subtitle ? (
              <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="ad-btn ad-btn--ghost ad-btn--sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── সারাংশ ── */}
      {cards.length ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[14px] border border-white/[0.07] bg-black/20 p-3"
            >
              <p className="text-[12px] text-[var(--text-muted)]">
                {card.label}
              </p>

              <p
                className="mt-1 text-[18px] font-black"
                style={{ color: card.tone || "var(--text-primary)" }}
              >
                {card.value}
              </p>

              {card.sub ? (
                <p className="mt-0.5 text-[11px] text-[var(--text-disabled)]">
                  {card.sub}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* ── খোঁজা ও ছাঁকনি ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statuses?.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setLoading(true);
              setStatus(item.key);
              setPage(1);
            }}
            className={`ad-btn ad-btn--sm ${
              status === item.key ? "ad-btn--primary" : "ad-btn--ghost"
            }`}
          >
            {item.label}
            {counts[item.key] !== undefined ? ` (${counts[item.key]})` : ""}
          </button>
        ))}

        <form
          onSubmit={submitSearch}
          className="ml-auto flex min-w-[220px] flex-1 items-center gap-2 sm:flex-none"
        >
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]"
            />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search…"
              style={{ paddingInlineStart: "34px" }}
              className="ad-input"
            />
          </div>

          {query || status !== "all" ? (
            <button
              type="button"
              onClick={clear}
              aria-label="clear"
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              <X size={14} />
            </button>
          ) : null}
        </form>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <Loader2 size={14} className="animate-spin" />
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[var(--text-disabled)]">Nothing yet.</p>
      ) : (
        <div className="ad-table-wrap ad-scroll">
          <table
            className="w-full border-collapse text-left"
            style={{ minWidth: `${compactMinWidth}px` }}
          >
            <thead>
              <tr className="border-b border-white/[0.07]">
                {compactCols.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {col.label}
                  </th>
                ))}
                {hasDetail ? (
                  <th className="px-3 py-2 text-right text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Details
                  </th>
                ) : null}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const isOpen = expandedId === row._id;

                return (
                  <React.Fragment key={row._id}>
                    <tr className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]">
                      {compactCols.map((col) => (
                        <td
                          key={col.key}
                          className="px-3 py-2.5 text-[13px] text-[var(--text-secondary)]"
                        >
                          {col.render(row)}
                        </td>
                      ))}

                      {hasDetail ? (
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isOpen ? "" : row._id)
                            }
                            className="ad-btn ad-btn--ghost ad-btn--sm"
                            aria-label="toggle details"
                          >
                            {isOpen ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </button>
                        </td>
                      ) : null}
                    </tr>

                    {hasDetail && isOpen ? (
                      <tr>
                        <td
                          colSpan={compactCols.length + 1}
                          className="bg-black/20 p-0"
                        >
                          <div className="grid grid-cols-1 gap-x-6 gap-y-1 p-4 sm:grid-cols-2 xl:grid-cols-3">
                            {columns.map((col) => (
                              <div
                                key={col.key}
                                className="flex items-start justify-between gap-4 border-b border-white/[0.05] py-2"
                              >
                                <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                                  {col.label}
                                </span>
                                <span className="break-all text-right text-[13px] font-semibold text-[var(--neutral100)]">
                                  {col.render(row)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
          <p className="text-[12px] text-[var(--text-muted)]">
            Total: {meta.total || 0} records
          </p>

          <Pager
            page={meta.page || 1}
            totalPages={meta.totalPages || 1}
            busy={loading}
            onChange={(next) => {
              setLoading(true);
              setPage(next);
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default HistoryTable;
