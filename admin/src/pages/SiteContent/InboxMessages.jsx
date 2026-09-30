import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Mail, RefreshCw, Send, Trash2 } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Pager } from "../../components/HistoryBits/HistoryBits";
import { Field, Loading, PageHead, StatusPill } from "./bits";
import { errorOf } from "./helpers";

const empty = { titleBn: "", titleEn: "", bodyBn: "", bodyEn: "", audience: "all", userIds: "" };

/**
 * খেলোয়াড়ের "অভ্যন্তরীণ বার্তা" — সবাইকে বা নির্দিষ্ট ইউজারনেমে পাঠানো।
 * "সবাই" মানে পাঠানোর সময় যাঁদের অ্যাকাউন্ট আছে; পরে যাঁরা আসবেন তাঁরা দেখেন না।
 */
const InboxMessages = () => {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get(`/api/inbox/admin?page=${page}&limit=20`)
      .then(({ data }) => {
        if (!alive) return;
        setRows(data?.data?.messages || []);
        setMeta(data?.data?.meta || {});
      })
      .catch((e) => toast.error(errorOf(e, "Failed to load")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, tick]);

  const refresh = () => {
    setLoading(true);
    setTick((x) => x + 1);
  };

  const send = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      await api.post("/api/inbox/admin", {
        title: { bn: form.titleBn, en: form.titleEn },
        body: { bn: form.bodyBn, en: form.bodyEn },
        audience: form.audience,
        userIds: form.userIds,
      });
      toast.success("Message sent");
      setForm(empty);
      setPage(1);
      refresh();
    } catch (err) {
      toast.error(errorOf(err, "Could not send"));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn, ok) => {
    try {
      setBusy(true);
      await fn();
      if (ok) toast.success(ok);
      refresh();
    } catch (err) {
      toast.error(errorOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHead title="Inbox Messages" subtitle="Messages in the players' inbox (অভ্যন্তরীণ বার্তা).">
        <button type="button" onClick={refresh} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHead>

      <form onSubmit={send} className="ad-card mb-5 grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title (বাংলা)">
            <input className="ad-input" value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} />
          </Field>
          <Field label="Title (English)">
            <input className="ad-input" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
          </Field>
          <Field label="Message (বাংলা)">
            <textarea rows={4} className="ad-input" value={form.bodyBn} onChange={(e) => setForm({ ...form, bodyBn: e.target.value })} />
          </Field>
          <Field label="Message (English)">
            <textarea rows={4} className="ad-input" value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <Field label="Send to">
            <select className="ad-input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="all">All players</option>
              <option value="users">Chosen players</option>
            </select>
          </Field>
          {form.audience === "users" ? (
            <Field label="Usernames" hint="Separate with commas, spaces or new lines.">
              <textarea rows={2} className="ad-input" value={form.userIds} onChange={(e) => setForm({ ...form, userIds: e.target.value })} />
            </Field>
          ) : (
            <p className="self-end pb-2 text-[12px] text-[var(--text-muted)]">Every player who already has an account sees it.</p>
          )}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="ad-btn ad-btn--primary">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send
          </button>
        </div>
      </form>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
          <Mail size={26} /> No messages sent yet.
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Message", "Sent to", "Read by", "Status", "Sent", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((msg) => (
                <tr key={msg._id} className="border-b border-white/[0.05] align-top last:border-0">
                  <td className="max-w-[360px] px-4 py-3">
                    <p className="text-[14px] font-semibold text-[var(--neutral100)]">{msg.title?.bn || msg.title?.en}</p>
                    <p className="mt-1 line-clamp-2 text-[12px] text-[var(--text-muted)]">{msg.body?.bn || msg.body?.en}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    {msg.audience === "all" ? "All players" : (msg.users || []).map((u) => u.userId).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{msg.readCount}</td>
                  <td className="px-4 py-3">
                    <button type="button" title="Show / hide" onClick={() => act(() => api.put(`/api/inbox/admin/${msg._id}`, { isActive: !msg.isActive }))}>
                      <StatusPill on={msg.isActive} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">
                    {new Date(msg.createdAt).toLocaleString()}
                    <br />
                    {msg.createdBy?.email || ""}
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setDeleting(msg)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Delete">
                      <Trash2 size={14} />
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

      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete this message?"
        message="It disappears from every player's inbox."
        confirmText="Delete"
        danger
        busy={busy}
        onConfirm={() => act(() => api.delete(`/api/inbox/admin/${deleting._id}`), "Deleted").then(() => setDeleting(null))}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export default InboxMessages;
