import React from "react";

import { useLanguage } from "../../Context/LanguageProvider";
import { copyText } from "../../utils/referralLink";
import { notify } from "../../utils/notify";

/**
 * লগইনের পর প্রোফাইল আইকনে hover করলে যে ড্রপডাউনটা নামে।
 *
 * মূল সাইট থেকে মাপা:
 *   প্যানেল ৩০৪ চওড়া (ভিতরের আইটেম ২৬০ + দুপাশে ২২)
 *   অবতার বৃত্ত ৬৮.৭, সোনালি বর্ডার #F0C343; ভিতরে ছবি ৬২
 *   VIP ব্যাজ ৫৪.১ × ২১.৮, radius ৪, কমলা গ্রেডিয়েন্ট, fs ২০
 *   নাম fs ২০; "ID:…" fs ২০, পাশে কপি বোতাম
 *   পাঁচটা আইটেম ২৬০ × ৪৮, radius ১০, ধূসর-নীল গ্রেডিয়েন্ট,
 *     y ১৮৯.৭ থেকে ৫৮ ধাপে; আইকন ~২৩, লেখা fs ১৭
 */
// মূল সাইটের মতো সব আইকন একই ধূসর-নীল (#879EC0) রেখায়
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
const ICONS = {
  myAccount: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" {...P} />
      <path d="M3 10h18M16 14.5h2" {...P} />
      <path d="M6 6l9-3 1.5 3" {...P} />
    </>
  ),
  betRecord: (
    <>
      <circle cx="12" cy="12" r="9" {...P} />
      <path d="M7.5 10.5l2.2 1.8L12 8.5l2.3 3.8 2.2-1.8-1 5h-7z" {...P} />
    </>
  ),
  inbox: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" {...P} />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" {...P} />
    </>
  ),
  support: (
    <>
      <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" {...P} />
      <rect x="3" y="13" width="4" height="6" rx="1.5" {...P} />
      <rect x="17" y="13" width="4" height="6" rx="1.5" {...P} />
      <path d="M19 19c0 1.5-2 2.5-5 2.5" {...P} />
    </>
  ),
  logout: (
    <>
      <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" {...P} />
      <path d="M10 12h10M17 8.5l3.5 3.5-3.5 3.5" {...P} />
    </>
  ),
};

const ITEMS = [
  { key: "myAccount", member: "myAccount" },
  { key: "betRecord", member: "betRecord" },
  { key: "inbox", member: "inbox" },
  { key: "support" },
  { key: "logout" },
];

const ProfileMenu = ({ user, onMember, onSupport, onLogout }) => {
  const { t } = useLanguage();

  const label = {
    myAccount: t.member.myAccount,
    betRecord: t.member.betRecord,
    inbox: t.member.inbox,
    support: t.sidebar.support,
    logout: t.sidebar.signOut,
  };
  const id = user?.referralCode || "";

  return (
    // অবতারের ঠিক নিচে, মাঝ বরাবর; উপরের ১২ ফাঁকটাও hover এলাকার ভিতরে
    <div className="absolute" style={{ top: "100%", left: "50%", transform: "translateX(-50%)", paddingTop: 12, zIndex: 30 }}>
      <div style={{ width: 304, padding: "20px 22px 20px", borderRadius: 21, background: "#282b34", boxShadow: "0 10px 30px rgb(0 0 0 / 0.45)" }}>
        <div className="flex flex-col items-center">
          <span className="grid place-items-center" style={{ width: 69, height: 69, borderRadius: "50%", background: "#f0c343" }}>
            <img
              src={user?.avatar || "/assets/member-desk/avatar-0.png"}
              onError={(e) => {
                e.currentTarget.src = "/assets/member-desk/avatar-0.png";
              }}
              alt=""
              style={{ width: 63, height: 63, borderRadius: "50%", objectFit: "cover", background: "#b1b8b6" }}
            />
          </span>
          <span
            className="grid place-items-center"
            style={{ marginTop: -11, width: 54, height: 22, borderRadius: 4, background: "linear-gradient(278deg,#e8a31d 87%,#dcb05b)", color: "#543c00", fontSize: 18, fontWeight: 700, fontStyle: "italic", position: "relative" }}
          >
            VIP{user?.vipLevel ?? 0}
          </span>
          <span style={{ marginTop: 2, fontSize: 20, color: "#ad00ff" }}>{user?.username ?? "-"}</span>
          {id && (
            <button
              type="button"
              onClick={async () => {
                if (await copyText(id)) notify.success(t.referralFlow?.codeCopied || "Copied");
              }}
              className="flex cursor-pointer items-center"
              style={{ marginTop: 2, gap: 8, fontSize: 20, color: "#ad00ff" }}
            >
              ID:{id}
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} aria-hidden="true">
                <rect x="8" y="3" width="13" height="15" rx="2" fill="#879ec0" />
                <path d="M5 7v12a2 2 0 0 0 2 2h10" fill="none" stroke="#879ec0" strokeWidth="2.4" />
              </svg>
            </button>
          )}
        </div>

        <div style={{ marginTop: 6 }}>
          {ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.key === "logout") onLogout?.();
                else if (item.key === "support") onSupport?.();
                else onMember?.(item.member);
              }}
              className="tb-hover-fade flex w-full cursor-pointer items-center"
              style={{
                width: 260,
                height: 48,
                marginTop: 10,
                borderRadius: 10,
                background: "linear-gradient(270deg,#484b5a,#424a57 28.47%,#515767 51.24%,#414559)",
                padding: "0 24px",
                color: "#879ec0",
                fontSize: 17,
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 23, height: 23, flexShrink: 0 }} aria-hidden="true">
                {ICONS[item.key]}
              </svg>
              <span className="flex-1 text-center" style={{ color: "#ad00ff", paddingInlineEnd: 23 }}>
                {label[item.key]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileMenu;
