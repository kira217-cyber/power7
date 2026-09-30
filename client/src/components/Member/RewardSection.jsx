import { useHideBootLoader } from "../../hook/useHideBootLoader";
import React, { useEffect } from "react";
import { useIsDesktop } from "../../hook/useIsDesktop";
import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { selectUser } from "../../features/auth/authSelectors";
import DeskReward from "./reward/DeskReward";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchRewardSummary, selectRewardAvailable } from "../../features/reward/rewardSlice";
import { useVipProgress } from "../../features/reward/useRewards";
import { useRefreshBalance } from "../../features/auth/useRefreshBalance";
import { copyText } from "../../utils/referralLink";
import { notify } from "../../utils/notify";

/**
 * "পুরস্কার কেন্দ্র" — ডেস্কটপে মডালের ট্যাব, মোবাইলে `/member/reward`।
 */

/* ডেস্কটপ (মডালের ভিতরে) — `reward/DeskReward.jsx` */
const Desktop = DeskReward;

/* ─────────────────── মোবাইল (আলাদা পেজ) ─────────────────── */
/**
 * "পুরস্কার সেন্টার" — মূল সাইটের `/m/rewardCenter`, মাপ ওদের CSS থেকে।
 *
 * পুরো পটভূমি `mall-bg.png` (কমলা, "REWARD" জলছাপ সহ); স্বচ্ছ হেডার।
 * ধূসর কার্ড (`.common-center-top`: ৯০%, উপরে ১২০ ফাঁক, radius ২৮, ফ্রেম
 * `border.png` + ডান-নিচে ব্যাজ) — ডান কোণে লাল "সাইন ইন" ফিতা, অবতার
 * (১১৬, সোনালি রেখা), নাম, ডাকনাম, ব্যালেন্স, VIP আর অগ্রগতি। নিচে চারটে
 * টাইল (মূল সাইটের ছবি) — "দাবি করা" তে না-খোলা টিকিটের সংখ্যা।
 */
const TILES = [
  { key: "claim", bg: "gift_bg", icon: "gift_icon", to: "/member/reward/claim" },
  { key: "signIn", bg: "task_bg", icon: "task_icon", to: "/member/reward/signin" },
  { key: "invite", bg: "invite_bg", icon: "invite_icon", to: "/member/referral" },
  { key: "ticket", bg: "temu_bg", icon: "temu_icon", to: "/member/reward/temu" },
];
const RIMG = "/assets/reward";

