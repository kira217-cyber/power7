import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeCheck,
  BanknoteArrowDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Percent,
  Receipt,
  User,
  Users,
  X,
} from "lucide-react";

import LanguageMenu from "../components/LanguageMenu/LanguageMenu";
import { money } from "../components/Panel/panelFormat";
import { useLanguage } from "../Context/LanguageProvider";
import { useHideBootLoader } from "../hook/useHideBootLoader";
import { logout, updateUser } from "../features/auth/authSlice";
import { selectUser } from "../features/auth/authSelectors";
import { selectSiteIdentify, selectGlobalLoaded } from "../features/global/globalSelectors";
import { fetchAffiliateData } from "../features/global/globalSlice";
import { fetchMe } from "../features/affiliate/affiliateApi";
import { notify } from "../utils/notify";
import { TONES } from "../components/Panel/tones";
import "../components/Panel/pro.css";

// প্রতিটা পাতার নিজের রঙ — সাইডবারের আইকন, হেডার আর পাতার ব্যানার একই রঙে
const NAV = [
  { to: "/dashboard", end: true, label: "navDashboard", Icon: LayoutDashboard, tone: TONES.dashboard },
  { to: "/dashboard/my-users", label: "navMyUsers", Icon: Users, tone: TONES.users },
  { to: "/dashboard/commission", label: "navCommissionStatus", Icon: Percent, tone: TONES.commission },
  { to: "/dashboard/withdraw", label: "navWithdraw", Icon: BanknoteArrowDown, tone: TONES.withdraw },
  { to: "/dashboard/withdraw-history", label: "navWithdrawHistory", Icon: Receipt, tone: TONES.history },
  { to: "/dashboard/verification", label: "verification", Icon: BadgeCheck, tone: TONES.verify },
  { to: "/dashboard/profile", label: "navProfile", Icon: User, tone: TONES.profile },
];

// সক্রিয় লিংক — ভরাট রঙের বদলে ঘুরতে থাকা RGB বর্ডার
const linkClass = ({ isActive }) =>
  `flex h-11 shrink-0 items-center gap-3 rounded-[12px] px-4 text-[14px] transition ${
    isActive
      ? "rgb-edge bg-white/[0.07] font-bold text-[var(--text-primary)]"
      : "font-medium text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
  }`;

/**
 * লগইন করা অ্যাফিলিয়েটের খোলস — ডেস্কটপে বাঁয়ে স্থায়ী সাইডবার,
 * মোবাইলে ড্রয়ার।
 *
 * লিংকগুলোয় `shrink-0`, নইলে ছোট পর্দায় flex সেগুলোকে চেপে ছোট করে
 * ফেলত (অ্যাডমিনে ঠিক এই ভুলটাই হয়েছিল)।
 */
