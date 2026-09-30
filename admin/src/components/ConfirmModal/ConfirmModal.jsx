import React, { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

/**
 * নিশ্চিতকরণ মডাল — ব্রাউজারের নিজের window.confirm এর বদলে।
 *
 * খোলা থাকলে (`open`) পর্দাজুড়ে ব্যাকড্রপ, মাঝে কার্ড: শিরোনাম, বার্তা,
 * ঐচ্ছিক ইনপুট (কারণ লেখা), আর দুটো বোতাম। ব্যাকড্রপ/Esc/বাতিলে বন্ধ,
 * নিশ্চিতে `onConfirm`। সাইটের গোল্ড/ডার্ক থিমেই আঁকা।
 */
const ConfirmModal = ({
  open,
  title = "Are you sure?",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  busy = false,
  children,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape" && !busy) onClose?.();
    };

    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const accent = danger ? "var(--status-danger)" : "var(--primary500)";

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => !busy && onClose?.()}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[420px] overflow-hidden rounded-[18px] border bg-[var(--neutral1000)] shadow-2xl"
        style={{ borderColor: "color-mix(in srgb, var(--neutral100), transparent 88%)" }}
      >
        <div className="flex items-start gap-3 p-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
            style={{
              background: `color-mix(in srgb, ${accent}, transparent 86%)`,
              color: accent,
            }}
          >
            <AlertTriangle size={20} />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {title}
            </h3>
            {message ? (
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                {message}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            aria-label="close"
            className="cursor-pointer rounded-lg p-1 text-[var(--text-disabled)] transition hover:text-[var(--neutral100)]"
          >
            <X size={18} />
          </button>
        </div>

        {children ? <div className="px-5 pb-1">{children}</div> : null}

        <div className="flex justify-end gap-3 border-t border-white/[0.07] p-4">
          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`ad-btn ad-btn--sm ${danger ? "ad-btn--danger" : "ad-btn--primary"}`}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
