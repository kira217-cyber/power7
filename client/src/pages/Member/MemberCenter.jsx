import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import Icon from "../../components/Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectUser } from "../../features/auth/authSelectors";
import { fetchInboxUnread, selectInboxUnread } from "../../features/inbox/inboxSlice";
import { fetchRewardSummary, selectRewardAvailable } from "../../features/reward/rewardSlice";
import { useRefreshBalance } from "../../features/auth/useRefreshBalance";
import { useLogout } from "../../features/auth/useLogout";
import { openSupport } from "../../data/contact";
import { m } from "../../hook/useUnits";
import { MEMBER_SECTIONS, MEMBER_LINKS } from "../../components/Member/sections";
import { useHideBootLoader } from "../../hook/useHideBootLoader";
import BottomNavbar from "../../components/BottomNavbar/BottomNavbar";
import AppDownloadModal from "../../components/AppDownloadModal/AppDownloadModal";

/**
 * মোবাইলের সদস্য কেন্দ্র — ডেস্কটপে এটা মডাল, মোবাইলে **আলাদা পেজ**।
 *
 * মূল সাইট (`/m/member/home`) থেকে মাপা, ৭৫০-ডিজাইনে:
 *   পেজের bg #F5F5F9; উপরে `.mc` এ `mc/home_bg.png` (bg-size 100%)
 *   হেডার `.mc-navbar-blue` ৭৫০ × ১০০ — বাঁয়ে তীর ৬৮ (x ৫০),
 *     মাঝে শিরোনাম fs ৩০ সাদা; নিচে ৮০ ফাঁকা
 *   `.default-member-wrapper` ৭০০ × ৫০৩.৮ **x ৫০ থেকে ডান কিনারা
 *     পর্যন্ত** — radius `28 0 0 28`, gradient 248deg #B3BCC8 → #F1F9FF,
 *     padding `76 50 50`
 *     `.cumulative-sign-in` ডান-উপরে ৩০৫.৮ × ৫৪, লাল gradient,
 *       ভিতরে ✓ আইকন + "সাইন ইন" fs ২৪ সাদা
 *     `.default-vip-icon` ডানে ২৫৮ × ২৮৬ মুকুটের ছবি (জলছাপ)
 *     `.profile-icon` ১৭৩ বৃত্ত, ৪px সাদা বর্ডার
 *     `.vip-tag` ১৫০ × ৪৯ radius ৩১, ধূসর gradient + 1px সাদা বর্ডার
 *     নাম fs ৩০ fw ৭০০ কালো + কপি আইকন ৩৫
 *     `ডাকনাম :` ও `যোগদান করেছেন:` fs ২৪ fw ৭০০ রঙ #666
 *     ব্যালেন্স fs ৪০ fw ৬০০ রঙ #434851, ডানে রিফ্রেশ ৩২
 *     নিচে তিনটা বোতাম ১৮৬ × ৫৪ radius ৩০, সাদা gradient + shadow
 *   `.member-home-root` সাদা; `সদস্য সেন্টার` ট্যাগ bg #DFDFDF fs ২০
 *   গ্রিড ৪ কলাম — ঘর ১৮২.৫, padding `20 0`; আইকনের বৃত্ত ৮৮,
 *     বাইরে ১px সোনালি gradient রিং (#ECD3A8 → #FFF2DB → #ECD3A8),
 *     ভিতরের আইকন ৫৪, রঙ #D1A24F; না-পড়া ব্যাজ ৪০ লাল
 */

/**
 * গ্রিডের আইটেমগুলো **এক জায়গা থেকেই** আসে —
 * `components/Member/sections.jsx`. ডেস্কটপ মডালের মেনু ও মোবাইলের
 * রাউটও সেই একই তালিকা পড়ে, তাই তিন জায়গায় আলাদা হয়ে যায় না।
 * শেষের দুটো (গ্রাহক সেবা, লগআউট) কোনো পেজ নয়, তাই এখানেই যোগ করি।
 */