const AffiliateLayout = () => {
  // RootLayout এর বাইরের রুট — সরাসরি /dashboard এ ঢুকলে
  // index.html এর বুট স্পিনারটা সরানোর কেউ থাকত না
  useHideBootLoader(true);

  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // হেডারে এখনকার পাতার নাম আর রঙ — সব পাতায় একই "অ্যাফিলিয়েট প্যানেল" নয়
  const current =
    NAV.find((item) => (item.end ? pathname.replace(/\/+$/, "") === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`))) || NAV[0];
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const siteIdentify = useSelector(selectSiteIdentify);
  const globalLoaded = useSelector(selectGlobalLoaded);
  const sideLogo = siteIdentify?.logo || "";

  const [open, setOpen] = useState(false);

  // ড্যাশবোর্ড আলাদা রুট-ট্রি — পাবলিক RootLayout এর fetch এখানে চলে না,
  // তাই লোগো/পরিচয়ের জন্য একবার নিজেই আনতে হয়
  useEffect(() => {
    if (!globalLoaded) dispatch(fetchAffiliateData());
  }, [globalLoaded, dispatch]);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /*
   * ব্যালেন্সটা লগইনের সময় যা ছিল তাই বসে থাকত — উইথড্র করার পরেও
   * পুরোনো সংখ্যা দেখাত। খোলসটা একবার নিজেই মিলিয়ে নেয়, তাই যে
   * পাতাতেই ঢোকেন হেডারের সংখ্যাটা ঠিক থাকে।
   */
  useEffect(() => {
    let alive = true;

    fetchMe()
      .then((me) => {
        if (alive && me) dispatch(updateUser(me));
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [dispatch]);

  const signOut = async () => {
    const ok = await notify.confirm({
      title: t("logoutTitle"),
      text: t("logoutText"),
      confirmText: t("yes"),
      cancelText: t("cancel"),
    });
    if (!ok) return;
    dispatch(logout());
    navigate("/", { replace: true });
    notify.success(t("logoutOk"));
  };

  const sidebar = (
    <>
      {/*
       * শুধু লোগো — পাশে "অ্যাফিলিয়েট প্যানেল" বসালে ২৫০px সাইডবারে
       * দুই লাইনে ভেঙে যেত, আর লেখাটা হেডারেও আছে।
       */}
      <div className="flex h-[64px] shrink-0 items-center px-5">
        {sideLogo ? (
          <img
            src={sideLogo}
            alt="POWER7"
            className="h-8 w-auto object-contain"
            draggable="false"
          />
        ) : (
          <span className="text-[13px] font-bold text-[var(--text-muted)]">
            Logo not found
          </span>
        )}
      </div>

      {/* কে আছেন আর হাতে কত — সাইডবারের উপরেই, খুঁজতে হয় না */}
      <div className="mx-3 shrink-0 rounded-[14px] border border-white/[0.07] bg-[var(--neutral1000)] p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary500)] text-[14px] font-black text-[var(--neutral1000)]">
            {String(user?.userId || "?")
              .slice(0, 1)
              .toUpperCase()}
          </span>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[14px] font-bold text-[var(--text-primary)]">
              {user?.userId}

              {/* যাচাই হয়ে গেলে টিক — অনুমোদিত হলেই, অপেক্ষায় থাকলে নয় */}
              {user?.verificationStatus === "approved" ? (
                <span
                  title={t("verifiedBadge")}
                  aria-label={t("verifiedBadge")}
                  className="flex shrink-0 items-center text-[var(--status-success)]"
                >
                  <BadgeCheck size={14} />
                </span>
              ) : null}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {t("affiliateRole")}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-disabled)]">
            {t("availableBalance")}
          </p>
          <p className="text-[19px] font-black text-[var(--primary500)]">
            {money(user?.balance)}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {NAV.map((item) => {
          const ItemIcon = item.Icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: `color-mix(in srgb, ${item.tone}, transparent 86%)`, color: item.tone }}
              >
                <ItemIcon size={15} />
              </span>
              {t(item.label)}
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/[0.07] p-3">
        <button
          type="button"
          onClick={signOut}
          className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[var(--neutral600)] text-[14px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          <LogOut size={15} />
          {t("logout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--aff-panel-bg, var(--content-bg))" }}>
      {/* ডেস্কটপ সাইডবার */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-white/[0.07] lg:flex" style={{ background: "var(--aff-panel-sidebar, var(--neutral900))" }}>
        {sidebar}
      </aside>

      {/* মোবাইল ড্রয়ার */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 lg:hidden"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      <aside
        className="fixed inset-y-0 left-0 z-[51] flex w-[260px] max-w-[84vw] flex-col border-r border-white/[0.07] transition-transform duration-300 lg:hidden"
        style={{ transform: open ? "translateX(0)" : "translateX(-100%)", background: "var(--aff-panel-sidebar, var(--neutral900))" }}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="absolute right-3 top-4 cursor-pointer text-[var(--text-muted)]"
        >
          <X size={20} />
        </button>

        {sidebar}
      </aside>

      <div className="lg:ps-[250px]">
        <header
          className="sticky top-0 z-30 flex h-[64px] items-center gap-3 border-b border-white/[0.07] px-4 backdrop-blur lg:px-6"
          style={{ background: "color-mix(in srgb, var(--aff-panel-header, var(--neutral900)), transparent 10%)" }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("menu")}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[12px] bg-[var(--neutral800)] text-[var(--primary500)] lg:hidden"
          >
            <Menu size={19} />
          </button>

          <span className="flex min-w-0 items-center gap-2.5">
            <span className="pro-badge h-8 w-8 rounded-[10px]" style={{ "--tone": current.tone }}>
              <current.Icon size={15} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold leading-tight text-[var(--text-primary)]">
                {t(current.label)}
              </span>
              <span className="hidden text-[11px] leading-tight text-[var(--text-disabled)] sm:block">
                {t("affiliatePanel")}
              </span>
            </span>
          </span>

          {/* ব্যালেন্সে চাপ দিলেই উইথড্র — সবচেয়ে বেশি দরকার হয় এটাই */}
          <Link
            to="/dashboard/withdraw"
            className="ms-auto flex h-9 items-center gap-2 rounded-full border border-[var(--primary500)]/30 bg-[var(--primary500)]/10 ps-3 pe-1 transition hover:bg-[var(--primary500)]/20"
          >
            <span className="text-[14px] font-black text-[var(--primary500)]">
              {money(user?.balance)}
            </span>

            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary500)] text-[var(--neutral1000)]">
              <BanknoteArrowDown size={14} />
            </span>
          </Link>

          {/* ভাষা বদলানো — লগইন করার পরেও দরকার, শুধু বাইরের পাতায় নয় */}
          <button
            type="button"
            onClick={() => setLangOpen(true)}
            aria-label={t("currencyAndLanguage")}
            className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full"
          >
            <img
              src={`${import.meta.env.BASE_URL}assets/flag/BD.svg`}
              alt="BD"
              className="h-full w-full object-cover"
              draggable="false"
            />
          </button>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>

        <LanguageMenu open={langOpen} onClose={() => setLangOpen(false)} />
      </div>
    </div>
  );
};

export default AffiliateLayout;
