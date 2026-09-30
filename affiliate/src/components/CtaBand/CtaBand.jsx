import React from "react";
import { Link } from "react-router";
import { useSelector } from "react-redux";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "../../Context/LanguageProvider";
import { selectAffiliateHome } from "../../features/global/globalSelectors";

/**
 * পেজের শেষের আহ্বান — **ক্লায়েন্টের ফুটারের ঠিক উপরের চওড়া ব্যানারের
 * মতো**: পুরো প্রস্থে ছবি, উপরে গাঢ় ঢাল আর সোনালি বোতাম।
 */
const CtaBand = () => {
  const { t, tv } = useLanguage();
  const c = useSelector(selectAffiliateHome)?.cta || {};

  return (
    <section className="tb-section">
      <div className="tb-wrap">
        <div className="relative overflow-hidden rounded-[14px]">
          <img
            src={`${import.meta.env.BASE_URL}assets/tb/cta-banner.webp`}
            alt=""
            className="h-[240px] w-full object-cover sm:h-[220px]"
            loading="lazy"
            draggable="false"
          />

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgb(15 2 56 / 0.95) 0%, rgb(15 2 56 / 0.78) 55%, rgb(15 2 56 / 0.2) 100%)",
            }}
          />

          <div className="absolute inset-0 flex items-center px-5 sm:px-8 lg:px-12">
            <div className="max-w-lg">
              <h2 className="tb-h2">
                <span className="tb-gold">{tv(c.title) || t("ctaTitle")}</span>
              </h2>

              <p className="tb-lead">{tv(c.text) || t("ctaText")}</p>

              <Link to="/register" className="tb-btn tb-btn--gold tb-btn--lg mt-5">
                {tv(c.button) || t("joinNow")}
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBand;
