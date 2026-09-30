/**
 * টাকার হিসাবের ছোট সাহায্যকারী — সব রুট এখান থেকেই নেয়।
 *
 * `num` যেকোনো মানকে সংখ্যা বানায় (ভুল মান হলে ০), `money` দুই দশমিকে
 * গোল করে — ভাসমান বিন্দুর 0.1 + 0.2 ধরনের ভুল জমতে দেয় না।
 */
export const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const money = (value) => Math.round(num(value) * 100) / 100;
