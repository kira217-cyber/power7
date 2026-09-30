import React, { useState } from "react";
import { useSelector } from "react-redux";
import { ChevronDown } from "lucide-react";

import Section from "../Section/Section";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectFaqs, selectAffiliateHome } from "../../features/global/globalSelectors";

/** সাধারণ প্রশ্ন — একসাথে একটাই খোলা থাকে */
const Faq = () => {
  const { t, tv } = useLanguage();
  const faqs = useSelector(selectFaqs);
  const home = useSelector(selectAffiliateHome);
  const c = home?.faq || {};

  const list = c.items?.length
    ? c.items.map((x, i) => ({ key: i, q: x.q, a: x.a }))
    : faqs;

  const [openKey, setOpenKey] = useState(list[0]?.key ?? null);

  return (
    <Section id="faq" title={tv(c.title) || t("faqTitle")}>
      <div className="flex flex-col gap-2.5">
        {list.map((item) => {
          const isOpen = openKey === item.key;

          return (
            <div
              key={item.key}
              className="overflow-hidden rounded-[12px]"
              style={{
                background: isOpen ? "var(--accent-soft)" : "rgb(255 255 255 / 0.04)",
                border: `1px solid ${isOpen ? "var(--accent-bright)" : "transparent"}`,
              }}
            >
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : item.key)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-start"
              >
                <span
                  className={`text-[15px] font-semibold lg:text-[16px] ${isOpen ? "tb-gold" : "text-white"}`}
                >
                  {tv(item.q)}
                </span>

                <ChevronDown
                  size={18}
                  className={`shrink-0 text-[var(--gold)] transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="tb-lead !mt-0 px-5 pb-5">{tv(item.a)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

export default Faq;
