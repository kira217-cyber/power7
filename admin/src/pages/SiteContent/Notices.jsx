import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Loading, MoveButtons, PageHead, StatusPill } from "./bits";
import { errorOf, swapIds } from "./helpers";

/**
 * হোমের চলমান নোটিশ — ব্যানারের নিচের স্ক্রলিং লেখা, একটার পর একটা।
 * প্রতিটা সারি নিজের জায়গাতেই বদলে Save।
 */
const Notices = () => {
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [adding, setAdding] = useState({ bn: "", en: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [deleting, setDeleting] = useState(null);

  const fetchItems = async () => {
    const { data } = await api.get("/api/site-content/admin/notices");
    return data?.data?.items || [];
  };

  const apply = (next) => {
    setItems(next);
    setDrafts(Object.fromEntries(next.map((n) => [n._id, { bn: n.text?.bn || "", en: n.text?.en || "" }])));
  };

  useEffect(() => {
    let alive = true;
    fetchItems()
      .then((next) => alive && apply(next))
      .catch((e) => toast.error(errorOf(e, "Failed to load")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const reload = async () => {
    try {
      setLoading(true);
      apply(await fetchItems());
    } catch (e) {
      toast.error(errorOf(e, "Failed to load"));
    } finally {
      setLoading(false);
    }
  };

  const run = async (key, fn, ok) => {
    try {
      setBusy(key);
      await fn();
      if (ok) toast.success(ok);
      await reload();
    } catch (e) {
      toast.error(errorOf(e));
    } finally {
      setBusy("");
    }
  };

  const add = (e) => {
    e.preventDefault();
    if (!adding.bn.trim() && !adding.en.trim()) return toast.error("Write the notice text");
    return run("add", () => api.post("/api/site-content/admin/notices", { text: adding }), "Notice added").then(() => setAdding({ bn: "", en: "" }));
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHead title="Notice" subtitle="The scrolling text under the home banner. Emoji are fine.">
        <button type="button" onClick={reload} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHead>

      <form onSubmit={add} className="ad-card mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label className="ad-label">New notice (বাংলা)</label>
          <input className="ad-input" value={adding.bn} onChange={(e) => setAdding({ ...adding, bn: e.target.value })} />
        </div>
        <div>
          <label className="ad-label">English</label>
          <input className="ad-input" value={adding.en} onChange={(e) => setAdding({ ...adding, en: e.target.value })} />
        </div>
        <button type="submit" disabled={busy === "add"} className="ad-btn ad-btn--primary">
          {busy === "add" ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add
        </button>
      </form>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <div className="ad-card py-10 text-center text-[var(--text-muted)]">No notices yet.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((n, i) => {
            const d = drafts[n._id] || { bn: "", en: "" };
            const changed = d.bn !== (n.text?.bn || "") || d.en !== (n.text?.en || "");
            return (
              <div key={n._id} className="ad-card grid gap-3" style={{ opacity: n.isActive ? 1 : 0.6 }}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="ad-input" value={d.bn} onChange={(e) => setDrafts({ ...drafts, [n._id]: { ...d, bn: e.target.value } })} placeholder="বাংলা" />
                  <input className="ad-input" value={d.en} onChange={(e) => setDrafts({ ...drafts, [n._id]: { ...d, en: e.target.value } })} placeholder="English" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MoveButtons
                    busy={Boolean(busy)}
                    onUp={i > 0 ? () => run("move", () => api.patch("/api/site-content/admin/notices/reorder", { ids: swapIds(items, i, i - 1) })) : null}
                    onDown={i < items.length - 1 ? () => run("move", () => api.patch("/api/site-content/admin/notices/reorder", { ids: swapIds(items, i, i + 1) })) : null}
                  />
                  <button type="button" onClick={() => run(n._id, () => api.put(`/api/site-content/admin/notices/${n._id}`, { isActive: !n.isActive }))} title="Show / hide">
                    <StatusPill on={n.isActive} />
                  </button>
                  <span className="flex-1" />
                  <button type="button" disabled={!changed || busy === n._id} onClick={() => run(n._id, () => api.put(`/api/site-content/admin/notices/${n._id}`, { text: d }), "Saved")} className="ad-btn ad-btn--primary ad-btn--sm">
                    {busy === n._id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                  </button>
                  <button type="button" onClick={() => setDeleting(n)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete this notice?"
        confirmText="Delete"
        danger
        busy={busy === "delete"}
        onConfirm={() => run("delete", () => api.delete(`/api/site-content/admin/notices/${deleting._id}`), "Deleted").then(() => setDeleting(null))}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export default Notices;
