import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, PanelBottom, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

import { api } from "../../api/axios";
import { HistoryHeader } from "../../components/HistoryBits/HistoryBits";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SitePreview from "../../components/SitePreview/SitePreview";
import { ImageRow, LangRow } from "./bits";
import { imageUrl, useUpload } from "./helpers";

const ENDPOINT = "/api/site-settings/admin/client-footer";
const EMPTY = { bn: "", en: "" };

/** server থেকে আসা ফুটার → এই পাতার খসড়া (কিছু না থাকলে খালি ঘর) */
const pick = (d = {}) => ({
  about: { show: d.about?.show !== false, title: d.about?.title || { ...EMPTY }, logo: d.about?.logo || "", text: d.about?.text || { ...EMPTY } },
  games: { show: d.games?.show !== false, title: d.games?.title || { ...EMPTY }, items: d.games?.items || [] },
  certificates: { show: d.certificates?.show !== false, title: d.certificates?.title || { ...EMPTY }, items: d.certificates?.items || [] },
  showProviders: d.showProviders !== false,
  providerLogos: d.providerLogos || [],
  copyright: d.copyright || { ...EMPTY },
});

/** ছোট ছবির ঘর — ক্লিক করলে আপলোড */
const Thumb = ({ value, onChange, size = "h-12 w-16" }) => {
  const upload = useUpload();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const choose = async (e) => {
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
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title={value ? "Change image" : "Choose image"}
        className={`flex ${size} shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.08] bg-black/30 transition hover:border-[var(--primary500)]`}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : value ? (
          <img src={imageUrl(value)} alt="" className="h-full w-full object-contain" />
        ) : (
          <ImagePlus size={16} className="text-[var(--text-disabled)]" />
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={choose} />
    </>
  );
};

/** সারির ক্রম বদল ও মোছা */
const RowTools = ({ index, count, onMove, onRemove }) => (
  <div className="ms-auto flex shrink-0 items-center gap-1">
    <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="ad-btn ad-btn--ghost ad-btn--sm" title="Move up">
      <ArrowUp size={13} />
    </button>
    <button type="button" onClick={() => onMove(index, 1)} disabled={index === count - 1} className="ad-btn ad-btn--ghost ad-btn--sm" title="Move down">
      <ArrowDown size={13} />
    </button>
    <button type="button" onClick={() => onRemove(index)} className="ad-btn ad-btn--danger ad-btn--sm" title="Remove">
      <Trash2 size={13} />
    </button>
  </div>
);

/** তালিকা সম্পাদনার সাধারণ কাজ — বদল, সরানো, মোছা, যোগ */
const useList = (list, onChange) => ({
  update: (i, patch) => onChange(list.map((row, j) => (j === i ? { ...row, ...patch } : row))),
  move: (i, dir) => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  },
  remove: (i) => onChange(list.filter((_, j) => j !== i)),
  add: (row) => onChange([...list, row]),
});

/** ছবি + নাম + লিংক — সার্টিফিকেট আর প্রোভাইডার লোগো */
const LogoList = ({ list, onChange, addLabel, thumb = "h-10 w-16" }) => {
  const L = useList(list, onChange);
  return (
    <div>
      <div className="flex flex-col gap-2">
        {list.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-[10px] bg-black/20 p-2">
            <Thumb value={row.image} onChange={(v) => L.update(i, { image: v })} size={thumb} />
            <input value={row.name || ""} onChange={(e) => L.update(i, { name: e.target.value })} placeholder="Name" className="ad-input !h-9 !w-[140px]" />
            <input value={row.link || ""} onChange={(e) => L.update(i, { link: e.target.value })} placeholder="Link (optional) https://…" className="ad-input !h-9 min-w-[160px] flex-1" />
            <RowTools index={i} count={list.length} onMove={L.move} onRemove={L.remove} />
          </div>
        ))}
        {!list.length ? <p className="text-[12px] text-[var(--text-muted)]">Nothing yet.</p> : null}
      </div>
      <button type="button" onClick={() => L.add({ name: "", image: "", link: "" })} className="ad-btn ad-btn--ghost ad-btn--sm mt-2">
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
};

