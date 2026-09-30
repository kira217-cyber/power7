import React from "react";
import { Link, useLocation } from "react-router";

import { useSelector } from "react-redux";

import UserBar from "./UserBar";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectUser } from "../../features/auth/authSelectors";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { siteImage, useSiteSettings } from "../../site/siteSettings";

/**
 * ফিক্সড হেডার।
 *
 * **ডেস্কটপ** (১৩৬৬ ও ১৯২০ তে হুবহু এক):
 *   উচ্চতা ৬৩, bg #0F0238, position fixed
 *   মেনু আইটেম প্রথমটা x=৩৬০, fs ২০; সক্রিয়টা সাদা + নিচে আন্ডারলাইন
 *   লগইন বোতাম ১০৯ × ৪৫ bg #AD00FF, লেখা #FBD029 fs ১৬ fw ৬০০
 *   নিবন্ধন বোতাম border 1px #AD00FF, লেখা #FBD029 fw ৭০০
 *   ক্রম: লগইন → নিবন্ধন
 *
 * **মোবাইল** (`.home-header`, ৭৫০-ডিজাইনে মাপা):
 *   উচ্চতা ১০৯, bg #0F0238
 *   হ্যামবার্গার (১৪, ৩৩) ৫৮ × ৪৩ — PNG
 *   লোগো (৯৩, ১৪) ২৩৮ × ৮০
 *   ডান পাশ (৫০২, ২৯) ২২৮ × ৫০:
 *     নিবন্ধন বোতাম ১২৫ × ৫০ (PNG ব্যাকগ্রাউন্ড) + উপহার আইকন ৪২ বাঁ কোণে
 *     লগইন বোতাম ১১১ × ৪৬ (PNG ব্যাকগ্রাউন্ড)
 *     দুটোরই লেখা fs ১৯ fw ৭০০ রঙ #FBD029
 */