const EXTRA = [
  { key: "appDownload", gridIcon: "appdownload" },
  { key: "support", gridIcon: "openhoursserve" },
  { key: "logout", gridIcon: "logout" },
];

// মূল সাইটের গ্রিডের ক্রম (`/m/member/home`) — চার কলামে এভাবেই সাজানো
const ORDER = [
  "reward",
  "betRecord",
  "profitLoss",
  "depositRecord",
  "withdrawRecord",
  "turnoverRecord",
  "accountRecord",
  "myAccount",
  "security",
  "referral",
  "manualRebate",
  "inbox",
  "feedback",
  "appDownload",
  "support",
  "help",
  "logout",
];

const GRID = [...MEMBER_SECTIONS.filter((section) => section.inGrid), ...EXTRA].sort(
  (a, b) => (ORDER.indexOf(a.key) + 1 || 99) - (ORDER.indexOf(b.key) + 1 || 99),
);


/** `ডাকনাম :` / `যোগদান করেছেন:` এর মতো লেবেল-মান জোড়া */
const InfoRow = ({ label, value, children }) => (
  <div className="flex items-center" style={{ gap: m(10), marginTop: m(12) }}>
    <span style={{ fontSize: m(24), fontWeight: 700, color: "var(--member-text, #666)" }}>
      {label}: {value}
    </span>
    {children}
  </div>
);

