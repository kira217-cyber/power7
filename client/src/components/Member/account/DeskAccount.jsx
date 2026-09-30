import React, { useState } from "react";
import { useSelector } from "react-redux";

import { useLanguage } from "../../../Context/LanguageProvider";
import { selectUser } from "../../../features/auth/authSelectors";
import { useLogout } from "../../../features/auth/useLogout";
import { useRefreshBalance } from "../../../features/auth/useRefreshBalance";
import { useProfile } from "../../../features/profile/useProfile";
import { notify } from "../../../utils/notify";
import { copyText } from "../../../utils/referralLink";
import { InfoDrawer, KycDrawer, PasswordDrawer, PhoneDrawer, TxDrawer, WalletDrawer } from "./DeskDrawer";

/**
 * ডেস্কটপের "আমার অ্যাকাউন্ট" — মূল সাইটের `#mc_container.security-center`,
 * তাদের CSS থেকে হুবহু মাপ (১১১০ × ৬২০ প্যানেল):
 *
 *   প্রোফাইল কার্ড `.personal-information` — (৩০, ৪০) ৩৩০ × ৫৩৯, radius ১০,
 *     ছায়া `0 7px 62px rgba(170,106,226,.19)`; উপরে ১০০ উঁচু ধূসর ফালি
 *     (level-bg ছবি নিচের দিকে মিলিয়ে যায়), ৮০ গোল অবতার, VIP পিল, নাম,
 *     যোগদানের তারিখ, ডানে VIP মেডেলের জলছাপ; তারপর ইউজারনেম কপি, ব্যালেন্স,
 *     অপেক্ষমাণ জমা/উত্তোলন, শেষ লগইন
 *   নিরাপত্তা কার্ড `.security-information` — (৩৯০, ৪০) ৩৩০ × ৫৩৯, পটভূমি
 *     স্তর অনুযায়ী ছবি (নিম্ন লাল / মধ্যম নীল / উচ্চ সবুজ); বৃত্তে স্তর,
 *     নিচে "পরামর্শিত সেটিং" — যেগুলো বাকি তার তিনটে আইকন
 *   ডানে `.account-information` — (৭৫০, ৪০) ৩৪০, প্রতিটা সারি padding-left ৭৪,
 *     ৫৫ গোল আইকন (মূল সাইটের sprite), শিরোনাম ১৬ #666 + ✓/! চিহ্ন,
 *     বিবরণ ১৩ #979797
 *
 * কোনো সারিতে চাপলে আলাদা মডাল নয়, প্যানেলের ভিতরে ডান থেকে ড্রয়ার।
 */

const IMG = "/assets/member-desk";

/** মূল সাইটের `iconinfo.png` sprite এর অবস্থান (active) আর আভা */
const ICONS = {
  info: ["-245px -7px", "rgba(254,235,107,.35)"],
  pwd: ["-245px -95px", "rgba(87,239,235,.35)"],
  moneypwd: ["-245px -356px", "rgba(221,205,120,.35)"],
  phone: ["-245px -529px", "rgba(219,133,253,.35)"],
  realname: ["-245px -615px", "rgba(255,109,124,.35)"],
  eWallet: ["-245px -961px", "rgba(254,235,107,.35)"],
};

const IconInfo = ({ name, onClick }) => {
  const style =
    name === "logout"
      ? { background: `url(${IMG}/icon-logout.png) no-repeat`, backgroundSize: "55px 55px", boxShadow: "9px 9px 21px rgba(255,109,124,.35)" }
      : { backgroundImage: `url(${IMG}/iconinfo.png)`, backgroundRepeat: "no-repeat", backgroundPosition: ICONS[name][0], boxShadow: `9px 9px 21px ${ICONS[name][1]}` };
  return <span role="presentation" onClick={onClick} style={{ display: "inline-block", width: 55, height: 55, borderRadius: "50%", cursor: "pointer", ...style }} />;
};

const GRADE = {
  low: { bg: "grade-low-bg.png", color: "#bb3c55", shadow: "rgba(218,81,97,.19)" },
  medium: { bg: "grade-mid-bg.png", color: "#3678c4", shadow: "rgba(56,124,248,.19)" },
  high: { bg: "grade-high-bg.png", color: "#439656", shadow: "rgba(29,162,29,.19)" },
};

