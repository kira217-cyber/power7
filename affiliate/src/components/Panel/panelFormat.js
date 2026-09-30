/** ড্যাশবোর্ডে টাকা ও তারিখ দেখানোর ফরম্যাট */

/**
 * অ্যাফিলিয়েটের রেফারেল লিংক।
 *
 * লিংকটা **ক্লায়েন্ট সাইটে** যায়, অ্যাফিলিয়েট সাইটে নয় — যাঁকে রেফার
 * করা হচ্ছে তিনি খেলোয়াড় হবেন, অ্যাফিলিয়েট নন। আগে
 * `window.location.origin` ধরা হতো, ফলে লিংকটা অ্যাফিলিয়েট সাইটের
 * রেজিস্টার পাতায় নিয়ে যেত আর ওখান থেকে খোলা অ্যাকাউন্ট খেলতেই
 * পারত না — কমিশনও জমত না।
 */
export const referralLink = (code) => {
  const base = String(import.meta.env.VITE_CLIENT_URL || "")
    .trim()
    .replace(/\/+$/, "");

  return `${base}/register?ref=${encodeURIComponent(code || "")}`;
};

export const money = (value) =>
  `৳ ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export const when = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

/**
 * শুধু তারিখ।
 *
 * `toLocaleDateString()` খালি হাতে ডাকলে ব্রাউজারের ভাষা ধরত — বাংলা
 * ব্রাউজারে ইংরেজি সাইটেও "১৫/৯/২০২৬" বসে যেত। তাই `when` এর মতোই
 * এখানেও লোকেল বেঁধে দেওয়া।
 */
export const day = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
