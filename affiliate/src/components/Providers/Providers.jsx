import React from "react";
import { useSelector } from "react-redux";

import Section from "../Section/Section";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectProviders, selectAffiliateHome } from "../../features/global/globalSelectors";

/**
 * প্রোভাইডার — **ক্লায়েন্টের ভেন্ডর চিপ হুবহু**: ১৫২ × ৫০, radius ১০,
 * ১.৫px বেগুনি বর্ডার, ভিতরে লোগো ১৫০ চওড়া contain। ছোট পর্দায় একটানা
 * পাশে স্ক্রল করে, ঠিক ক্লায়েন্টের সেকশনের মতো।
 */
const Providers = () => {
  const { t, tv } = useLanguage();
  const providers = useSelector(selectProviders);
  const c = useSelector(selectAffiliateHome)?.providers || {};

  const list = c.items?.length
    ? c.items.map((p, i) => ({ key: i, name: p.name, icon: p.image }))
    : providers;

  return (
    <Section
      title={tv(c.title) || t("providersTitle")}
      text={tv(c.text) || t("providersText")}
    >
      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:justify-center lg:overflow-visible">
        {list.map((item) => (
          <span key={item.key} className="tb-chip">
            <img src={item.icon} alt={item.name} loading="lazy" draggable="false" />
          </span>
        ))}
      </div>
    </Section>
  );
};

export default Providers;
