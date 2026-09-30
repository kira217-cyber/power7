import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  Check,
  ExternalLink,
  Loader2,
  Lock,
  Monitor,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
  Undo2,
} from "lucide-react";

import { api } from "../../api/axios";
import { HistoryHeader } from "../../components/HistoryBits/HistoryBits";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";

/** প্রিভিউ কোন সাইটের কোন ঠিকানায় — `.env` এ না থাকলে লোকালের পোর্ট */
const SITE_URL = {
  client: String(import.meta.env.VITE_CLIENT_URL || "http://localhost:5173").replace(/\/+$/, ""),
  affiliate: String(import.meta.env.VITE_AFFILIATE_URL || "http://localhost:5174").replace(/\/+$/, ""),
};

/**
 * শুধু scheme + host + port — live এ অ্যাফিলিয়েট `/partner` এর নিচে থাকে, কিন্তু
 * iframe এর বার্তার `event.origin` এ পথ থাকে না, তাই তুলনা origin দিয়েই
 */
const originOf = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
};

const DEVICES = {
  desktop: { width: 1440, height: 900, Icon: Monitor, label: "Desktop" },
  mobile: { width: 390, height: 844, Icon: Smartphone, label: "Mobile" },
};

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();

/** `<input type="color">` শুধু ৬ অঙ্ক বোঝে */
const sixDigit = (hex) => {
  const v = String(hex || "");
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return /^#[0-9a-fA-F]{6}/.test(v) ? v.slice(0, 7) : "#000000";
};

/** একটা রঙের সারি — রঙ বাছাই, হেক্স লেখা, ডিফল্টে ফেরা */
const ColorRow = ({ token, value, saved, onChange }) => {
  // লেখার সময়টুকু নিজের লেখা, নইলে আসল মান — তাই বাইরে থেকে বদলালেও মেলে
  const [editing, setEditing] = useState(null);
  const changed = !same(value, token.default);
  const unsaved = !same(value, saved);

  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-white/[0.06] bg-black/20 p-2.5">
      <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-[10px] border border-white/15" style={{ background: value }}>
        <input
          type="color"
          value={sixDigit(value)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={token.label}
        />
      </label>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold text-[var(--neutral100)]">
          {token.label}
          {unsaved ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary500)]" title="Not saved yet" /> : null}
        </p>
        <input
          value={editing ?? value}
          onFocus={() => setEditing(value)}
          onChange={(e) => {
            setEditing(e.target.value);
            if (HEX.test(e.target.value.trim())) onChange(e.target.value.trim());
          }}
          onBlur={() => setEditing(null)}
          spellCheck={false}
          className="mt-0.5 w-full bg-transparent font-mono text-[12px] text-[var(--text-muted)] outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(token.default)}
        disabled={!changed}
        title={`Default ${token.default}`}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--text-muted)] transition hover:bg-white/10 disabled:cursor-default disabled:opacity-25"
      >
        <Undo2 size={14} />
      </button>
    </div>
  );
};

/**
 * থিম স্টুডিও — এক সাইটের প্রতিটা পাতার রঙ আলাদা করে, আসল পাতার লাইভ
 * প্রিভিউসহ।
 *
 * কোন পাতায় কোন রঙ — server এর registry থেকে (নিজে হাতে তালিকা নয়)।
 * প্রিভিউ আসল সাইট iframe এ; রঙ বদলালেই `postMessage` এ পাঠানো হয়, সাইট
 * সেটা শুধু ওই iframe এ বসায় (theme/liveTheme.js) — সেভ করার আগে কেউ দেখে না।
 */
