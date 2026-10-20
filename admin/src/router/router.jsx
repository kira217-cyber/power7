import { createBrowserRouter } from "react-router";

import RootLayout from "../RootLayout/RootLayout";
import PrivateRoute from "../PrivateRoute/PrivateRoute";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Profile from "../pages/Profile/Profile";
import Admins from "../pages/Admins/Admins";
import GameApiKey from "../pages/GameApiKey/GameApiKey";
import GameLaunchKey from "../pages/GameLaunchKey/GameLaunchKey";
import Maintenance from "../pages/Maintenance/Maintenance";
import OtpSetting from "../pages/OtpSetting/OtpSetting";
import Users from "../pages/Users/Users";
import Affiliates from "../pages/Users/Affiliates";
import UserDetails from "../pages/Users/UserDetails";
import GameHistory from "../pages/GameHistory/GameHistory";
import DepositMethods from "../pages/DepositMethods/DepositMethods";
import DepositField from "../pages/DepositField/DepositField";
import DepositBonusTurnover from "../pages/DepositBonusTurnover/DepositBonusTurnover";
import ManualDeposit from "../pages/ManualDeposit/ManualDeposit";
import DepositRequests from "../pages/DepositRequests/DepositRequests";
import WithdrawMethods from "../pages/WithdrawMethods/WithdrawMethods";
import WithdrawRequests from "../pages/WithdrawRequests/WithdrawRequests";
import Verification from "../pages/Verification/Verification";
import AffiliateVerification from "../pages/Verification/AffiliateVerification";
import TurnoverHistory from "../pages/TurnoverHistory/TurnoverHistory";
import ReferralProgram from "../pages/Referral/ReferralProgram";
import ReferralRewards from "../pages/Referral/ReferralRewards";
import RewardTemplates from "../pages/Rewards/RewardTemplates";
import RewardTickets from "../pages/Rewards/RewardTickets";
import SignInSetting from "../pages/Rewards/SignInSetting";
import VipLevels from "../pages/Vip/VipLevels";
import VipSettings from "../pages/Vip/VipSettings";
import VipHistory from "../pages/Vip/VipHistory";
import { Popups, Sliders } from "../pages/SiteContent/ImageListPage";
import Notices from "../pages/SiteContent/Notices";
import SitePromotions from "../pages/SiteContent/Promotions";
import ContactLinks from "../pages/SiteContent/ContactLinks";
import InboxMessages from "../pages/SiteContent/InboxMessages";
import HelpContent from "../pages/SiteContent/HelpContent";
import HomeEvents from "../pages/SiteContent/HomeEvents";
import AppDownload from "../pages/SiteContent/AppDownload";
import AffWithdrawRequests from "../pages/AffWithdrawRequests/AffWithdrawRequests";
import BulkAdjustment from "../pages/BulkAdjustment/BulkAdjustment";
import RegisterBonus from "../pages/RegisterBonus/RegisterBonus";
import AutoDeposit from "../pages/AutoDeposit/AutoDeposit";
import AutoDepositHistory from "../pages/AutoDepositHistory/AutoDepositHistory";
import MfsDeposit from "../pages/MfsDeposit/MfsDeposit";
import MfsDepositHistory from "../pages/MfsDepositHistory/MfsDepositHistory";
import AutoWithdraw from "../pages/AutoWithdraw/AutoWithdraw";
import AutoWithdrawHistory from "../pages/AutoWithdrawHistory/AutoWithdrawHistory";
import ThemeStudio from "../pages/ThemeStudio/ThemeStudio";
import AffWithdrawMethods from "../pages/AffWithdrawMethods/AffWithdrawMethods";
import IdentityPage from "../pages/SiteSettings/SiteIdentity";
import FooterPage from "../pages/SiteSettings/FooterSetting";
import ClientFooter from "../pages/SiteSettings/ClientFooter";
import AffiliateHomeContent from "../pages/Affiliate/AffiliateHomeContent";
import AffiliateAuthPage from "../pages/Affiliate/AffiliateAuthPage";
import { Handshake, Image as ImageIcon, UserRoundCheck } from "lucide-react";

