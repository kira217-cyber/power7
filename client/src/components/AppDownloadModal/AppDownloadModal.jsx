import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import api, { API_URL } from "../../api/axios";
import { notify } from "../../utils/notify";
import { siteImage, useSiteSettings } from "../../site/siteSettings";

/** APK এর ঠিকানা — server আসল নামটা `Content-Disposition` এ দেয় */
const DOWNLOAD_URL = `${API_URL}/api/app/download`;

/**
 * অ্যাপ ডাউনলোডের মডাল।
 *
 * মূল সাইটের মোবাইল `.bottom-modal.a2hs` থেকে মাপা (৭৫০-ডিজাইনে):
 *   নিচ থেকে ওঠা প্যানেল ৭৫০ × ৩৪৬, উপরের কোণ radius ১৫.৬
 *   আইকন ১২০ × ১২০ (x ৪৪), পাশে বর্ণনা ৪৯৩ চওড়া fs ৩০
 *   ক্লোজ ৫০ বৃত্ত bg #868686, উপরে-ডানে
 *   দুটো বোতাম ৩০০ × ৭৪ radius ১৪.৬ —
 *     "APP" bg #1678FF, "ওয়েব-অ্যাপ" সাদা বর্ডার
 *   APP বোতামের উপরে ছোট ট্যাগ ১২৬ × ৩০ bg #EA4E3D
 */
const AppDownloadModal = ({ onClose }) => {
  const { t, lang } = useLanguage();
  // লোগো admin এর "Site Identity" থেকে
  const { identify } = useSiteSettings();
  const isDesktop = useIsDesktop();
  // admin এর "App Download" — APK আছে কিনা, নাম, বর্ণনা
  const [app, setApp] = useState(null);
  useEffect(() => {
    api
      .get("/api/app/public")
      .then(({ data }) => setApp(data?.data || null))
      .catch(() => setApp(null));
  }, []);
  const desc = (lang === "en" ? app?.description?.en || app?.description?.bn : app?.description?.bn || app?.description?.en) || t.download.desc;
  const hasApk = Boolean(app?.hasApk);

  const downloadApk = (e) => {
    if (hasApk) return;
    e.preventDefault();
    notify.info(t.download.notReady);
  };
  const webApp = () => notify.info(t.download.webAppHint);

  const panel = isDesktop
    ? { width: 520, borderRadius: 16, padding: 28 }
    : {
        width: "100%",
        borderRadius: `${m(15.6)} ${m(15.6)} 0 0`,
        padding: `${m(30)} ${m(30)} ${m(40)}`,
      };

  return (
    <div
      className="fixed inset-0 flex justify-center"
      style={{
        background: "rgb(0 0 0 / 0.6)",
        zIndex: 80,
        alignItems: isDesktop ? "center" : "flex-end",
      }}
      onClick={onClose}
    >
      <div
        className="relative"
        style={{ ...panel, background: "#fff", color: "#222" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="absolute grid cursor-pointer place-items-center"
          style={{
            top: isDesktop ? 16 : m(30),
            right: isDesktop ? 16 : m(20),
            width: isDesktop ? 34 : m(50),
            height: isDesktop ? 34 : m(50),
            borderRadius: "50%",
            background: "#868686",
            color: "#fff",
          }}
        >
          <Icon name="popup-close" size={isDesktop ? 16 : m(25)} />
        </button>

        <div className="flex items-center" style={{ gap: isDesktop ? 18 : m(18) }}>
          <img
            src={siteImage(identify.mobileLogo)}
            alt={t.brand}
            style={{
              width: isDesktop ? 84 : m(120),
              height: isDesktop ? 84 : m(120),
              borderRadius: isDesktop ? 12 : m(8),
              objectFit: "contain",
              background: "#f3f3f3",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontSize: isDesktop ? 16 : m(30),
              lineHeight: 1.45,
              color: "#222",
            }}
          >
            {desc}
          </div>
        </div>

        {/* ডেস্কটপে ফোন দিয়ে স্ক্যান করে নামানোর QR */}
        {isDesktop && hasApk && (
          <div className="flex items-center" style={{ marginTop: 18, gap: 14, padding: 12, borderRadius: 10, background: "#f5f7fb" }}>
            <div style={{ background: "#fff", padding: 6, lineHeight: 0 }}>
              <QRCodeCanvas value={DOWNLOAD_URL} size={96} marginSize={0} />
            </div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
              {t.download.scan}
              <div style={{ marginTop: 4, color: "#999", fontSize: 12, wordBreak: "break-all" }}>
                {app.fileName}
                {app.version ? ` · v${app.version}` : ""}
              </div>
            </div>
          </div>
        )}

        <div
          className="text-center"
          style={{
            marginTop: isDesktop ? 22 : m(28),
            fontSize: isDesktop ? 15 : m(32),
            color: "#1678ff",
            textDecoration: "underline",
            cursor: "pointer",
          }}
          onClick={onClose}
        >
          {t.download.continueBrowser}
        </div>

        <div
          className="flex justify-center"
          style={{ marginTop: isDesktop ? 18 : m(26), gap: isDesktop ? 16 : m(20) }}
        >
          <span className="relative">
            <span
              className="absolute grid place-items-center"
              style={{
                top: isDesktop ? -12 : m(-24),
                left: "50%",
                transform: "translateX(-50%)",
                width: isDesktop ? 96 : m(126),
                height: isDesktop ? 22 : m(30),
                borderRadius: isDesktop ? 6 : m(6.5),
                background: "#ea4e3d",
                color: "#fff",
                fontSize: isDesktop ? 12 : m(16),
                whiteSpace: "nowrap",
              }}
            >
              {t.download.tag}
            </span>
            {/* admin এর আপলোড করা APK — ঠিক সেই নামেই নামে */}
            <a
              href={hasApk ? DOWNLOAD_URL : "#"}
              download={hasApk ? app.fileName : undefined}
              onClick={downloadApk}
              className="flex cursor-pointer items-center justify-center"
              style={{
                width: isDesktop ? 200 : m(300),
                height: isDesktop ? 50 : m(74),
                borderRadius: isDesktop ? 10 : m(14.6),
                background: "#1678ff",
                color: "#fff",
                fontSize: isDesktop ? 16 : m(24),
                gap: 8,
                opacity: app && !hasApk ? 0.55 : 1,
              }}
            >
              <Icon name="icon-android" size={isDesktop ? 20 : m(40)} />
              APP
            </a>
          </span>

          {app?.showWebApp !== false && (
          <button
            type="button"
            onClick={webApp}
            className="flex cursor-pointer items-center justify-center"
            style={{
              width: isDesktop ? 200 : m(300),
              height: isDesktop ? 50 : m(74),
              borderRadius: isDesktop ? 10 : m(14.6),
              background: "#fff",
              border: "1px solid #1678ff",
              color: "#1678ff",
              fontSize: isDesktop ? 16 : m(24),
              gap: 8,
            }}
          >
            <Icon name="icon-apple" size={isDesktop ? 20 : m(40)} />
            {t.download.webApp}
          </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppDownloadModal;
