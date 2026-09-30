import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { MODAL_TABS, SECTION_BY_KEY } from "../Member/sections";
import { useLanguage } from "../../Context/LanguageProvider";
import { fetchInboxUnread, selectInboxUnread } from "../../features/inbox/inboxSlice";
import { fetchRewardSummary, selectRewardAvailable } from "../../features/reward/rewardSlice";

/**
 * লগইনের পরের "ব্যক্তিগত কেন্দ্র" মডাল (ডেস্কটপ)।
 *
 * এটা শুধু **খোলস** — ভিতরের কনটেন্ট `components/Member/*Section.jsx`
 * থেকে আসে, যেগুলো মোবাইলের পেজেও একই কম্পোনেন্ট। মেনুর তালিকাও
 * `Member/sections.jsx` থেকেই, যাতে মোবাইল ও ডেস্কটপ কখনো আলাদা হয়ে
 * না যায়।
 *
 * মূল সাইট থেকে মাপা:
 *   মডাল ১২৯০ × ৬২০ — বাঁয়ে মেনু ১৮০, ডানে প্যানেল ১১১০
 *   মেনুর প্রতিটা আইটেম ১৮০ × ৫০ — আইকন ২৫ × ২৫ (x ১০),
 *     লেখা fs ১৫ (x ৩৮); সক্রিয়টার bg লালচে #E8474C
 *   ডান পাশ radius `0 10px 10px 0` — **হালকা থিম**, বাকি সাইটের উল্টো
 *   ক্লোজ বোতাম ৩১ × ৩১ বৃত্ত bg #2B3248, উপরে-ডানে (১২৪৯, ১০)
 */
/**
 * মেনুর আইকন — মূল সাইটের নিজের sprite (`.acmc_icon`, ৩৫০ × ১২০ PNG),
 * সাদা রেখার আইকন; প্রতিটার background-position তাদের CSS থেকে।
 * "বন্ধুদের আমন্ত্রণ" আলাদা ২০ × ২০ ছবি।
 */
const MENU_ICON = {
  myAccount: "-148px -84px",
  deposit: "-316px -15px",
  withdraw: "-14px -49px",
  betRecord: "-59px -48px",
  accountRecord: "-274px -53px",
  profitLoss: "-57px -84px",
  reward: "-106px -49px",
  inbox: "-148px -48px",
  manualRebate: "-182px -84px",
};

const MenuIcon = ({ id }) =>
  id === "referral" ? (
    <span className="shrink-0" style={{ width: 25, height: 25, display: "grid", placeItems: "center" }}>
      <img src="/assets/member-desk/menu-referral.png" alt="" style={{ width: 20, height: 20 }} />
    </span>
  ) : (
    <span
      className="shrink-0"
      style={{ width: 25, height: 25, backgroundImage: "url(/assets/member-desk/menu-icons.png)", backgroundRepeat: "no-repeat", backgroundPosition: MENU_ICON[id] || MENU_ICON.myAccount }}
    />
  );

const MemberModal = ({ tab = "deposit", onClose, onTab }) => {
  const { t } = useLanguage();
  const section = SECTION_BY_KEY[tab] ?? SECTION_BY_KEY.deposit;
  const dispatch = useDispatch();
  const inboxUnread = useSelector(selectInboxUnread);
  const rewardAvailable = useSelector(selectRewardAvailable);

  // মডাল খুললেই ইনবক্সের না-পড়া সংখ্যা — মেনুর ব্যাজের জন্য
  useEffect(() => {
    dispatch(fetchInboxUnread());
    dispatch(fetchRewardSummary());
  }, [dispatch]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "rgb(0 0 0 / 0.6)", zIndex: 65 }}
      onClick={onClose}
    >
      <div
        className="relative flex"
        style={{ width: 1290, height: 620, borderRadius: 10 }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* বাঁয়ে মেনু */}
        <div
          className="hide-scrollbar"
          style={{
            width: 180,
            height: 620,
            background: "var(--member-nav-bg, #2b3248)",
            borderRadius: "10px 0 0 10px",
            overflowY: "auto",
          }}
        >
          {/* মূল সাইটের `.br_acmc_mltitle` — ২৭px ৬০০, padding `30px 0`, দুই লাইনে */}
          <div className="text-center" style={{ padding: "30px 10px", color: "var(--member-nav-text, #fff)", fontSize: 27, fontWeight: 600, lineHeight: 1.33 }}>
            {t.member.title}
          </div>

          {MODAL_TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onTab?.(item.key)}
              className="tb-menu-item relative flex w-full cursor-pointer items-center text-left"
              style={{
                width: 180,
                height: 50,
                padding: "0 0 0 10px",
                color: "var(--member-nav-text, #fff)",
                fontSize: 15,
                lineHeight: 1.33,
                background: item.key === tab ? "var(--member-nav-active, #da394f)" : undefined,
              }}
            >
              <MenuIcon id={item.key} />
              <span style={{ maxWidth: 136, marginLeft: 10 }}>{t.member[item.key] ?? item.title(t)}</span>
              {/* মূল সাইটের `.tip_fixd` — আইকনের উপরে-ডানে লাল সংখ্যা */}
              {(() => {
                const n = item.key === "inbox" ? inboxUnread : item.key === "reward" ? rewardAvailable : 0;
                return n > 0 ? (
                  <span className="absolute grid place-items-center" style={{ left: 25, top: 1, minWidth: 20, height: 18, borderRadius: 9, padding: "0 5px", background: "#f00", fontSize: 12, lineHeight: "14px" }}>
                    {n > 99 ? "99+" : n}
                  </span>
                ) : null;
              })()}
            </button>
          ))}
        </div>

        {/* ডান পাশ — মোবাইলের পেজেও ঠিক এই কম্পোনেন্টটাই চলে */}
        <div style={{ borderRadius: "0 10px 10px 0", overflow: "hidden" }}>
          {section.render()}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="tb-hover-fade absolute flex cursor-pointer items-center justify-center"
          style={{
            top: 10,
            right: 10,
            width: 31,
            height: 31,
            borderRadius: "50%",
            background: "var(--member-nav-bg, #2b3248)",
            color: "#fff",
          }}
        >
          <img src="/assets/member-desk/modal-close.png" alt="" style={{ width: 10, height: 10 }} />
        </button>
      </div>
    </div>
  );
};

export default MemberModal;
