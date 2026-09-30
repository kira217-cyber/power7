import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { useLanguage } from "../../Context/LanguageProvider";
import { selectCommissionTiers } from "../../features/global/globalSelectors";

// বাংলা অঙ্কে সংখ্যা দেখানোর জন্য
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

const toBn = (value) =>
  String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const format = (value, isBangla) => {
  const text = new Intl.NumberFormat("en-US").format(Math.round(value));
  return isBangla ? toBn(text) : text;
};

/**
 * আয়ের হিসাব — সক্রিয় প্লেয়ার সংখ্যা ও প্লেয়ার-প্রতি গড় লস থেকে
 * আনুমানিক মাসিক কমিশন। স্ল্যাব নিজে থেকেই বেছে নেয়।
 */
const Calculator = () => {
  const { t, isBangla } = useLanguage();
  const tiers = useSelector(selectCommissionTiers);

  const [players, setPlayers] = useState(25);
  const [average, setAverage] = useState(4000);

  const { share, income } = useMemo(() => {
    // প্লেয়ার সংখ্যা অনুযায়ী স্ল্যাব — তালিকার ক্রম অনুসারে
    const bounds = [10, 30, 60, 100];
    let index = bounds.findIndex((max) => players <= max);
    if (index === -1) index = tiers.length - 1;

    const tier = tiers[Math.min(index, tiers.length - 1)];
    const pct = tier?.share || 0;

    return { share: pct, income: (players * average * pct) / 100 };
  }, [players, average, tiers]);

  const slider = (value, min, max, step, onChange) => (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="tb-range mt-3"
    />
  );

  return (
    <div className="tb-card !p-4 sm:!p-5">
      <h3 className="text-[17px] font-bold text-white sm:text-[20px]">{t("calcTitle")}</h3>

      <div className="mt-5 flex flex-col gap-5">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className="text-[14px] text-[var(--text-muted)]">
              {t("calcPlayers")}
            </label>
            <span className="text-[16px] font-bold text-[var(--gold)]">
              {format(players, isBangla)}
            </span>
          </div>

          {slider(players, 1, 200, 1, setPlayers)}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className="text-[14px] text-[var(--text-muted)]">
              {t("calcAverage")}
            </label>
            <span className="text-[16px] font-bold text-[var(--gold)]">
              ৳{format(average, isBangla)}
            </span>
          </div>

          {slider(average, 500, 20000, 500, setAverage)}
        </div>

        <div
          className="rounded-[12px] p-4 text-center"
          style={{
            background: "var(--accent-soft)",
            border: "1px solid var(--accent-bright)",
          }}
        >
          <p className="text-[13px] text-[var(--text-muted)]">
            {t("calcResult")} · {isBangla ? toBn(share) : share}%
          </p>

          <p className="tb-gold mt-1 text-[28px] leading-tight font-extrabold lg:text-[32px]">
            ৳{format(income, isBangla)}
          </p>
        </div>

        <p className="text-[12px] leading-relaxed text-[var(--text-disabled)]">
          {t("calcNote")}
        </p>
      </div>

    </div>
  );
};

export default Calculator;
