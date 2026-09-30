import React from "react";
import { useSelector } from "react-redux";
import { Gift, Wallet, Layers, Trophy } from "lucide-react";

import Section from "../Section/Section";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectStats, selectAffiliateHome } from "../../features/global/globalSelectors";

/**
 * "৪ টি রেফার কমিশন" — মূল সাইটের রেফারেল অফারের চারটা সংখ্যা।
 *
 * প্রতিটা ঘরে **ক্লায়েন্টের ক্যাটাগরি আইটেমের চেহারা**: আইকনের পিছনে
 * বেগুনি ডিম্বাকৃতি রিং, নিচে সোনালি গ্রেডিয়েন্টে সংখ্যা।
 * (BetChokkor এ এটা ছিল সাদামাটা চার কলামের একটা বার।)
 */
const ICONS = [Gift, Wallet, Layers, Trophy];

const Stats = () => {
  const { t, tv, isBangla } = useLanguage();
  const stats = useSelector(selectStats);
  const home = useSelector(selectAffiliateHome);

  const list = home?.stats?.length
    ? home.stats.map((s, i) => ({ key: i, value: tv(s.value), label: tv(s.label) }))
    : stats.map((s) => ({
        key: s.key,
        value: isBangla ? s.value : s.valueEn,
        label: t(s.labelKey),
      }));

  return (
    <Section id="rewards" title={t("statsTitle")} text={t("statsText")}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {list.map((item, index) => {
          const Icon = ICONS[index % ICONS.length];

          return (
            <div
              key={item.key}
              className="tb-card flex flex-col items-center !px-3 py-5 text-center"
            >
              <span className="tb-ring tb-ring--on">
                <Icon size={30} color="var(--gold)" />
              </span>

              <p className="tb-gold mt-3 text-[22px] leading-none font-extrabold sm:text-[26px]">
                {item.value}
              </p>

              <p className="mt-2 text-[13px] leading-snug text-[var(--text-muted)]">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

export default Stats;
