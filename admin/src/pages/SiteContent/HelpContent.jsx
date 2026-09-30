import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Bold, BookOpen, Heading, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Field, Loading, Modal, MoveButtons, PageHead, StatusPill } from "./bits";
import { errorOf, swapIds } from "./helpers";

/** সাইটে যেমন দেখাবে — `## ` শিরোনাম, `**…**` মোটা, ফাঁকা লাইনে অনুচ্ছেদ */
const inline = (line, key) =>
  line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong> : part,
  );
const Preview = ({ text }) => (
  <div className="ad-scroll h-full overflow-y-auto rounded-lg bg-white p-4 text-[14px] leading-6 text-[#64656b]">
    {String(text || "")
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b, i) =>
        b.startsWith("## ") ? (
          <h3 key={i} className="mt-3 text-[16px] font-bold text-[#333] first:mt-0">
            {inline(b.slice(3), i)}
          </h3>
        ) : (
          <p key={i} className="mt-3 first:mt-0">
            {b.split("\n").map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {inline(line, `${i}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        ),
      )}
  </div>
);

/** লেখার ঘর + শিরোনাম/মোটা বোতাম + পাশে লাইভ প্রিভিউ */
const Editor = ({ value, onChange }) => {
  const ref = useRef(null);
  const wrap = (kind) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    let next;
    if (kind === "bold") {
      const picked = value.slice(a, b) || "bold text";
      next = `${value.slice(0, a)}**${picked}**${value.slice(b)}`;
    } else {
      const lineStart = value.lastIndexOf("\n", a - 1) + 1;
      next = value.slice(lineStart, lineStart + 3) === "## " ? value.slice(0, lineStart) + value.slice(lineStart + 3) : `${value.slice(0, lineStart)}## ${value.slice(lineStart)}`;
    }
    onChange(next);
    requestAnimationFrame(() => el.focus());
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex flex-col">
        <div className="mb-2 flex gap-2">
          <button type="button" onClick={() => wrap("heading")} className="ad-btn ad-btn--ghost ad-btn--sm" title="Make this line a heading">
            <Heading size={14} /> Heading
          </button>
          <button type="button" onClick={() => wrap("bold")} className="ad-btn ad-btn--ghost ad-btn--sm" title="Bold the selected text">
            <Bold size={14} /> Bold
          </button>
        </div>
        <textarea ref={ref} className="ad-input flex-1 leading-6" style={{ minHeight: 360 }} value={value} onChange={(e) => onChange(e.target.value)} />
        <p className="mt-1 text-[12px] text-[var(--text-disabled)]">Empty line = new paragraph · line starting with “## ” = heading · **text** = bold</p>
      </div>
      <div className="flex flex-col">
        <p className="ad-label mb-2">Preview</p>
        <div style={{ height: 392 }}>
          <Preview text={value} />
        </div>
      </div>
    </div>
  );
};

const blank = { title: { bn: "", en: "" }, body: { bn: "", en: "" }, showMobile: true, showDesktop: false, isActive: true };

const ArticleForm = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState(() => ({ ...blank, ...initial, title: { ...blank.title, ...(initial?.title || {}) }, body: { ...blank.body, ...(initial?.body || {}) } }));
  const [lang, setLang] = useState("bn");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    try {
      setBusy(true);
      if (initial?._id) await api.put(`/api/help/admin/${initial._id}`, f);
      else await api.post("/api/help/admin", f);
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(errorOf(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={initial?._id ? "Edit help article" : "New help article"} onClose={onClose} width={1100}>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title (বাংলা)">
            <input className="ad-input" value={f.title.bn} onChange={(e) => setF({ ...f, title: { ...f.title, bn: e.target.value } })} />
          </Field>
          <Field label="Title (English)" hint="Leave empty to show the Bangla text in English too.">
            <input className="ad-input" value={f.title.en} onChange={(e) => setF({ ...f, title: { ...f.title, en: e.target.value } })} />
          </Field>
        </div>
        <div className="flex gap-2">
          {["bn", "en"].map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)} className={`ad-btn ad-btn--sm ${lang === l ? "ad-btn--primary" : "ad-btn--ghost"}`}>
              Text ({l === "bn" ? "বাংলা" : "English"})
            </button>
          ))}
        </div>
        <Editor key={lang} value={f.body[lang] || ""} onChange={(v) => setF((x) => ({ ...x, body: { ...x.body, [lang]: v } }))} />
        <div className="flex flex-wrap gap-5 text-[14px] text-[var(--text-secondary)]">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={f.showMobile} onChange={(e) => setF({ ...f, showMobile: e.target.checked })} /> Show on mobile (Help Center page)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={f.showDesktop} onChange={(e) => setF({ ...f, showDesktop: e.target.checked })} /> Show on desktop (footer “help” column)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Active
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ad-btn ad-btn--ghost">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={save} className="ad-btn ad-btn--primary">
            {busy ? <Loader2 size={15} className="animate-spin" /> : null} Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * সাহায্য কেন্দ্রের লেখা (গোপনীয়তা নীতি, শর্তাবলী …) — মোবাইলের "সাহায্য
 * কেন্দ্র" পাতার ট্যাব; চাইলে ডেস্কটপের ফুটারেও। ক্রম উপরে/নিচে সরিয়ে।
 */
const HelpContent = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/api/help/admin")
      .then(({ data }) => alive && setRows(data?.data?.articles || []))
      .catch((e) => toast.error(errorOf(e, "Failed to load")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = () => {
    setLoading(true);
    setTick((x) => x + 1);
  };
  const run = async (fn, ok) => {
    try {
      setBusy(true);
      await fn();
      if (ok) toast.success(ok);
      reload();
    } catch (err) {
      toast.error(errorOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHead title="Help Content" subtitle="Help Center articles (privacy policy, terms …). Players see them as tabs on the mobile Help Center page.">
        <button type="button" onClick={reload} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button type="button" onClick={() => setEditing({})} className="ad-btn ad-btn--primary ad-btn--sm">
          <Plus size={15} /> New article
        </button>
      </PageHead>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
          <BookOpen size={26} /> No articles yet.
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Order", "Title", "Length", "Shown on", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row._id} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-4 py-3">
                    <MoveButtons
                      busy={busy}
                      onUp={i > 0 ? () => run(() => api.put("/api/help/admin/reorder", { ids: swapIds(rows, i, i - 1) })) : null}
                      onDown={i < rows.length - 1 ? () => run(() => api.put("/api/help/admin/reorder", { ids: swapIds(rows, i, i + 1) })) : null}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[14px] font-semibold text-[var(--neutral100)]">{row.title?.bn || row.title?.en}</p>
                    <p className="text-[12px] text-[var(--text-muted)]">{row.title?.en || "— English uses Bangla —"}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    {(row.body?.bn || "").length.toLocaleString()} / {(row.body?.en || "").length.toLocaleString()} chars
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{[row.showMobile && "Mobile", row.showDesktop && "Desktop"].filter(Boolean).join(" + ") || "—"}</td>
                  <td className="px-4 py-3">
                    <button type="button" title="Show / hide" onClick={() => run(() => api.put(`/api/help/admin/${row._id}`, { ...row, isActive: !row.isActive }))}>
                      <StatusPill on={row.isActive} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" title="Edit" onClick={() => setEditing(row)} className="ad-btn ad-btn--ghost ad-btn--sm">
                        <Pencil size={14} />
                      </button>
                      <button type="button" title="Delete" onClick={() => setDeleting(row)} className="ad-btn ad-btn--ghost ad-btn--sm">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ArticleForm
          initial={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete this article?"
        message="It disappears from the Help Center."
        confirmText="Delete"
        danger
        busy={busy}
        onConfirm={() => run(() => api.delete(`/api/help/admin/${deleting._id}`), "Deleted").then(() => setDeleting(null))}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export default HelpContent;
