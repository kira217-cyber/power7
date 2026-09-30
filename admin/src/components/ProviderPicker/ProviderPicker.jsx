import React, { useEffect, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

import { cachedProviders, loadProviders, providerImage } from "./providers";

const clamp = (value) => Math.min(100, Math.max(0, Number(value) || 0));

/**
 * টার্নওভারে কোন প্রোভাইডার গোনা হবে।
 *
 * প্রতিটা প্রোভাইডারের শতাংশ তার জন্য **বাঁধা ন্যূনতম অংশ** — ৫০%+৫০%
 * দিলে পুরো শর্ত দুই ভাগে ভাগ হয়ে যায়, একটাতেই খেলে কখনো শেষ হবে না।
 * যোগফল ১০০ এর কম হলে বাকিটা খোলা অংশ, সেখানে যে কেউ জমা দিতে পারে।
 * কিছু না বাছলে কোনো বাধা নেই — যে কোনো প্রোভাইডার ১:১ গোনে।
 *
 * ব্যবহার হয় Register Bonus, Bonus & Turnover (মেথড ও প্রতিটা
 * প্রোমোশন) আর Auto Deposit এর প্রতিটা বোনাসে।
 */
const ProviderPicker = ({ value, onChange }) => {
  const [providers, setProviders] = useState(cachedProviders() || []);
  const [loading, setLoading] = useState(!cachedProviders());
  const [error, setError] = useState("");

  useEffect(() => {
    if (cachedProviders()) return undefined;

    let alive = true;

    loadProviders()
      .then((list) => alive && setProviders(list))
      .catch((err) =>
        alive &&
        setError(
          err?.response?.data?.message ||
            "Providers could not be loaded — check the Game API key",
        ),
      )
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  const selected = {};

  (Array.isArray(value) ? value : []).forEach((item) => {
    const code = String(item?.providerCode || "").toUpperCase();

    if (code) selected[code] = clamp(item?.percent ?? 100);
  });

  const emit = (next) =>
    onChange(
      Object.entries(next).map(([providerCode, percent]) => ({
        providerCode,
        percent,
      })),
    );

  const toggle = (code) => {
    const next = { ...selected };

    if (code in next) delete next[code];
    else next[code] = 100;

    emit(next);
  };

  const total = Object.values(selected).reduce((sum, item) => sum + item, 0);
  const open = Math.max(0, 100 - total);
  const over = total > 100;
  const count = Object.keys(selected).length;

  return (
    <div className="rounded-[14px] border border-white/[0.07] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-[var(--text-muted)]">
          {count
            ? `${count} provider(s) selected`
            : "Nothing selected — every provider counts in full"}
        </p>

        {count > 0 && (
          <span
            className="rounded-full px-2 py-[2px] text-[11px] font-bold"
            style={{
              background: over
                ? "color-mix(in srgb, var(--status-danger), transparent 88%)"
                : "rgba(255,255,255,0.06)",
              color: over ? "var(--status-danger)" : "var(--text-secondary)",
            }}
          >
            Dedicated {total}%
            {over ? " — cannot save over 100%" : ` · open ${open}%`}
          </span>
        )}
      </div>

      {error ? (
        <p className="flex items-center gap-2 text-[13px] text-[var(--status-danger)]">
          <TriangleAlert size={14} />
          {error}
        </p>
      ) : loading ? (
        <p className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <Loader2 size={14} className="animate-spin" />
          Loading providers…
        </p>
      ) : providers.length === 0 ? (
        <p className="text-[13px] text-[var(--text-disabled)]">
          No provider found on the game platform.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {providers.map((provider) => {
            const code = provider.providerCode;
            const checked = code in selected;

            return (
              <div
                key={code}
                className="rounded-[12px] border p-2 transition"
                style={{
                  borderColor: checked
                    ? "color-mix(in srgb, var(--primary500), transparent 55%)"
                    : "rgba(255,255,255,0.07)",
                  background: checked
                    ? "color-mix(in srgb, var(--primary500), transparent 94%)"
                    : "rgba(0,0,0,0.25)",
                }}
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(code)}
                    className="h-[14px] w-[14px] shrink-0 cursor-pointer"
                  />

                  {providerImage(provider) ? (
                    <img
                      src={providerImage(provider)}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-[8px] object-contain"
                    />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded-[8px] bg-white/[0.06]" />
                  )}

                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-[var(--neutral100)]">
                      {provider.providerName}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">
                      {code}
                    </span>
                  </span>
                </label>

                {checked && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={selected[code]}
                      onChange={(event) =>
                        emit({ ...selected, [code]: clamp(event.target.value) })
                      }
                      className="ad-input h-9 text-[13px]"
                    />
                    <span className="text-[13px] font-bold text-[var(--text-muted)]">
                      %
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderPicker;
