import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, RotateCcw, Save } from "lucide-react";

import { api } from "../../api/axios";
import { HistoryHeader } from "../../components/HistoryBits/HistoryBits";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SitePreview from "../../components/SitePreview/SitePreview";
import { ImageRow } from "./bits";

/** অ্যাফিলিয়েটের ছবিগুলো (আগের মতো) */
const AFF_IMAGES = [
  { key: "logo", label: "Header logo", size: "≈ 260 × 64 px" },
  { key: "brandLogo", label: "Brand / footer logo", size: "≈ 200 × 64 px" },
  { key: "favicon", label: "Favicon (browser tab icon)", size: "≈ 64 × 64 px (png)", box: "h-14 w-14" },
];

/**
 * ক্লায়েন্ট ও অ্যাফিলিয়েট সাইটের পরিচয় (লোগো/favicon/টাইটেল) — এক
 * কম্পোনেন্ট, শুধু endpoint আর ছবির তালিকা বদলায়। `preview` দিলে পাশে
 * ক্লায়েন্ট সাইটের লাইভ প্রিভিউ, `resettable` দিলে "ডিফল্টে ফেরাও"।
 */
const IdentityPage = ({ title, subtitle, endpoint, Icon, images = AFF_IMAGES, placeholder = "POWER7 Affiliates", preview = false, resettable = false }) => {
  const keys = useMemo(() => ["siteName", ...images.map((i) => i.key)], [images]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [resetAsk, setResetAsk] = useState(false);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));
  const fill = (d = {}) => setDraft(Object.fromEntries(keys.map((k) => [k, d[k] || ""])));

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/site-settings/admin/${endpoint}`);
      fill(data?.data?.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // এক ধাপ পরে — effect এর ভিতরে সরাসরি setState নয়
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const save = async () => {
    try {
      setBusy("save");
      await api.put(`/api/site-settings/admin/${endpoint}`, draft);
      toast.success("Saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const reset = async () => {
    try {
      setBusy("reset");
      const { data } = await api.delete(`/api/site-settings/admin/${endpoint}`);
      fill(data?.data?.data);
      toast.success("Back to the default logo and name");
      setResetAsk(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Reset failed");
    } finally {
      setBusy("");
    }
  };

  const message = useMemo(() => (preview ? { type: "tb-site:settings", settings: { identify: draft } } : null), [preview, draft]);

  if (loading) {
    return (
      <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  const form = (
    <div>
      <div className="ad-card mb-4 flex flex-col gap-4">
        <div>
          <label className="ad-label">Website title (browser tab)</label>
          <input value={draft.siteName || ""} onChange={(e) => set("siteName", e.target.value)} className="ad-input" placeholder={placeholder} />
        </div>

        {images.map((img) => (
          <ImageRow key={img.key} label={img.label} size={img.size} value={draft[img.key] || ""} onChange={(v) => set(img.key, v)} box={img.box} />
        ))}
        {resettable ? (
          <p className="text-[12px] text-[var(--text-muted)]">An empty image uses the site&apos;s built-in one.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={Boolean(busy)} className="ad-btn ad-btn--primary">
          {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
        {resettable ? (
          <button type="button" onClick={() => setResetAsk(true)} disabled={Boolean(busy)} className="ad-btn ad-btn--ghost">
            <RotateCcw size={16} /> Reset to default
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className={preview ? "" : "mx-auto max-w-[820px]"}>
      <HistoryHeader title={title} subtitle={subtitle} Icon={Icon} />

      {preview ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          {form}
          <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
            <SitePreview path="/" message={message} />
          </div>
        </div>
      ) : (
        form
      )}

      <ConfirmModal
        open={resetAsk}
        danger
        busy={busy === "reset"}
        title="Reset the site identity?"
        message="The title, logos and favicon go back to the site's original ones, for everyone."
        confirmText="Reset"
        onConfirm={reset}
        onClose={() => busy !== "reset" && setResetAsk(false)}
      />
    </div>
  );
};

export default IdentityPage;
