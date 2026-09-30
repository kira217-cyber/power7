import React from "react";

/**
 * ডেটা লোড হওয়ার আগ পর্যন্ত পুরো স্ক্রিন জুড়ে দেখানো হয়।
 *
 * **ক্লায়েন্ট সাইটের লোডারটাই হুবহু** (`client/src/components/Loader`) —
 * মূল সাইটের `.br_loader_root` / `.br_spinner` এর নকল:
 *   ঢাকনা `fixed inset-0`
 *   স্পিনার ৬০ × ৬০ — তিনটে রেখা, `border-left: 2.4px solid #ffd800`,
 *   `rotateX(66deg)`, ১s linear infinite; শুরুর কোণ ১২০° / ২৪০° / ৩৬০°
 *
 * স্পিনারের CSS `index.css` এ (`.tb-spinner*`), যাতে দরকার হলে অন্য
 * জায়গাতেও (সেকশনের ভিতরে) একই স্পিনার বসানো যায়।
 */
export const Spinner = ({ size = 60 }) => (
  <span className="tb-spinner" style={{ width: size, height: size }}>
    <span className="tb-spinner__inner">
      <span className="tb-spinner__line" />
      <span className="tb-spinner__line" />
      <span className="tb-spinner__line" />
    </span>
  </span>
);

/**
 * ঢাকনাটা পেছনের পেজটাকে **ঝাপসা** করে, কালো করে দেয় না।
 *
 * ক্লায়েন্ট সাইটের ঢাকনা `rgba(0,0,0,.8)` — পেছনে পেজ থাকলে ওটা ঠিকই
 * দেখায়, কিন্তু অ্যাফিলিয়েটে লোডারটা পেজ আঁকার *আগে* উঠত বলে পেছনে
 * কিছুই থাকত না, পুরো পর্দা কালো হয়ে যেত। তাই দুটো বদল:
 *
 *   ১. RootLayout এখন পেজটা এঁকে তার **উপরে** লোডার বসায়
 *   ২. ঢাকনার রঙ হালকা (সাইটের নেভি, কালো নয়) + `backdrop-filter`,
 *      যাতে পেছনের পেজটা ঝাপসা হয়ে দেখা যায়
 *
 * `backdrop-filter` না চিনলে (পুরোনো ব্রাউজার) শুধু নেভি আস্তরণটা
 * থাকে — তখনো লেখা পড়া যায় না, কাজ চলে যায়।
 */
const OVERLAY = {
  background: "rgb(1 9 40 / 0.55)",
  backdropFilter: "blur(10px) saturate(115%)",
  WebkitBackdropFilter: "blur(10px) saturate(115%)",
};

/** `scope="site"` পুরো পর্দা, `"section"` কোনো অংশের ভিতরে */
const SiteLoader = ({ scope = "site" }) => (
  <div
    className="flex items-center justify-center"
    style={
      scope === "site"
        ? { position: "fixed", inset: 0, zIndex: 1000, ...OVERLAY }
        : { position: "absolute", inset: 0, zIndex: 5, ...OVERLAY }
    }
  >
    <Spinner />
  </div>
);

export default SiteLoader;