const MemberCenter = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const signOut = useLogout();
  const user = useSelector(selectUser);
  const { refresh, refreshing } = useRefreshBalance();
  const dispatch = useDispatch();
  const inboxUnread = useSelector(selectInboxUnread);
  const rewardAvailable = useSelector(selectRewardAvailable);

  useHideBootLoader();
  const [downloadOpen, setDownloadOpen] = useState(false);

  // ইনবক্সের না-পড়া সংখ্যা — মেইলের ঘরে লাল ব্যাজ
  useEffect(() => {
    if (user) {
      dispatch(fetchInboxUnread());
      dispatch(fetchRewardSummary());
    }
  }, [dispatch, user]);

  const badgeOf = (item) => {
    if (item.key === "inbox") return inboxUnread > 0 ? (inboxUnread > 99 ? "99+" : inboxUnread) : null;
    if (item.key === "reward") return rewardAvailable > 0 ? (rewardAvailable > 99 ? "99+" : rewardAvailable) : null;
    return item.badge || null;
  };

  // লগইন না থাকলে router এর RequireLogin আগেই লগইন পেজে পাঠায়
  if (!user) return null;

  const actions = [
    { key: "deposit", label: t.memberPage.depositBtn, to: MEMBER_LINKS.deposit },
    { key: "withdraw", label: t.memberPage.withdrawBtn, to: MEMBER_LINKS.withdraw },
    { key: "card", label: t.memberPage.cardBtn, to: MEMBER_LINKS.cards },
  ];

  const onItem = (item) => {
    if (item.key === "appDownload") {
      setDownloadOpen(true);
      return;
    }
    if (item.key === "logout") {
      signOut();
      return;
    }
    if (item.key === "support") {
      openSupport();
      return;
    }
    const to = MEMBER_LINKS[item.key];
    if (to) navigate(to);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--member-page-bg, #f5f5f9)", paddingBottom: m(110) }}>
      <div
        style={{
          backgroundImage: "url(/assets/mobile/member/bg.png)",
          backgroundSize: "100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* ── হেডার ── */}
        <div
          className="relative flex items-center justify-center"
          style={{ height: m(100) }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="back"
            className="absolute flex cursor-pointer items-center justify-center"
            style={{ left: m(50), width: m(68), height: m(68) }}
          >
            {/* মূল সাইটের সরু `‹` শেভরন — ২২ × ৩৮ */}
            <span
              style={{
                width: m(22),
                height: m(38),
                borderInlineStart: `${m(7)} solid #fff`,
                borderBlockStart: `${m(7)} solid #fff`,
                transform: "rotate(-45deg)",
                marginInlineStart: m(10),
              }}
            />
          </button>
          <span style={{ fontSize: m(30), color: "#fff" }}>{t.member.myAccount}</span>
        </div>

        {/* ── প্রোফাইল কার্ড ──
            ডান কিনারা পর্যন্ত যায়, তাই ডান পাশে radius নেই */}
        <div
          className="relative overflow-hidden"
          style={{
            marginInlineStart: m(50),
            borderRadius: `${m(28)} 0 0 ${m(28)}`,
            background: "linear-gradient(248deg, #b3bcc8 0%, #f1f9ff 100%)",
            minHeight: m(504),
            padding: `${m(76)} ${m(50)} ${m(40)}`,
          }}
        >
          {/* মুকুটের জলছাপ */}
          <img
            src="/assets/mobile/member/vip-crown.png"
            alt=""
            className="pointer-events-none absolute"
            style={{ right: 0, top: 0, width: m(258), height: m(286), objectFit: "contain" }}
          />

          {/* ডান-উপরের "সাইন ইন" ফিতা */}
          <button
            type="button"
            onClick={() => navigate("/member/reward")}
            className="absolute flex cursor-pointer items-center"
            style={{
              right: 0,
              top: 0,
              height: m(54),
              padding: `0 ${m(30)} 0 ${m(140)}`,
              gap: m(14),
              background: "linear-gradient(0deg, #bb0c0c, #ec515b)",
              color: "#fff",
              fontSize: m(24),
            }}
          >
            <img
              src="/assets/mobile/member/sign-check.png"
              alt=""
              style={{ width: m(30), height: m(30) }}
            />
            {t.memberPage.signIn}
            <span style={{ fontSize: m(26) }}>›</span>
          </button>

          <div className="relative flex" style={{ gap: m(30) }}>
            <img
              src={user.avatar || "/assets/mobile/avatar.png"}
              alt=""
              style={{
                width: m(173),
                height: m(173),
                borderRadius: "50%",
                border: `${m(8)} solid #fff`,
                objectFit: "cover",
                flexShrink: 0,
                background: "var(--member-surface, #fff)",
              }}
            />

            {/* flex কলাম — নইলে rem মূলের ৫২px লাইন-বক্সে VIP ট্যাগ নিচে নামে */}
            <div className="flex flex-col items-start" style={{ flex: 1, minWidth: 0 }}>
              <span
                className="inline-flex items-center"
                style={{
                  height: m(49),
                  paddingInline: m(16),
                  gap: m(8),
                  borderRadius: m(31),
                  background: "linear-gradient(rgb(102 102 102 / 0.9), rgb(102 102 102 / 0.9))",
                  border: `${m(2)} solid rgb(255 255 255 / 0.2)`,
                  color: "#fff",
                  fontSize: m(24),
                  fontWeight: 700,
                }}
              >
                <img
                  src="/assets/mobile/member/vip-crown.png"
                  alt=""
                  style={{ width: m(31), height: m(33), objectFit: "contain" }}
                />
                VIP{user.vipLevel}
              </span>

              <div className="flex items-center" style={{ gap: m(10), marginTop: m(20) }}>
                <span style={{ fontSize: m(30), fontWeight: 700, color: "#000" }}>
                  {user.username}
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(user.username)}
                  aria-label="copy"
                  className="cursor-pointer"
                  style={{ width: m(35), height: m(35), color: "#444", fontSize: m(30) }}
                >
                  {/* স্প্রাইটে কপি আইকন নেই — মূল সাইটের মতোই দুই
                      পাতার চিহ্ন (ProfileMenu ও এটাই ব্যবহার করে) */}
                  ⧉
                </button>
              </div>

              <InfoRow label={t.memberPage.nickname} value={user.username}>
                <button
                  type="button"
                  onClick={() => navigate("/member/account")}
                  aria-label="edit"
                  className="cursor-pointer"
                  style={{ width: m(31), height: m(31), color: "var(--member-text, #666)" }}
                >
                  <Icon name="icon-icon-edit" size={m(28)} />
                </button>
              </InfoRow>

              <InfoRow label={t.memberPage.joined} value={user.joinedAt || "—"} />
            </div>
          </div>

          {/* ব্যালেন্স */}
          <div className="relative flex items-center" style={{ marginTop: m(22), height: m(46) }}>
            <span style={{ fontSize: m(40), fontWeight: 600, color: "#434851" }}>
              {user.currency} {user.balance.toFixed(2)}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              aria-label="refresh"
              onClick={refresh}
              className={`cursor-pointer${refreshing ? " tb-spin" : ""}`}
              style={{ width: m(32), height: m(32) }}
            >
              <img
                src="/assets/mobile/icons/refresh.svg"
                alt=""
                style={{ width: "100%", height: "100%" }}
              />
            </button>
          </div>

          {/* তিনটা বোতাম */}
          <div className="relative flex" style={{ marginTop: m(22), gap: m(16) }}>
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => navigate(action.to)}
                className="flex-1 cursor-pointer"
                style={{
                  height: m(54),
                  borderRadius: m(30),
                  background: "linear-gradient(0deg, rgb(255 255 255 / 0.7), var(--member-surface, #fff))",
                  boxShadow: `0 ${m(2)} ${m(10)} rgb(110 110 110 / 0.5)`,
                  color: "#454545",
                  fontSize: m(24),
                  fontWeight: 700,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── সদস্য সেন্টারের গ্রিড ── */}
      <div style={{ background: "var(--member-surface, #fff)", marginTop: m(31) }}>
        <div className="flex" style={{ paddingInline: m(50), paddingTop: m(4) }}>
          <span
            style={{
              padding: `${m(6)} ${m(18)}`,
              borderRadius: m(26),
              background: "#dfdfdf",
              color: "#000",
              fontSize: m(20),
            }}
          >
            {t.memberPage.sectionTitle}
          </span>
        </div>

        <div
          style={{
            padding: m(10),
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          }}
        >
          {GRID.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onItem(item)}
              className="flex cursor-pointer flex-col items-center"
              style={{ padding: `${m(20)} 0` }}
            >
              {/* বৃত্তের বাইরে ১px সোনালি gradient রিং */}
              <span
                className="relative grid place-items-center"
                style={{
                  width: m(90),
                  height: m(90),
                  padding: m(2),
                  borderRadius: "50%",
                  background: "linear-gradient(#ecd3a8, #fff2db 50%, #ecd3a8)",
                }}
              >
                <span
                  className="grid h-full w-full place-items-center"
                  style={{ borderRadius: "50%", background: "linear-gradient(180deg,#fdf1dc,#fff9ef 55%,#fbecd2)" }}
                >
                  <img
                    src={`/assets/mobile/member/${item.gridIcon}.svg`}
                    alt=""
                    style={{ width: m(54), height: m(54), objectFit: "contain" }}
                  />
                </span>
                {badgeOf(item) ? (
                  <span
                    className="absolute grid place-items-center"
                    style={{
                      top: m(-16),
                      right: m(-16),
                      minWidth: m(40),
                      height: m(40),
                      borderRadius: m(26),
                      background: "linear-gradient(#ff5841, #fe0404)",
                      color: "#fff",
                      fontSize: m(26),
                      fontWeight: 500,
                    }}
                  >
                    {badgeOf(item)}
                  </span>
                ) : null}
              </span>

              <span
                className="text-center"
                style={{ marginTop: m(14), fontSize: m(24), color: "var(--member-title, #333)", lineHeight: 1.25 }}
              >
                {t.memberPage.items[item.key] ?? item.title?.(t)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* মূল সাইটে সদস্য কেন্দ্রেও বটম নেভ থাকে */}
      <BottomNavbar />
      {downloadOpen && <AppDownloadModal onClose={() => setDownloadOpen(false)} />}
    </div>
  );
};

export default MemberCenter;
