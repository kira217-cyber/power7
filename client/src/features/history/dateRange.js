/**
 * রেকর্ডের তারিখের সীমা — ব্রাউজারের নিজের সময় অঞ্চলে দিনের শুরু-শেষ।
 *
 * server শুধু `from`/`to` (ISO) পায়; "আজ" মানে খেলোয়াড়ের আজ, server এর নয়।
 * সপ্তাহ শুরু সোমবার।
 */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const rangeOf = (key, now = new Date()) => {
  const today = startOfDay(now);
  switch (key) {
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: endOfDay(y) };
    }
    case "days7":
      return { from: addDays(today, -6), to: endOfDay(now) };
    case "week": {
      const back = (today.getDay() + 6) % 7;
      return { from: addDays(today, -back), to: endOfDay(now) };
    }
    case "month":
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: endOfDay(now) };
    default:
      return { from: today, to: endOfDay(now) };
  }
};

const pad = (n) => String(n).padStart(2, "0");

/** "MM/DD" — ফিল্টারের পাশে দেখানোর জন্য */
export const shortDate = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
