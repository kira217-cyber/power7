import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, MessageSquareWarning, RefreshCw, Search, Send, XCircle } from "lucide-react";

import { api } from "../../api/axios";
import { Pager } from "../../components/HistoryBits/HistoryBits";
import { Field, Loading, Modal, PageHead } from "../SiteContent/bits";
import { errorOf, imageUrl } from "../SiteContent/helpers";

const TYPES = {
  deposit: "Deposit (আমানত)",
  withdraw: "Withdraw (উত্তোলন)",
  game: "Game (খেলা)",
  service: "Customer service (গ্রাহক সেবা)",
  agent: "Agent application (এজেন্ট আবেদন)",
  other: "Other (অন্যান্য)",
};

const STATUS = {
  new: ["New", "--status-pending"],
  replied: ["Replied", "--status-success"],
  closed: ["Closed", "--text-disabled"],
};

const Pill = ({ status }) => {
  const [label, color] = STATUS[status] || STATUS.new;
  return (
    <span
      className="rounded-full px-2 py-[2px] text-[11px] font-bold"
      style={{ background: `color-mix(in srgb, var(${color}), transparent 86%)`, color: `var(${color})` }}
    >
      {label}
    </span>
  );
};

/**
 * খেলোয়াড়ের "অভিযোগ / পরামর্শ" — তালিকা, ছবি, উত্তর (খেলোয়াড়ের ইনবক্সে
 * যায়) আর বন্ধ করা।
 */
const Feedback = () => {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (search) params.set("q", search);
    api
      .get(`/api/feedback/admin?${params}`)
      .then(({ data }) => {
        if (!alive) return;
        setRows(data?.data?.feedback || []);
        setMeta(data?.data?.meta || {});
        setSummary(data?.data?.summary || {});
      })
      .catch((e) => toast.error(errorOf(e, "Failed to load")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, status, type, search, tick]);

  const reload = () => {
    setLoading(true);
    setTick((x) => x + 1);
  };

  const filter = (setter) => (e) => {
    setLoading(true);
    setPage(1);
    setter(e.target.value);
  };

  const save = async (body, ok) => {
    try {
      setBusy(true);
      await api.patch(`/api/feedback/admin/${open._id}`, body);
      toast.success(ok);
      setOpen(null);
      reload();
    } catch (err) {
      toast.error(errorOf(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHead title="Feedback" subtitle="Complaints and suggestions from players (অভিযোগ / পরামর্শ). A reply goes to the player's inbox.">
        <button type="button" onClick={reload} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHead>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {Object.entries(STATUS).map(([key, [label, color]]) => (
          <div key={key} className="ad-card py-3">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-[24px] font-bold" style={{ color: `var(${color})` }}>
              {summary[key] || 0}
            </p>
          </div>
        ))}
      </div>

      <div className="ad-card mb-4 flex flex-wrap items-end gap-3">
        <div style={{ width: 170 }}>
          <Field label="Status">
            <select className="ad-input" value={status} onChange={filter(setStatus)}>
              <option value="">All</option>
              {Object.entries(STATUS).map(([k, [label]]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ width: 260 }}>
          <Field label="Type">
            <select className="ad-input" value={type} onChange={filter(setType)}>
              <option value="">All</option>
              {Object.entries(TYPES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setPage(1);
            setSearch(q.trim());
          }}
        >
          <div style={{ width: 200 }}>
            <Field label="Username">
              <input className="ad-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
            </Field>
          </div>
          <button type="submit" className="ad-btn ad-btn--ghost">
            <Search size={15} />
          </button>
        </form>
      </div>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
          <MessageSquareWarning size={26} /> No feedback yet.
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Player", "Type", "Message", "Image", "Status", "Sent", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-white/[0.05] align-top last:border-0">
                  <td className="px-4 py-3 text-[14px] font-semibold text-[var(--neutral100)]">{row.userIdText}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{TYPES[row.type] || row.type}</td>
                  <td className="max-w-[340px] px-4 py-3">
                    <p className="line-clamp-2 text-[13px] text-[var(--text-secondary)]">{row.content}</p>
                    {row.reply ? <p className="mt-1 line-clamp-1 text-[12px] text-[var(--status-success)]">↳ {row.reply}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.image ? (
                      <a href={imageUrl(row.image)} target="_blank" rel="noreferrer">
                        <img src={imageUrl(row.image)} alt="" className="h-12 w-12 rounded object-cover" />
                      </a>
                    ) : (
                      <span className="text-[12px] text-[var(--text-disabled)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Pill status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(row);
                        setReply("");
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
        <Modal title={`Feedback — ${open.userIdText}`} onClose={() => setOpen(null)}>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-muted)]">
            <Pill status={open.status} /> {TYPES[open.type] || open.type} · {new Date(open.createdAt).toLocaleString()}
          </div>
          <p className="whitespace-pre-wrap rounded-lg bg-white/[0.04] p-3 text-[14px] text-[var(--neutral100)]">{open.content}</p>
          {open.image ? (
            <a href={imageUrl(open.image)} target="_blank" rel="noreferrer" className="mt-3 block">
              <img src={imageUrl(open.image)} alt="" className="max-h-[260px] rounded-lg" />
            </a>
          ) : null}

          {open.reply ? (
            <div className="mt-4">
              <p className="ad-label">Reply sent {open.repliedAt ? `· ${new Date(open.repliedAt).toLocaleString()}` : ""} {open.repliedBy?.email ? `· ${open.repliedBy.email}` : ""}</p>
              <p className="whitespace-pre-wrap rounded-lg bg-white/[0.04] p-3 text-[14px] text-[var(--status-success)]">{open.reply}</p>
            </div>
          ) : null}

          <div className="mt-4">
            <Field label={open.reply ? "Send another reply" : "Reply"} hint="The player gets this in the inbox.">
              <textarea rows={4} className="ad-input" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {open.status !== "closed" && (
              <button type="button" disabled={busy} onClick={() => save({ status: "closed" }, "Closed")} className="ad-btn ad-btn--ghost">
                <XCircle size={15} /> Close without reply
              </button>
            )}
            <button type="button" disabled={busy || !reply.trim()} onClick={() => save({ reply }, "Reply sent")} className="ad-btn ad-btn--primary">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send reply
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Feedback;
