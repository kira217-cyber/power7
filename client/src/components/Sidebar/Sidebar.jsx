import React, { useState } from "react";

import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { selectGameCategories } from "../../features/globalGame/globalGameSelectors";

import Icon from "../Icon/Icon";
import { useLogout } from "../../features/auth/useLogout";
import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";

/**
 * বাঁ পাশের সাইডবার।
 *
 * মূল সাইট থেকে মাপা (ডেস্কটপ):
 *   কলাম ২৪৭.৫px, bg #010928, padding 0 14.3px 48px 15.8px
 *   nav-wrapper প্রস্থ ২১৭.৪px; গ্রুপ ১ (৫ আইটেম) h৩১০ mb৪১,
 *   গ্রুপ ২ (গেম সেন্টার) h৬২, গ্রুপ ৩ (সদস্য কেন্দ্র) h৬২ mb৪০
 *   nav-item h৫২, margin-top ১০, radius ৮.৭, padding 0 20, gap 20
 *     active: bg rgba(188,67,244,.28) + 1px solid #AD00FF
 *   আইকন ৪০×৪০, label fs ১৮ fw ৬০০
 *   নিচের গ্রুপ (ভাষা, অ্যাপ, গ্রাহক সেবা, সাইন আউট) — লেখা #97A5C9 fs ১৬.৫,
 *   আইকনগুলো মূল সাইটের নিজের PNG (`public/assets/sidebar/`)
 *
 * মোবাইলে এটা ড্রয়ার হয়ে বাঁ দিক থেকে ঢোকে।
 */

const Group = ({ children, mb = 0 }) => (
  <div className="flex flex-col" style={{ width: 217.4, marginBottom: mb }}>
    {children}
  </div>
);

/** মূল সাইটের PNG আইকন — নিজের মাপে, ৪০ এর ঘরের মাঝে */
const Png = ({ name, w = 40, h = 40 }) => (
  <img src={`/assets/sidebar/${name}.png`} alt="" style={{ width: w, height: h, objectFit: "contain" }} />
);

const MUTED = "var(--text-muted, #97A5C9)";

const NavItem = ({ icon, label, active, trailing, onClick, iconSize = 40, muted = false, labelSize = 18, ghost = false }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex shrink-0 cursor-pointer items-center text-left"
    style={{
      height: 52,
      marginTop: 10,
      borderRadius: 8.7,
      padding: "0 20px",
      gap: 20,
      color: muted ? MUTED : "#fff",
      fontSize: 17.3,
      fontWeight: 600,
      background: active && !ghost ? "var(--accent-soft)" : "transparent",
      border: active ? "1px solid var(--accent)" : "1px solid transparent",
    }}
  >
    {typeof icon === "string" ? (
      <Icon name={icon} size={iconSize} />
    ) : (
      <span style={{ width: 40, height: 40, display: "grid", placeItems: "center" }}>{icon}</span>
    )}
    <span style={{ fontSize: muted ? labelSize : 18, fontWeight: 600, flex: 1 }}>{label}</span>
    {trailing}
  </button>
);

const Chevron = ({ open }) => (
  <span
    style={{
      transition: "transform .2s",
      transform: open ? "rotate(180deg)" : "none",
      display: "grid",
      placeItems: "center",
    }}
  >
    <Icon name="arrow-down" size={18} />
  </span>
);