/** "প্রয়োজনীয় খেলা" — প্রতিটা সারি একটা গেম ক্যাটাগরি + দুই ভাষার লেখা */
const GameList = ({ list, onChange, categories }) => {
  const L = useList(list, onChange);
  const known = new Set(categories.map((c) => c.key));
  return (
    <div>
      <div className="flex flex-col gap-2">
        {list.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-[10px] bg-black/20 p-2">
            <select
              value={row.category || ""}
              onChange={(e) => {
                const cat = categories.find((c) => c.key === e.target.value);
                // লেখা খালি থাকলে ক্যাটাগরির নামই বসে
                const label = row.label?.bn || row.label?.en ? row.label : { bn: cat?.name?.bn || "", en: cat?.name?.en || "" };
                L.update(i, { category: e.target.value, label });
              }}
              className="ad-input !h-9 !w-[150px]"
              title="Game category it opens"
            >
              <option value="">Choose category…</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name?.en || c.name?.bn || c.key}
                </option>
              ))}
              {row.category && !known.has(row.category) ? <option value={row.category}>{row.category}</option> : null}
            </select>
            <input value={row.label?.bn || ""} onChange={(e) => L.update(i, { label: { ...row.label, bn: e.target.value } })} placeholder="Bangla" className="ad-input !h-9 min-w-[120px] flex-1" />
            <input value={row.label?.en || ""} onChange={(e) => L.update(i, { label: { ...row.label, en: e.target.value } })} placeholder="English" className="ad-input !h-9 min-w-[120px] flex-1" />
            <RowTools index={i} count={list.length} onMove={L.move} onRemove={L.remove} />
          </div>
        ))}
        {!list.length ? <p className="text-[12px] text-[var(--text-muted)]">Nothing yet — this column stays hidden.</p> : null}
      </div>
      <button type="button" onClick={() => L.add({ category: "", label: { ...EMPTY } })} className="ad-btn ad-btn--ghost ad-btn--sm mt-2">
        <Plus size={13} /> Add game
      </button>
    </div>
  );
};

/** অংশের কার্ড — ডানে "দেখাও" সুইচ */
const Section = ({ title, hint, show, onShow, children }) => (
  <div className="ad-card mb-4">
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold text-[var(--neutral100)]">{title}</p>
        {hint ? <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{hint}</p> : null}
      </div>
      {onShow ? (
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-semibold text-[var(--text-secondary)]">
          <input type="checkbox" checked={show} onChange={(e) => onShow(e.target.checked)} /> Show
        </label>
      ) : null}
    </div>
    <div className={`mt-3 ${onShow && !show ? "pointer-events-none opacity-40" : ""}`}>{children}</div>
  </div>
);

/**
 * ক্লায়েন্ট সাইটের ফুটার — তিন কলাম (আমাদের সম্পর্কে, প্রয়োজনীয় খেলা,
 * সার্টিফিকেট), প্রোভাইডার লোগো আর কপিরাইট; ডেস্কটপ ও মোবাইল দুটোতেই।
 * পাশে লাইভ প্রিভিউ।
 */
