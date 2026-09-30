import React from "react";
import { useSelector } from "react-redux";

import { useLanguage } from "../../Context/LanguageProvider";
import { selectAffiliateAuth, selectSiteIdentify } from "../../features/global/globalSelectors";

/**
 * লগইন / রেজিস্টার / পাসওয়ার্ড রিসেট পেজের শেয়ার্ড মোড়ক।
 *
 * **ক্লায়েন্ট সাইটের লগইন পেজের চেহারা** — উপরে লোগো, তার নিচে বড়
 * শিরোনাম, তারপর গাঢ় কার্ডে ফর্ম। ইনপুট bg #010E22 + বর্ডার #D6E2F4,
 * সাবমিট বেগুনি #BC43F4, লিংক সবুজ #7BC242 (সব `.tb-auth` টোকেনে)।
 */
const AuthCard = ({ title, subtitle, width = "460px", children, footer, footerLead, variant, main = false }) => {
  const { t, tv } = useLanguage();
  const auth = useSelector(selectAffiliateAuth);
  const siteIdentify = useSelector(selectSiteIdentify);
  const c = (variant && auth?.[variant]) || {};

  // admin এর লেখা শুধু পাতার মূল ধাপে — OTP বা "আবেদন পাঠানো হয়েছে" ধাপের
  // নিজের শিরোনাম থাকে, সেখানে বসালে ভুল কথা দেখাত
  const heading = (main && tv(c.title)) || title;
  const sub = (main && tv(c.subtitle)) || subtitle;
  const lead = (main && tv(c.footerText)) || footerLead;
  const logo = c.image || siteIdentify?.brandLogo || siteIdentify?.logo || "";

  return (
    <div className="tb-auth tb-glow flex min-h-[calc(100vh-56px)] justify-center lg:min-h-[calc(100vh-63px)]">
      <div className="tb-wrap flex justify-center py-8 lg:py-14">
        <div className="w-full" style={{ maxWidth: width }}>
          {logo && (
            <img
              src={logo}
              alt=""
              className="mx-auto mb-6 h-[52px] w-auto object-contain lg:h-[62px]"
              draggable="false"
            />
          )}

          <div className="mb-6 text-center">
            <h1 className="tb-h2">
              <span className="tb-gold">{heading}</span>
            </h1>
            <p className="tb-lead !mt-2">{sub}</p>
          </div>

          <div
            className="rounded-[16px] p-5 sm:p-6"
            style={{
              background: "var(--aff-auth-card, var(--surface))",
              border: "1px solid rgb(188 67 244 / 0.28)",
            }}
          >
            {children}
          </div>

          {footer && (
            <p className="mt-5 text-center text-[14px] text-[var(--text-muted)]">
              {lead && <>{lead} </>}
              {footer}
            </p>
          )}

          <p className="mt-5 text-center text-[12px] text-[var(--text-faint)]">
            {t("ageNotice")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCard;
