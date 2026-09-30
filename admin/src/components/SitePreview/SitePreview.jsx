import React, { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Monitor, RefreshCw, Smartphone } from "lucide-react";

/** ক্লায়েন্ট সাইটের ঠিকানা — `.env` এ না থাকলে লোকালের পোর্ট */
export const CLIENT_URL = String(import.meta.env.VITE_CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
/** iframe এর বার্তার `event.origin` এ পথ থাকে না — তাই তুলনা শুধু origin দিয়ে */
const CLIENT_ORIGIN = (() => {
  try {
    return new URL(CLIENT_URL).origin;
  } catch {
    return CLIENT_URL;
  }
})();

const DEVICES = {
  desktop: { width: 1440, height: 900, Icon: Monitor, label: "Desktop" },
  mobile: { width: 390, height: 844, Icon: Smartphone, label: "Mobile" },
};

/**
 * ক্লায়েন্ট সাইটের লাইভ প্রিভিউ — আসল পাতাটাই iframe এ, ছোট করে।
 *
 * `message` (যেমন `{ type: "tb-site:settings", settings }`) না-সেভ-করা খসড়া;
 * পাতা তৈরি হলে (`tb-theme:ready`) আর প্রতিবার বদলালে পাঠানো হয়, শুধু
 * ওই iframe এ বসে (client এর theme/liveTheme.js শোনে)। `scroll="bottom"`
 * দিলে লোড হওয়ার পর নিচে নামে (ফুটার)।
 */
const SitePreview = ({ path = "/", message, scroll }) => {
  const frameRef = useRef(null);
  const boxRef = useRef(null);
  const [device, setDevice] = useState("desktop");
  const [frameKey, setFrameKey] = useState(0);
  const [boxWidth, setBoxWidth] = useState(600);

  const post = useCallback((msg) => {
    frameRef.current?.contentWindow?.postMessage(msg, CLIENT_ORIGIN);
  }, []);

  // খসড়া বদলালেই প্রিভিউতে
  useEffect(() => {
    if (!message) return undefined;
    const id = requestAnimationFrame(() => post(message));
    return () => cancelAnimationFrame(id);
  }, [message, post]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== CLIENT_ORIGIN || event.data?.type !== "tb-theme:ready") return;
      if (message) post(message);
      if (scroll) setTimeout(() => post({ type: "tb-theme:scroll", to: scroll }), 1500);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [message, post, scroll]);

  useEffect(() => {
    if (!boxRef.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, []);

  const dev = DEVICES[device];
  const scale = Math.min(1, (boxWidth - 2) / dev.width);
  const src = `${CLIENT_URL}${path}`;

  return (
    <div className="ad-card ad-card--preview p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="me-auto text-[14px] font-extrabold text-[var(--neutral100)]">
          Live preview <span className="text-[12px] font-normal text-[var(--text-muted)]">not saved yet</span>
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
        <a href={src} target="_blank" rel="noreferrer" className="ad-btn ad-btn--ghost ad-btn--sm" title="Open the site in a new tab">
          <ExternalLink size={14} />
        </a>
      </div>

      <div ref={boxRef} className="w-full">
        <div
          className="ad-preview-frame mx-auto overflow-hidden rounded-[14px] border border-white/10 bg-black"
          style={{ width: dev.width * scale, height: dev.height * scale }}
        >
          <iframe
            key={`${src}-${device}-${frameKey}`}
            ref={frameRef}
            src={src}
            title="Live preview"
            style={{ width: dev.width, height: dev.height, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, display: "block" }}
          />
        </div>
      </div>
    </div>
  );
};

export default SitePreview;
