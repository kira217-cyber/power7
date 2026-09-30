import React from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Loader2, X } from "lucide-react";

/** পাতার শিরোনাম + ডানে বোতাম */
export const PageHead = ({ title, subtitle, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="ad-title text-[26px] lg:text-[30px]">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-[14px] text-[var(--text-muted)]">{subtitle}</p>
      ) : null}
    </div>
    <div className="flex gap-2">{children}</div>
  </div>
);

export const Field = ({ label, hint, children }) => (
  <div>
    <label className="ad-label">{label}</label>
    {children}
    {hint ? (
      <p className="mt-1 text-[12px] text-[var(--text-disabled)]">{hint}</p>
    ) : null}
  </div>
);

export const Loading = () => (
  <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
    <Loader2 size={16} className="animate-spin" /> Loading…
  </div>
);

export const StatusPill = ({ on }) => (
  <span
    className="rounded-full px-2 py-[2px] text-[11px] font-bold"
    style={{
      background: `color-mix(in srgb, var(${on ? "--status-success" : "--text-disabled"}), transparent 86%)`,
      color: `var(${on ? "--status-success" : "--text-disabled"})`,
    }}
  >
    {on ? "Active" : "Hidden"}
  </span>
);

/** উপরে/নিচে সরানো */
export const MoveButtons = ({ onUp, onDown, busy }) => (
  <div className="flex gap-1">
    <button
      type="button"
      title="Move up"
      disabled={!onUp || busy}
      onClick={onUp}
      className="ad-btn ad-btn--ghost ad-btn--sm"
    >
      <ArrowUp size={14} />
    </button>
    <button
      type="button"
      title="Move down"
      disabled={!onDown || busy}
      onClick={onDown}
      className="ad-btn ad-btn--ghost ad-btn--sm"
    >
      <ArrowDown size={14} />
    </button>
  </div>
);

/** সাধারণ ফর্ম-মডাল */
// body তে portal — পাতার ভিতরের stacking context এ আটকে থেকে সাইডবারের নিচে না পড়ে
export const Modal = ({ title, onClose, children, width = 620 }) =>
  createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="ad-card ad-scroll relative max-h-[92vh] w-full overflow-y-auto"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[var(--neutral100)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ad-btn ad-btn--ghost ad-btn--sm"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
