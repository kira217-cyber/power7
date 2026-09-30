import { useEffect } from "react";

/**
 * `index.html` এর বুট স্পিনারটা সরায়।
 *
 * স্পিনারটা React চালু হওয়ার আগেই পেইন্ট হয় (মূল সাইটের
 * `.br_loader_root` এর মতো), তাই সরানোর দায়িত্ব অ্যাপের।
 *
 * প্রতিটা **টপ-লেভেল রুট** এই হুক ডাকে — RootLayout, লগইন/নিবন্ধন পেজ,
 * সদস্য কেন্দ্র। কেবল RootLayout এ রাখলে `/login` এ সরাসরি ঢুকলে
 * স্পিনারটা পর্দা ঢেকে আটকে থাকত।
 *
 * @param {boolean} ready কনটেন্ট দেখানোর মতো অবস্থায় এসেছে কিনা
 */
export const useHideBootLoader = (ready = true) => {
  useEffect(() => {
    if (!ready) return undefined;

    const boot = document.getElementById("tb-boot");
    if (!boot) return undefined;

    boot.classList.add("tb-boot--gone");
    const timer = setTimeout(() => boot.remove(), 300);
    return () => clearTimeout(timer);
  }, [ready]);
};

export default useHideBootLoader;
