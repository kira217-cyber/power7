import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X } from "lucide-react";

import { useSelector } from "react-redux";

import { useLanguage } from "../../Context/LanguageProvider";
import { selectSiteIdentify } from "../../features/global/globalSelectors";
import LanguageMenu from "../LanguageMenu/LanguageMenu";

// ল্যান্ডিং পেজের সেকশনগুলোতে স্ক্রল-লিংক
const NAV_LINKS = [
  { key: "commission", href: "#commission", labelKey: "navCommission" },
  { key: "how", href: "#how-it-works", labelKey: "navHowItWorks" },
  { key: "why", href: "#why-us", labelKey: "navWhyUs" },
  { key: "faq", href: "#faq", labelKey: "navFaq" },
];

/**
 * অ্যাফিলিয়েট হেডার — বাঁয়ে লোগো, মাঝে সেকশন লিংক (ডেস্কটপ),
 * ডানে ভাষা + লগইন/রেজিস্টার। মোবাইলে লিংকগুলো ড্রয়ারে।
 */
const Navber = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  const siteIdentify = useSelector(selectSiteIdentify);
  const logo = siteIdentify?.logo || "";
  const logoNode = logo ? (
    <img src={logo} alt="Logo" className="h-[38px] w-auto object-contain lg:h-[46px]" draggable="false" />
  ) : (
    <span className="text-[13px] font-bold text-[var(--text-muted)]">Logo not found</span>
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // ড্রয়ার খোলা থাকলে পেছনের পেজ স্ক্রল হবে না
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // অন্য পেজ থেকে সেকশনে যেতে হলে আগে হোমে ফিরতে হয়
  const goToSection = (href) => {
    setMenuOpen(false);

    if (pathname !== "/") {
      navigate("/" + href);
      return;
    }

    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  // /#commission এর মতো লিংকে এলে সেকশনে স্ক্রল
  useEffect(() => {
    if (!hash) return;
    const timer = setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [hash]);

  return (
    <header className="tb-header fixed inset-x-0 top-0 z-50 bg-[var(--header-bg)]">
      <div className="tb-wrap flex h-full items-center justify-between gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          {logoNode}
          <span className="hidden text-[13px] font-semibold uppercase tracking-widest text-[var(--primary500)] md:inline">
            Affiliates
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => goToSection(link.href)}
              className="cursor-pointer px-3 py-2 text-[16px] font-medium text-[var(--accent-bright)] transition-colors hover:text-white"
            >
              {t(link.labelKey)}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setLangOpen(true)}
            aria-label={t("currencyAndLanguage")}
            className="h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-full"
          >
            <img
              src={`${import.meta.env.BASE_URL}assets/flag/BD.svg`}
              alt="BD"
              className="h-full w-full object-cover"
              draggable="false"
            />
          </button>

          {/* ছোট পর্দায় এই দুটো ড্রয়ারে থাকে, নইলে লোগোর সাথে এঁটে
              যায় না। মোড়কটা div — `.tb-btn` এর display কে হারাতে
              Tailwind এর `hidden` এর উপর ভরসা করা যায় না। */}
          <div className="hidden items-center gap-2 sm:flex">
            <Link to="/login" className="tb-btn tb-btn--primary tb-btn--sm">
              {t("login")}
            </Link>

            <Link to="/register" className="tb-btn tb-btn--ghost tb-btn--sm">
              {t("signup")}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("navHowItWorks")}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--gold)] lg:hidden"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* ── মোবাইল ড্রয়ার ── */}
      <div
        onClick={() => setMenuOpen(false)}
        className="fixed inset-0 z-[60] bg-[var(--modal-mask-bg)] transition-opacity duration-200 lg:hidden"
        style={{
          opacity: menuOpen ? 1 : 0,
          visibility: menuOpen ? "visible" : "hidden",
          pointerEvents: menuOpen ? "auto" : "none",
        }}
      />

      <aside
        className="fixed right-0 top-0 z-[61] flex h-screen w-[280px] max-w-[84vw] flex-col bg-[var(--surface)] transition-transform duration-300 ease-in-out lg:hidden"
        style={{ transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between px-5">
          {logoNode}

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label={t("close")}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--gold)]"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4">
          {NAV_LINKS.map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => goToSection(link.href)}
              className="cursor-pointer rounded-[10px] px-4 py-3 text-start text-[15px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-white"
            >
              {t(link.labelKey)}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 p-5">
          <Link
            to="/register"
            onClick={() => setMenuOpen(false)}
            className="tb-btn tb-btn--primary w-full"
          >
            {t("joinNow")}
          </Link>

          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className="tb-btn tb-btn--ghost w-full"
          >
            {t("login")}
          </Link>
        </div>
      </aside>

      <LanguageMenu open={langOpen} onClose={() => setLangOpen(false)} />

      <style>{`
        /* ক্লায়েন্ট সাইটের হেডার ডেস্কটপে ৬৩px ফিক্সড */
        .tb-header { height: 56px; }

        @media (min-width: 1024px) {
          .tb-header { height: 63px; }
        }
      `}</style>
    </header>
  );
};

export default Navber;
