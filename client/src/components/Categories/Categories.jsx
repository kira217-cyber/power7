import React from "react";
import { useSelector } from "react-redux";

import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { selectGameTabs } from "../../features/globalGame/globalGameSelectors";

/**
 * হোমের ক্যাটাগরি ট্যাব সারি।
 *
 * আইকনের পিছনের **বেগুনি বৃত্ত** দুই ভার্সনেই এক ছবি (মাপা: ডেস্কটপের
 * `.game-menu-item:after` আর মোবাইলের `.game-menu-icon:before` একই দুটো
 * PNG ব্যবহার করে — নিষ্ক্রিয় শুধু আউটলাইন, সক্রিয় ভিতরে ভরাট)।
 *
 * ডেস্কটপ (px):
 *   `.game-menu-item` min-width ৭৬.৮, উচ্চতা ১১১, সারির গ্যাপ ৪০
 *   বৃত্ত `:after` ৭০ × ৪৪, `translateY(-8px)`, `z-index: -1`,
 *     নিষ্ক্রিয় `contain` / সক্রিয় `cover`
 *   `.menu-icon` ৬০ × ৬০; **প্রতিটার নিজস্ব background-size**
 *   সক্রিয়ের নিচে `:before` — ১০০% × ২px, #BC43F4
 *
 * মোবাইল (৭৫০-ডিজাইন) — ডেস্কটপের ছোট রূপ নয়, **আলাদা তালিকা**:
 *   `ul.game-menu-list` ৭৫০ × ১৬৬, padding `15 15 16 18`
 *   `li.game-menu-item` ১৩৫ × ১৩৫ (গ্যাপ নেই, ধাপ ১৩৫)
 *   `.game-menu-icon` ১০০ × ৯২.৫ — এর `:before` বৃত্ত ১০০ × ৭০,
 *     আইকনের **নিচের দিকে** বসে (top ৪৬.২, তারপর translate −৫০,−২১)
 *   `.icon-*` ৬৪ × ৬৪ (fish ৭০ × ৭০), contain
 *   `.game-menu-name` fs ২০ সাদা, y ১০৭.৫
 *   ৯টা ট্যাব — ডেস্কটপে নেই এমন **JILI** ও **ফিশিং** এখানে আছে
 */
const DESK_TABS = [
  { key: "HOME", icon: "hot", size: [57, 65] },
  { key: "FAV", icon: "fav", size: [52, 44] },
  { key: "RNG", icon: "rng", size: [61, 41] },
  { key: "LIVE", icon: "live", size: [60, 60] },
  { key: "PVP", icon: "pvp", size: [60, 60] },
  { key: "SPORTS", icon: "sports", size: [60, 60] },
  { key: "MXWIN", icon: "mxwin", size: [47, 49] },
];

const MOB_TABS = [
  { key: "HOME", icon: "home", size: 64 },
  { key: "FAV", icon: "fav", size: 64 },
  { key: "JL", icon: "jl", size: 64 },
  { key: "RNG", icon: "rng", size: 64 },
  { key: "FISH", icon: "fish", size: 70 },
  { key: "LIVE", icon: "live", size: 64 },
  { key: "MXWIN", icon: "mxwin", size: 64 },
  { key: "PVP", icon: "pvp", size: 64 },
  { key: "SPORTS", icon: "sports", size: 64 },
];

/**
 * ডেস্কটপের ক্যাটাগরি ব্লকের মাপ।
 *
 * মূল ডেস্কটপ সাইটে বৃত্তটা ৭০ × ৪৪ আর `translateY(-8px)` — আইকনের
 * (৬০) প্রায় মাঝ বরাবর বসে, তাই তার উপরের রেখা আইকনের গায়ের উপর দিয়ে
 * যায়। মোবাইলে বৃত্তটা আইকনের নিচে নেমে থাকে বলে আইকনটা তার উপরে বসে
 * থাকে — ব্যবহারকারী ডেস্কটপেও সেটাই চেয়েছেন।
 *
 * তাই **আইকন মূল সাইটের মতোই ৬০** (তার per-icon background-size ও
 * অপরিবর্তিত), শুধু বৃত্তটা সামান্য চওড়া করে আইকনের নিচে নামানো:
 *
 *   আইকন   ৬০ × ৬০, বাক্সের উপর থেকে ৮
 *   বৃত্ত   ৭৬ × ৪৭.৮ (ছবির অনুপাত ১৪০ : ৮৮), আইকনের নিচের কিনারা
 *           থেকে আরও ১২ নিচে নামে → top ৩২.২, নিচ ৮০
 *   লেখা    বৃত্তের নিচে, top ৮৯
 *   আইটেম   ৮০ + ৯ + ২২ = ১১১ — মূল সাইটের সমান
 *
 * বৃত্তের মাপ বদলাতে চাইলে শুধু `DESK_RING_W` বদলালেই হয়।
 */
