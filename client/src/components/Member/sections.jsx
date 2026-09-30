import React from "react";
import AccountSection from "./AccountSection";
import MoneySection from "./MoneySection";
import RecordSection from "./RecordSection";
import RewardSection from "./RewardSection";
import ReferralSection from "./ReferralSection";
import RebateSection from "./RebateSection";
import InboxSection from "./InboxSection";
import SecuritySection from "./SecuritySection";
import FeedbackSection from "./FeedbackSection";
import HelpSection from "./HelpSection";
import CardsSection from "./CardsSection";
import ClaimCenter from "./reward/ClaimCenter";
import SignInPage from "./reward/SignInPage";
import TemuHistory from "./reward/TemuHistory";

/**
 * সদস্য কেন্দ্রের **একটাই তালিকা**।
 *
 * মূল সাইটে প্রতিটা জিনিস (ডিপোজিট, উত্তোলন, রেকর্ড…) একটাই ফিচার —
 * ডেস্কটপে মডালের একটা ট্যাব হিসেবে খোলে, মোবাইলে নিজের URL এ আলাদা
 * পেজ হিসেবে। তাই কম্পোনেন্টও একটাই (`<Key>Section.jsx`), ভিতরে
 * `useIsDesktop()` দিয়ে দুই লেআউট।
 *
 * এই ফাইলটাই সেই সংযোগের একমাত্র উৎস — মডালের বাঁ মেনু, মোবাইলের
 * রাউট আর সদস্য কেন্দ্রের গ্রিড তিনটাই এখান থেকে পড়ে, যাতে কোথাও
 * একটা যোগ করে অন্যটায় ভুলে যাওয়া না হয়।
 *
 * ক্ষেত্রগুলো:
 *   `key`      — locale ও নেভিগেশনে ব্যবহৃত নাম
 *   `path`     — মোবাইলের URL (`/member/<path>`); না থাকলে মোবাইলে নেই
 *   `icon`     — মডালের মেনুর আইকন
 *   `gridIcon` — মোবাইলের সদস্য কেন্দ্রের গ্রিডের লাইন-আর্ট আইকন
 *   `inModal`  — ডেস্কটপ মডালের বাঁ মেনুতে দেখাবে কিনা
 *   `inGrid`   — মোবাইলের গ্রিডে দেখাবে কিনা
 *   `title(t)` — শিরোনাম; মোবাইল ও ডেস্কটপ একই লেখা ব্যবহার করে
 *   `render()` — কনটেন্ট
 */
