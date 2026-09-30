import React from "react";
import { Wrench } from "lucide-react";

import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { getSupportUrl } from "../../data/contact";
import { siteImage, useSiteSettings } from "../../site/siteSettings";

/**
 * সাইট রক্ষণাবেক্ষণে থাকলে পুরো পর্দায় শুধু এই বার্তা।
 *
 * মূল সাইটে এমন পাতা দেখা যায়নি, তাই চেহারা লগইন মডালের ধাঁচে —
 * একই কার্ড (#181F2B, radius ২০), একই বেগুনি বোতাম। ডেস্কটপে px,
 * মোবাইলে ৭৫০ ডিজাইনের rem (`m()`), বাকি সাইটের মতোই।
 *
 * বন্ধ করার বোতাম ইচ্ছে করেই নেই — অ্যাডমিন মোড না নামানো পর্যন্ত
 * কনটেন্ট দেখানো উচিত নয়। "আবার চেষ্টা" পাতা নতুন করে লোড করে।
 */
const MaintenanceScreen = ({ setting }) => {
  const { t, lang } = useLanguage();
  // লোগো admin এর "Site Identity" থেকে
  const { identify } = useSiteSettings();
  const isDesktop = useIsDesktop();

  // admin এর লেখা আগে; ওই ভাষায় ফাঁকা থাকলে নিজের লেখা
  const title = setting?.title?.[lang] || t.maintenance.title;
  const message = setting?.message?.[lang] || t.maintenance.text;

  const u = (desk, mob) => (isDesktop ? desk : m(mob));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "var(--bg)", zIndex: 2000, padding: u(20, 30) }}
    >
      <div
        className="flex w-full flex-col items-center text-center"
        style={{
          maxWidth: u(444, 650),
          background: "#181f2b",
          borderRadius: u(20, 24),
          padding: isDesktop ? "40px 35px 30px" : `${m(56)} ${m(40)} ${m(40)}`,
        }}
      >
        <img
          src={siteImage(identify.logo)}
          alt="POWER7"
          draggable="false"
          style={{ height: u(50, 70), width: "auto", objectFit: "contain" }}
        />

        <span
          className="flex items-center justify-center"
          style={{
            marginTop: u(26, 36),
            width: u(84, 120),
            height: u(84, 120),
            borderRadius: "50%",
            background: "rgb(188 67 244 / 0.12)",
            color: "var(--accent-bright)",
          }}
        >
          <Wrench size={isDesktop ? 38 : 30} />
        </span>

        <p
          style={{
            marginTop: u(22, 32),
            color: "#fff",
            fontSize: u(20, 34),
            fontWeight: 700,
          }}
        >
          {title}
        </p>

        <p
          style={{
            marginTop: u(12, 18),
            color: "#a8a8a8",
            fontSize: u(14, 26),
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {message}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="tb-hover-fade w-full cursor-pointer"
          style={{
            marginTop: u(28, 44),
            height: u(52, 84),
            borderRadius: u(7, 12),
            background: "var(--accent-bright)",
            color: "#fff",
            fontSize: u(18, 30),
            fontWeight: 700,
          }}
        >
          {t.maintenance.retry}
        </button>

        <a
          href={getSupportUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="tb-hover-fade flex w-full items-center justify-center"
          style={{
            marginTop: u(12, 20),
            height: u(46, 76),
            borderRadius: u(7, 12),
            background: "#212937",
            color: "#fff",
            fontSize: u(15, 26),
            fontWeight: 600,
          }}
        >
          {t.maintenance.support}
        </a>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