const RING_RATIO = 88 / 140; // ছবির নিজের অনুপাত
const DESK_ICON = 60;
const DESK_ICON_TOP = 8;
/** বৃত্তের চওড়া — আইকনের চেয়ে সামান্য বড় */
const DESK_RING_W = 76;
const DESK_RING = [DESK_RING_W, +(DESK_RING_W * RING_RATIO).toFixed(1)];
/** আইকনের নিচের কিনারা থেকে বৃত্ত কতটা নিচে নামবে */
const RING_BELOW = 12;
const DESK_RING_TOP = +(DESK_ICON_TOP + DESK_ICON + RING_BELOW - DESK_RING[1]).toFixed(1);

const DESK_ICON_BOX = [DESK_RING_W, DESK_ICON_TOP + DESK_ICON + RING_BELOW];
const DESK_GAP = 9;
const DESK_LABEL_H = 22;
const DESK_ITEM_H = DESK_ICON_BOX[1] + DESK_GAP + DESK_LABEL_H;

/** নিষ্ক্রিয়ে শুধু বেগুনি রেখা, সক্রিয়ে ভিতরটা ভরাট */
const ringUrl = (isActive) =>
  `url(/assets/mobile/cat/${isActive ? "ring-active" : "ring"}.png)`;

/**
 * White-label থেকে ট্যাব এলে সেগুলো, নইলে উপরের স্ট্যাটিক তালিকা।
 * "হোম"/"জনপ্রিয়" ক্যাটাগরি নয় (হোম পেজ নিজেই), তাই সবসময় প্রথমে থাকে।
 */
const buildTabs = (apiTabs, isDesktop, lang) => {
  const statics = isDesktop ? DESK_TABS : MOB_TABS;
  if (!apiTabs) return statics;

  const home = statics[0];
  const list = isDesktop ? apiTabs.desktop : apiTabs.mobile;

  return [
    home,
    ...list.map((c) => ({
      key: c.key,
      iconUrl: isDesktop ? c.deskIcon : c.mobIcon,
      // admin এ মাপ দেওয়া থাকলে মূল সাইটের মতো নিজের মাপে, নইলে ৬০ এ ধরানো
      size: isDesktop ? c.deskIconSize || null : 64,
      label: c.name?.[lang] || c.name?.bn || c.key,
    })),
  ];
};

