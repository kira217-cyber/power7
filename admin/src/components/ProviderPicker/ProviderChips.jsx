import React, { useEffect, useState } from "react";

import { cachedProviders, loadProviders, providerImage } from "./providers";

/**
 * বোনাসে বাছা প্রোভাইডারগুলো — ছবি, নাম আর শতাংশ সহ ছোট চিপে।
 * `list` = `[{ providerCode, percent }]`; খালি হলে `emptyText`।
 */
const ProviderChips = ({ list, emptyText = "Any" }) => {
  const [providers, setProviders] = useState(cachedProviders() || []);

  useEffect(() => {
    if (cachedProviders()) return undefined;
    let alive = true;
    loadProviders()
      .then((items) => alive && setProviders(items))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const items = Array.isArray(list) ? list : [];
  if (!items.length) return <span className="text-[var(--text-muted)]">{emptyText}</span>;

  const byCode = Object.fromEntries(providers.map((p) => [String(p.providerCode).toUpperCase(), p]));

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {items.map((item) => {
        const code = String(item.providerCode || "").toUpperCase();
        const provider = byCode[code];
        const img = providerImage(provider);
        return (
          <span
            key={code}
            title={provider?.providerName || code}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] py-[2px] pl-[3px] pr-2 text-[12px] font-semibold text-[var(--text-secondary)]"
          >
            {img ? (
              <img src={img} alt="" className="h-5 w-5 rounded-full bg-black/30 object-contain" />
            ) : (
              <span className="h-5 w-5 rounded-full bg-white/[0.08]" />
            )}
            {provider?.providerName || code} {item.percent ?? 100}%
          </span>
        );
      })}
    </span>
  );
};

export default ProviderChips;
