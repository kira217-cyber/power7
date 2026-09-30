import React from "react";
import { useNavigate } from "react-router";
import { RefreshCw } from "lucide-react";

/** টাকার অঙ্ক দেখানো — ৳ 1,234.00 */
export const taka = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "৳ 0.00";
  return `৳ ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * ইতিহাস/রিকোয়েস্ট পাতার সোনালি গ্রেডিয়েন্ট হেডার — Bajiman এর মতো,
 * রঙ আমাদের সাইটের (গোল্ড/ডার্ক)। বাঁয়ে আইকন + শিরোনাম, ডানে রিফ্রেশ।
 */
export const HistoryHeader = ({ title, subtitle, Icon, onRefresh, loading }) => (
  <div
    className="mb-5 overflow-hidden rounded-[24px] border px-5 py-5 md:px-6 md:py-6"
    style={{
      background:
        "linear-gradient(90deg, var(--neutral1000), color-mix(in srgb, var(--primary500), transparent 82%), var(--neutral1000))",
      borderColor: "color-mix(in srgb, var(--primary500), transparent 78%)",
    }}
  >
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-[18px]"
          style={{
            background:
              "linear-gradient(135deg, var(--primary400), var(--primary500))",
            color: "var(--neutral1000)",
          }}
        >
          {Icon ? <Icon size={26} /> : null}
        </span>

        <div>
          <h1 className="text-[24px] font-black tracking-tight text-[var(--neutral100)] md:text-[30px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-[13px] font-medium text-[var(--text-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="ad-btn ad-btn--primary"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      ) : null}
    </div>
  </div>
);

/** সারাংশ কার্ড — টাকা (বড়) + রেকর্ড সংখ্যা + আইকন */
export const StatCard = ({ title, amount, count, color, Icon }) => (
  <div className="ad-card">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </div>
        <div className="mt-2 text-[22px] font-black" style={{ color }}>
          {amount}
        </div>
        <div className="mt-1 text-[13px] font-semibold text-[var(--text-disabled)]">
          {Number(count || 0)} records
        </div>
      </div>

      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]"
        style={{
          background: `color-mix(in srgb, ${color}, transparent 86%)`,
          color,
        }}
      >
        {Icon ? <Icon size={22} /> : null}
      </span>
    </div>
  </div>
);

/**
 * ইতিহাসের পাতাগুলোর সাধারণ অংশ।
 *
 * পাঁচটা পাতায় (গেম, টার্নওভার, অটো ডিপোজিট, ডিপোজিট, উইথড্র) একই
 * সারাংশের কার্ড, একই ইউজার-ঘর আর একই পাতা বদলানোর সারি — তাই এক
 * জায়গায়। একটা বদলালে সব জায়গায় বদলায়।
 */

/**
 * ইউজারের ঘর — নামে ক্লিক করলে তার বিস্তারিত পাতায়।
 *
 * যেকোনো ইতিহাস থেকে "এই লোকটা আসলে কে" দেখতে চাইলে আগে Users এ গিয়ে
 * খুঁজতে হতো; এখন নামটাই লিংক।
 *
 * `user` হতে পারে শুধু আইডি (lean কোয়েরি) বা populate করা অবজেক্ট —
 * দুটোই চলে। অ্যাফিলিয়েট হলে অ্যাফিলিয়েটের পাতায় যায়, কারণ দুই
 * তালিকার বিস্তারিত পাতা আলাদা।
 */
export const UserCell = ({ user, userId, sub }) => {
  const navigate = useNavigate();

  const id = String(user?._id || user || "").trim();
  const name = userId || user?.userId || "—";
  const isAffiliate = user?.role === "aff-user";

  const detail = sub ?? user?.phone ?? "";

  if (!id) {
    return (
      <div>
        <p className="text-[14px] font-semibold text-[var(--neutral100)]">
          {name}
        </p>
        {detail ? (
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{detail}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        title="Open user details"
        onClick={() => navigate(`/${isAffiliate ? "affiliates" : "users"}/${id}`)}
        className="cursor-pointer text-left text-[14px] font-semibold text-[var(--neutral100)] underline decoration-[var(--primary500)]/40 underline-offset-4 transition hover:text-[var(--primary500)]"
      >
        {name}
      </button>

      {detail ? (
        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{detail}</p>
      ) : null}
    </div>
  );
};

/**
 * শুধু নামটা লিংক হিসেবে — যেসব পাতার ঘর নিজের নকশায় (আইকন, ফোন) সাজানো,
 * সেখানে নামের জায়গায় বসে। ক্লিকে ইউজার বা অ্যাফিলিয়েটের বিস্তারিত পাতা।
 */
export const UserLink = ({ user, name, className = "text-[13px] font-bold" }) => {
  const navigate = useNavigate();
  const id = String(user?._id || user || "").trim();
  const label = name || user?.userId || "Unknown";
  if (!id) return <span className={`${className} text-[var(--neutral100)]`}>{label}</span>;
  return (
    <button
      type="button"
      title="Open user details"
      onClick={() => navigate(`/${user?.role === "aff-user" ? "affiliates" : "users"}/${id}`)}
      className={`${className} cursor-pointer text-left text-[var(--neutral100)] underline decoration-[var(--primary500)]/40 underline-offset-4 transition hover:text-[var(--primary500)]`}
    >
      {label}
    </button>
  );
};

/**
 * উপরের সারাংশের কার্ডগুলো।
 *
 * `items` এ `[label, value, tone?, sub?]` — এক নজরে মোট কত, কত গেল,
 * কত এলো। তালিকায় নামার আগেই ছবিটা পাওয়া যায়।
 */
export const SummaryCards = ({ items, columns = 4 }) => (
  <div
    className={`mb-4 grid gap-3 sm:grid-cols-2 ${
      columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
    }`}
  >
    {items.map(([label, value, tone, sub]) => (
      <div key={label} className="ad-card py-4">
        <p className="text-[13px] text-[var(--text-muted)]">{label}</p>

        <p
          className="mt-1 text-[22px] font-black"
          style={{ color: tone || "var(--text-primary)" }}
        >
          {value}
        </p>

        {sub ? (
          <p className="mt-1 text-[12px] text-[var(--text-disabled)]">{sub}</p>
        ) : null}
      </div>
    ))}
  </div>
);

/** পাতা বদলানোর সারি — একটাই পাতা হলে দেখা যায় না */
export const Pager = ({ page, totalPages, busy, onChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={page <= 1 || busy}
        onClick={() => onChange(page - 1)}
        className="ad-btn ad-btn--ghost ad-btn--sm"
      >
        Previous
      </button>

      <span className="text-[13px] text-[var(--text-muted)]">
        {page} / {totalPages}
      </span>

      <button
        type="button"
        disabled={page >= totalPages || busy}
        onClick={() => onChange(page + 1)}
        className="ad-btn ad-btn--ghost ad-btn--sm"
      >
        Next
      </button>
    </div>
  );
};
