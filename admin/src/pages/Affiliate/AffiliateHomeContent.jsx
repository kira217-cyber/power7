import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ImagePlus, Loader2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";

import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const imageUrl = (u) => (!u ? "" : u.startsWith("http") ? u : `${API_URL}${u}`);

const ICON_KEYS = ["UserPlus", "Share2", "Wallet", "TrendingUp", "BarChart3", "Zap", "ShieldCheck", "Headset", "Megaphone", "Circle"];

const L = () => ({ bn: "", en: "" });
const lang = (o) => ({ bn: o?.bn || "", en: o?.en || "" });

const emptyContent = () => ({
  hero: { badge: L(), title: L(), text: L(), joinBtn: L(), loginBtn: L(), pill: L(), earnFigure: L(), activePlayersValue: L(), activePlayersLabel: L(), desktopImage: "", mobileImage: "" },
  stats: [],
  commission: { eyebrow: L(), title: L(), text: L(), tierLabel: L(), revenueShare: L(), tiers: [] },
  howItWorks: { eyebrow: L(), title: L(), steps: [] },
  whyUs: { eyebrow: L(), title: L(), features: [] },
  providers: { title: L(), text: L(), items: [] },
  faq: { eyebrow: L(), title: L(), items: [] },
  cta: { title: L(), text: L(), button: L() },
});

const normalize = (c = {}) => {
  const h = c.hero || {};
  return {
    hero: {
      badge: lang(h.badge), title: lang(h.title), text: lang(h.text), joinBtn: lang(h.joinBtn), loginBtn: lang(h.loginBtn),
      pill: lang(h.pill), earnFigure: lang(h.earnFigure), activePlayersValue: lang(h.activePlayersValue), activePlayersLabel: lang(h.activePlayersLabel),
      desktopImage: h.desktopImage || "", mobileImage: h.mobileImage || "",
    },
    stats: (c.stats || []).map((s) => ({ value: lang(s.value), label: lang(s.label) })),
    commission: {
      eyebrow: lang(c.commission?.eyebrow), title: lang(c.commission?.title), text: lang(c.commission?.text),
      tierLabel: lang(c.commission?.tierLabel), revenueShare: lang(c.commission?.revenueShare),
      tiers: (c.commission?.tiers || []).map((t) => ({ players: lang(t.players), share: t.share ?? 0 })),
    },
    howItWorks: {
      eyebrow: lang(c.howItWorks?.eyebrow), title: lang(c.howItWorks?.title),
      steps: (c.howItWorks?.steps || []).map((s) => ({ icon: s.icon || "Circle", title: lang(s.title), text: lang(s.text) })),
    },
    whyUs: {
      eyebrow: lang(c.whyUs?.eyebrow), title: lang(c.whyUs?.title),
      features: (c.whyUs?.features || []).map((f) => ({ icon: f.icon || "Circle", title: lang(f.title), text: lang(f.text) })),
    },
    providers: {
      title: lang(c.providers?.title), text: lang(c.providers?.text),
      items: (c.providers?.items || []).map((p) => ({ name: p.name || "", image: p.image || "", _file: null, _preview: "" })),
    },
    faq: {
      eyebrow: lang(c.faq?.eyebrow), title: lang(c.faq?.title),
      items: (c.faq?.items || []).map((x) => ({ q: lang(x.q), a: lang(x.a) })),
    },
    cta: { title: lang(c.cta?.title), text: lang(c.cta?.text), button: lang(c.cta?.button) },
  };
};

/* ── reusable ── */
const LangRow = ({ label, value, onChange, textarea }) => {
  const F = textarea ? "textarea" : "input";
  return (
    <div>
      {label && <label className="ad-label">{label}</label>}
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <F className="ad-input" rows={textarea ? 2 : undefined} placeholder="Bangla" value={value?.bn || ""} onChange={(e) => onChange({ ...value, bn: e.target.value })} />
        <F className="ad-input" rows={textarea ? 2 : undefined} placeholder="English" value={value?.en || ""} onChange={(e) => onChange({ ...value, en: e.target.value })} />
      </div>
    </div>
  );
};

