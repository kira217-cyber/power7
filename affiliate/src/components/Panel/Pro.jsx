import React from "react";

import "./pro.css";

/**
 * অ্যাফিলিয়েট প্যানেলের নতুন নকশার টুকরো।
 *
 * প্রতিটা পাতা নিজের রঙ (`tone`) নিয়ে এগুলো জোড়া দেয় — একই টুকরো,
 * কিন্তু রঙ, ব্যানার আর গঠন পাতাভেদে আলাদা, তাই পাতাগুলো আর একরকম
 * লাগে না। রঙগুলো এক জায়গায় (`TONES`), যাতে সাইডবার-হেডারও একই রঙ পায়।
 */

const toneStyle = (tone, style) => ({ "--tone": tone, ...style });

/** পাতার মাথার ব্যানার — আইকন, ছোট লেখা, শিরোনাম; ডানে যা খুশি */
export const Hero = ({ tone, heroBg, Icon, eyebrow, title, subtitle, aside, children, className = "" }) => (
  <section className={`pro-hero p-5 lg:p-7 ${className}`} style={toneStyle(tone, heroBg ? { "--hero-bg": heroBg } : undefined)}>
    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="pro-badge h-12 w-12">
              <Icon size={22} />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-bold tracking-[0.02em]" style={{ color: tone }}>
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-0.5 flex items-center gap-2 truncate text-[22px] font-black text-[var(--text-primary)] lg:text-[28px]">
              {title}
            </h1>
          </div>
        </div>
        {subtitle ? <p className="mt-3 max-w-[560px] text-[13px] leading-relaxed text-[var(--text-muted)]">{subtitle}</p> : null}
        {children}
      </div>
      {aside}
    </div>
  </section>
);

/**
 * কার্ড — `rgb` দিলে ঘুরতে থাকা রংধনু বর্ডার, `glow` দিলে ভিতরে রঙিন আভাও
 * (ছোট কার্ডে সুন্দর, বড় কার্ডে ভারী লাগে), `lined` দিলে উপরে রঙের রেখা।
 */
export const Glass = ({ tone, rgb = false, glow = false, lined = false, hover = false, className = "", style, children }) => (
  <div
    className={`pro-card ${rgb ? "rgb-edge" : ""} ${rgb && glow ? "rgb-glow" : ""} ${lined ? "pro-card--lined" : ""} ${hover ? "pro-card--hover" : ""} ${className}`}
    style={toneStyle(tone, style)}
  >
    {children}
  </div>
);

/** কার্ডের শিরোনাম সারি */
export const Title = ({ tone, Icon, title, subtitle, action }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-3">
      {Icon ? (
        <span className="pro-badge h-9 w-9 rounded-[11px]" style={{ "--tone": tone }}>
          <Icon size={16} />
        </span>
      ) : null}
      <div className="min-w-0">
        <h2 className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
    </div>
    {action}
  </div>
);

/** এক নজরের সংখ্যা — বাঁয়ে রঙের ব্যাজ, নিচে ছোট লেখা */
export const Metric = ({ tone, Icon, label, value, sub, valueTone }) => (
  <Glass tone={tone} lined hover className="p-4">
    <div className="flex items-center gap-3">
      {Icon ? (
        <span className="pro-badge h-11 w-11">
          <Icon size={19} />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[12px] text-[var(--text-muted)]">{label}</p>
        <p className="truncate text-[22px] font-black leading-tight" style={{ color: valueTone || "var(--text-primary)" }}>
          {value}
        </p>
      </div>
    </div>
    {sub ? <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-[12px] text-[var(--text-disabled)]">{sub}</p> : null}
  </Glass>
);

/** বাছাইয়ের ট্যাব — সক্রিয়টা পাতার রঙে */
export const Segmented = ({ tone, items, value, onChange }) => (
  <div className="inline-flex flex-wrap gap-1 rounded-[13px] border border-white/[0.07] bg-[rgb(1_9_40_/_0.5)] p-1">
    {items.map((item) => {
      const on = item.key === value;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className="h-8 cursor-pointer rounded-[10px] px-3.5 text-[13px] transition"
          style={{
            background: on ? tone : "transparent",
            color: on ? "#140a28" : "var(--text-secondary)",
            fontWeight: on ? 700 : 500,
            boxShadow: on ? `0 6px 16px -8px ${tone}` : "none",
          }}
        >
          {item.label}
          {item.count != null ? <span className="ms-1.5 opacity-70">{item.count}</span> : null}
        </button>
      );
    })}
  </div>
);

/** গোল অগ্রগতি — `value / max` */
export const Ring = ({ value = 0, max = 1, size = 120, stroke = 11, tone, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          style={{ stroke: tone, transition: "stroke-dasharray 0.6s ease", filter: `drop-shadow(0 0 6px ${tone})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

/** কয়েক ভাগের গোল চার্ট — `parts: [{ value, tone }]` */
export const Donut = ({ parts, size = 150, stroke = 16, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((sum, p) => sum + Math.max(0, Number(p.value) || 0), 0);
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        {total > 0 &&
          parts.map((p, i) => {
            const len = (Math.max(0, Number(p.value) || 0) / total) * c;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                style={{ stroke: p.tone }}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

/** ভাগ-বার — কোন অংশ কতটা (`parts: [{ value, tone }]`) */
export const StackBar = ({ parts, height = 10 }) => {
  const total = parts.reduce((sum, p) => sum + Math.max(0, Number(p.value) || 0), 0);
  return (
    <div className="flex w-full overflow-hidden rounded-full bg-white/[0.07]" style={{ height }}>
      {total > 0 &&
        parts.map((p, i) => (
          <span
            key={i}
            style={{ width: `${(Math.max(0, Number(p.value) || 0) / total) * 100}%`, background: p.tone }}
            className="h-full transition-[width] duration-500"
          />
        ))}
    </div>
  );
};

/** নামের প্রথম অক্ষরের গোল ছবি */
export const Avatar = ({ name, tone, size = 38 }) => (
  <span
    className="pro-badge rounded-full font-black"
    style={{ "--tone": tone, width: size, height: size, fontSize: size * 0.4 }}
  >
    {String(name || "?").slice(0, 1).toUpperCase()}
  </span>
);

/** অবস্থার ব্যাজ */
export const Badge = ({ tone, children, dot = true }) => (
  <span
    className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-bold"
    style={{ background: `color-mix(in srgb, ${tone}, transparent 86%)`, color: tone }}
  >
    {dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} /> : null}
    {children}
  </span>
);

/** ফাঁকা অবস্থা — পাতার রঙে */
export const Blank = ({ tone, Icon, label }) => (
  <div className="flex flex-col items-center gap-3 py-12 text-center">
    {Icon ? (
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `color-mix(in srgb, ${tone}, transparent 88%)`, color: tone }}
      >
        <Icon size={26} />
      </span>
    ) : null}
    <p className="text-[14px] text-[var(--text-muted)]">{label}</p>
  </div>
);
