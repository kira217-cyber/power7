import React from "react";
import { useSelector } from "react-redux";
import {
  TrendingUp,
  BarChart3,
  Zap,
  ShieldCheck,
  Headset,
  Megaphone,
  Circle,
} from "lucide-react";

import Section from "../Section/Section";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectFeatures, selectAffiliateHome } from "../../features/global/globalSelectors";

const ICONS = { TrendingUp, BarChart3, Zap, ShieldCheck, Headset, Megaphone };

/**
 * ছয়টি ফিচার — **ক্লায়েন্টের গেম কার্ডের চেহারা**: গোল কোণা,
 * উপরে-ডানে বেগুনি ব্যাজে নম্বর, নাম সোনালি গ্রেডিয়েন্টে।
 */
const WhyUs = () => {
  const { t, tv } = useLanguage();
  const features = useSelector(selectFeatures);
  const c = useSelector(selectAffiliateHome)?.whyUs || {};

  const list = c.features?.length
    ? c.features.map((f, i) => ({ key: i, icon: f.icon, title: tv(f.title), text: tv(f.text) }))
    : features.map((f) => ({ key: f.key, icon: f.icon, title: t(f.titleKey), text: t(f.textKey) }));

  return (
    <Section id="why-us" title={tv(c.title) || t("whyTitle")}>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {list.map((item, index) => {
          const Icon = ICONS[item.icon] || Circle;

          return (
            <div key={item.key} className="tb-card">
              {/* গেম কার্ডের ভেন্ডর ব্যাজের মতো */}
              <span
                className="absolute top-0 right-0 flex h-[26px] min-w-[42px] items-center justify-center text-[12px] font-bold text-white"
                style={{
                  background: "var(--accent-bright)",
                  borderRadius: "0 0 0 10px",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <span
                className="flex h-11 w-11 items-center justify-center rounded-[12px]"
                style={{ background: "var(--accent-soft)", color: "var(--gold)" }}
              >
                <Icon size={20} />
              </span>

              <h3 className="tb-gold mt-4 text-[17px] font-bold">{item.title}</h3>
              <p className="tb-lead !mt-2">{item.text}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

export default WhyUs;