const ClientFooter = () => {
  const [draft, setDraft] = useState(null);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState("");
  const [resetAsk, setResetAsk] = useState(false);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));
  const setIn = (sec, k, v) => setDraft((p) => ({ ...p, [sec]: { ...p[sec], [k]: v } }));

  const load = async () => {
    try {
      const { data } = await api.get(ENDPOINT);
      setDraft(pick(data?.data?.data));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    }
  };

  useEffect(() => {
    queueMicrotask(load);
    // খেলার তালিকার ড্রপডাউন — সাইটের আসল গেম ক্যাটাগরি (না পেলে লেখা key ই থাকে)
    api
      .get("/api/games/game-data")
      .then(({ data }) => {
        // server এর /api/games/game-data → { data: { data: { categories } } }
        const cats = data?.data?.data?.categories || [];
        setCategories(cats.filter((c) => c.key && c.type !== "favorite").map((c) => ({ key: c.key, name: c.name || {} })));
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    try {
      setBusy("save");
      const { data } = await api.put(ENDPOINT, draft);
      setDraft(pick(data?.data?.data));
      toast.success("Footer saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const reset = async () => {
    try {
      setBusy("reset");
      const { data } = await api.delete(ENDPOINT);
      setDraft(pick(data?.data?.data));
      toast.success("Footer is back to default");
      setResetAsk(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Reset failed");
    } finally {
      setBusy("");
    }
  };

  const message = useMemo(() => (draft ? { type: "tb-site:settings", settings: { footer: draft } } : null), [draft]);

  if (!draft) {
    return (
      <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div>
      <HistoryHeader
        title="Footer Setting"
        subtitle="The client site footer on desktop and mobile — every text, logo, game link and certificate. The preview shows your changes before you save."
        Icon={PanelBottom}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Section title="About us" hint="First column: logo and a short text." show={draft.about.show} onShow={(v) => setIn("about", "show", v)}>
            <div className="flex flex-col gap-3">
              <LangRow label="Heading" value={draft.about.title} onChange={(v) => setIn("about", "title", v)} />
              <ImageRow label="Logo" size="empty = the Site Identity logo" value={draft.about.logo} onChange={(v) => setIn("about", "logo", v)} />
              <LangRow label="Text" value={draft.about.text} onChange={(v) => setIn("about", "text", v)} textarea rows={4} />
            </div>
          </Section>

          <Section title="Popular games" hint="Second column: each line opens its game category (like the sidebar)." show={draft.games.show} onShow={(v) => setIn("games", "show", v)}>
            <div className="flex flex-col gap-3">
              <LangRow label="Heading" value={draft.games.title} onChange={(v) => setIn("games", "title", v)} />
              <GameList list={draft.games.items} onChange={(v) => setIn("games", "items", v)} categories={categories} />
            </div>
          </Section>

          <Section
            title="Certificates"
            hint="Third column: badges such as Gaming Curacao and Oracle API. With a link, a click opens it in a new tab."
            show={draft.certificates.show}
            onShow={(v) => setIn("certificates", "show", v)}
          >
            <div className="flex flex-col gap-3">
              <LangRow label="Heading" value={draft.certificates.title} onChange={(v) => setIn("certificates", "title", v)} />
              <LogoList list={draft.certificates.items} onChange={(v) => setIn("certificates", "items", v)} addLabel="Add certificate" thumb="h-12 w-24" />
            </div>
          </Section>

          <Section title="Provider logos" hint="The grey logo row under the columns." show={draft.showProviders} onShow={(v) => set("showProviders", v)}>
            <LogoList list={draft.providerLogos} onChange={(v) => set("providerLogos", v)} addLabel="Add logo" />
          </Section>

          <Section title="Copyright">
            <LangRow label="Copyright" value={draft.copyright} onChange={(v) => set("copyright", v)} />
          </Section>

          <div className="sticky bottom-3 z-10 flex flex-wrap gap-2 rounded-[16px] border border-white/[0.08] bg-[var(--neutral1000)]/90 p-3 backdrop-blur">
            <button type="button" onClick={save} disabled={Boolean(busy)} className="ad-btn ad-btn--primary flex-1">
              {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
            <button type="button" onClick={() => setResetAsk(true)} disabled={Boolean(busy)} className="ad-btn ad-btn--ghost">
              <RotateCcw size={16} /> Reset to default
            </button>
          </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <SitePreview path="/" message={message} scroll="bottom" />
        </div>
      </div>

      <ConfirmModal
        open={resetAsk}
        danger
        busy={busy === "reset"}
        title="Reset the footer?"
        message="Every text, logo, game link and certificate goes back to the default footer, for everyone."
        confirmText="Reset"
        onConfirm={reset}
        onClose={() => busy !== "reset" && setResetAsk(false)}
      />
    </div>
  );
};

export default ClientFooter;
