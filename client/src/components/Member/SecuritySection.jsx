import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { useLogout } from "../../features/auth/useLogout";
import MemberShell from "./MemberShell";
import { useProfile } from "../../features/profile/useProfile";
import { ProfileSheet } from "./ProfileForms";

/** "২০২৬-০৯-২৫ ১৫:০৮:০৬" এর মতো */
const fmtDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * সুরক্ষা কেন্দ্র — মূল সাইটে এটা **শুধু মোবাইলে** আছে,
 * ডেস্কটপ মডালে এর ট্যাব নেই।
 *
 * "সুরক্ষা কেন্দ্র" — মূল সাইটের `/m/securityCenter`।
 *
 * গঠন: উপরে সাদা কার্ডে বাঁয়ে ০% বৃত্ত, ডানে "নিরাপত্তা শতাংশ: নিম্ন",
 * পাঁচটা বিদ্যুৎ চিহ্ন (প্রথমটা হলুদ, বাকি ধূসর), শেষ লগইন IP ও সময়।
 * তারপর লাল সতর্কবাণী, তারপর সাদা কার্ডে পাঁচটা সারি — বাঁয়ে বড় আইকন,
 * শিরোনামের পাশে অবস্থার ব্যাজ (❗ লাল / ✅ সবুজ) ও পেন্সিল, নিচে বর্ণনা,
 * ডানে তীর।
 */
// অবস্থা server এর নিরাপত্তা স্কোর থেকে (`item` = কোন কাজটা হয়েছে কিনা)
// আইকন মূল সাইটের স্প্রাইট থেকে তোলা SVG (নীল→বেগুনি গ্রেডিয়েন্ট রেখা);
// "পরিচয় যাচাই" মূল সাইটে নেই, তাই ওটার আইকন একই ধাঁচে আঁকা
const IMG = "/assets/security";
const ROWS = [
  { key: "profile", icon: "profile", item: "profile" },
  { key: "wallet", icon: "wallet", item: "wallet" },
  { key: "loginPassword", icon: "lock", item: "always" },
  { key: "payPassword", icon: "pay-password", item: "payPassword" },
  { key: "verification", icon: "verify", item: "verification" },
  { key: "logout", icon: "logout" },
];

const SecuritySection = () => {
  const { t } = useLanguage();
  const signOut = useLogout();
  const navigate = useNavigate();
  const page = t.memberPage.pages.security;
  const p = t.profileFlow;
  const profile = useProfile();
  const [sheet, setSheet] = useState(null);

  const ov = profile.overview;
  const percent = ov?.security?.percent ?? 0;
  const level = ov?.security?.level || "low";
  const items = ov?.security?.items || {};
  const statusOf = (row) => (!row.item ? null : row.item === "always" || items[row.item] ? "ok" : "warn");

  const rowTitle = (key) => page.rows[key]?.title || (key === "verification" ? p.kycTitle : key);
  const rowDesc = (key) =>
    key === "verification" ? `${p.kycDesc} (${p.kycStatus[ov?.kycStatus || "none"]})` : page.rows[key]?.desc;

  const open = (key) => {
    if (key === "logout") return signOut();
    if (key === "profile") return navigate("/member/account");
    if (key === "wallet") return navigate("/member/withdraw");
    return setSheet(key);
  };

  return (
    <MemberShell title={page.title}>
      <div style={{ background: "var(--member-page-bg, #f5f5f9)", padding: `${m(24)} ${m(24)} ${m(40)}` }}>
        {/* স্কোর কার্ড */}
        <div
          className="flex items-center"
          style={{
            background: "var(--member-surface, #fff)",
            borderRadius: m(16),
            padding: m(30),
            gap: m(30),
          }}
        >
          <span
            className="grid shrink-0 place-items-center"
            style={{
              width: m(160),
              height: m(160),
              borderRadius: "50%",
              border: `${m(8)} solid #f0f0f4`,
              color: "#7b5cf0",
            }}
          >
            <span style={{ fontSize: m(56) }}>
              {percent}<span style={{ fontSize: m(24), color: "#8ab4f8" }}>%</span>
            </span>
          </span>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: m(32), color: "var(--member-title, #222)", fontWeight: 700 }}>
              {page.scoreLabel} {p.levels[level]}
            </div>
            <div className="flex" style={{ marginTop: m(16), gap: m(1) }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <img
                  key={i}
                  src={`${IMG}/lightning-${i < Math.max(1, Math.round(percent / 20)) ? "on" : "off"}.svg`}
                  alt=""
                  style={{ width: m(35), height: m(35) }}
                />
              ))}
            </div>
            <div style={{ fontSize: m(24), color: "var(--member-text, #666)", marginTop: m(14) }}>
              {page.lastIp} <span style={{ color: "var(--member-title, #333)" }}>{ov?.user?.lastLoginIp || "—"}</span>
            </div>
            <div style={{ fontSize: m(24), color: "var(--member-text, #666)", marginTop: m(6) }}>
              {page.lastTime} <span style={{ color: "var(--member-title, #333)" }}>{fmtDateTime(ov?.user?.lastLoginAt)}</span>
            </div>
          </div>
        </div>

        <div
          className="text-center"
          style={{
            color: "var(--member-accent, #e60012)",
            fontSize: m(30),
            lineHeight: 1.5,
            padding: `${m(30)} ${m(10)}`,
          }}
        >
          {level === "low" ? page.warn : ""}
        </div>

        {/* করণীয়ের সারি */}
        <div style={{ background: "var(--member-surface, #fff)", borderRadius: m(16), overflow: "hidden" }}>
          {ROWS.map((row, index) => (
            <button
              key={row.key}
              type="button"
              onClick={() => open(row.key)}
              className="flex w-full cursor-pointer items-center text-left"
              style={{
                padding: `${m(26)} ${m(30)} ${m(26)} ${m(10)}`,
                gap: m(40),
                borderTop: index ? `${m(4)} solid #efeff2` : "none",
              }}
            >
              <span className="grid shrink-0 place-items-center" style={{ width: m(140) }}>
                <img src={`${IMG}/${row.icon}.svg`} alt="" style={{ width: m(81), height: m(81) }} />
              </span>

              <span style={{ flex: 1 }}>
                {/* ব্যাজ ও পেন্সিল লেখার সাথেই — লম্বা শিরোনাম ভাঙলে শেষ লাইনের পরে বসে */}
                <span className="block" style={{ fontSize: m(32), color: "var(--member-title, #222)", fontWeight: 600, lineHeight: 1.5 }}>
                  {rowTitle(row.key)}
                  {statusOf(row) && (
                    <img src={`${IMG}/${statusOf(row)}.svg`} alt="" className="inline-block" style={{ width: m(37), height: m(37), marginLeft: m(12), verticalAlign: "-0.15em" }} />
                  )}
                  {statusOf(row) && <img src={`${IMG}/edit.svg`} alt="" className="inline-block" style={{ width: m(33), height: m(33), marginLeft: m(12), verticalAlign: "-0.1em" }} />}
                </span>
                <span
                  className="block"
                  style={{ fontSize: m(24), color: "var(--member-muted, #999)", marginTop: m(8), lineHeight: 1.4 }}
                >
                  {rowDesc(row.key)}
                </span>
              </span>

              {statusOf(row) && (
                <img src={`${IMG}/arrow.svg`} alt="" className="shrink-0" style={{ width: m(44), height: m(44) }} />
              )}
            </button>
          ))}
        </div>
      </div>
      {sheet && <ProfileSheet which={sheet} profile={profile} onClose={() => setSheet(null)} />}
    </MemberShell>
  );
};

export default SecuritySection;