const Navber = ({ topOffset = 0, onToggleSidebar, onAuth, onMember, onSupport, onLogout }) => {
  const { t } = useLanguage();
  // লোগো admin এর "Site Identity" থেকে
  const { identify } = useSiteSettings();
  const user = useSelector(selectUser);
  const isDesktop = useIsDesktop();

  const { pathname } = useLocation();
  // মূল সাইটের মতো — পাতা অনুযায়ী সক্রিয়; "অর্থ উপার্জন" বন্ধুদের আমন্ত্রণ খোলে
  // (লগইন না থাকলে আগে লগইন)
  const menu = [
    { key: "games", label: t.headerMenu.games, to: "/", active: pathname === "/" || pathname.startsWith("/games") },
    { key: "promotions", label: t.headerMenu.promotions, to: "/promotions", active: pathname.startsWith("/promotions") },
    { key: "earn", label: t.headerMenu.earn, onClick: () => (user ? onMember?.("referral") : onAuth?.("login")) },
  ];

  if (!isDesktop) {
    return (
      <header
        className="fixed right-0 left-0"
        style={{ top: topOffset, height: m(109), background: "var(--header-bg)", zIndex: 20 }}
      >
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="menu"
          className="absolute cursor-pointer"
          style={{
            left: m(14),
            top: m(33),
            width: m(58),
            height: m(43),
            backgroundImage: "url(/assets/mobile/header-menu.png)",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
          }}
        />

        <Link
          to="/"
          className="absolute"
          style={{ left: m(93), top: m(14), width: m(238), height: m(80) }}
        >
          <img
            src={siteImage(identify.mobileLogo)}
            alt={t.brand}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </Link>

        {user ? (
          <UserBar
            user={user}
            onDeposit={() => onMember?.("deposit")}
            onWithdraw={() => onMember?.("withdraw")}
            onMember={(tab) => onMember?.(typeof tab === "string" ? tab : "myAccount")}
            onSupport={onSupport}
            onLogout={onLogout}
          />
        ) : (
        <div
          className="absolute flex items-center"
          style={{ left: m(502), top: m(29), width: m(228), height: m(50) }}
        >
          <button
            type="button"
            onClick={() => onAuth?.("register")}
            className="relative flex cursor-pointer items-center justify-center"
            style={{
              width: m(125),
              height: m(50),
              backgroundImage: "url(/assets/mobile/register-btn.png)",
              backgroundSize: "100% 100%",
              color: "var(--gold)",
              fontSize: m(19),
              fontWeight: 700,
            }}
          >
            <img
              src="/assets/mobile/register-gift.svg"
              alt=""
              className="absolute"
              style={{ left: m(-21), top: m(-11), width: m(42), height: m(42) }}
            />
            <span style={{ fontSize: m(19) }}>{t.auth.registerShort}</span>
          </button>

          <button
            type="button"
            onClick={() => onAuth?.("login")}
            className="flex cursor-pointer items-center justify-center"
            style={{
              marginInlineStart: m(-8),
              width: m(111),
              height: m(46),
              backgroundImage: "url(/assets/mobile/login-btn.png)",
              backgroundSize: "100% 100%",
              color: "var(--gold)",
              fontSize: m(19),
              fontWeight: 700,
            }}
          >
            {t.login}
          </button>
        </div>
        )}
      </header>
    );
  }

  return (
    <header
      className="fixed top-0 right-0 left-0 flex items-center"
      style={{
        height: "var(--header-h)",
        background: "var(--header-bg)",
        zIndex: 20,
        paddingInline: 20,
      }}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="menu"
        className="flex shrink-0 cursor-pointer flex-col justify-center"
        style={{ width: 44, gap: 6 }}
      >
        {[28, 22, 28].map((w, i) => (
          <span
            key={i}
            style={{
              width: w,
              height: 3,
              borderRadius: 99,
              background: "#6b4e9b",
              alignSelf: i === 1 ? "flex-end" : "flex-start",
            }}
          />
        ))}
      </button>

      <Link to="/" className="flex shrink-0 items-center" style={{ marginInlineStart: 30 }}>
        <img
          src={siteImage(identify.logo)}
          alt={t.brand}
          // `.side-top img.logo` — ১৪৮.৭ × ৫০
          style={{ width: 148.7, height: 50, objectFit: "contain" }}
        />
      </Link>

      <nav className="flex h-full items-center" style={{ marginInlineStart: 125, gap: 52 }}>
        {menu.map((item) => {
          const body = (
            <>
              {item.label}
              {item.active && <span className="absolute bottom-0 left-0 w-full" style={{ height: 2, background: "var(--accent, #ad00ff)" }} />}
            </>
          );
          const style = { fontSize: 20, color: "var(--accent, #ad00ff)" };
          return item.to ? (
            <Link key={item.key} to={item.to} className="relative flex h-full items-center whitespace-nowrap" style={style}>
              {body}
            </Link>
          ) : (
            <button key={item.key} type="button" onClick={item.onClick} className="relative flex h-full cursor-pointer items-center whitespace-nowrap" style={style}>
              {body}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {user ? (
        <UserBar
          user={user}
          onDeposit={() => onMember?.("deposit")}
          onWithdraw={() => onMember?.("withdraw")}
          onMember={(tab) => onMember?.(typeof tab === "string" ? tab : "myAccount")}
          onSupport={onSupport}
          onLogout={onLogout}
        />
      ) : (
      <div className="flex shrink-0 items-center" style={{ gap: 14 }}>
        <button
          type="button"
          onClick={() => onAuth?.("login")}
          className="tb-hover-fade flex cursor-pointer items-center justify-center font-semibold whitespace-nowrap"
          style={{
            height: 45,
            padding: "0 22px",
            background: "var(--accent)",
            borderRadius: 6,
            color: "var(--gold)",
            fontSize: 16,
          }}
        >
          {t.login}
        </button>

        <button
          type="button"
          onClick={() => onAuth?.("register")}
          className="tb-hover-fade flex cursor-pointer items-center justify-center font-bold whitespace-nowrap"
          style={{
            height: 45,
            padding: "0 16px",
            border: "1px solid var(--accent)",
            borderRadius: 6,
            color: "var(--gold)",
            fontSize: 16,
          }}
        >
          {t.register}
        </button>
      </div>
      )}
    </header>
  );
};

export default Navber;