const Sidebar = ({ topOffset = 0, open, onClose, onMember, onSection, onDownload, onSupport }) => {
  const { t, lang, setLang, languages } = useLanguage();
  const navigate = useNavigate();
  const signOut = useLogout();
  const isDesktop = useIsDesktop();
  const [gameCenterOpen, setGameCenterOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const current = languages.find((item) => item.code === lang) ?? languages[0];

  // মূল সাইটে ডিপোজিট ও উত্তোলন সাইডবার থেকেই "ব্যক্তিগত কেন্দ্র" মডাল
  // খোলে, আলাদা পেজে যায় না
  const top = [
    { key: "deposit", icon: "deposit", label: t.sidebar.deposit, member: "deposit" },
    // স্প্রাইটের withdraw ছবিটা ছেঁটে বসানো — আলাদা PNG এ সেই ছাঁটা রূপ
    { key: "withdraw", icon: <Png name="withdraw" w={41} h={40} />, label: t.sidebar.withdraw, member: "withdraw" },
    { key: "promo", icon: "promo-2", label: t.sidebar.promo, to: "/promotions" },
    { key: "reward", icon: "reward", label: t.sidebar.reward, member: "reward" },
    { key: "rebate", icon: "cashback", label: t.sidebar.rebate, member: "manualRebate" },
  ];

  // গেম সেন্টার — মূল সাইটের মতো স্লট, ফিশিং, লাইভ, পোকার, স্পোর্টস
  // (প্রোভাইডার-ভিত্তিক ক্যাটাগরি)। আইকন মূল সাইটের নিজের।
  const categories = useSelector(selectGameCategories);
  const GC_ICON = { slot: "gc-rng.png", fishing: "gc-fish.svg", live: "gc-live.png", poker: "gc-pvp.svg", sports: "gc-sports.png" };
  const STATIC_GC = [
    { key: "slot", label: t.gameCenter.RNG },
    { key: "fishing", label: t.gameCenter.FISH },
    { key: "live", label: t.gameCenter.LIVE },
    { key: "poker", label: t.gameCenter.PVP },
    { key: "sports", label: t.gameCenter.SPORTS },
  ];
  const gameCenter = categories.length
    ? categories
        .filter((c) => c.type === "sports" || (c.type === "games" && c.showProviders !== false))
        .map((c) => ({ key: c.key, label: c.name?.[lang] || c.name?.bn || c.key, deskIcon: c.deskIcon }))
    : STATIC_GC;
  const gcIcon = (item) =>
    GC_ICON[item.key] ? (
      <img src={`/assets/sidebar/${GC_ICON[item.key]}`} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
    ) : (
      <img src={item.deskIcon} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
    );

  const member = [
    { key: "vip", icon: "vip", label: t.memberCenter.vip },
    { key: "betRecord", icon: "bet-record", label: t.memberCenter.betRecord },
    { key: "accountRecord", icon: "icon-account", label: t.memberCenter.accountRecord },
    { key: "myAccount", icon: "icon-avatar", label: t.memberCenter.myAccount },
    { key: "deposit2", icon: "deposit_record", label: t.memberCenter.deposit },
    { key: "profitLoss", icon: "profit-loss", label: t.memberCenter.profitLoss },
    { key: "inbox", icon: "mailcen", label: t.memberCenter.inbox },
  ];

  return (
    <>
      {/* মোবাইলে ড্রয়ারের পিছনের আবরণ */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 md:hidden"
          style={{ background: "rgb(0 0 0 / 0.5)", zIndex: 18 }}
        />
      )}

      {/* দুই ভিউপোর্টেই হ্যামবার্গার দিয়ে খোলে-বন্ধ হয় (ডেস্কটপে ডিফল্টে
          খোলা)। transform টা inline style এ, কারণ Tailwind এর md: ক্লাস
          inline style কে হারাতে পারে না। */}
      <aside
        className="hide-scrollbar fixed bottom-0 left-0 overflow-y-auto transition-transform"
        style={{
          // ডাউনলোড বার খোলা থাকলে সাইডবারও ততটা নিচ থেকে
          top: topOffset ? `calc(var(--header-h) + ${topOffset})` : "var(--header-h)",
          width: "var(--sidebar-w)",
          maxWidth: isDesktop ? "none" : "80vw",
          background: "var(--bg)",
          padding: "0 14.3px 48px 15.8px",
          zIndex: 19,
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <Group mb={41}>
          {top.map((item) => (
            <NavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active
              onClick={() => {
                if (item.member) onMember?.(item.member);
                else if (item.to) navigate(item.to);
                onClose?.();
              }}
            />
          ))}
        </Group>

        <Group>
          <NavItem
            icon={<Png name="gameCenter" w={32} h={40} />}
            label={t.sidebar.gameCenter}
            active
            trailing={<Chevron open={gameCenterOpen} />}
            onClick={() => setGameCenterOpen((v) => !v)}
          />
          {gameCenterOpen &&
            gameCenter.map((item) => (
              <NavItem
                key={item.key}
                icon={gcIcon(item)}
                label={item.label}
                onClick={() => {
                  onSection?.(item.key);
                  onClose?.();
                }}
              />
            ))}
        </Group>

        <Group mb={40}>
          <NavItem
            icon={<Png name="member" />}
            label={t.sidebar.memberCenter}
            active
            trailing={<Chevron open={memberOpen} />}
            onClick={() => setMemberOpen((v) => !v)}
          />
          {memberOpen &&
            member.map((item) => (
              <NavItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                onClick={() => {
                  onMember?.(item.key === "deposit2" ? "deposit" : item.key);
                  onClose?.();
                }}
              />
            ))}
        </Group>

        <Group mb={40}>
          {/* ভাষা — মূল সাইটের মতো ড্রপডাউন, বেছে নিলে পুরো সাইট বদলায় */}
          <NavItem
            icon={
              <img
                src={current.flag}
                alt=""
                // `.language-select img` — ৩৮ × ৩৮
                style={{ width: 38, height: 38, borderRadius: "50%" }}
              />
            }
            label={current.name}
            active
            muted
            labelSize={16.5}
            // মূল সাইটে এখানে তীরচিহ্ন নেই — চাপলে তালিকা খোলে
            onClick={() => setLangOpen((v) => !v)}
          />
          {langOpen &&
            languages
              .filter((item) => item.code !== lang)
              .map((item) => (
                <NavItem
                  key={item.code}
                  icon={
                    <img
                      src={item.flag}
                      alt=""
                      style={{ width: 38, height: 38, borderRadius: "50%" }}
                    />
                  }
                  label={item.name}
                  onClick={() => {
                    setLang(item.code);
                    setLangOpen(false);
                  }}
                />
              ))}

          <NavItem
            icon={<Png name="download" w={36} h={36} />}
            label={t.sidebar.appDownload}
            active
            muted
            labelSize={16.5}
            onClick={() => onDownload?.()}
          />
          <NavItem
            icon={<Png name="service" w={39} h={30} />}
            label={t.sidebar.support}
            active
            muted
            onClick={() => onSupport?.()}
          />
        </Group>

        <Group>
          <NavItem
            icon={<Png name="logout" w={27} h={33} />}
            label={t.sidebar.signOut}
            // মূল সাইটে সাইন আউটের শুধু বর্ডার, ভিতরটা ফাঁকা
            active
            ghost
            muted
            labelSize={16.5}
            onClick={() => signOut(onClose)}
          />
        </Group>
      </aside>
    </>
  );
};

export default Sidebar;
