import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Field, Loading, Modal, MoveButtons, PageHead, StatusPill } from "./bits";
import { errorOf, imageUrl, swapIds } from "./helpers";

/**
 * প্রমোশন পাতার কার্ড — কভার ছবি, শিরোনাম, আর "আরও" চাপলে খোলা লম্বা
 * ছবিগুলো (মূল সাইটে বিস্তারিত ছবি হিসেবেই থাকে), ঐচ্ছিক লেখা ও লিংক।
 *
 * `code` — ব্যানার বা পপআপের লিংকে এই সংখ্যা বসালে সেটা চাপলে এই
 * প্রমোশন খোলে।
 */
const toLocal = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const empty = { code: "", titleBn: "", titleEn: "", contentBn: "", contentEn: "", link: "", startAt: "", endAt: "", isActive: true, bodyImages: [] };

const Promotions = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [cover, setCover] = useState(null);
  const [newBody, setNewBody] = useState([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  // "শুরু/শেষ" দেখানোর তুলনার সময় — পাতা খোলার মুহূর্ত
  const [now] = useState(() => Date.now());

  const fetchItems = async () => {
    const { data } = await api.get("/api/site-content/admin/promotions");
    return data?.data?.items || [];
  };

  useEffect(() => {
    let alive = true;
    fetchItems()
      .then((next) => alive && setItems(next))
      .catch((e) => toast.error(errorOf(e, "Failed to load")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const reload = async () => {
    try {
      setLoading(true);
      setItems(await fetchItems());
    } catch (e) {
      toast.error(errorOf(e, "Failed to load"));
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (p) => {
    setCover(null);
    setNewBody([]);
    setDraft(
      p
        ? {
            _id: p._id,
            code: p.code || "",
            titleBn: p.title?.bn || "",
            titleEn: p.title?.en || "",
            contentBn: p.content?.bn || "",
            contentEn: p.content?.en || "",
            link: p.link || "",
            startAt: toLocal(p.startAt),
            endAt: toLocal(p.endAt),
            isActive: p.isActive !== false,
            image: p.image,
            bodyImages: p.bodyImages || [],
          }
        : { ...empty },
    );
  };

  const save = async (e) => {
    e.preventDefault();
    if (!draft._id && !cover) return toast.error("Choose a cover image");
    const body = new FormData();
    if (cover) body.append("image", cover);
    newBody.forEach((f) => body.append("bodyImages", f));
    body.append("keepBodyImages", JSON.stringify(draft.bodyImages));
    body.append("code", draft.code.trim());
    body.append("title", JSON.stringify({ bn: draft.titleBn, en: draft.titleEn }));
    body.append("content", JSON.stringify({ bn: draft.contentBn, en: draft.contentEn }));
    body.append("link", draft.link.trim());
    body.append("startAt", draft.startAt ? new Date(draft.startAt).toISOString() : "");
    body.append("endAt", draft.endAt ? new Date(draft.endAt).toISOString() : "");
    body.append("isActive", String(draft.isActive));
    try {
      setBusy(true);
      if (draft._id) await api.put(`/api/site-content/admin/promotions/${draft._id}`, body);
      else await api.post("/api/site-content/admin/promotions", body);
      toast.success("Promotion saved");
      setDraft(null);
      await reload();
    } catch (err) {
      toast.error(errorOf(err, "Save failed"));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const act = async (fn, ok) => {
    try {
      setBusy(true);
      await fn();
      if (ok) toast.success(ok);
      await reload();
    } catch (err) {
      toast.error(errorOf(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (p) => {
    const body = new FormData();
    body.append("isActive", String(!p.isActive));
    return act(() => api.put(`/api/site-content/admin/promotions/${p._id}`, body));
  };

  const schedule = (p) => {
    if (p.startAt && new Date(p.startAt) > now) return `Starts ${new Date(p.startAt).toLocaleString()}`;
    if (p.endAt && new Date(p.endAt) <= now) return "Ended";
    if (p.endAt) return `Ends ${new Date(p.endAt).toLocaleString()}`;
    return "Always";
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHead title="Promotions" subtitle="Cards on the promotion page; “More” opens the long images.">
        <button type="button" onClick={reload} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button type="button" onClick={() => openEditor(null)} className="ad-btn ad-btn--primary ad-btn--sm">
          <Plus size={15} /> Add promotion
        </button>
      </PageHead>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <div className="ad-card py-10 text-center text-[var(--text-muted)]">No promotions yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <div key={p._id} className="ad-card p-3" style={{ opacity: p.isActive ? 1 : 0.55 }}>
              <img src={imageUrl(p.image)} alt="" className="w-full rounded-[12px] bg-black/30 object-cover" style={{ aspectRatio: "348 / 217" }} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="truncate text-[14px] font-semibold text-[var(--neutral100)]">{p.title?.bn || p.title?.en}</p>
                <button type="button" onClick={() => toggle(p)} title="Show / hide">
                  <StatusPill on={p.isActive} />
                </button>
              </div>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                {p.code ? `Code ${p.code} · ` : ""}
                {(p.bodyImages || []).length} detail images · {schedule(p)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <MoveButtons
                  busy={busy}
                  onUp={i > 0 ? () => act(() => api.patch("/api/site-content/admin/promotions/reorder", { ids: swapIds(items, i, i - 1) })) : null}
                  onDown={i < items.length - 1 ? () => act(() => api.patch("/api/site-content/admin/promotions/reorder", { ids: swapIds(items, i, i + 1) })) : null}
                />
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEditor(p)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => setDeleting(p)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <Modal title={draft._id ? "Edit promotion" : "Add promotion"} width={760} onClose={() => !busy && setDraft(null)}>
          <form onSubmit={save} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title (বাংলা)">
                <input className="ad-input" value={draft.titleBn} onChange={(e) => setDraft({ ...draft, titleBn: e.target.value })} />
              </Field>
              <Field label="Title (English)">
                <input className="ad-input" value={draft.titleEn} onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })} />
              </Field>
            </div>

            <Field label="Cover image" hint="Card picture, about 348 × 217.">
              {cover || draft.image ? (
                <img src={cover ? URL.createObjectURL(cover) : imageUrl(draft.image)} alt="" className="mb-2 max-h-[180px] rounded-[12px] object-contain" />
              ) : null}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setCover(e.target.files?.[0] || null)} className="ad-input" />
            </Field>

            <Field label="Detail images" hint="Shown in order when the player opens the promotion.">
              <div className="mb-2 flex flex-wrap gap-2">
                {draft.bodyImages.map((url) => (
                  <div key={url} className="relative">
                    <img src={imageUrl(url)} alt="" className="h-[90px] w-[70px] rounded-[8px] bg-black/30 object-cover" />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, bodyImages: draft.bodyImages.filter((u) => u !== url) })}
                      className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-[var(--status-danger)] text-white"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {newBody.map((f, idx) => (
                  <div key={`${f.name}-${idx}`} className="relative">
                    <img src={URL.createObjectURL(f)} alt="" className="h-[90px] w-[70px] rounded-[8px] object-cover ring-2 ring-[var(--primary500)]" />
                    <button type="button" onClick={() => setNewBody(newBody.filter((_, j) => j !== idx))} className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-[var(--status-danger)] text-white" title="Remove">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setNewBody([...newBody, ...Array.from(e.target.files || [])].slice(0, 10))} className="ad-input" />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Text under the images (বাংলা, optional)">
                <textarea rows={4} className="ad-input" value={draft.contentBn} onChange={(e) => setDraft({ ...draft, contentBn: e.target.value })} />
              </Field>
              <Field label="English (optional)">
                <textarea rows={4} className="ad-input" value={draft.contentEn} onChange={(e) => setDraft({ ...draft, contentEn: e.target.value })} />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Code (numbers)" hint="Put this number in a banner/popup link to open this promotion.">
                <input className="ad-input" inputMode="numeric" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.replace(/\D/g, "") })} />
              </Field>
              <Field label="“Join now” link (optional)">
                <input className="ad-input" placeholder="https://…" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
              </Field>
              <Field label="Starts (optional)">
                <input type="datetime-local" className="ad-input" value={draft.startAt} onChange={(e) => setDraft({ ...draft, startAt: e.target.value })} />
              </Field>
              <Field label="Ends (optional)">
                <input type="datetime-local" className="ad-input" value={draft.endAt} onChange={(e) => setDraft({ ...draft, endAt: e.target.value })} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-[14px] text-[var(--text-secondary)]">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /> Show on the site
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="ad-btn ad-btn--ghost">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="ad-btn ad-btn--primary">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete this promotion?"
        message="Its images are deleted too."
        confirmText="Delete"
        danger
        busy={busy}
        onConfirm={() => act(() => api.delete(`/api/site-content/admin/promotions/${deleting._id}`), "Deleted").then(() => setDeleting(null))}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export default Promotions;
