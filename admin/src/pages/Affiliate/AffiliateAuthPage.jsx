import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ImagePlus, Loader2, RefreshCw, Save, X } from "lucide-react";

import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const imageUrl = (u) => (!u ? "" : u.startsWith("http") ? u : `${API_URL}${u}`);
const lang = (o) => ({ bn: o?.bn || "", en: o?.en || "" });

const LangRow = ({ label, value, onChange, textarea }) => {
  const F = textarea ? "textarea" : "input";
  return (
    <div>
      <label className="ad-label">{label}</label>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <F className="ad-input" rows={textarea ? 2 : undefined} placeholder="Bangla" value={value?.bn || ""} onChange={(e) => onChange({ ...value, bn: e.target.value })} />
        <F className="ad-input" rows={textarea ? 2 : undefined} placeholder="English" value={value?.en || ""} onChange={(e) => onChange({ ...value, en: e.target.value })} />
      </div>
    </div>
  );
};

/**
 * অ্যাফিলিয়েট Login বা Register পেজের সব — লেখা (bn/en), ছবি ও রঙ।
 * `page` = "login" | "register"; — রঙ affiliate সাইটের নিজের (প্রিভিউতেও তাই)।
 */
const AffiliateAuthPage = ({ page, title }) => {
  const [content, setContent] = useState({ title: lang(), subtitle: lang(), footerText: lang(), image: "" });
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const cRes = await api.get("/api/affiliate-auth/admin");
      const c = cRes?.data?.data?.[page] || {};
      setContent({ title: lang(c.title), subtitle: lang(c.subtitle), footerText: lang(c.footerText), image: c.image || "" });
      setImgFile(null);
      setImgPreview("");
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
  }, [page]);

  const pickImg = (f) => {
    if (!f.type.startsWith("image/")) return toast.error("Choose an image");
    if (f.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setImgFile(f);
    setImgPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    try {
      setBusy(true);
      const form = new FormData();
      form.append("content", JSON.stringify({ title: content.title, subtitle: content.subtitle, footerText: content.footerText, image: content.image }));
      if (imgFile) form.append("image", imgFile);
      await api.put(`/api/affiliate-auth/admin/${page}`, form);
      toast.success("Saved");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="ad-card mx-auto flex max-w-[1000px] items-center gap-3 text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  // প্রিভিউয়ে affiliate সাইটের নিজের রঙ
  const cv = (k, d) => d;
  const shownImg = imgPreview || imageUrl(content.image);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">{title}</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">Text and image of the affiliate {page} page. Empty text falls back to defaults.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="ad-btn ad-btn--ghost ad-btn--sm"><RefreshCw size={15} /> Reload</button>
          <button type="button" onClick={save} disabled={busy} className="ad-btn ad-btn--primary ad-btn--sm">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {/* Text + image */}
          <div className="ad-card flex flex-col gap-4">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">Text & image</h2>
            <LangRow label="Title" value={content.title} onChange={(v) => setContent((p) => ({ ...p, title: v }))} />
            <LangRow label="Subtitle" value={content.subtitle} onChange={(v) => setContent((p) => ({ ...p, subtitle: v }))} />
            <LangRow label="Footer prompt" value={content.footerText} onChange={(v) => setContent((p) => ({ ...p, footerText: v }))} />
            <div>
              <label className="ad-label">Logo / banner (above the card)</label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.08] bg-black/30">
                  {shownImg ? <img src={shownImg} alt="" className="h-full w-full object-contain" /> : <ImagePlus size={18} className="text-[var(--text-disabled)]" />}
                </span>
                <button type="button" onClick={() => imgRef.current?.click()} className="ad-btn ad-btn--ghost ad-btn--sm"><ImagePlus size={14} /> {shownImg ? "Change" : "Choose"}</button>
                {shownImg && <button type="button" onClick={() => { setImgFile(null); setImgPreview(""); setContent((p) => ({ ...p, image: "" })); }} className="ad-btn ad-btn--ghost ad-btn--sm"><X size={14} /></button>}
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImg(f); e.target.value = ""; }} />
              </div>
            </div>
          </div>

          <div><button type="button" onClick={save} disabled={busy} className="ad-btn ad-btn--primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save all</button></div>
        </div>

        {/* Preview (Bangla) */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="ad-label mb-2">Live preview (Bangla)</p>
          <div className="rounded-[14px] p-4" style={{ background: "#07051a" }}>
            {shownImg ? <img src={shownImg} alt="" className="mx-auto mb-3 max-h-16 w-auto object-contain" /> : null}
            <p className="text-center text-[15px] font-bold" style={{ color: cv("title", "#ffffff") }}>{content.title.bn || "শিরোনাম"}</p>
            <p className="mb-3 text-center text-[11px]" style={{ color: cv("subtitle", "#a8a8a4") }}>{content.subtitle.bn || "সাবটাইটেল"}</p>
            <div className="rounded-[12px] p-3" style={{ background: cv("card-bg", "#0b0a24") }}>
              <div className="mb-2 h-8 rounded-[8px]" style={{ background: cv("input-bg", "#010E22") }} />
              <div className="mb-3 h-8 rounded-[8px]" style={{ background: cv("input-bg", "#010E22") }} />
              <div className="text-right text-[10px] underline" style={{ color: cv("link", "#7BC242") }}>পাসওয়ার্ড ভুলে গেছেন?</div>
              <div className="mt-2 flex h-8 items-center justify-center rounded-[10px] text-[12px] font-bold" style={{ background: cv("btn-bg", "#BC43F4"), color: cv("btn-text", "#ffffff") }}>{page === "login" ? "লগইন" : "রেজিস্টার"}</div>
            </div>
            <p className="mt-3 text-center text-[10px]" style={{ color: "#a8a8a4" }}>{content.footerText.bn || "প্রম্পট"} <span style={{ color: cv("link", "#7BC242") }}>লিংক</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateAuthPage;
