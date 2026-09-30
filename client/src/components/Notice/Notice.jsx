import React from "react";
import { useLanguage } from "../../Context/LanguageProvider";

import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";

/**
 * ব্যানারের নিচের চলন্ত নোটিশ বার।
 *
 * ডেস্কটপ (px, মাপা):
 *   `.notice-marquee-container` ১০৮৫ × ৫০, radius ২২.৫, bg #241A3E,
 *     padding `0 13.5`; `.notice-icon` ৩৯ × ৩৯
 *
 * মোবাইল (৭৫০-ডিজাইন, মাপা) — গঠনটা উল্টো: বারের পেছনে **কিছু নেই**,
 *   শুধু মাঝের লেখার অংশটা একটা গোলাকার পিল:
 *   `.notice_root` ৭৫০ × ৭৯.৯, padding `10 0`
 *   `.notice_bg` ৭৫০ × ৬০, padding `0 26`
 *   `.notice_icon` ৩৬ × ৩৬ (x ২৬) — বারের বাইরে, বাঁয়ে
 *   `.marquee` ৬২৮.১ × ৬০ (x ৭২), bg #241A3E, radius ৩০, fs ২৪
 *   ডানে `.download-icon` ২৪ × ৪৭ — বেগুনি শেভরন + "APP"
 */
const Notice = ({ notices = [] }) => {
  const { lang } = useLanguage();
  const isDesktop = useIsDesktop();

  if (!notices.length) return null;

  const text = notices.map((notice) => (lang === "en" && notice.textEn) || notice.text).join("　　");

  const marquee = (
    <div className="tb-marquee">
      {/* কনটেন্ট দুবার — একটানা লুপের জন্য */}
      {[0, 1].map((copy) => (
        <span
          key={copy}
          className="whitespace-nowrap"
          style={{
            fontSize: isDesktop ? 16 : m(24),
            color: "var(--home-notice-text, #fff)",
            paddingInlineEnd: isDesktop ? 40 : m(60),
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );

  if (!isDesktop) {
    return (
      <div className="flex items-center" style={{ height: m(79.9), padding: `${m(10)} ${m(26)}` }}>
        <span
          className="shrink-0"
          style={{
            width: m(36),
            height: m(36),
            backgroundImage: "url(/assets/mobile/notice-icon.png)",
            backgroundSize: "contain",
            backgroundPosition: "50%",
            backgroundRepeat: "no-repeat",
          }}
        />

        <div
          className="relative flex flex-1 items-center overflow-hidden"
          style={{
            height: m(60),
            marginInlineStart: m(10),
            paddingInline: m(24),
            borderRadius: m(30),
            background: "var(--home-notice-bg, var(--surface))",
          }}
        >
          {marquee}
        </div>

        {/* ডানের APP ডাউনলোড ইঙ্গিত — নিচমুখী শেভরন + "APP" */}
        <div
          className="flex shrink-0 flex-col items-center justify-center"
          style={{ width: m(30), height: m(47), marginInlineStart: m(8) }}
        >
          <span
            style={{
              width: m(26),
              height: m(14),
              backgroundColor: "var(--home-notice-icon, var(--accent-bright))",
              clipPath: "polygon(0 0, 50% 100%, 100% 0)",
            }}
          />
          <span
            style={{
              marginTop: m(4),
              fontSize: m(18),
              lineHeight: 1,
              fontWeight: 700,
              color: "var(--accent-bright)",
            }}
          >
            APP
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center overflow-hidden"
      style={{
        height: "var(--notice-h)",
        borderRadius: "var(--notice-radius)",
        background: "var(--home-notice-bg, var(--surface))",
        padding: "0 13.5px",
        gap: 19,
      }}
    >
      <span
        className="shrink-0"
        style={{
          width: 39,
          height: 39,
          backgroundImage: "url(/assets/icons/speaker.png)",
          backgroundSize: "contain",
          backgroundPosition: "50%",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative flex-1 overflow-hidden">{marquee}</div>
    </div>
  );
};

export default Notice;
