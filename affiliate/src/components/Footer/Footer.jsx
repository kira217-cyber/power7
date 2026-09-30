import React from "react";
import { Link } from "react-router";
import { useSelector } from "react-redux";

import { useLanguage } from "../../Context/LanguageProvider";
import { selectFooter, selectSiteIdentify } from "../../features/global/globalSelectors";

/* ব্যাজগুলো ক্লায়েন্ট সাইটের ফুটার থেকে কপি করা — একই ব্র্যান্ড */
const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;

const LICENSES = [
  { key: "curacao", src: asset("footer/curacao.png"), alt: "Curacao" },
  { key: "cert1", src: asset("footer/certificate-1.png"), alt: "Certificate" },
  { key: "cert2", src: asset("footer/certificate-2.png"), alt: "Certificate" },
  { key: "cert3", src: asset("footer/certificate-3.png"), alt: "Certificate" },
];

const RESPONSIBLE = [
  { key: "responsible1", src: asset("footer/responsible-1.png"), alt: "Responsible gaming" },
  { key: "responsible2", src: asset("footer/responsible-2.png"), alt: "Responsible gaming" },
  { key: "security1", src: asset("footer/security-1.png"), alt: "Secure" },
  { key: "security2", src: asset("footer/security-2.png"), alt: "Secure" },
];

const Footer = () => {
  const { t, tv } = useLanguage();
  const footer = useSelector(selectFooter);
  const siteIdentify = useSelector(selectSiteIdentify);

  // ফুটারের নিজের লোগো অ্যাডমিন থেকে আসে; না থাকলে সাইটের ব্র্যান্ড
  // লোগোটাই — নইলে "Logo not found" দেখায়
  const logo = footer?.logo || siteIdentify?.brandLogo || siteIdentify?.logo || "";
  const ctaText = tv(footer?.description) || t("ctaText");
  const copyright = tv(footer?.copyright) || t("copyright");
  const ageNotice = tv(footer?.ageNotice) || t("ageNotice");

  const clientUrl = import.meta.env.VITE_CLIENT_URL || "http://localhost:5173";

  const linkClass =
    "text-[14px] text-[var(--text-muted)] transition-colors hover:text-[var(--gold)]";

  return (
    <footer
      className="border-t"
      style={{ background: "var(--surface)", borderColor: "rgb(188 67 244 / 0.25)" }}
    >
      <div className="tb-wrap py-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                  draggable="false"
                />
              ) : (
                <span className="text-[13px] font-bold text-[var(--text-muted)]">
                  Logo not found
                </span>
              )}
              <span className="text-[13px] font-semibold uppercase tracking-widest text-[var(--gold)]">
                Affiliates
              </span>
            </div>

            <p className="tb-lead !mt-4 max-w-xs">{ctaText}</p>
          </div>

          <div>
            <h3 className="mb-4 text-[14px] font-semibold text-[var(--gold)]">
              {t("footerLinks")}
            </h3>

            <ul className="flex flex-col gap-3">
              <li>
                <a href="#commission" className={linkClass}>
                  {t("navCommission")}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className={linkClass}>
                  {t("navHowItWorks")}
                </a>
              </li>
              <li>
                <a href="#faq" className={linkClass}>
                  {t("navFaq")}
                </a>
              </li>
              <li>
                <a
                  href={clientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {t("mainSite")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-[14px] font-semibold text-[var(--gold)]">
              {t("footerSupport")}
            </h3>

            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/register" className={linkClass}>
                  {t("signup")}
                </Link>
              </li>
              <li>
                <Link to="/login" className={linkClass}>
                  {t("login")}
                </Link>
              </li>
              <li>
                <span className={linkClass}>{t("liveChat")}</span>
              </li>
              <li>
                <span className={linkClass}>{t("contactUs")}</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h3 className="mb-4 text-[14px] font-semibold text-[var(--gold)]">
                {t("footerLicense")}
              </h3>

              <div className="flex flex-wrap items-center gap-4">
                {LICENSES.map((item) => (
                  <img
                    key={item.key}
                    src={item.src}
                    alt={item.alt}
                    className="h-8 w-auto object-contain"
                    draggable="false"
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-[14px] font-semibold text-[var(--gold)]">
                {t("footerResponsible")}
              </h3>

              <div className="flex flex-wrap items-center gap-4">
                {RESPONSIBLE.map((item) => (
                  <img
                    key={item.key}
                    src={item.src}
                    alt={item.alt}
                    className="h-8 w-auto object-contain"
                    draggable="false"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[rgb(188_67_244_/_0.25)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[var(--text-muted)]">{copyright}</p>
          <p className="text-[13px] text-[var(--text-disabled)]">{ageNotice}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
