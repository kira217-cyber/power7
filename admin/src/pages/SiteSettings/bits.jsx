import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { ImagePlus, Loader2, X } from "lucide-react";


import { imageUrl, useUpload } from "./helpers";

/** ছবি আপলোডের সারি — লেবেল, প্রিভিউ, চুজ/চেঞ্জ, রিমুভ */
export const ImageRow = ({ label, size, value, onChange, box = "h-16 w-40" }) => {
  const upload = useUpload();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const url = await upload(file);
      if (url) onChange(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="rounded-[14px] border border-white/[0.07] p-4">
      <label className="ad-label">
        {label} {size ? <span className="text-[var(--text-disabled)]">({size})</span> : null}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className={`flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-white/[0.08] bg-black/30`}>
          {value ? (
            <img src={imageUrl(value)} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus size={20} className="text-[var(--text-disabled)]" />
          )}
        </span>
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="ad-btn ad-btn--ghost ad-btn--sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {value ? "Change" : "Choose"}
        </button>
        {value ? (
          <button type="button" onClick={() => onChange("")} className="ad-btn ad-btn--danger ad-btn--sm">
            <X size={14} />
          </button>
        ) : null}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
};

/** বাংলা+ইংরেজি টেক্সট জোড়া */
export const LangRow = ({ label, value, onChange, textarea, rows = 3 }) => {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const Field = textarea ? "textarea" : "input";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="ad-label">{label} (Bangla)</label>
        <Field rows={rows} value={value?.bn || ""} onChange={set("bn")} className="ad-input" />
      </div>
      <div>
        <label className="ad-label">{label} (English)</label>
        <Field rows={rows} value={value?.en || ""} onChange={set("en")} className="ad-input" />
      </div>
    </div>
  );
};