const ThemeStudio = ({ site }) => {
  const [registry, setRegistry] = useState(null);
  const [saved, setSaved] = useState({}); // page → { colors }
  const [pageKey, setPageKey] = useState("");
  const [draft, setDraft] = useState({}); // এই পাতার রঙ (ডিফল্ট + বদল)
  const [device, setDevice] = useState("desktop");
  const [busy, setBusy] = useState("");
  const [resetAsk, setResetAsk] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [boxWidth, setBoxWidth] = useState(800);

  const frameRef = useRef(null);
  const boxRef = useRef(null);

  const siteReg = registry?.[site];
  const page = siteReg?.pages.find((p) => p.key === pageKey) || null;
  const tokens = useMemo(() => (page ? page.groups.flatMap((g) => g.tokens) : []), [page]);

  const load = useCallback(async () => {
    try {
      const [reg, cur] = await Promise.all([api.get("/api/theme/admin/registry"), api.get(`/api/theme/admin/${site}`)]);
      const nextReg = reg?.data?.data?.registry || {};
      setRegistry(nextReg);
      setSaved(cur?.data?.data?.pages || {});
      setPageKey((prev) => prev || nextReg?.[site]?.pages?.[0]?.key || "");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load colours");
    }
  }, [site]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  // পাতা বদলালে তার সেভ করা রঙ দিয়ে খসড়া শুরু
  const savedFor = useCallback(
    (key) => {
      const p = siteReg?.pages.find((x) => x.key === key);
      if (!p) return {};
      const colors = saved[key]?.colors || {};
      return Object.fromEntries(p.groups.flatMap((g) => g.tokens).map((tk) => [tk.key, colors[tk.key] || tk.default]));
    },
    [siteReg, saved],
  );

  useEffect(() => {
    if (pageKey) queueMicrotask(() => setDraft(savedFor(pageKey)));
  }, [pageKey, savedFor]);

  const savedNow = useMemo(() => savedFor(pageKey), [savedFor, pageKey]);
  const dirty = tokens.some((tk) => !same(draft[tk.key], savedNow[tk.key]));

  /** প্রিভিউতে যা যাবে — অন্য পাতার সেভ করা রঙ + এই পাতার খসড়া */
  const previewColors = useMemo(() => {
    const all = {};
    Object.values(saved).forEach((p) => Object.assign(all, p.colors || {}));
    tokens.forEach((tk) => {
      if (!same(draft[tk.key], tk.default)) all[tk.key] = draft[tk.key];
      else delete all[tk.key];
    });
    return all;
  }, [saved, tokens, draft]);

  const post = useCallback((msg) => {
    frameRef.current?.contentWindow?.postMessage(msg, originOf(SITE_URL[site]));
  }, [site]);

  const pushColors = useCallback(() => post({ type: "tb-theme:colors", colors: previewColors }), [post, previewColors]);

  // রঙ বদলালেই প্রিভিউতে
  useEffect(() => {
    const id = requestAnimationFrame(pushColors);
    return () => cancelAnimationFrame(id);
  }, [pushColors]);

  // পাতা তৈরি হলে রঙ পাঠানো, দরকারে মডাল খোলা/নিচে নামা
  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== originOf(SITE_URL[site]) || event.data?.type !== "tb-theme:ready") return;
      pushColors();
      if (page?.preview?.open && device === "desktop") setTimeout(() => post({ type: "tb-theme:open", target: page.preview.open }), 900);
      if (page?.preview?.scroll) setTimeout(() => post({ type: "tb-theme:scroll", to: page.preview.scroll }), 1500);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [site, pushColors, post, page, device]);

  // প্রিভিউর বাক্সের মাপ — পুরো পাতাটা ছোট করে ধরানো
  useEffect(() => {
    if (!boxRef.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [registry]);

  const dev = DEVICES[device];
  const scale = Math.min(1, (boxWidth - 2) / dev.width);
  // মোবাইলে কিছু জিনিস মডাল নয়, আলাদা পাতা (সদস্য কেন্দ্রের জমা) — তাই `mobilePath`
  const previewPath = page ? (device === "mobile" && page.preview.mobilePath) || page.preview.path : "";
  const frameSrc = page ? `${SITE_URL[site]}${previewPath}` : "";

  const choosePage = (key) => {
    if (key === pageKey) return;
    if (dirty && !window.confirm("You have unsaved colours on this page. Leave without saving?")) return;
    setPageKey(key);
  };

  const save = async () => {
    try {
      setBusy("save");
      const changed = Object.fromEntries(tokens.filter((tk) => !same(draft[tk.key], tk.default)).map((tk) => [tk.key, draft[tk.key]]));
      const { data } = await api.put(`/api/theme/admin/${site}/${pageKey}`, { colors: changed });
      setSaved((prev) => ({ ...prev, [pageKey]: { colors: data?.data?.colors || {}, updatedAt: data?.data?.updatedAt } }));
      toast.success("Saved — the live site uses these colours now");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const resetPage = async () => {
    try {
      setBusy("reset");
      await api.delete(`/api/theme/admin/${site}/${pageKey}`);
      setSaved((prev) => {
        const next = { ...prev };
        delete next[pageKey];
        return next;
      });
      setResetAsk(false);
      toast.success("This page is back to its default colours");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Reset failed");
    } finally {
      setBusy("");
    }
  };

  if (!siteReg) {
    return (
      <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  const customised = (key) => Object.keys(saved[key]?.colors || {}).length;

  return (
    <div className="mx-auto max-w-[1500px]">
      <HistoryHeader
        title={`${siteReg.label} colours`}
        subtitle="Pick a page, change its colours and watch the real page update. Nothing changes for visitors until you save."
        Icon={Palette}
        onRefresh={load}
      />

      {/* ── পাতা বাছাই ── */}
      <div className="ad-card mb-4 flex flex-wrap gap-2 p-3">
        {siteReg.pages.map((p) => {
          const on = p.key === pageKey;
          const n = customised(p.key);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => choosePage(p.key)}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-[10px] px-3.5 text-[13px] font-semibold transition"
              style={{
                background: on ? "var(--primary500)" : "rgba(255,255,255,0.05)",
                color: on ? "var(--neutral1000)" : "var(--text-secondary, #c7cbe0)",
              }}
            >
              {p.label}
              {n ? (
                <span
                  className="rounded-full px-1.5 text-[10.5px] font-black"
                  style={{ background: on ? "rgba(0,0,0,0.2)" : "color-mix(in srgb, var(--primary500), transparent 80%)", color: on ? "inherit" : "var(--primary500)" }}
                  title={`${n} colour(s) changed`}
                >
                  {n}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        {/* ── রঙের ঘর ── */}
        <div className="flex min-w-0 flex-col gap-4">
          {page?.hint ? <p className="ad-card py-3 text-[12.5px] text-[var(--text-muted)]">{page.hint}</p> : null}

          {page?.groups.map((group) => (
            <div key={group.label} className="ad-card">
              <p className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-[var(--text-muted)]">{group.label}</p>
              <div className="flex flex-col gap-2">
                {group.tokens.map((tk) => (
                  <ColorRow
                    key={tk.key}
                    token={tk}
                    value={draft[tk.key] || tk.default}
                    saved={savedNow[tk.key]}
                    onChange={(v) => setDraft((prev) => ({ ...prev, [tk.key]: v }))}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="ad-card sticky bottom-3 z-10 flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={!dirty || Boolean(busy)} className="ad-btn ad-btn--primary flex-1">
              {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
            <button type="button" onClick={() => setDraft(savedNow)} disabled={!dirty || Boolean(busy)} className="ad-btn ad-btn--ghost" title="Undo unsaved changes">
              <Undo2 size={16} />
            </button>
            <button type="button" onClick={() => setResetAsk(true)} disabled={!customised(pageKey) || Boolean(busy)} className="ad-btn ad-btn--ghost" title="Back to the default colours">
              <RotateCcw size={16} />
            </button>
            <p className="w-full text-[11.5px] text-[var(--text-disabled)]">
              {dirty ? (
                <span className="text-[var(--primary500)]">Unsaved changes — only you see them in the preview.</span>
              ) : (
                <span className="flex items-center gap-1">
                  <Check size={12} /> Everything saved
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── লাইভ প্রিভিউ ── */}
        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <div className="ad-card ad-card--preview p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="me-auto text-[14px] font-extrabold text-[var(--neutral100)]">
                Live preview <span className="font-mono text-[12px] font-normal text-[var(--text-muted)]">{previewPath}</span>
              </p>
              {Object.entries(DEVICES).map(([key, d]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] px-2.5 text-[12px] font-semibold transition"
                  style={{ background: device === key ? "var(--primary500)" : "rgba(255,255,255,0.06)", color: device === key ? "var(--neutral1000)" : "inherit" }}
                >
                  <d.Icon size={14} /> {d.label}
                </button>
              ))}
              <button type="button" onClick={() => setFrameKey((k) => k + 1)} className="ad-btn ad-btn--ghost ad-btn--sm" title="Reload the preview">
                <RefreshCw size={14} />
              </button>
              <a href={frameSrc} target="_blank" rel="noreferrer" className="ad-btn ad-btn--ghost ad-btn--sm" title="Open the page in a new tab">
                <ExternalLink size={14} />
              </a>
            </div>

            {page?.preview.auth ? (
              <p className="mb-3 flex items-start gap-2 rounded-[10px] bg-white/[0.04] p-2.5 text-[12px] text-[var(--text-muted)]">
                <Lock size={13} className="mt-0.5 shrink-0" />
                This page needs a logged-in account. Log in on the {site === "client" ? "client" : "affiliate"} site in this browser once, then reload the preview.
              </p>
            ) : null}

            <div ref={boxRef} className="w-full">
              <div
                className="ad-preview-frame mx-auto overflow-hidden rounded-[14px] border border-white/10 bg-black"
                style={{ width: dev.width * scale, height: dev.height * scale }}
              >
                {frameSrc ? (
                  <iframe
                    // পাতা বদলালে নতুন করে লোড — একই ঠিকানার পাতাও (হোম / সদস্য মডাল) নিজের মডাল খোলে
                    key={`${pageKey}-${frameSrc}-${device}-${frameKey}`}
                    ref={frameRef}
                    src={frameSrc}
                    title="Live preview"
                    style={{ width: dev.width, height: dev.height, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, display: "block" }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={resetAsk}
        danger
        busy={busy === "reset"}
        title="Reset this page?"
        message={`Every colour on “${page?.label}” goes back to the default, for everyone.`}
        confirmText="Reset"
        onConfirm={resetPage}
        onClose={() => busy !== "reset" && setResetAsk(false)}
      />
    </div>
  );
};

export default ThemeStudio;