export const MEMBER_SECTIONS = [
  {
    key: "myAccount",
    path: "account",
    icon: "icon-avatar",
    gridIcon: "myacc",
    inModal: true,
    inGrid: true,
    title: (t) => t.member.myAccount,
    render: () => <AccountSection />,
  },
  {
    key: "deposit",
    path: "deposit",
    icon: "deposit",
    gridIcon: "deprecm3",
    inModal: true,
    inGrid: false,
    title: (t) => t.money.depositTitle,
    render: () => <MoneySection mode="deposit" />,
  },
  {
    key: "withdraw",
    path: "withdraw",
    icon: "withdraw",
    gridIcon: "withrec3",
    inModal: true,
    inGrid: false,
    title: (t) => t.money.withdrawTitle,
    render: () => <MoneySection mode="withdraw" />,
  },
  {
    key: "betRecord",
    path: "bet-record",
    icon: "bet-record",
    gridIcon: "transbetrepmem3",
    inModal: true,
    inGrid: true,
    title: (t) => t.memberPage.items.betRecord,
    render: () => <RecordSection tab="betRecord" titleKey="betRecord" withGameTabs />,
  },
  {
    key: "accountRecord",
    path: "account-record",
    icon: "icon-account",
    gridIcon: "transrec3",
    inModal: true,
    inGrid: true,
    title: (t) => t.memberPage.items.accountRecord,
    render: () => <RecordSection tab="accountRecord" titleKey="accountRecord" />,
  },
  {
    key: "profitLoss",
    path: "profit-loss",
    icon: "profit-loss",
    gridIcon: "perspnl3",
    inModal: true,
    inGrid: true,
    title: (t) => t.memberPage.items.profitLoss,
    render: () => (
      <RecordSection tab="profitLoss" titleKey="profitLoss" withDays7 pageTitle="profitLoss" />
    ),
  },
  {
    key: "depositRecord",
    path: "deposit-record",
    gridIcon: "deprecm3",
    inModal: false,
    inGrid: true,
    title: (t) => t.memberPage.items.depositRecord,
    render: () => <RecordSection tab="accountRecord" titleKey="depositRecord" />,
  },
  {
    key: "withdrawRecord",
    path: "withdraw-record",
    gridIcon: "withrec3",
    inModal: false,
    inGrid: true,
    title: (t) => t.memberPage.items.withdrawRecord,
    render: () => <RecordSection tab="accountRecord" titleKey="withdrawRecord" />,
  },
  {
    key: "turnoverRecord",
    path: "turnover-record",
    gridIcon: "turnover3",
    inModal: false,
    inGrid: true,
    title: (t) => t.memberPage.items.turnoverRecord,
    render: () => <RecordSection tab="accountRecord" titleKey="turnoverRecord" />,
  },
  {
    key: "reward",
    path: "reward",
    icon: "reward",
    gridIcon: "rewcen3",
    inModal: true,
    inGrid: true,
    title: (t) => t.memberPage.items.reward,
    render: () => <RewardSection />,
  },
  {
    key: "referral",
    path: "referral",
    icon: "share",
    gridIcon: "referral",
    inModal: true,
    inGrid: true,
    title: (t) => t.memberPage.items.referral,
    render: () => <ReferralSection />,
  },
  {
    key: "inbox",
    path: "mail",
    icon: "mailcen",
    gridIcon: "mailcen",
    inModal: true,
    inGrid: true,
    title: (t) => t.memberPage.items.mail,
    render: () => <InboxSection />,
  },
  {
    key: "manualRebate",
    path: "rebate",
    icon: "cashback",
    gridIcon: "manplayreb3",
    inModal: true,
    inGrid: true,
    title: (t) => t.memberPage.items.rebate,
    render: () => <RebateSection />,
  },
  // ─ মূল সাইটে এই তিনটা শুধু মোবাইলেই আছে, ডেস্কটপ মডালে ট্যাব নেই ─
  {
    key: "security",
    path: "security",
    gridIcon: "secpriv",
    inModal: false,
    inGrid: true,
    title: (t) => t.memberPage.items.security,
    render: () => <SecuritySection />,
  },
  {
    key: "feedback",
    path: "feedback",
    gridIcon: "feedback3",
    inModal: false,
    inGrid: true,
    title: (t) => t.memberPage.items.feedback,
    render: () => <FeedbackSection />,
  },
  {
    key: "help",
    path: "help",
    gridIcon: "helpcenter",
    inModal: false,
    inGrid: true,
    title: (t) => t.memberPage.items.help,
    render: () => <HelpSection />,
  },
  {
    // মোবাইলের "আমার কার্ড" (সদস্য পাতার উপরের বোতাম) — গ্রিড বা মডালে নেই
    key: "cards",
    path: "cards",
    inModal: false,
    inGrid: false,
    title: (t) => t.memberPage.cardBtn,
    render: () => <CardsSection />,
  },
  // ─ পুরস্কার কেন্দ্রের ভিতরের পাতা (মোবাইল) — ডেস্কটপে এগুলো পুরস্কার ট্যাবের ভিতরেই ─
  {
    key: "rewardClaim",
    path: "reward/claim",
    inModal: false,
    inGrid: false,
    title: (t) => t.memberPage.pages.reward.tiles.claim,
    render: () => <ClaimCenter />,
  },
  {
    key: "rewardSignIn",
    path: "reward/signin",
    inModal: false,
    inGrid: false,
    title: (t) => t.rewardFlow.signIn,
    render: () => <SignInPage />,
  },
  {
    key: "rewardTemu",
    path: "reward/temu",
    inModal: false,
    inGrid: false,
    title: (t) => t.rewardFlow.temuHistory,
    render: () => <TemuHistory />,
  },
];

/** key → section */
export const SECTION_BY_KEY = Object.fromEntries(
  MEMBER_SECTIONS.map((section) => [section.key, section]),
);

/** মডালের বাঁ পাশের মেনু */
export const MODAL_TABS = MEMBER_SECTIONS.filter((section) => section.inModal);

/** মোবাইলের `/member/*` রাউট */
export const MOBILE_ROUTES = MEMBER_SECTIONS.filter((section) => section.path);

/** key → `/member/...` লিংক */
export const MEMBER_LINKS = Object.fromEntries(
  MOBILE_ROUTES.map((section) => [section.key, `/member/${section.path}`]),
);
