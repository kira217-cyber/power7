/**
 * অ্যাফিলিয়েট প্যানেলের প্রতিটা পাতার নিজের রঙ — সাইডবার, হেডার আর পাতা
 * একই রঙ পায়, তাই এক জায়গায়।
 */
export const TONES = {
  // admin এর "Affiliate Colours" এ প্রতি পাতার রঙ; না দিলে এই ডিফল্ট
  dashboard: "var(--aff-dashboard-tone, #fbd029)",
  users: "var(--aff-users-tone, #22d3ee)",
  commission: "var(--aff-commission-tone, #a78bfa)",
  withdraw: "var(--aff-withdraw-tone, #fbbf24)",
  history: "var(--aff-history-tone, #60a5fa)",
  verify: "var(--aff-verify-tone, #34d399)",
  profile: "var(--aff-profile-tone, #f472b6)",
  success: "#38ba9d",
  danger: "#ff777c",
  pending: "#f5b547",
};

/** প্রতি পাতার ব্যানারের পটভূমি — না দিলে প্যানেলের কার্ডের রঙ */
export const HEROES = {
  dashboard: "var(--aff-dashboard-hero, var(--aff-panel-card, var(--neutral900)))",
  users: "var(--aff-users-hero, var(--aff-panel-card, var(--neutral900)))",
  commission: "var(--aff-commission-hero, var(--aff-panel-card, var(--neutral900)))",
  withdraw: "var(--aff-withdraw-hero, var(--aff-panel-card, var(--neutral900)))",
  history: "var(--aff-history-hero, var(--aff-panel-card, var(--neutral900)))",
  verify: "var(--aff-verify-hero, var(--aff-panel-card, var(--neutral900)))",
  profile: "var(--aff-profile-hero, var(--aff-panel-card, var(--neutral900)))",
};

/** কমিশনের চার ভাগ — ড্যাশবোর্ড আর কমিশন পাতায় একই */
export const PARTS = {
  refer: "var(--aff-part-refer, #22d3ee)",
  deposit: "var(--aff-part-deposit, #fbd029)",
  gameLoss: "var(--aff-part-loss, #34d399)",
  gameWin: "var(--aff-part-win, #ff777c)",
};
