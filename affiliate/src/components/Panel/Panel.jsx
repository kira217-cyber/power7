import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/**
 * ড্যাশবোর্ডের পাতাগুলোর সাধারণ অংশ।
 *
 * ছয়টা পাতায় একই কার্ড, একই সংখ্যার ঘর, একই টেবিলের মোড়ক আর একই
 * পাতা বদলানোর সারি — তাই এক জায়গায়।
 */

export const Card = ({ title, subtitle, action, children, className = "" }) => (
  <div
    className={`rounded-[16px] border border-white/[0.07] bg-[var(--neutral900)] p-4 lg:p-5 ${className}`}
  >
    {title ? (
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>

        {action}
      </div>
    ) : null}

    {children}
  </div>
);

/** এক নজরের সংখ্যা */
export const Stat = ({ label, value, sub, tone, Icon }) => (
  <div className="rounded-[16px] border border-white/[0.07] bg-[var(--neutral900)] p-4">
    <div className="flex items-start justify-between gap-3">
      <p className="text-[13px] text-[var(--text-muted)]">{label}</p>

      {Icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary500)]/10 text-[var(--primary500)]">
          <Icon size={16} />
        </span>
      ) : null}
    </div>

    <p
      className="mt-2 text-[22px] font-black"
      style={{ color: tone || "var(--text-primary)" }}
    >
      {value}
    </p>

    {sub ? (
      <p className="mt-1 text-[12px] text-[var(--text-disabled)]">{sub}</p>
    ) : null}
  </div>
);

/** নাম-মান জোড়া */
export const Row = ({ label, value, tone }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/[0.05] py-2.5 last:border-0">
    <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
    <span
      className="text-[14px] font-semibold"
      style={{ color: tone || "var(--text-primary)" }}
    >
      {value}
    </span>
  </div>
);

/**
 * চওড়া টেবিলের মোড়ক।
 *
 * কার্ডে `overflow: hidden` নেই, তাই এখানে সরাসরি `overflow-x-auto`
 * কাজ করে — ভিতরের টেবিল চওড়া হলে পাশে টেনে দেখা যায়।
 */
export const TableWrap = ({ children, minWidth = 760 }) => (
  <div
    className="overflow-x-auto"
    style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
  >
    <div style={{ minWidth: `${minWidth}px` }}>{children}</div>
  </div>
);

export const Loading = ({ label }) => (
  <p className="flex items-center gap-2 py-6 text-[14px] text-[var(--text-muted)]">
    <Loader2 size={15} className="animate-spin" />
    {label}
  </p>
);

export const Empty = ({ label, Icon }) => (
  <div className="flex flex-col items-center gap-3 py-10 text-center">
    {Icon ? <Icon size={26} className="text-[var(--text-disabled)]" /> : null}
    <p className="text-[14px] text-[var(--text-muted)]">{label}</p>
  </div>
);

/** পাতা বদলানো — একটাই পাতা হলে দেখা যায় না */
export const Pager = ({ page, totalPages, busy, onChange, labels }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={page <= 1 || busy}
        onClick={() => onChange(page - 1)}
        className="flex h-9 cursor-pointer items-center gap-1 rounded-[10px] border border-white/[0.07] px-3 text-[13px] text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={14} />
        {labels?.prev || "Prev"}
      </button>

      <span className="text-[13px] text-[var(--text-muted)]">
        {page} / {totalPages}
      </span>

      <button
        type="button"
        disabled={page >= totalPages || busy}
        onClick={() => onChange(page + 1)}
        className="flex h-9 cursor-pointer items-center gap-1 rounded-[10px] border border-white/[0.07] px-3 text-[13px] text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {labels?.next || "Next"}
        <ChevronRight size={14} />
      </button>
    </div>
  );
};
