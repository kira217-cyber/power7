import React, { useState } from "react";

import Icon from "../Icon/Icon";
import ProfileMenu from "./ProfileMenu";
import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { useRefreshBalance } from "../../features/auth/useRefreshBalance";

/**
 * লগইনের পরে হেডারের ডান পাশ।
 *
 * মূল সাইট থেকে মাপা (`.header-right`, ১৯২০ viewport):
 *   ডিপোজিট বোতাম ১২২.২ × ৪৫, radius ২০, সোনালি gradient
 *   উত্তোলন বোতাম ১১১.৬ × ৪৫, radius ৮.৭, bg rgba(188,67,244,.28)
 *   অবতার ৪৯ × ৪৯ (VIP ব্যাজ সহ), তারপর ব্যালেন্স ১২৪.৫ × ৪০
 *   শেষে "সদস্য" বোতাম ৭৮.৮ × ৪৫, radius ২০, gradient, লেখা #AD00FF
 *   পুরোটা ডানে, ডান প্রান্ত থেকে ৩৫ ফাঁক
 */
const UserBar = ({ user, onDeposit, onWithdraw, onMember, onSupport, onLogout }) => {
  // মূল সাইটে অবতারে hover করলেই মেনুটা নামে (ক্লিক লাগে না)
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();
  const isDesktop = useIsDesktop();
  const { refresh, refreshing } = useRefreshBalance();

  const balance = `${user.currency} ${user.balance.toFixed(2)}`;

  /* ── মোবাইল (`.header-right`, ৭৫০-ডিজাইনে মাপা) ──
       `.user-balance` ২৬১.২ × ৮৪ (x ৩৩১.৯, y ১২.৫), bg #282F3C,
         radius ১৬, padding `0 15`, gap ৫ — ভিতরে:
         `.sum-balance` fs ২৫ fw ৮০০ রঙ #DADADA + রিফ্রেশ ৪০ × ৪০,
         `.deposit-btn` ৬০ × ৬০ (উপরে-বাঁয়ে ৩৫ উপহার আইকন),
         `.withdraw-btn` ৬০ × ৬০
       `.member-icon` ১৩১ × ৮৪ (x ৫৯৯), bg #282F3C, radius ১৮,
         padding `0 16 0 8` — অবতার ৬৮ বৃত্ত, নিচে VIP ব্যাজ
         ৫৮.৩ × ২৪.৫ (PNG ব্যাকগ্রাউন্ড, লেখা #543C00 fs ২৪ fw ৭০০),
         ডানে ২৩ × ১১ শেভরন */
  if (!isDesktop) {
    return (
      <div
        className="absolute flex items-center"
        style={{ right: m(20), top: m(12.5), height: m(84), gap: m(5.9) }}
      >
        <div
          className="tb-balance flex items-center"
          style={{
            height: m(84),
            paddingInline: m(15),
            borderRadius: m(16),
            background: "#282f3c",
            gap: m(5),
          }}
        >
          <button
            type="button"
            onClick={onMember}
            className="flex cursor-pointer items-center"
            style={{ height: m(40) }}
          >
            <span
              className="truncate"
              style={{ fontSize: m(25), fontWeight: 800, color: "#dadada" }}
            >
              {balance}
            </span>
            <span
              role="button"
              aria-label="refresh"
              onClick={refresh}
              className={`flex items-center justify-center${refreshing ? " tb-spin" : ""}`}
              style={{ width: m(40), height: m(40) }}
            >
              <img
                src="/assets/mobile/icons/refresh.svg"
                alt=""
                style={{ width: m(26), height: m(26) }}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={onDeposit}
            aria-label="deposit"
            className="relative flex cursor-pointer items-center justify-center"
            style={{ width: m(60), height: m(60) }}
          >
            <img
              src="/assets/mobile/icons/deposit.svg"
              alt=""
              style={{ width: m(60), height: m(60) }}
            />
            <img
              src="/assets/mobile/register-gift.svg"
              alt=""
              className="absolute"
              style={{ left: m(-15), top: m(-15), width: m(35), height: m(35) }}
            />
          </button>

          <button
            type="button"
            onClick={onWithdraw}
            aria-label="withdraw"
            className="flex cursor-pointer items-center justify-center"
            style={{ width: m(60), height: m(60) }}
          >
            <img
              src="/assets/mobile/icons/withdraw.svg"
              alt=""
              style={{ width: m(60), height: m(60) }}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={onMember}
          className="tb-member relative flex cursor-pointer items-center"
          style={{
            height: m(84),
            padding: `0 ${m(16)} 0 ${m(8)}`,
            borderRadius: m(18),
            background: "#282f3c",
          }}
        >
          <span className="relative" style={{ width: m(68), height: m(68) }}>
            <img
              src={user.avatar || "/assets/mobile/avatar.png"}
              alt=""
              style={{
                width: m(68),
                height: m(68),
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
                background: "var(--surface)",
              }}
            />
            <span
              className="absolute flex items-center justify-center"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
                bottom: m(-8),
                width: m(58.3),
                height: m(24.5),
                backgroundImage: "url(/assets/mobile/vip-bg.png)",
                backgroundSize: "100% 100%",
                borderRadius: m(5),
                color: "#543c00",
                fontSize: m(24),
                fontWeight: 700,
              }}
            >
              VIP{user.vipLevel}
            </span>
          </span>

          <span
            className="flex items-center justify-center"
            style={{ width: m(23), marginInlineStart: m(2) }}
          >
            <img
              src="/assets/mobile/icons/chevron.svg"
              alt=""
              style={{ width: m(23), height: m(11) }}
            />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center" style={{ gap: 15, marginInlineEnd: 35 }}>
      <button
        type="button"
        onClick={onDeposit}
        className="tb-hover-fade flex cursor-pointer items-center justify-center"
        style={{
          width: 122.2,
          height: 45,
          borderRadius: 20,
          background: "linear-gradient(90deg,#fff5e2,#f0cda3)",
          color: "#333",
          fontSize: 18,
        }}
      >
        {t.deposit}
      </button>

      <button
        type="button"
        onClick={onWithdraw}
        className="tb-hover-fade flex cursor-pointer items-center justify-center"
        style={{
          width: 111.6,
          height: 45,
          borderRadius: 8.7,
          background: "rgba(188,67,244,.28)",
          border: "1px solid #ad00ff",
          color: "#ad00ff",
          fontSize: 18,
        }}
      >
        {t.withdraw}
      </button>

      {/* অবতার + VIP ব্যাজ — hover এ প্রোফাইল মেনু */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: "var(--header-h)" }}
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
      >
      <button
        type="button"
        onClick={() => onMember("myAccount")}
        className="relative flex cursor-pointer items-center justify-center"
        style={{ width: 49, height: 49 }}
      >
        {/* আসল অবতারের ছবি (আগে শুধু একটা আইকন দেখাত) */}
        <img
          src={user.avatar || "/assets/member-desk/avatar-0.png"}
          onError={(e) => {
            e.currentTarget.src = "/assets/member-desk/avatar-0.png";
          }}
          alt=""
          style={{ width: 49, height: 49, borderRadius: "50%", objectFit: "cover", background: "#b1b8b6" }}
        />
        <span
          className="absolute grid place-items-center"
          style={{
            bottom: -9,
            left: "50%",
            transform: "translateX(-50%)",
            width: 47,
            height: 19,
            borderRadius: 4,
            background: "linear-gradient(278deg,#e8a31d 87%,#dcb05b)",
            color: "#543c00",
            fontSize: 15,
            fontWeight: 700,
            fontStyle: "italic",
          }}
        >
          VIP{user.vipLevel}
        </span>
      </button>

        {menuOpen && (
          <ProfileMenu
            user={user}
            // কিছুতে চাপলে মেনু বন্ধ — নইলে মডালের উপরেও ঝুলে থাকত
            onMember={(tab) => {
              setMenuOpen(false);
              onMember(tab);
            }}
            onSupport={() => {
              setMenuOpen(false);
              onSupport?.();
            }}
            onLogout={() => {
              setMenuOpen(false);
              onLogout?.();
            }}
          />
        )}
      </div>

      {/* ব্যালেন্স */}
      {/* ব্যালেন্স — মূল সাইটের `.member-info-item`: গাঢ় পিল, #AD00FF এ বড় সংখ্যা */}
      <div
        className="flex items-center"
        style={{ minWidth: 124.5, height: 40, padding: "0 12px", gap: 8, borderRadius: 8, background: "#262a3a", color: "#ad00ff" }}
      >
        <span style={{ fontSize: 25, lineHeight: 1 }}>{user.currency}</span>
        <span className="truncate" style={{ fontSize: 25, lineHeight: 1 }}>
          {user.balance.toFixed(2)}
        </span>
        <span
          role="button"
          aria-label="refresh"
          onClick={refresh}
          className={`flex cursor-pointer${refreshing ? " tb-spin" : ""}`}
          style={{ color: "#fff" }}
        >
          <Icon name="refresh" size={19} />
        </span>
      </div>

      <button
        type="button"
        onClick={() => onMember("myAccount")}
        className="tb-hover-fade flex cursor-pointer items-center justify-center"
        style={{
          width: 78.8,
          height: 45,
          borderRadius: 20,
          background: "linear-gradient(270deg,#484b5a,#424a57 28.47%,#515767 51.24%,#414559)",
          color: "#ad00ff",
          fontSize: 16,
        }}
      >
        {t.bottomNav.member}
      </button>
    </div>
  );
};

export default UserBar;
