import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, RefreshCw, Save, Search } from "lucide-react";

import { api } from "../../api/axios";
import { Pager } from "../../components/HistoryBits/HistoryBits";
import { Field, Loading, PageHead } from "../SiteContent/bits";
import { errorOf } from "../SiteContent/helpers";

const DAYS = 7;
const money = (value) => `৳ ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Stat = ({ label, value }) => (
  <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-3">
    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
    <p className="mt-1 text-[20px] font-black text-[var(--neutral100)]">{value}</p>
  </div>
);

/**
 * ডেইলি বোনাস — ৭ দিনের টাকা, নিয়ম, আর কে কবে কত পেল।
 *
 * খেলোয়াড় "দাবি করা" পাতা থেকে প্রতিদিন (বাংলাদেশ সময় রাত ১২টায় নতুন দিন)
 * সেই দিনের টাকা একবার নেন। কোনো দিন না নিলে সেটা চলে যায়, পরের দিন পরের
 * দিনেরটা; ৭ দিন পেরোলে আবার দিন ১।
 */
const DailyBonus = () => {
  const [form, setForm] = useState(null);
  const [stats, setStats] = useState({});
  const [busy, setBusy] = useState(false);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [paid, setPaid] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ q: "", dayNo: "", date: "" });
  const [listBusy, setListBusy] = useState(false);

  const applySetting = useCallback((data) => {
    const s = data?.data?.setting || {};
    setForm({
      enabled: s.enabled === true,
      title: s.title || { bn: "", en: "" },
      rules: s.rules || { bn: "", en: "" },
      days: Array.from({ length: DAYS }, (_, i) => String(s.days?.[i] ?? 0)),
      turnoverMultiplier: String(s.turnoverMultiplier ?? 1),
      minTotalDeposit: String(s.minTotalDeposit ?? 0),
    });
    setStats(data?.data?.stats || {});
  }, []);

  const loadSetting = useCallback(
    () =>
      api
        .get("/api/daily-bonus/admin/setting")
        .then(({ data }) => applySetting(data))
        .catch((err) => toast.error(errorOf(err, "Failed to load"))),
    [applySetting],
  );

  // তালিকা আনা — অবস্থা বসে উত্তরের পরে (effect এর ভিতরে সরাসরি নয়)
  const fetchClaims = useCallback(
    () =>
      api
        .get("/api/daily-bonus/admin/claims", { params: { page, limit: 20, ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) } })
        .then(({ data }) => {
          setRows(data?.data?.claims || []);
          setMeta(data?.data?.meta || {});
          setPaid(data?.data?.paid || 0);
        })
        .catch((err) => toast.error(errorOf(err, "Failed to load claims")))
        .finally(() => setListBusy(false)),
    [page, filter],
  );

  const loadClaims = () => {
    setListBusy(true);
    fetchClaims();
  };

  useEffect(() => {
    loadSetting();
  }, [loadSetting]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  if (!form) return <Loading />;

  const set = (key, value) => setForm((v) => ({ ...v, [key]: value }));
  const setDay = (i, value) => set("days", form.days.map((d, j) => (j === i ? value : d)));
  const weekTotal = form.days.reduce((sum, d) => sum + (Number(d) || 0), 0);

  const save = async () => {
    try {
      setBusy(true);
      await api.put("/api/daily-bonus/admin/setting", {
        ...form,
        days: form.days.map((d) => Number(d) || 0),
        turnoverMultiplier: Number(form.turnoverMultiplier) || 0,
        minTotalDeposit: Number(form.minTotalDeposit) || 0,
      });
      toast.success("Daily bonus saved");
      loadSetting();
    } catch (err) {
      toast.error(errorOf(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHead
        title="Daily Bonus"
        subtitle="A 7-day cycle on the player's Claim page. Each day (new day at 12 AM Bangladesh time) a player claims that day's amount once. A missed day is gone — the next day gives the next day's amount. After day 7 it starts again from day 1."
      >
        <button type="button" disabled={busy} onClick={save} className="ad-btn ad-btn--primary ad-btn--sm">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
        </button>
      </PageHead>

      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Claims today" value={stats.todayClaims ?? 0} />
        <Stat label="Paid today" value={money(stats.todayPaid)} />
        <Stat label="All claims" value={stats.totalClaims ?? 0} />
        <Stat label="All paid" value={money(stats.totalPaid)} />
        <Stat label="Players" value={stats.players ?? 0} />
      </div>

      <div className="ad-card mb-5 grid gap-4">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-[14px] font-semibold text-[var(--neutral100)]">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Daily bonus is on
          <span className="text-[12px] font-normal text-[var(--text-muted)]">(off = hidden from players)</span>
        </label>

        <div>
          <p className="ad-label">Amount for each day (৳)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {form.days.map((value, i) => (
              <Field key={i} label={`Day ${i + 1}`}>
                <input type="number" min={0} className="ad-input" value={value} onChange={(e) => setDay(i, e.target.value)} />
              </Field>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-disabled)]">
            0 = nothing that day. A player who claims all 7 days gets <b className="text-[var(--primary500)]">{money(weekTotal)}</b> per cycle.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Turnover multiplier" hint="The player must bet this many times the bonus before withdrawing it. 0 = no condition.">
            <input type="number" min={0} step="0.5" className="ad-input" value={form.turnoverMultiplier} onChange={(e) => set("turnoverMultiplier", e.target.value)} />
          </Field>
          <Field label="Minimum total deposit to claim (৳)" hint="Stops new empty accounts from collecting bonuses. 0 = anyone can claim.">
            <input type="number" min={0} className="ad-input" value={form.minTotalDeposit} onChange={(e) => set("minTotalDeposit", e.target.value)} />
          </Field>
          {["bn", "en"].map((lng) => (
            <Field key={`t${lng}`} label={`Title (${lng === "bn" ? "বাংলা" : "English"})`}>
              <input className="ad-input" value={form.title[lng] || ""} onChange={(e) => set("title", { ...form.title, [lng]: e.target.value })} />
            </Field>
          ))}
          {["bn", "en"].map((lng) => (
            <Field key={`r${lng}`} label={`Rules (${lng === "bn" ? "বাংলা" : "English"}) — shown behind the "Rules" button`}>
              <textarea rows={5} className="ad-input" style={{ minHeight: 130 }} value={form.rules[lng] || ""} onChange={(e) => set("rules", { ...form.rules, [lng]: e.target.value })} />
            </Field>
          ))}
        </div>
      </div>

      {/* কে কবে কত পেল */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <h2 className="mr-auto text-[16px] font-extrabold text-[var(--neutral100)]">
          Claims <span className="text-[13px] font-semibold text-[var(--text-muted)]">· {meta.total ?? 0} · paid {money(paid)}</span>
        </h2>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={filter.q}
            onChange={(e) => {
              setPage(1);
              setFilter((f) => ({ ...f, q: e.target.value.trim() }));
            }}
            placeholder="Username"
            className="ad-input"
            style={{ paddingInlineStart: 34, width: 180 }}
          />
        </div>
        <select
          className="ad-input"
          style={{ width: 120 }}
          value={filter.dayNo}
          onChange={(e) => {
            setPage(1);
            setFilter((f) => ({ ...f, dayNo: e.target.value }));
          }}
        >
          <option value="">All days</option>
          {Array.from({ length: DAYS }, (_, i) => (
            <option key={i} value={i + 1}>
              Day {i + 1}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="ad-input"
          style={{ width: 160 }}
          value={filter.date}
          onChange={(e) => {
            setPage(1);
            setFilter((f) => ({ ...f, date: e.target.value }));
          }}
        />
        <button type="button" onClick={loadClaims} disabled={listBusy} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={listBusy ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="ad-card ad-table-wrap ad-scroll p-0">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr>
              {["Player", "Day", "Amount", "Turnover", "Balance after", "Date (BD)", "Claimed at"].map((h) => (
                <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[var(--text-muted)]">
                  {listBusy ? "Loading…" : "No claims yet"}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="border-t border-white/[0.06]">
                  <td className="px-4 py-3 text-[14px] font-semibold text-[var(--neutral100)]">{row.userIdText}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">Day {row.dayNo}</td>
                  <td className="px-4 py-3 text-[13px] font-bold text-[var(--primary500)]">{money(row.amount)}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{row.turnoverRequired ? money(row.turnoverRequired) : "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{money(row.balanceAfter)}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{row.dayKey}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} totalPages={meta.totalPages} busy={listBusy} onChange={setPage} />
    </div>
  );
};

export default DailyBonus;
