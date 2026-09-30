import React from "react";
import { useSelector } from "react-redux";

import Section from "../Section/Section";
import Calculator from "../Calculator/Calculator";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectCommissionTiers, selectAffiliateHome } from "../../features/global/globalSelectors";

/**
 * কমিশন স্ল্যাব।
 *
 * টেবিল নয় — **ক্লায়েন্টের সাইডবার/তালিকার মতো সারি**: প্রতিটা স্ল্যাব
 * একটা পিল, বাঁয়ে বেগুনি বৃত্তে নম্বর, ডানে সোনালি গ্রেডিয়েন্টে শতাংশ।
 * সর্বোচ্চ স্ল্যাবটা বেগুনি টিন্টে ভরাট, ঠিক সক্রিয় nav-item এর মতো।
 */
const Commission = () => {
  const { t, tv } = useLanguage();
  const staticTiers = useSelector(selectCommissionTiers);
  const c = useSelector(selectAffiliateHome)?.commission || {};

  const tiers = c.tiers?.length
    ? c.tiers.map((x, i) => ({ key: i, tier: i + 1, players: x.players, share: x.share }))
    : staticTiers;

  const topKey = tiers.length ? tiers[tiers.length - 1].key : null;

  return (
    <Section
      id="commission"
      title={tv(c.title) || t("commissionTitle")}
      text={tv(c.text) || t("commissionText")}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-6">
        {/* ── স্ল্যাবের সারি ── */}
        <div className="flex flex-col gap-2.5">
          {tiers.map((tier) => {
            const isTop = tier.key === topKey;

            return (
              <div
                key={tier.key}
                className="flex items-center gap-3 rounded-[12px] px-3 py-3 sm:px-4"
                style={{
                  background: isTop ? "var(--accent-soft)" : "rgb(255 255 255 / 0.04)",
                  border: `1px solid ${isTop ? "var(--accent-bright)" : "transparent"}`,
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                  style={{
                    background: isTop ? "var(--accent-bright)" : "rgb(188 67 244 / 0.25)",
                    color: isTop ? "#fff" : "var(--gold)",
                  }}
                >
                  {tier.tier}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-white">{tv(tier.players)}</p>
                  <p className="text-[12px] text-[var(--text-muted)]">{t("activePlayers")}</p>
                </div>

                <span
                  className={`shrink-0 text-[20px] font-extrabold sm:text-[24px] ${
                    isTop ? "tb-gold" : ""
                  }`}
                  style={isTop ? undefined : { color: "#fff" }}
                >
                  {tier.share}%
                </span>
              </div>
            );
          })}
        </div>

        <Calculator />
      </div>
    </Section>
  );
};

export default Commission;