const ImageRow = ({ label, shown, onPick, onClear }) => {
  const ref = useRef(null);
  return (
    <div>
      {label && <label className="ad-label">{label}</label>}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.08] bg-black/30">
          {shown ? <img src={shown} alt="" className="h-full w-full object-contain" /> : <ImagePlus size={16} className="text-[var(--text-disabled)]" />}
        </span>
        <button type="button" onClick={() => ref.current?.click()} className="ad-btn ad-btn--ghost ad-btn--sm"><ImagePlus size={14} /> {shown ? "Change" : "Choose"}</button>
        {shown && <button type="button" onClick={onClear} className="ad-btn ad-btn--ghost ad-btn--sm"><X size={14} /></button>}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      </div>
    </div>
  );
};

const Card = ({ title, action, children }) => (
  <div className="ad-card flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

/**
 * অ্যাফিলিয়েট হোম পেজের সব সেকশনের কনটেন্ট (লেখা bn/en + ছবি)।
 * রঙ আলাদা: "Affiliate Home Theme" পেজ থেকে। খালি রাখলে স্ট্যাটিক fallback।
 */
const AffiliateHomeContent = () => {
  const [c, setC] = useState(emptyContent());
  const [imgs, setImgs] = useState({}); // heroDesktop/heroMobile -> {file,preview}
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/affiliate-home/admin");
      setC(normalize(data?.data || {}));
      setImgs({});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // এক ধাপ পরে — effect এর ভিতরে সরাসরি setState নয়
    queueMicrotask(load); }, []);

  const patch = (fn) => setC((prev) => { const n = structuredClone(prev); fn(n); return n; });

  const pickHero = (slot, file) => {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image");
    if (file.size > 6 * 1024 * 1024) return toast.error("Max 6MB");
    setImgs((p) => ({ ...p, [slot]: { file, preview: URL.createObjectURL(file) } }));
  };
  const pickProvider = (i, file) => {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    patch((n) => { n.providers.items[i]._file = file; n.providers.items[i]._preview = URL.createObjectURL(file); });
  };
  const shownHero = (slot, url) => imgs[slot]?.preview || imageUrl(url);

  const save = async () => {
    const payload = structuredClone(c);
    payload.providers.items = payload.providers.items.map((p) => ({ name: p.name, image: p.image }));

    const form = new FormData();
    ["heroDesktop", "heroMobile"].forEach((s) => { if (imgs[s]?.file) form.append(s, imgs[s].file); });
    c.providers.items.forEach((p, i) => { if (p._file) form.append(`provider_${i}`, p._file); });
    form.append("content", JSON.stringify(payload));
    try {
      setBusy(true);
      const { data } = await api.put("/api/affiliate-home/admin", form);
      toast.success("Saved");
      setC(normalize(data?.data || {}));
      setImgs({});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="ad-card mx-auto flex max-w-[1100px] items-center gap-3 text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  const h = c.hero;

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">Affiliate Home — Content</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">All text & images of the affiliate landing page. Empty falls back to defaults.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="ad-btn ad-btn--ghost ad-btn--sm"><RefreshCw size={15} /> Reload</button>
          <button type="button" onClick={save} disabled={busy} className="ad-btn ad-btn--primary ad-btn--sm">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Hero */}
        <Card title="1 · Hero">
          <LangRow label="Badge" value={h.badge} onChange={(v) => patch((n) => (n.hero.badge = v))} />
          <LangRow label="Title" value={h.title} onChange={(v) => patch((n) => (n.hero.title = v))} />
          <LangRow label="Text" textarea value={h.text} onChange={(v) => patch((n) => (n.hero.text = v))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <LangRow label="Join button" value={h.joinBtn} onChange={(v) => patch((n) => (n.hero.joinBtn = v))} />
            <LangRow label="Login button" value={h.loginBtn} onChange={(v) => patch((n) => (n.hero.loginBtn = v))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageRow label="Banner" shown={shownHero("heroDesktop", h.desktopImage)} onPick={(f) => pickHero("heroDesktop", f)} onClear={() => { setImgs((p) => { const n = { ...p }; delete n.heroDesktop; return n; }); patch((n) => (n.hero.desktopImage = "")); }} />
          </div>
        </Card>

        {/* Stats */}
        <Card title="2 · Stats" action={<button type="button" onClick={() => patch((n) => n.stats.push({ value: L(), label: L() }))} className="ad-btn ad-btn--ghost ad-btn--sm"><Plus size={14} /> Stat</button>}>
          {c.stats.map((s, i) => (
            <div key={i} className="rounded-[12px] border border-white/[0.07] p-3">
              <div className="mb-2 flex items-center justify-between"><p className="text-[13px] font-bold text-[var(--neutral100)]">Stat {i + 1}</p><button type="button" onClick={() => patch((n) => n.stats.splice(i, 1))} className="ad-btn ad-btn--danger ad-btn--sm"><Trash2 size={13} /></button></div>
              <LangRow label="Value" value={s.value} onChange={(v) => patch((n) => (n.stats[i].value = v))} />
              <div className="mt-2"><LangRow label="Label" value={s.label} onChange={(v) => patch((n) => (n.stats[i].label = v))} /></div>
            </div>
          ))}
        </Card>

        {/* Commission */}
        <Card title="3 · Commission" action={<button type="button" onClick={() => patch((n) => n.commission.tiers.push({ players: L(), share: 0 }))} className="ad-btn ad-btn--ghost ad-btn--sm"><Plus size={14} /> Tier</button>}>
          <LangRow label="Title" value={c.commission.title} onChange={(v) => patch((n) => (n.commission.title = v))} />
          <LangRow label="Text" textarea value={c.commission.text} onChange={(v) => patch((n) => (n.commission.text = v))} />
          {c.commission.tiers.map((t, i) => (
            <div key={i} className="rounded-[12px] border border-white/[0.07] p-3">
              <div className="mb-2 flex items-center justify-between"><p className="text-[13px] font-bold text-[var(--neutral100)]">Tier {i + 1}</p><button type="button" onClick={() => patch((n) => n.commission.tiers.splice(i, 1))} className="ad-btn ad-btn--danger ad-btn--sm"><Trash2 size={13} /></button></div>
              <LangRow label="Players range" value={t.players} onChange={(v) => patch((n) => (n.commission.tiers[i].players = v))} />
              <div className="mt-2"><label className="ad-label">Share %</label><input type="number" className="ad-input mt-1 max-w-[140px]" value={t.share} onChange={(e) => patch((n) => (n.commission.tiers[i].share = Number(e.target.value) || 0))} /></div>
            </div>
          ))}
        </Card>

        {/* How it works */}
        <Card title="4 · How it works" action={<button type="button" onClick={() => patch((n) => n.howItWorks.steps.push({ icon: "Circle", title: L(), text: L() }))} className="ad-btn ad-btn--ghost ad-btn--sm"><Plus size={14} /> Step</button>}>
          <LangRow label="Title" value={c.howItWorks.title} onChange={(v) => patch((n) => (n.howItWorks.title = v))} />
          {c.howItWorks.steps.map((s, i) => (
            <div key={i} className="rounded-[12px] border border-white/[0.07] p-3">
              <div className="mb-2 flex items-center justify-between"><p className="text-[13px] font-bold text-[var(--neutral100)]">Step {i + 1}</p><button type="button" onClick={() => patch((n) => n.howItWorks.steps.splice(i, 1))} className="ad-btn ad-btn--danger ad-btn--sm"><Trash2 size={13} /></button></div>
              <div className="mb-2"><label className="ad-label">Icon</label><select className="ad-input mt-1 max-w-[200px]" value={s.icon} onChange={(e) => patch((n) => (n.howItWorks.steps[i].icon = e.target.value))}>{ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
              <LangRow label="Title" value={s.title} onChange={(v) => patch((n) => (n.howItWorks.steps[i].title = v))} />
              <div className="mt-2"><LangRow label="Text" textarea value={s.text} onChange={(v) => patch((n) => (n.howItWorks.steps[i].text = v))} /></div>
            </div>
          ))}
        </Card>

        {/* Why us */}
        <Card title="5 · Why us" action={<button type="button" onClick={() => patch((n) => n.whyUs.features.push({ icon: "Circle", title: L(), text: L() }))} className="ad-btn ad-btn--ghost ad-btn--sm"><Plus size={14} /> Feature</button>}>
          <LangRow label="Title" value={c.whyUs.title} onChange={(v) => patch((n) => (n.whyUs.title = v))} />
          {c.whyUs.features.map((f, i) => (
            <div key={i} className="rounded-[12px] border border-white/[0.07] p-3">
              <div className="mb-2 flex items-center justify-between"><p className="text-[13px] font-bold text-[var(--neutral100)]">Feature {i + 1}</p><button type="button" onClick={() => patch((n) => n.whyUs.features.splice(i, 1))} className="ad-btn ad-btn--danger ad-btn--sm"><Trash2 size={13} /></button></div>
              <div className="mb-2"><label className="ad-label">Icon</label><select className="ad-input mt-1 max-w-[200px]" value={f.icon} onChange={(e) => patch((n) => (n.whyUs.features[i].icon = e.target.value))}>{ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
              <LangRow label="Title" value={f.title} onChange={(v) => patch((n) => (n.whyUs.features[i].title = v))} />
              <div className="mt-2"><LangRow label="Text" textarea value={f.text} onChange={(v) => patch((n) => (n.whyUs.features[i].text = v))} /></div>
            </div>
          ))}
        </Card>

        {/* Providers */}
        <Card title="6 · Providers" action={<button type="button" onClick={() => patch((n) => n.providers.items.push({ name: "", image: "", _file: null, _preview: "" }))} className="ad-btn ad-btn--ghost ad-btn--sm"><Plus size={14} /> Provider</button>}>
          <LangRow label="Title" value={c.providers.title} onChange={(v) => patch((n) => (n.providers.title = v))} />
          <LangRow label="Text" value={c.providers.text} onChange={(v) => patch((n) => (n.providers.text = v))} />
          <div className="grid gap-3 sm:grid-cols-2">
            {c.providers.items.map((p, i) => (
              <div key={i} className="rounded-[12px] border border-white/[0.07] p-3">
                <div className="mb-2 flex items-center justify-between"><p className="text-[13px] font-bold text-[var(--neutral100)]">#{i + 1}</p><button type="button" onClick={() => patch((n) => n.providers.items.splice(i, 1))} className="ad-btn ad-btn--danger ad-btn--sm"><Trash2 size={13} /></button></div>
                <label className="ad-label">Name</label>
                <input className="ad-input mt-1" value={p.name} onChange={(e) => patch((n) => (n.providers.items[i].name = e.target.value))} />
                <div className="mt-2"><ImageRow label="Logo" shown={p._preview || imageUrl(p.image)} onPick={(f) => pickProvider(i, f)} onClear={() => patch((n) => { n.providers.items[i].image = ""; n.providers.items[i]._file = null; n.providers.items[i]._preview = ""; })} /></div>
              </div>
            ))}
          </div>
        </Card>

        {/* FAQ */}
        <Card title="7 · FAQ" action={<button type="button" onClick={() => patch((n) => n.faq.items.push({ q: L(), a: L() }))} className="ad-btn ad-btn--ghost ad-btn--sm"><Plus size={14} /> Question</button>}>
          <LangRow label="Title" value={c.faq.title} onChange={(v) => patch((n) => (n.faq.title = v))} />
          {c.faq.items.map((x, i) => (
            <div key={i} className="rounded-[12px] border border-white/[0.07] p-3">
              <div className="mb-2 flex items-center justify-between"><p className="text-[13px] font-bold text-[var(--neutral100)]">Q{i + 1}</p><button type="button" onClick={() => patch((n) => n.faq.items.splice(i, 1))} className="ad-btn ad-btn--danger ad-btn--sm"><Trash2 size={13} /></button></div>
              <LangRow label="Question" value={x.q} onChange={(v) => patch((n) => (n.faq.items[i].q = v))} />
              <div className="mt-2"><LangRow label="Answer" textarea value={x.a} onChange={(v) => patch((n) => (n.faq.items[i].a = v))} /></div>
            </div>
          ))}
        </Card>

        {/* CTA */}
        <Card title="8 · CTA band">
          <LangRow label="Title" value={c.cta.title} onChange={(v) => patch((n) => (n.cta.title = v))} />
          <LangRow label="Text" value={c.cta.text} onChange={(v) => patch((n) => (n.cta.text = v))} />
          <LangRow label="Button" value={c.cta.button} onChange={(v) => patch((n) => (n.cta.button = v))} />
        </Card>

        <div>
          <button type="button" onClick={save} disabled={busy} className="ad-btn ad-btn--primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save all content</button>
        </div>
      </div>
    </div>
  );
};

export default AffiliateHomeContent;