/** ক্লায়েন্টের পরিচয়ের ছবি — ডেস্কটপ ও মোবাইলের লোগো আলাদা (মূল সাইটের মতো) */
const CLIENT_IMAGES = [
  { key: "logo", label: "Desktop logo (header, maintenance page)", size: "≈ 149 × 50 px" },
  { key: "mobileLogo", label: "Mobile logo (header, login, app download)", size: "≈ 446 × 150 px" },
  { key: "favicon", label: "Favicon (browser tab icon)", size: "≈ 64 × 64 px (png)", box: "h-14 w-14" },
];

const AFF_FOOTER_FIELDS = [
  { key: "description", label: "Description / CTA", textarea: true, rows: 3 },
  { key: "copyright", label: "Copyright" },
  { key: "ageNotice", label: "Age notice" },
];
import Feedback from "../pages/Feedback/Feedback";
import NotFoundPage from "../pages/NotFoundPage/NotFoundPage";
import { navItems } from "../data/navigation";

/**
 * রুট টেবিল।
 *
 * সাইডবারের তালিকাটাই (`data/navigation.js`) রুটের **একমাত্র উৎস** —
 * প্রতিটা নেভ আইটেমের জন্য একটা রুট নিজে থেকেই তৈরি হয়, তাই মেনুতে
 * কিছু যোগ করলে রুট লিখতে ভুলে যাওয়ার সুযোগ নেই।
 *
 * প্রতিটা পেজ `REAL_PAGES` এ। মেনুতে আছে কিন্তু এখানে নেই এমন আইটেমের
 * রুট হয় না (খালি "No API" পাতা আর নেই) — নতুন পেজ দুই জায়গাতেই যোগ করো।
 */
const REAL_PAGES = {
  "/": <Dashboard />,
  "/admins": <Admins />,
  "/users": <Users />,
  "/affiliates": <Affiliates />,
  "/game-api-key": <GameApiKey />,
  "/game-history": <GameHistory />,
  "/deposit-methods": <DepositMethods />,
  "/deposit-field": <DepositField />,
  "/deposit-bonus-turnover": <DepositBonusTurnover />,
  "/manual-deposit": <ManualDeposit />,
  "/deposit-requests": <DepositRequests />,
  "/withdraw-methods": <WithdrawMethods />,
  "/withdraw-requests": <WithdrawRequests />,
  "/verification": <Verification />,
  "/affiliate-verification": <AffiliateVerification />,
  "/turnover-history": <TurnoverHistory />,
  "/game-launch-key": <GameLaunchKey />,
  "/maintenance": <Maintenance />,
  "/otp-setting": <OtpSetting />,
  "/referral": <ReferralProgram />,
  "/referral-rewards": <ReferralRewards />,
  "/reward-tickets": <RewardTemplates />,
  "/reward-signin": <SignInSetting />,
  "/reward-history": <RewardTickets />,
  "/vip-levels": <VipLevels />,
  "/vip-settings": <VipSettings />,
  "/vip-history": <VipHistory />,
  "/sliders": <Sliders />,
  "/popups": <Popups />,
  "/site-notice": <Notices />,
  "/promotions": <SitePromotions />,
  "/contact-links": <ContactLinks />,
  "/notifications": <InboxMessages />,
  "/help-content": <HelpContent />,
  "/home-events": <HomeEvents />,
  "/app-download": <AppDownload />,
  "/aff-withdraw-requests": <AffWithdrawRequests />,
  "/bulk-adjustment": <BulkAdjustment />,
  "/register-bonus": <RegisterBonus />,
  "/auto-deposit": <AutoDeposit />,
  "/auto-deposit-history": <AutoDepositHistory />,
  "/mfs-deposit": <MfsDeposit />,
  "/mfs-deposit-history": <MfsDepositHistory />,
  "/auto-withdraw": <AutoWithdraw />,
  "/auto-withdraw-history": <AutoWithdrawHistory />,
  "/site-theme/client": <ThemeStudio key="client" site="client" />,
  "/site-theme/affiliate": <ThemeStudio key="affiliate" site="affiliate" />,
  "/aff-withdraw-methods": <AffWithdrawMethods />,
  "/site-identity": (
    <IdentityPage
      title="Site Identity"
      subtitle="Client site title, logos and favicon — the preview shows them before you save."
      endpoint="identify"
      Icon={ImageIcon}
      images={CLIENT_IMAGES}
      placeholder="POWER7"
      preview
      resettable
    />
  ),
  "/footer-setting": <ClientFooter />,
  "/aff-identity": <IdentityPage title="Affiliate Identity" subtitle="Affiliate site name, logo and favicon." endpoint="aff-identify" Icon={UserRoundCheck} />,
  "/aff-footer": <FooterPage title="Affiliate Footer" subtitle="Affiliate footer logo, description and copyright." endpoint="aff-footer" logoKey="logo" fields={AFF_FOOTER_FIELDS} Icon={Handshake} />,
  "/affiliate-home-content": <AffiliateHomeContent />,
  "/affiliate-login-page": <AffiliateAuthPage page="login" title="Affiliate Login Page" />,
  "/affiliate-register-page": <AffiliateAuthPage page="register" title="Affiliate Register Page" />,
  "/affiliate-forgot-page": <AffiliateAuthPage page="forgot" title="Affiliate Forgot Password Page" />,
  "/app-download-content": <AppDownload />,
  "/feedback": <Feedback />,
};

