import React from "react";
import { Link } from "react-router";
import { useSelector } from "react-redux";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "../../Context/LanguageProvider";
import { selectAffiliateHome, selectStats } from "../../features/global/globalSelectors";

/**
 * হিরো — বাঁয়ে লেখা ও দুটো পিল বোতাম, ডানে মূল সাইটের আসল রেফারেল
 * ক্রিয়েটিভ একটা কার্ডে। ক্রিয়েটিভটার নিজের লেখা আছে, তাই তার **উপরে**
 * কিছু বসাই না — পাশে রাখি।
 *
 * নিচে ক্লায়েন্ট সাইটের চলন্ত নোটিশ বার, চারটা কমিশনের সংখ্যা নিয়ে।
 */
const Hero = () => {
  const { t, tv, isBangla } = useLanguage();
  const home = useSelector(selectAffiliateHome);
  const stats = useSelector(selectStats);
  const h = home?.hero || {};

  const banner =
    h.desktopImage || `${import.meta.env.BASE_URL}assets/banners/affiliate-desktop.png`;

  const ticker = stats
    .map((s) => `${isBangla ? s.value : s.valueEn} ${t(s.labelKey)}`)
    .join("　·　");

  return (
    <section className="tb-glow overflow-hidden">
      <div className="tb-wrap py-8 lg:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="text-center lg:text-start">
            <span className="tb-eyebrow">{tv(h.badge) || t("heroBadge")}</span>

            <h1 className="tb-h1 mt-4">
              <span className="tb-gold">{tv(h.title) || t("heroTitle")}</span>
            </h1>

            <p className="tb-lead mx-auto max-w-xl lg:mx-0">{tv(h.text) || t("heroText")}</p>

            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <Link to="/register" className="tb-btn tb-btn--gold tb-btn--lg">
                {tv(h.joinBtn) || t("joinNow")}
                <ArrowRight size={18} />
              </Link>

              <Link to="/login" className="tb-btn tb-btn--ghost tb-btn--lg">
                {tv(h.loginBtn) || t("login")}
              </Link>
            </div>
          </div>

          {/* ── আসল রেফারেল ক্রিয়েটিভ ── */}
          <div
            className="h-fit self-center overflow-hidden rounded-[16px]"
            style={{ border: "1px solid rgb(188 67 244 / 0.35)" }}
          >
            <img
              src={banner}
              alt={tv(h.title) || t("heroTitle")}
              className="block w-full"
              style={{ aspectRatio: "696 / 338", objectFit: "cover" }}
              draggable="false"
            />
          </div>
        </div>

        {/* ── চলন্ত নোটিশ বার — ক্লায়েন্টের হোমে যেমন ── */}
        {ticker && (
          <div className="tb-notice mt-8">
            <img
              src={`${import.meta.env.BASE_URL}assets/tb/speaker.png`}
              alt=""
              className="h-[30px] w-[30px] shrink-0 object-contain"
              draggable="false"
            />

            <div className="relative flex-1 overflow-hidden">
              <div className="tb-marquee">
                {/* কনটেন্ট দুবার — একটানা লুপ, বার কখনো ফাঁকা হয় না */}
                {[0, 1].map((copy) => (
                  <span key={copy} className="pe-10 text-[14px] whitespace-nowrap text-white">
                    {ticker}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
