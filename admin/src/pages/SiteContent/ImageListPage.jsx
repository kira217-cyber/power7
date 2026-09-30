import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Field, Loading, Modal, MoveButtons, PageHead, StatusPill } from "./bits";
import { errorOf, imageUrl, swapIds } from "./helpers";

/**
 * ছবির তালিকা — হোমের ব্যানার আর পপআপ (একই পাতা, `kind` আলাদা)।
 *
 * মূল সাইটের মতো ডেস্কটপ আর মোবাইলের তালিকা আলাদা; মোবাইলে কিছু না
 * থাকলে ক্লায়েন্ট ডেস্কটপেরটাই দেখায়। লিংক: শুধু অঙ্ক = প্রমোশনের কোড
 * (প্রমোশন পাতায় সেই কার্ড খোলে), নইলে http(s) URL।
 */
const SIZES = {
  banners: { desktop: "1085 × 371 px", mobile: "750 × 300 px" },
  popups: { desktop: "about 845 px wide", mobile: "about 562 px wide" },
};

const blank = (platform) => ({ title: "", titleBn: "", titleEn: "", link: "", platform, isActive: true });

const ImageListPage = ({ kind, heading, subtitle }) => {
  const isPopup = kind === "popups";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("desktop");
  const [draft, setDraft] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchItems = async () => {
    const { data } = await api.get(`/api/site-content/admin/${kind}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

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

  const list = items.filter((x) => (x.platform || "desktop") === platform);

  const openEditor = (item) => {
    setFile(null);
    setPreview(item ? imageUrl(item.image) : "");
    setDraft(
      item
        ? { _id: item._id, title: typeof item.title === "string" ? item.title : "", titleBn: item.title?.bn || "", titleEn: item.title?.en || "", link: item.link || "", platform: item.platform || "desktop", isActive: item.isActive !== false }
        : blank(platform),
    );
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!draft._id && !file) return toast.error("Choose an image");
    const body = new FormData();
    if (file) body.append("image", file);
    body.append("link", draft.link.trim());
    body.append("platform", draft.platform);
    body.append("isActive", String(draft.isActive));
    if (isPopup) body.append("title", JSON.stringify({ bn: draft.titleBn, en: draft.titleEn }));
    else body.append("title", draft.title);
    try {
      setBusy(true);
      if (draft._id) await api.put(`/api/site-content/admin/${kind}/${draft._id}`, body);
      else await api.post(`/api/site-content/admin/${kind}`, body);
      toast.success("Saved");
      setDraft(null);
      await reload();
    } catch (err) {
      toast.error(errorOf(err, "Save failed"));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const move = async (i, j) => {
    try {
      setBusy(true);
      // শুধু এই প্ল্যাটফর্মের ক্রম বদলায়; অন্যটার সারি আগের জায়গায়
      const ids = swapIds(list, i, j);
      const others = items.filter((x) => (x.platform || "desktop") !== platform).map((x) => x._id);
      await api.patch(`/api/site-content/admin/${kind}/reorder`, { ids: [...ids, ...others] });
      await reload();
    } catch (err) {
      toast.error(errorOf(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item) => {
    const body = new FormData();
    body.append("isActive", String(!item.isActive));
    try {
      await api.put(`/api/site-content/admin/${kind}/${item._id}`, body);
      await reload();
    } catch (err) {
      toast.error(errorOf(err));
    }
  };

  const remove = async () => {
    try {
      setBusy(true);
      await api.delete(`/api/site-content/admin/${kind}/${deleting._id}`);
      toast.success("Deleted");
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(errorOf(err, "Delete failed"));
    } finally {
      setBusy(false);
    }
  };

  const titleOf = (item) => (isPopup ? item.title?.bn || item.title?.en : item.title) || "Untitled";

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHead title={heading} subtitle={subtitle}>
        <button type="button" onClick={reload} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button type="button" onClick={() => openEditor(null)} className="ad-btn ad-btn--primary ad-btn--sm">
          <Plus size={15} /> Add
        </button>
      </PageHead>

      <div className="ad-card mb-4 flex flex-wrap items-center gap-2">
        {["desktop", "mobile"].map((p) => (
          <button key={p} type="button" onClick={() => setPlatform(p)} className={`ad-btn ad-btn--sm ${platform === p ? "ad-btn--primary" : "ad-btn--ghost"}`}>
            {p === "desktop" ? "Desktop" : "Mobile"} ({items.filter((x) => (x.platform || "desktop") === p).length})
          </button>
        ))}
        <span className="ml-auto text-[12px] text-[var(--text-muted)]">Best size: {SIZES[kind][platform]}</span>
      </div>

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <div className="ad-card py-10 text-center text-[var(--text-muted)]">
          Nothing here yet.{platform === "mobile" ? " Mobile shows the desktop list until you add some." : ""}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item, i) => (
            <div key={item._id} className="ad-card p-3" style={{ opacity: item.isActive ? 1 : 0.55 }}>
              <img src={imageUrl(item.image)} alt="" className="w-full rounded-[12px] bg-black/30 object-contain" style={{ aspectRatio: isPopup ? "4 / 3" : platform === "mobile" ? "5 / 2" : "1085 / 371" }} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="truncate text-[14px] font-semibold text-[var(--neutral100)]">{titleOf(item)}</p>
                <button type="button" onClick={() => toggle(item)} title="Show / hide">
                  <StatusPill on={item.isActive} />
                </button>
              </div>
              <p className="mt-1 truncate text-[12px] text-[var(--text-muted)]">{item.link ? `Link: ${item.link}` : "No link"}</p>
              <div className="mt-3 flex items-center justify-between">
                <MoveButtons busy={busy} onUp={i > 0 ? () => move(i, i - 1) : null} onDown={i < list.length - 1 ? () => move(i, i + 1) : null} />
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEditor(item)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => setDeleting(item)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <Modal title={draft._id ? "Edit" : "Add"} onClose={() => !busy && setDraft(null)}>
          <form onSubmit={save} className="grid gap-4">
            <Field label="Image" hint={`Best size: ${SIZES[kind][draft.platform]}. png, jpg, webp or gif — up to 5 MB.`}>
              {preview ? <img src={preview} alt="" className="mb-2 max-h-[220px] w-full rounded-[12px] bg-black/30 object-contain" /> : null}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickFile} className="ad-input" />
            </Field>
            {isPopup ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title (বাংলা)">
                  <input className="ad-input" value={draft.titleBn} onChange={(e) => setDraft({ ...draft, titleBn: e.target.value })} />
                </Field>
                <Field label="Title (English)">
                  <input className="ad-input" value={draft.titleEn} onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })} />
                </Field>
              </div>
            ) : (
              <Field label="Title (admin only)">
                <input className="ad-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
            )}
            <Field label="Link" hint="A promotion code (numbers only) opens that promotion; or a full https:// link. Leave empty for no link.">
              <input className="ad-input" value={draft.link} placeholder="3383560 or https://…" onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Show on">
                <select className="ad-input" value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value })}>
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </Field>
              <Field label="Status">
                <select className="ad-input" value={draft.isActive ? "1" : "0"} onChange={(e) => setDraft({ ...draft, isActive: e.target.value === "1" })}>
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </Field>
            </div>
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
        title="Delete this image?"
        message="It disappears from the site right away."
        confirmText="Delete"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export const Sliders = () => <ImageListPage kind="banners" heading="Home Sliders" subtitle="Banners at the top of the home page." />;
export const Popups = () => <ImageListPage kind="popups" heading="Popups" subtitle="The notice popup shown when the site opens." />;

export default ImageListPage;