/** নেস্টেড তালিকাটা সমতল করে — গ্রুপের নামও সাথে রাখি */
const flatten = (items, group = "") =>
  items.flatMap((item) =>
    item.children?.length
      ? flatten(item.children, item.label)
      : [{ ...item, group }],
  );

const pages = flatten(navItems);

if (import.meta.env.DEV) {
  pages
    .filter((p) => p.path && !REAL_PAGES[p.path])
    .forEach((p) => console.warn(`[router] menu item without a page: ${p.path}`));
}

/** রুট এলিমেন্ট — দরকার হলে গার্ড দিয়ে মোড়া */
const elementFor = (item) => {
  const page = REAL_PAGES[item.path];

  if (item.motherOnly) {
    return <PrivateRoute motherOnly>{page}</PrivateRoute>;
  }

  if (item.perm) {
    return <PrivateRoute perm={item.perm}>{page}</PrivateRoute>;
  }

  return page;
};

export const routes = createBrowserRouter(
  [
    { path: "/login", element: <Login />, errorElement: <NotFoundPage /> },

    {
      path: "/",
      element: (
        <PrivateRoute>
          <RootLayout />
        </PrivateRoute>
      ),
      errorElement: <NotFoundPage />,
      children: [
        { index: true, element: elementFor(pages.find((p) => p.path === "/")) },

        // নিজের প্রোফাইল সাইডবারে নেই — হেডারের আইকন থেকে খোলে
        { path: "profile", element: <Profile /> },

        // একজনের বিস্তারিত — সাইডবারে নেই, তালিকার সারিতে চাপলে খোলে।
        // তালিকার পেজের একই পারমিশন (server ও একই নিয়মে আটকায়)
        {
          path: "users/:id",
          element: (
            <PrivateRoute perm="users">
              <UserDetails kind="users" />
            </PrivateRoute>
          ),
        },
        {
          path: "affiliates/:id",
          element: (
            <PrivateRoute perm="affiliates">
              <UserDetails kind="affiliates" />
            </PrivateRoute>
          ),
        },

        ...pages
          .filter((item) => item.path && item.path !== "/" && REAL_PAGES[item.path])
          .map((item) => ({
            path: item.path.replace(/^\//, ""),
            element: elementFor(item),
          })),

        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);

export default routes;
