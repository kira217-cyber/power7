import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Check, Loader2, RefreshCw, Scale, Search } from "lucide-react";

import { api } from "../../api/axios";

const fetchRows = async (q, page) => {
  const params = new URLSearchParams({ page: String(page), limit: "20" });

  if (q) params.set("q", q);

  const { data } = await api.get(`/api/admin/bulk-adjustment/users?${params}`);
  return data?.data || { users: [], meta: {}, totals: {} };
};

const money = (value) => Number(value || 0).toFixed(2);

const netColor = (value) =>
  value > 0
    ? "var(--status-success)"
    : value < 0
      ? "var(--status-danger)"
      : "var(--text-muted)";

/**
 * কমিশনের হিসাব মেলানো।
 *
 * অ্যাফিলিয়েটের জমে থাকা কমিশন তাঁর মূল ব্যালেন্সে বসিয়ে বাকেটগুলো
 * শূন্য করা হয়। রেফার, ডিপোজিট আর গেম-হারের কমিশন তাঁর পাওনা; রেফার
 * করা প্লেয়াররা যা জিতেছে তার ভাগ তাঁর দেনা — তাই
 * net = (refer + deposit + loss) − win, যা ঋণাত্মকও হতে পারে।
 */
const BulkAdjustment = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  // টাইপ করার সময় প্রতি অক্ষরে রিকোয়েস্ট না গিয়ে একটু থেমে যায়
  useEffect(() => {
    let alive = true;

    const timer = setTimeout(() => {
      fetchRows(search, page)
        .then((data) => {
          if (!alive) return;

          setRows(data.users || []);
          setMeta(data.meta || {});
          setTotals(data.totals || {});
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
  }, [search, page]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchRows(search, page);

      setRows(data.users || []);
      setMeta(data.meta || {});
      setTotals(data.totals || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const settleOne = async (row) => {
    if (
      !window.confirm(
        `Settle ${money(row.preview.net)} into ${row.userId}'s balance? This cannot be undone.` +
          (row.preview.net < 0 ? " If the balance is short, the rest stays owed as game-win commission." : ""),
      )
    ) {
      return;
    }

    try {
      setBusy(row._id);
      const { data } = await api.post(`/api/admin/bulk-adjustment/adjust/${row._id}`);

      toast.success(data?.message || "Settled");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed");
    } finally {
      setBusy("");
    }
  };

  const settleAll = async () => {
    const scope = search ? `matching "${search}"` : "every affiliate";

    if (
      !window.confirm(
        `Settle ${scope}? Net ${money(totals.net)} will move into their balances. This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setBusy("all");
      const { data } = await api.post("/api/admin/bulk-adjustment/adjust-all", {
        q: search,
      });

      const result = data?.data || {};

      // ঋণাত্মক নেট যতটুকু ব্যালেন্সে কুলায়নি, সেটা পরের বারের জন্য থেকে যায়
      const extra = Number(result.carried) > 0 ? ` — ${money(result.carried)} owed carried forward` : "";
      toast.success(
        `Settled ${result.settled ?? 0} (${money(result.applied)})${extra}` +
          (result.failed ? `, ${result.failed} changed meanwhile — refresh and retry` : ""),
      );
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1150px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            Bulk Adjustment
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Move earned commission into affiliates&apos; spendable balance.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            disabled={Boolean(busy) || !totals.pending}
            onClick={settleAll}
            className="ad-btn ad-btn--primary ad-btn--sm"
          >
            {busy === "all" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Scale size={15} />
            )}
            Settle all
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Waiting", totals.pending, "var(--status-pending)"],
          ["Gross", money(totals.gross), "var(--text-primary)"],
          ["Net to pay", money(totals.net), netColor(Number(totals.net))],
        ].map(([label, value, color]) => (
          <div key={label} className="ad-card py-4">
            <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-[24px] font-black" style={{ color }}>
              {value ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="ad-card mb-4">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]"
          />
          <input
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
              // খোঁজা বদলালে আবার প্রথম পাতা থেকেই শুরু
              setPage(1);
            }}
            placeholder="Search affiliates — settle all only touches what matches"
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
          <Scale size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No affiliate here
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            Nothing matches this search.
          </p>
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {[
                  "Affiliate",
                  "Balance",
                  "Refer",
                  "Deposit",
                  "Game loss",
                  "Game win",
                  "Net",
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
              {rows.map((row) => {
                const nothing =
                  row.preview.gross === 0 && row.preview.gameWin === 0;

                return (
                  <tr
                    key={row._id}
                    className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-[14px] font-semibold text-[var(--neutral100)]">
                      {row.userId}
                      {row.username && row.username !== row.userId && (
                        <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">@{row.username}</span>
                      )}
                      <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">
                        {row.phone}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[14px] text-[var(--primary500)]">
                      {money(row.balance)}
                    </td>

                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                      {money(row.preview.refer)}
                    </td>

                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                      {money(row.preview.deposit)}
                    </td>

                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                      {money(row.preview.gameLoss)}
                    </td>

                    <td className="px-4 py-3 text-[13px] text-[var(--status-danger)]">
                      {/* শূন্যের আগে বিয়োগ চিহ্ন বসালে "−0.00" দেখাত */}
                      {row.preview.gameWin > 0 ? "−" : ""}
                      {money(row.preview.gameWin)}
                    </td>

                    <td
                      className="px-4 py-3 text-[14px] font-bold"
                      style={{ color: netColor(row.preview.net) }}
                    >
                      {money(row.preview.net)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={nothing || Boolean(busy)}
                        onClick={() => settleOne(row)}
                        className="ad-btn ad-btn--ghost ad-btn--sm"
                      >
                        {busy === row._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Settle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        &quot;Settle all&quot; only touches the affiliates the search above is
        showing, and skips anyone with nothing pending.
      </p>
    </div>
  );
};

export default BulkAdjustment;
