import React from "react";

import { m } from "../../hook/useUnits";

/**
 * মোবাইলে পর্দার একদম উপরে অ্যাপ ডাউনলোডের বার — হেডারেরও উপরে।
 * ডেস্কটপে এটা নেই।
 *
 * মূল সাইট (`.shell-download-bar`) থেকে মাপা, ৭৫০-ডিজাইনে:
 *   বার ৭৫০ × ১২৫, bg #081B21, padding `0 11 0 70`
 *   `.download-bar-close` ২৫ × ২৫, বাঁয়ে (২০, ৫০)
 *   `.download-bar-icon` ৯৫ × ৯৫ (x ৭০, y ১৫), radius ২০
 *   `.app-full-name-wrap` (২২৮, ৩০) — দুটো লেখার ছবি একটার নিচে
 *     একটা: ১৯৮ × ৩০ ও ১৫৯ × ৩০
 *   `.download-bar-btn-wrap` ৩০০ × ১১৮ (x ৪৫০) — পিছনে ঝিলিকের
 *     ছবি (`100% 95%`), উপরে বোতাম ২০০ × ৬৫ (x ৫২০, y ৩০)
 */
const DownloadBar = ({ onClose, onDownload }) => (
  <div
    className="tb-dlbar fixed top-0 right-0 left-0 md:hidden"
    style={{ height: m(125), background: "#081b21", zIndex: 21 }}
  >
    <button
      type="button"
      onClick={onClose}
      aria-label="close"
      className="absolute cursor-pointer"
      style={{ left: m(20), top: m(50), width: m(25), height: m(25) }}
    >
      <img
        src="/assets/mobile/dl/close.svg"
        alt=""
        style={{ width: "100%", height: "100%" }}
      />
    </button>

    <img
      src="/assets/mobile/dl/app-icon.png"
      alt=""
      className="absolute"
      style={{ left: m(70), top: m(15), width: m(95), height: m(95), borderRadius: m(20) }}
    />

    <div className="absolute" style={{ left: m(228), top: m(30) }}>
      <img src="/assets/mobile/dl/text1.png" alt="" style={{ width: m(198), height: m(30) }} />
      <img
        src="/assets/mobile/dl/text2.png"
        alt=""
        style={{ width: m(159), height: m(30), marginTop: m(5), marginInlineStart: m(19) }}
      />
    </div>

    <button
      type="button"
      onClick={onDownload}
      className="absolute flex cursor-pointer items-center justify-center"
      style={{
        left: m(450),
        top: 0,
        width: m(300),
        height: m(118),
        backgroundImage: "url(/assets/mobile/dl/btn-bg.png)",
        backgroundSize: "100% 95%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "50%",
      }}
    >
      <span
        style={{
          width: m(200),
          height: m(65),
          backgroundImage: "url(/assets/mobile/dl/btn.png)",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "50%",
        }}
      />
    </button>
  </div>
);

export default DownloadBar;
