import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import { useLanguage } from "../../Context/LanguageProvider";
import { useUI } from "../../Context/uiContext";
import { m } from "../../hook/useUnits";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { selectIsLoggedIn } from "../../features/auth/authSelectors";
import { fetchRewardSummary, selectRewardKinds } from "../../features/reward/rewardSlice";
import { followLink } from "../../utils/siteLink";

/**
 * হোমের ভাসমান ইভেন্ট আইকন — মূল সাইটের `.entry-count-wrap`।
 *
 * বন্ধ অবস্থায় এক ঘরে (৬২ × ৭৮) আইকনগুলো পালা করে আসে, উপরে তীর আর বাঁয়ে
 * ক্রস; তীরে চাপলে সবগুলো কালো-স্বচ্ছ লম্বা পাতে খোলে (প্রতিটা ৭৮ পরপর)।
 * কোন আইকন, কোন কোণে, উপরে-নিচে না পাশাপাশি, কত সেকেন্ড পরপর — সব admin
 * এর "Home Events" থেকে। ক্রস চাপলে লুকায়, reload দিলে আবার আসে।
 */
const IMG = "/assets/reward";
const DEFAULT_IMAGE = {
  signin: "entry-LOGIN.webp",
  temu: "entry-TEMU.gif",
  redPacket: "entry-RAFFLE.gif",
  wheel: "reward-wheel.png",
  claim: "promo-box.png",
  referral: "item-default.png",
  promotion: "item-default.png",
  link: "item-default.png",
};
const TICKET_KINDS = ["temu", "redPacket", "wheel"];

const HomeEvents = () => {
  const isDesktop = useIsDesktop();
  const loggedIn = useSelector(selectIsLoggedIn);
  const kinds = useSelector(selectRewardKinds);
  const { events, eventSetting } = useSelector((s) => s.global);
  const { openAuth, openMember } = useUI();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // ক্রস চাপলে এই পাতায় লুকায়; reload দিলে আবার দেখায় (কোথাও মনে রাখা হয় না)
  const [closed, setClosed] = useState(false);

  // ডেস্কটপে ৩৯০px ফোনের মাপকে px এ
  const z = (n) => (isDesktop ? `${Math.round(n * 5.2) / 10}px` : m(n));

  useEffect(() => {
    if (loggedIn) dispatch(fetchRewardSummary());
  }, [dispatch, loggedIn]);

  const items = (events || []).filter(
    (e) =>
      (e.platform === "all" || e.platform === (isDesktop ? "desktop" : "mobile")) &&
      (!e.onlyWithTicket || !TICKET_KINDS.includes(e.kind) || (kinds?.[e.kind] || 0) > 0),
  );
  const interval = Math.max(1, Number(eventSetting?.interval) || 3) * 1000;
  const count = items.length;

  useEffect(() => {
    if (open || count < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [open, count, interval]);

  if (closed || !eventSetting || count === 0 || (!loggedIn && !eventSetting.showGuests)) return null;

  const go = (item) => {
    if (!loggedIn && item.kind !== "promotion" && item.kind !== "link") {
      openAuth("login");
      return;
    }
    if (item.kind === "link") return followLink(item.link);
    if (item.kind === "promotion") return navigate(`/promotions?open=${encodeURIComponent(item.link)}`);
    if (item.kind === "referral") return openMember("referral");
    if (isDesktop) return openMember("reward");
    return navigate(item.kind === "signin" ? "/member/reward/signin" : "/member/reward/claim");
  };

  const pos = eventSetting.position || "RIGHT_BOTTOM";
  const right = pos.startsWith("RIGHT");
  const middle = pos.endsWith("MIDDLE");
  const vertical = eventSetting.direction !== "horizontal";
  const titleOf = (item) => (lang === "en" ? item.title?.en || item.title?.bn : item.title?.bn || item.title?.en) || "";

  const icon = (item, size = 102) => (
    <button key={item.id} type="button" onClick={() => go(item)} title={titleOf(item)} className="block shrink-0 cursor-pointer" style={{ width: z(size + 18), height: z(size + 22) }}>
      <img src={item.image || `${IMG}/${DEFAULT_IMAGE[item.kind]}`} alt={titleOf(item)} className="h-full w-full object-contain" draggable={false} />
    </button>
  );

  const close = () => setClosed(true);

  return (
    <div
      className="fixed flex flex-col items-center"
      style={{
        zIndex: 60,
        [right ? "right" : "left"]: z(10),
        ...(middle ? { top: "50%", transform: "translateY(-50%)" } : { bottom: isDesktop ? "140px" : m(210) }),
      }}
    >
      {/* তীর আর ক্রস */}
      <div className="relative" style={{ width: z(124), height: z(52) }}>
        {count > 1 && (
          <button
            type="button"
            aria-label={open ? "collapse" : "expand"}
            onClick={() => setOpen((v) => !v)}
            className="absolute cursor-pointer"
            style={{ left: "50%", top: 0, width: z(44), height: z(44), marginLeft: z(-22), background: `url(${IMG}/entry-icon-arrow.png) center / contain no-repeat`, transform: open ? "none" : "rotate(180deg)", transition: "transform .3s" }}
          />
        )}
        <button
          type="button"
          aria-label="close"
          onClick={close}
          className="absolute grid cursor-pointer place-items-center"
          style={{ [right ? "left" : "right"]: z(-24), top: z(4), width: z(44), height: z(44), borderRadius: "50%", background: "rgba(80,80,80,.85)", color: "#fff", fontSize: z(30), lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {open ? (
        <div
          className={`flex ${vertical ? "flex-col" : right ? "flex-row-reverse" : "flex-row"} items-center`}
          style={{ background: "rgba(0,0,0,.7)", boxShadow: "0 2px 14px rgba(0,0,0,.25)", borderRadius: z(80), padding: vertical ? `${z(14)} ${z(8)}` : `${z(8)} ${z(14)}`, gap: z(32), animation: "tb-drawer-in .25s ease-out" }}
        >
          {items.map((item) => icon(item))}
        </div>
      ) : (
        icon(items[index % count], 106)
      )}
    </div>
  );
};

export default HomeEvents;