const Categories = ({ active = "HOME", onChange }) => {
  const { t, lang } = useLanguage();
  const isDesktop = useIsDesktop();
  const tabs = buildTabs(useSelector(selectGameTabs), isDesktop, lang);

  if (!isDesktop) {
    return (
      <ul
        className="hide-scrollbar flex overflow-x-auto"
        style={{ height: m(166), padding: `${m(15)} ${m(15)} ${m(16)} ${m(18)}` }}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active;

          return (
            <li key={tab.key} className="shrink-0" style={{ width: m(135) }}>
              <button
                type="button"
                onClick={() => onChange?.(tab.key)}
                className="flex w-full cursor-pointer flex-col items-center"
                style={{ height: m(135) }}
              >
                {/* আইকন + তার পিছনের বৃত্ত */}
                <div
                  className="relative flex items-end justify-center"
                  style={{ width: m(100), height: m(92.5), flexShrink: 0 }}
                >
                  {/* বৃত্তটা DOM এ আইকনের **আগে**, তাই এমনিতেই পিছনে
                      পড়ে — `z-index: -1` দিলে পেজের ব্যাকগ্রাউন্ডের
                      পিছনে চলে যায় এবং একদম দেখা যায় না */}
                  <span
                    className="pointer-events-none absolute"
                    style={{
                      left: 0,
                      top: m(25.2),
                      width: m(100),
                      height: m(70),
                      backgroundImage: ringUrl(isActive),
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "50%",
                      backgroundSize: "contain",
                    }}
                  />
                  <span
                    className="absolute"
                    style={{
                      top: m(9.2),
                      width: m(tab.size),
                      height: m(tab.size),
                      backgroundImage: `url(${tab.iconUrl || `/assets/mobile/cat/${tab.icon}.png`})`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "50%",
                      backgroundSize: "contain",
                    }}
                  />
                </div>

                <span
                  className="w-full truncate text-center"
                  style={{ marginTop: m(15), fontSize: m(20), color: "var(--home-cat-text, #fff)" }}
                >
                  {tab.label ?? t.tabsMobile[tab.key]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div
      className="hide-scrollbar flex overflow-x-auto"
      // `.game-menu` padding ২.৮ চারদিকে — প্রথম ট্যাব x = কলাম + ২.৮;
      // নিচে প্রথম সেকশনের শিরোনাম পর্যন্ত ৩৪ (মাপা)
      style={{ height: DESK_ITEM_H + 5.6, padding: 2.8, gap: 40, marginBottom: 34 }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const [iw, ih] = tab.size || [60, 60];

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange?.(tab.key)}
            className="relative flex shrink-0 cursor-pointer flex-col items-center whitespace-nowrap"
            style={{
              // `.game-menu-item` — min-width ৭৬.৮ (border-box), পাশে ৮ padding;
              // ছোট নামে ৭৬.৮, লম্বা নামে নাম + ১৬ ("আমার প্রিয়" ৯৬.৪)
              minWidth: 76.8,
              height: DESK_ITEM_H,
              padding: "0 8px",
              borderRadius: 7,
              color: "var(--home-cat-text, #fff)",
              fontSize: 17,
              fontWeight: 500,
              transition: ".2s",
            }}
          >
            {/* আইকন ও তার পিছনের বৃত্ত — মোবাইলের মতো এক বাক্সে */}
            <div
              className="relative flex items-end justify-center"
              // বাক্সটা আইকনের সমান (৬০) — বৃত্ত দুপাশে একটু বেরিয়ে থাকে, তাই
              // বৃত্ত আইটেমকে চওড়া করে না
              style={{ width: DESK_ICON, height: DESK_ICON_BOX[1], flexShrink: 0 }}
            >
              {/* বৃত্তটা DOM এ আইকনের আগে বলে এমনিতেই পিছনে পড়ে */}
              <span
                className="pointer-events-none absolute"
                style={{
                  left: (DESK_ICON - DESK_RING[0]) / 2,
                  top: DESK_RING_TOP,
                  width: DESK_RING[0],
                  height: DESK_RING[1],
                  backgroundImage: ringUrl(isActive),
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "50%",
                  backgroundSize: isActive ? "cover" : "contain",
                }}
              />

              {/* আইকন — background, কারণ প্রতিটার নিজস্ব মাপ আছে */}
              <span
                className="absolute"
                style={{
                  top: DESK_ICON_TOP,
                  width: DESK_ICON,
                  height: DESK_ICON,
                  backgroundImage: `url(${tab.iconUrl || `/assets/icons/menu/${tab.icon}.png`})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "50%",
                  // প্রতিটা আইকনের নিজস্ব মাপ; না থাকলে বাক্সে contain
                  backgroundSize: tab.size ? `${iw}px ${ih}px` : "contain",
                }}
              />
            </div>

            <span
              style={{ marginTop: DESK_GAP, height: DESK_LABEL_H, lineHeight: `${DESK_LABEL_H}px` }}
            >
              {tab.label ?? t.tabs[tab.key]}
            </span>

            {/* সক্রিয় ট্যাবের নিচের রেখা — মূল সাইটের `:before` */}
            {isActive && (
              <span
                className="absolute bottom-0 left-0"
                style={{ width: "100%", height: 2, background: "var(--home-cat-active, #bc43f4)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Categories;
