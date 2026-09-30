import React from "react";
import { useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router";

import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { selectIsLoggedIn } from "../../features/auth/authSelectors";

/**
 * মোবাইলের বটম নেভিগেশন — ডেস্কটপে থাকে না।
 *
 * মূল সাইট থেকে মাপা (৭৫০-ডিজাইনে):
 *   বার ৭৫০ × ১১০, `footer-bg.png` (cover), স্ক্রিনের নিচে ফিক্সড
 *   প্রতিটা আইটেম ১৫০ × ১১০ — `.footer_icon` ৭০ × ৭০ (y ৮.৫),
 *     লেখা fs ২০ সাদা (y ৮১.৫, উচ্চতা ২০)
 *   **প্রতিটা আইকনের নিজস্ব background-size**: হোম `auto 70`,
 *     প্রমোশন ৬০, শেয়ার contain, পুরস্কার ৫৪, সদস্য ৬০
 *   মাঝের "শেয়ার" আলাদা: `.share-container` ১৪৮.৫ বৃত্ত bg #BC43F4,
 *     বারের **৪৪.২ উপরে** ওঠে; ভিতরে আইকন ৮৩.১ (উপর থেকে ১৭.৮),
 *     লেখা উপর থেকে ১০৪.৪
 */
const ITEMS = [
  { key: "home", icon: "/assets/mobile/nav/home.svg", size: "auto 0.7rem", to: "/" },
  { key: "promotions", icon: "/assets/mobile/nav/promo.svg", size: m(60), to: "/promotions" },
  // শেয়ার = বন্ধুদের আমন্ত্রণ; `auth` গুলো লগইন চায় — না থাকলে লগইন পাতা, পরে সেখানেই ফেরা
  { key: "share", icon: "/assets/mobile/nav/share.png", size: "contain", to: "/member/referral", center: true, auth: true },
  { key: "reward", icon: "/assets/mobile/nav/reward.svg", size: m(54), to: "/member/reward", auth: true },
  { key: "member", icon: "/assets/mobile/nav/member.png", size: m(60), to: "/member", auth: true },
];

const BottomNavbar = () => {
  const { t } = useLanguage();
  const loggedIn = useSelector(selectIsLoggedIn);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = (item) => (e) => {
    e.preventDefault();
    if (item.auth && !loggedIn) {
      navigate("/login", { state: { from: item.to } });
      return;
    }
    if (pathname !== item.to) navigate(item.to);
    // একই পাতায় থাকলে উপরে ফেরা
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 flex md:hidden"
      style={{
        height: m(110),
        backgroundImage: "url(/assets/mobile/footer-bg.png)",
        backgroundSize: "cover",
        zIndex: 17,
      }}
    >
      {ITEMS.map((item) =>
        item.center ? (
          <Link
            key={item.key}
            to={item.to}
            onClick={go(item)}
            className="relative flex justify-center"
            style={{ width: m(150), height: m(110) }}
          >
            <span
              className="tb-share absolute flex flex-col items-center"
              style={{
                top: m(-44.2),
                width: m(148.5),
                height: m(148.5),
                borderRadius: "50%",
                background: "var(--bnav-share, var(--accent-bright))",
              }}
            >
              <span
                style={{
                  marginTop: m(17.8),
                  width: m(83.1),
                  height: m(83.1),
                  backgroundImage: `url(${item.icon})`,
                  backgroundSize: item.size,
                  backgroundPosition: "50%",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <span
                className="w-full text-center"
                style={{ marginTop: m(3.5), fontSize: m(20), color: "var(--bnav-text, #fff)" }}
              >
                {t.bottomNav[item.key]}
              </span>
            </span>
          </Link>
        ) : (
          <Link
            key={item.key}
            to={item.to}
            onClick={go(item)}
            className="relative flex flex-col items-center"
            style={{ width: m(150), height: m(110) }}
          >
            <span
              style={{
                marginTop: m(8.5),
                width: m(70),
                height: m(70),
                backgroundImage: `url(${item.icon})`,
                backgroundSize: item.size,
                backgroundPosition: "50%",
                backgroundRepeat: "no-repeat",
              }}
            />
            <span
              className="w-full text-center"
              style={{ fontSize: m(20), lineHeight: m(20), color: "var(--bnav-text, #fff)", marginTop: m(3) }}
            >
              {t.bottomNav[item.key]}
            </span>
          </Link>
        ),
      )}
    </nav>
  );
};

export default BottomNavbar;