const bnDigits = (s, lang) => (lang === "en" ? s : String(s).replace(/\d/g, (x) => "০১২৩৪৫৬৭৮৯"[x]));
const pad = (n) => String(n).padStart(2, "0");
const dateOf = (v, lang) => {
  if (!v) return "-";
  const d = new Date(v);
  return bnDigits(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, lang);
};
const dateTimeOf = (v, lang) => {
  if (!v) return "-";
  const d = new Date(v);
  return bnDigits(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, lang);
};
const todaySlash = (lang) => {
  const d = new Date();
  return bnDigits(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, lang);
};

const DeskAccount = () => {
  const { t, lang } = useLanguage();
  const d = t.deskAcc;
  const p = t.profileFlow;
  const user = useSelector(selectUser) || {};
  const signOut = useLogout();
  const { refresh, refreshing } = useRefreshBalance();
  const profile = useProfile();
  const [drawer, setDrawer] = useState(null);
  const [hidden, setHidden] = useState(false);

  const ov = profile.overview;
  const items = ov?.security?.items || {};
  const level = ov?.security?.level || "low";
  const percent = ov?.security?.percent ?? 0;
  const grade = GRADE[level] || GRADE.low;

  // ডানের তালিকা — মূল সাইটের পাঁচটা, লগআউটের আগে আমাদের বাড়তি পরিচয় যাচাই
  // (ফোন নম্বর মূল সাইটের মতোই "ব্যক্তিগত তথ্য" ড্রয়ারের ভিতরে)
  const rows = [
    { key: "profile", icon: "info", done: items.profile, title: t.member.actions.profile.title, desc: t.member.actions.profile.desc },
    { key: "loginPassword", icon: "pwd", done: true, title: d.loginPw, desc: d.loginPwDesc },
    { key: "wallet", icon: "eWallet", done: items.wallet, title: d.bindWallet, desc: d.bindWalletDesc },
    { key: "payPassword", icon: "moneypwd", done: items.payPassword, title: t.member.actions.payPassword.title, desc: d.payPwDesc },
    { key: "verification", icon: "realname", done: items.verification, title: p.kycTitle, desc: `${p.kycDesc} (${p.kycStatus[ov?.kycStatus || "none"]})` },
    { key: "logout", icon: "logout", title: d.logout, desc: d.logoutDesc },
  ];

  // "পরামর্শিত সেটিং" — বাকি থাকা কাজ, সর্বোচ্চ তিনটে (মূল সাইটে তথ্য/ওয়ালেট/লেনদেন পাসওয়ার্ড)
  const suggest = rows.filter((r) => ["profile", "wallet", "payPassword", "verification"].includes(r.key) && !r.done).slice(0, 3);
  const short = { profile: t.member.actions.profile.title, wallet: d.bindWallet, payPassword: t.member.actions.payPassword.title, phone: p.phoneTitle, verification: p.kycTitle };

  const open = (key) => {
    if (key === "logout") return signOut();
    return setDrawer(key);
  };
  const close = () => {
    setDrawer(null);
    profile.load();
  };

  const balance = Number(user.balance || 0).toFixed(2);
  const [whole, cents] = balance.split(".");

  return (
    <div className="relative overflow-hidden" style={{ width: 1110, height: 620, background: "var(--member-surface, #fff)", lineHeight: 1 }}>
      {/* ── প্রোফাইল কার্ড ── */}
      <div className="absolute overflow-hidden" style={{ left: 30, top: 40, width: 330, height: 539, borderRadius: 10, boxShadow: "0 7px 62px 0 rgba(170,106,226,.19)" }}>
        <div className="relative flex items-center" style={{ height: 100, padding: "0 16px", background: "linear-gradient(0deg,#f1f9ff00 0,#b3bcc880 100%)" }}>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${IMG}/level-bg.png)`, backgroundPosition: "bottom", backgroundSize: "cover", WebkitMaskImage: "linear-gradient(to bottom,#000,rgba(0,0,0,0))", maskImage: "linear-gradient(to bottom,#000,rgba(0,0,0,0))" }}
          />
          <div
            className="absolute"
            style={{ right: 23, top: 5, width: 81, height: 90, background: `url(${IMG}/lv3.png)`, backgroundSize: "100% 100%", opacity: 0.5, filter: "blur(.5px)", WebkitMaskImage: "linear-gradient(to bottom,#000,rgba(0,0,0,0))", maskImage: "linear-gradient(to bottom,#000,rgba(0,0,0,0))" }}
          />
          <div className="relative flex flex-1 items-center" style={{ gap: 8, paddingTop: 12, marginBottom: 8 }}>
            <img src={`${IMG}/avatar-0.png`} alt="" style={{ width: 80, height: 80, borderRadius: "50%", background: "#b1b8b6", objectFit: "cover" }} />
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 6 }}>
              <div className="flex items-center">
                <span className="flex items-center" style={{ padding: "4px 8px", borderRadius: 60, border: "1px solid rgba(255,255,255,.2)", background: "linear-gradient(180deg,rgba(102,102,102,.7) 0,rgba(67,72,81,.7) 100%)", marginRight: 5 }}>
                  <img src={`${IMG}/lv3.png`} alt="" style={{ width: 16, height: 18, marginRight: 8 }} />
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, padding: "0 8px", textShadow: "0 1px 0 rgba(0,0,0,.25)" }}>VIP{user.vipLevel ?? 0}</span>
                </span>
                <img src={`${IMG}/signin.png`} alt="" style={{ width: 26, height: 26 }} />
              </div>
              <div className="flex items-center" style={{ color: "var(--member-text, #666)", fontSize: 16, fontWeight: 900 }}>
                <span className="truncate">{user.username}</span>
                <img
                  src={`${IMG}/edit-icon.svg`}
                  alt=""
                  role="presentation"
                  onClick={() => setDrawer("profile")}
                  style={{ width: 12, height: 12, marginLeft: 8, cursor: "pointer" }}
                />
              </div>
              <div className="flex items-center" style={{ color: "#b2b2b2", fontSize: 10, fontWeight: 500 }}>
                <img src={`${IMG}/icon-date.svg`} alt="" style={{ width: 12, height: 12, marginRight: 2 }} />
                {p.joined} {dateOf(user.createdAt || ov?.user?.createdAt, lang)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center" style={{ marginTop: 12, paddingLeft: 16 }}>
          <span className="flex items-center" style={{ height: 24, color: "#979797", fontSize: 12, fontWeight: 600 }}>
            {user.username}
            <img
              src={`${IMG}/icon-copy.png`}
              alt=""
              role="presentation"
              onClick={async () => (await copyText(user.username || "")) && notify.success(d.copied)}
              style={{ width: 12, height: 12, marginLeft: 5, cursor: "pointer" }}
            />
          </span>
        </div>

        <div className="flex items-center" style={{ marginTop: 8, padding: "0 9px", color: "#434851", fontWeight: 600, fontFamily: "Arial, Helvetica, sans-serif" }}>
          <div className="flex flex-1 items-center" style={{ fontSize: 24 }}>
            <span style={{ fontSize: 34 }}>৳</span>
            <span style={{ marginLeft: 6 }}>{hidden ? "****" : whole}</span>
            {!hidden && <span style={{ fontSize: 16, alignSelf: "flex-start", marginTop: 6 }}>.{cents}</span>}
          </div>
          <img
            src={`${IMG}/refresh-icon.svg`}
            alt=""
            role="presentation"
            onClick={refresh}
            style={{ width: 15, height: 15, margin: "0 5px", cursor: "pointer", animation: refreshing ? "tb-spin .6s linear infinite" : "none" }}
          />
          <img src={`${IMG}/${hidden ? "eyes-icon-close" : "eyes-icon-open"}.svg`} alt="" role="presentation" onClick={() => setHidden((v) => !v)} style={{ width: 18, height: 18, cursor: "pointer" }} />
        </div>

        <div style={{ paddingLeft: 30, color: "var(--member-text, #666)", fontSize: 14 }}>
          {[
            ["security-deposit.png", ov?.pendingDeposits ?? 0, p.pendingDeposit],
            ["security-withdrawal.png", ov?.pendingWithdraws ?? 0, p.pendingWithdraw],
          ].map(([icon, n, label]) => (
            <div key={icon} className="relative" style={{ marginTop: 20, height: 38, paddingLeft: 55, background: `url(${IMG}/${icon}) no-repeat left center` }}>
              <div className="truncate" style={{ width: 210 }}>
                {n} {label}
              </div>
              <div style={{ paddingTop: 8, fontSize: 12, color: "#aaa" }}>{todaySlash(lang)}</div>
              <span className="absolute" style={{ right: 20, bottom: -18, width: 210, borderTop: "1px dashed #efeff1" }} />
            </div>
          ))}
        </div>

        <div style={{ margin: "36px 0 0 30px", paddingLeft: 55, lineHeight: "20px", fontSize: 12, color: "#5e5e5e", background: `url(${IMG}/lastlogin.png) no-repeat left center` }}>
          <div>
            {d.lastTime}: {dateTimeOf(ov?.user?.lastLoginAt, lang)}
          </div>
          <div>
            {d.lastIp}: {ov?.user?.lastLoginIp || "-"}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full" style={{ height: 90, background: "linear-gradient(180deg,rgba(241,249,255,0) 0,rgba(179,188,200,.2) 100%)", borderRadius: "0 0 10px 10px" }} />
      </div>

      {/* ── নিরাপত্তা কার্ড ── */}
      <div className="absolute" style={{ left: 390, top: 40, width: 330, height: 539, borderRadius: 10, background: `url(${IMG}/${grade.bg}) no-repeat`, boxShadow: `0 7px 62px ${grade.shadow}` }}>
        <div className="flex flex-col justify-center text-center" style={{ margin: "88px auto 0", maxWidth: 168, minHeight: 168, fontSize: 44, color: grade.color }}>
          <div>{p.levels[level]}</div>
          <div style={{ marginTop: 12, fontSize: 15, padding: "0 5px" }}>{t.member.securityLabel}</div>
        </div>
        <div className="text-center" style={{ marginTop: 15, color: "#fff", fontSize: 14, lineHeight: "25px" }}>
          <div>
            {d.scoreA} <strong style={{ fontSize: 22, fontWeight: 400, fontFamily: "Arial, serif" }}>{percent}</strong> {d.scoreB}
          </div>
          <div>
            {p.levelText}
            <span style={{ marginLeft: 5 }}>{p.levels[level]}</span>
          </div>
        </div>
        {suggest.length > 0 ? (
          <>
            <div className="absolute w-full text-center" style={{ bottom: "24%", color: "#5e5e5e", fontSize: 15, fontWeight: 700 }}>
              {d.suggested}
            </div>
            <div className="absolute bottom-0 flex w-full" style={{ height: 104 }}>
              {suggest.map((r) => (
                <div key={r.key} className="text-center" style={{ width: "33.33%", fontSize: 16 }}>
                  <IconInfo name={r.icon} onClick={() => open(r.key)} />
                  <div style={{ marginTop: 12, color: "var(--member-text, #666)", lineHeight: 1 }}>{short[r.key]}</div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* ── করণীয়ের তালিকা ── */}
      <div className="hide-scrollbar absolute overflow-y-auto" style={{ left: 750, top: 40, width: 340, height: 580, padding: "0 25px 0 20px" }}>
        {rows.map((r) => (
          <div key={r.key} role="button" tabIndex={0} onClick={() => open(r.key)} className="relative cursor-pointer" style={{ minHeight: 61, marginBottom: 20, paddingLeft: 74 }}>
            <span className="absolute" style={{ left: 0, top: 2 }}>
              <IconInfo name={r.icon} />
            </span>
            <div className="flex items-center" style={{ gap: 5, color: "var(--member-text, #666)", fontSize: 16, lineHeight: "18px", marginBottom: 8 }}>
              {r.title}
              {r.done !== undefined && <img src={`${IMG}/${r.done ? "icon-checked" : "icon-danger"}.png`} alt="" style={{ width: 18, height: 18 }} />}
            </div>
            <div style={{ lineHeight: "18px", fontSize: 13, color: "#979797" }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* ── ড্রয়ার ── */}
      {drawer === "profile" && <InfoDrawer profile={profile} onClose={close} onPhone={() => setDrawer("phone")} />}
      {drawer === "loginPassword" && <PasswordDrawer profile={profile} onClose={close} />}
      {drawer === "payPassword" && <TxDrawer profile={profile} onClose={close} />}
      {drawer === "wallet" && <WalletDrawer onClose={close} onChanged={profile.load} />}
      {drawer === "phone" && <PhoneDrawer profile={profile} onClose={close} />}
      {drawer === "verification" && <KycDrawer profile={profile} onClose={close} />}
    </div>
  );
};

export default DeskAccount;