const Mobile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const available = useSelector(selectRewardAvailable);
  const vip = useVipProgress();
  const { refresh, refreshing } = useRefreshBalance();
  const page = t.memberPage.pages.reward;

  useHideBootLoader();
  useEffect(() => {
    dispatch(fetchRewardSummary());
  }, [dispatch]);

  const copy = () => copyText(user?.username || "").then(() => notify.success(t.rewardFlow.copied));
  const progress = vip ? `${Number(vip.xp || 0).toLocaleString("en-US")} / ${Number(vip.next?.xpRequired ?? vip.xp ?? 0).toLocaleString("en-US")}` : "0 / 0";

  return (
    <div style={{ minHeight: "100vh", background: `url(${RIMG}/mall-bg.png) center ${m(-34)} / 100% no-repeat var(--member-page-bg, #f5f5f9)`, paddingBottom: m(60) }}>
      {/* স্বচ্ছ হেডার */}
      <div className="relative flex items-center justify-center" style={{ height: m(100) }}>
        <button type="button" onClick={() => navigate(-1)} aria-label="back" className="absolute flex cursor-pointer items-center" style={{ left: m(50), width: m(68), height: m(68) }}>
          <span style={{ width: m(22), height: m(38), borderInlineStart: `${m(7)} solid #fff`, borderBlockStart: `${m(7)} solid #fff`, transform: "rotate(-45deg)", marginInlineStart: m(10) }} />
        </button>
        <span style={{ fontSize: m(34), color: "#fff" }}>{page.title}</span>
      </div>

      {/* প্রোফাইল কার্ড */}
      <div
        className="relative overflow-hidden"
        style={{
          width: "90%",
          minHeight: m(436),
          margin: `${m(120)} auto 0`,
          borderRadius: m(28),
          paddingTop: m(80),
          background: `url(${RIMG}/border.png) 50% center / calc(100% - ${m(30)}) calc(100% - ${m(30)}) no-repeat, url(${RIMG}/badge.png) right ${m(10)} bottom ${m(10)} / auto 80% no-repeat, linear-gradient(90deg,#f1f9ff,#b3bcc8)`,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/member/reward/signin")}
          className="absolute flex cursor-pointer items-center"
          style={{
            right: 0,
            top: 0,
            height: m(54),
            padding: `0 ${m(75)} 0 ${m(130)}`,
            color: "#fff",
            fontSize: m(28),
            background: `url(${RIMG}/sign.png) ${m(76)} center / ${m(36)} ${m(36)} no-repeat, linear-gradient(0deg,#bb0c0c,#ec515b)`,
            clipPath: `polygon(${m(34)} 0, 100% 0, 100% 100%, ${m(64)} 100%, ${m(34)} 0)`,
          }}
        >
          {page.signIn}
          <span className="absolute" style={{ right: m(24), width: m(16), height: m(16), borderTop: `${m(4)} solid #fff`, borderRight: `${m(4)} solid #fff`, transform: "rotate(45deg)" }} />
        </button>

        <div className="flex items-center" style={{ padding: `0 ${m(42)}`, gap: m(15) }}>
          <img src={user?.avatar || "/assets/mobile/avatar.png"} alt="" style={{ width: m(116), height: m(116), borderRadius: "50%", border: `${m(6)} solid #caa86d`, objectFit: "cover", background: "var(--member-surface, #fff)" }} />
          <div className="flex flex-col items-start" style={{ color: "rgba(37,37,37,.6)", fontWeight: 700 }}>
            <button type="button" onClick={copy} className="flex cursor-pointer items-center" style={{ color: "#000", fontSize: m(30), fontWeight: 700, gap: m(10) }}>
              {user?.username ?? "-"}
              <svg viewBox="0 0 24 24" style={{ width: m(35), height: m(35) }} aria-hidden="true">
                <rect x="8" y="3" width="13" height="15" rx="2" fill="#000" />
                <path d="M5 7v12a2 2 0 0 0 2 2h10" fill="none" stroke="#000" strokeWidth="2.4" />
              </svg>
            </button>
            <span style={{ fontSize: m(24), marginTop: m(13) }}>
              {page.nickname} {user?.nickname || user?.username}
            </span>
            <span className="flex items-center" style={{ fontSize: m(41), marginTop: m(10), gap: m(10) }}>
              ৳ {Number(user?.balance ?? 0).toFixed(2)}
              <button type="button" onClick={refresh} aria-label="refresh" className="cursor-pointer" style={{ transform: refreshing ? "rotate(180deg)" : "none", transition: "transform .4s" }}>
                <Icon name="refresh" size={m(40)} />
              </button>
            </span>
          </div>
        </div>

        <div className="flex items-center" style={{ padding: `${m(30)} ${m(42)} 0` }}>
          <span style={{ height: m(33), lineHeight: m(42), paddingLeft: m(54), background: `url(${RIMG}/crown.png) 0 0 / ${m(48)} ${m(33)} no-repeat`, color: "rgba(37,37,37,.6)", fontSize: m(24), fontWeight: 700 }}>
            {vip?.level?.name || `VIP${user?.vipLevel ?? 0}`}
          </span>
          <span className="flex-1" />
          <span className="flex items-center" style={{ fontSize: m(28), color: "var(--member-text, #555)", gap: m(8) }}>
            {page.benefit}
            <span style={{ width: m(26), height: m(26), background: `url(${RIMG}/right.png) center / contain no-repeat` }} />
          </span>
        </div>
        <div className="flex items-center" style={{ padding: `${m(20)} ${m(42)} ${m(40)}`, gap: m(16) }}>
          <span style={{ flex: 1, height: m(14), borderRadius: m(7), background: "#c9ced8", overflow: "hidden" }}>
            <span className="block h-full" style={{ width: `${vip?.progress ?? 0}%`, background: "linear-gradient(90deg,#caa86d,#f2d48b)" }} />
          </span>
          <span style={{ fontSize: m(26), color: "var(--member-text, #555)" }}>{progress}</span>
        </div>
      </div>

      {/* চারটে টাইল */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: m(28), margin: `${m(56)} ${m(42)} 0` }}>
        {TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => navigate(tile.to)}
            className="relative flex cursor-pointer flex-col items-center justify-center"
            style={{ aspectRatio: "316 / 260", background: `url(${RIMG}/${tile.bg}.png) center / 100% 100% no-repeat`, borderRadius: m(14), color: "#fff", gap: m(20) }}
          >
            <span className="relative grid place-items-center" style={{ width: m(94), height: m(94), borderRadius: "50%", background: "var(--member-surface, #fff)" }}>
              <img src={`${RIMG}/${tile.icon}.png`} alt="" style={{ width: m(46) }} />
              {tile.key === "claim" && available > 0 && (
                <span className="absolute grid place-items-center" style={{ top: m(-14), right: m(-22), minWidth: m(46), height: m(46), padding: `0 ${m(8)}`, borderRadius: m(23), background: "#f5222d", fontSize: m(26), color: "#fff" }}>
                  {available > 99 ? "99+" : available}
                </span>
              )}
            </span>
            <span className="text-center" style={{ fontSize: m(30), lineHeight: 1.1, padding: `0 ${m(16)}` }}>
              {page.tiles[tile.key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const RewardSection = (props) => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <Desktop {...props} /> : <Mobile {...props} />;
};

export default RewardSection;
