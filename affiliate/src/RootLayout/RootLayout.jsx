import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";

import Navber from "../components/Navber/Navber";
import Footer from "../components/Footer/Footer";
import SiteLoader from "../components/SiteLoader/SiteLoader";
import { useHideBootLoader } from "../hook/useHideBootLoader";

import { fetchAffiliateData } from "../features/global/globalSlice";
import {
  selectGlobalLoaded,
  selectSiteIdentify,
} from "../features/global/globalSelectors";

// ক্লায়েন্ট সাইটের মতোই — লোডার অন্তত এতক্ষণ দেখানো হয়
const MIN_LOADER_MS = 2000;

// পেজ লোডে একবারই
let minLoaderDone = false;

const RootLayout = () => {
  const [minTimePassed, setMinTimePassed] = useState(minLoaderDone);

  const dispatch = useDispatch();
  const loaded = useSelector(selectGlobalLoaded);
  const siteIdentify = useSelector(selectSiteIdentify);
  const { pathname } = useLocation();

  // অ্যাডমিন-নিয়ন্ত্রিত টাইটেল ও favicon বসানো
  useEffect(() => {
    document.title = siteIdentify?.siteName || "Site title not set";

    if (siteIdentify?.favicon) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = siteIdentify.favicon;
    }
  }, [siteIdentify]);

  useEffect(() => {
    if (minLoaderDone) return undefined;

    const timer = setTimeout(() => {
      minLoaderDone = true;
      setMinTimePassed(true);
    }, MIN_LOADER_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) {
      dispatch(fetchAffiliateData());
    }
  }, [dispatch, loaded]);

  // রুট বদলালে উপরে ফিরে যাওয়া
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const booting = !loaded || !minTimePassed;

  /*
   * বুট স্পিনারটা React চালু হওয়ামাত্রই সরাই, ডেটার অপেক্ষায় নয়।
   *
   * আগে `!booting` পাঠানো হতো, ফলে ডেটা আসা পর্যন্ত index.html এর কালো
   * ঢাকনাটাই পর্দা জুড়ে থাকত। এখন নিচের `<SiteLoader />` সাথে সাথেই
   * দায়িত্ব নেয় — কিন্তু সেটা পেজের *উপরে* বসে, তাই পেছনের পেজটা
   * ঝাপসা হয়ে দেখা যায়।
   */
  useHideBootLoader(true);

  // লোডার ওঠা অবস্থায় পেছনের পেজটা যেন স্ক্রল না হয় — দেখা যাচ্ছে বলে
  // চাকা ঘোরালে নড়ে উঠত, অথচ ক্লিক করা যায় না
  useEffect(() => {
    if (!booting) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [booting]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--neutral1000)]">
      <Navber />

      <main className="flex-1 pt-[var(--header-height)] lg:pt-[var(--desktop-header-height)]">
        <Outlet />
      </main>

      <Footer />

      {booting && <SiteLoader />}
    </div>
  );
};

export default RootLayout;
