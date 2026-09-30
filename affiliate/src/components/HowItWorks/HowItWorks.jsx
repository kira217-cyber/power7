import React from "react";
import { useSelector } from "react-redux";
import { UserPlus, Share2, Wallet, Circle } from "lucide-react";

import Section from "../Section/Section";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectSteps, selectAffiliateHome } from "../../features/global/globalSelectors";

const ICONS = { UserPlus, Share2, Wallet };

/**
 * তিন ধাপ — **ক্লায়েন্টের ক্যাটাগরি সারির চেহারা**: আইকনের পিছনে
 * বেগুনি রিং, নিচে নাম, ধাপগুলোর মাঝে সোনালি ড্যাশ-রেখা।
 * (BetChokkor এ ছিল তিনটা বাক্স, কোণায় বড় ০১/০২/০৩।)
 */
const HowItWorks = () => {
  const { t, tv } = useLanguage();
  const steps = useSelector(selectSteps);
  const c = useSelector(selectAffiliateHome)?.howItWorks || {};

  const list = c.steps?.length
    ? c.steps.map((s, i) => ({ key: i, icon: s.icon, title: tv(s.title), text: tv(s.text) }))
    : steps.map((s) => ({ key: s.key, icon: s.icon, title: t(s.titleKey), text: t(s.textKey) }));

  return (
    <Section id="how-it-works" title={tv(c.title) || t("howTitle")}>
      <div className="grid gap-6 md:grid-cols-3 md:gap-4">
        {list.map((step, index) => {
          const Icon = ICONS[step.icon] || Circle;

          return (
            <div key={step.key} className="relative flex flex-col items-center text-center">
              {/* ধাপগুলোর মাঝে জোড়ার রেখা — শুধু ডেস্কটপে */}
              {index < list.length - 1 && (
                <span
                  className="absolute top-[40px] hidden md:block"
                  style={{
                    left: "calc(50% + 52px)",
                    right: "calc(-50% + 52px)",
                    height: 2,
                    background:
                      "repeating-linear-gradient(90deg, var(--gold) 0 6px, transparent 6px 12px)",
                    opacity: 0.5,
                  }}
                />
              )}

              <span className="tb-ring">
                <Icon size={30} color="var(--gold)" />
              </span>

              <span
                className="mt-2 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold"
                style={{ background: "var(--accent-bright)", color: "#fff" }}
              >
                {index + 1}
              </span>

              <h3 className="mt-3 text-[17px] font-bold text-white">{step.title}</h3>
              <p className="tb-lead !mt-2 max-w-[280px]">{step.text}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

export default HowItWorks;
