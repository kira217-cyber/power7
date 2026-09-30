import React, { useState } from "react";

import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { vendorLabel } from "../../data/vendorNames";
import { useOpenGame } from "../../features/game/useOpenGame";
import { isFavorite, toggleFavorite, useFavorites } from "../../features/game/favorites";

/**
 * একটা গেমের কার্ড — ডেস্কটপ ও মোবাইলে গঠন আলাদা, তাই দুটো আলাদা শাখা।
 *
 * **ডেস্কটপ** (মাপা): কার্ড ১৬৪.২ × ১৯৫.৮
 *   `.game-img` বর্গ, radius ১৬; ভিতরের `<img>` **object-fit: contain**
 *   `.game-info` ৩১.৭ উঁচু, padding-top ৯.৭; নাম ২২ উঁচু fs ১৭
 *   `.fav-btn` ৪৩.৮ বৃত্ত bg rgba(0,0,0,.37), উপরে-বাঁয়ে ৫,৫
 *   `.game-vassalage` ৪৯ × ৩৬ **নিচে-ডানে**, radius `32px 0 16px`
 *   hover: ছবি scale(1.1), overlay + "এখন খেলুন"/"ফ্রি ট্রায়াল"
 *
 * **মোবাইল** (৭৫০-ডিজাইনে মাপা): কার্ড ২১৭ × ২৮১ — বর্গ নয়, **লম্বা**
 *   `.game-background` ২১৭ × ২৪৫ (অনুপাত 217/245), radius ১৬,
 *     ছবি **object-fit: cover**
 *   `.game-fav` ৩২ × ২৯ উপরে-বাঁয়ে ৮,৮ (ডেস্কটপের বৃত্ত নয়)
 *   ব্যাজ ৭৩ × ৩৩ **উপরে-ডানে**, bg #BC43F4, fs ২০
 *   নাম y ২৫০ থেকে, উচ্চতা ৩১, fs ২৬
 */
/** ভরাট লাল হৃদয় — প্রিয় তালিকায় থাকলে */
const HeartFilled = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z"
      fill="#ff3b5c"
    />
  </svg>
);

/**
 * গেমের ছবি — মূল সাইট যেভাবে লোড দেখায় (দুই ভার্সন আলাদা, মাপা):
 *
 *   ডেস্কটপ (vue-lazyload): লোড হওয়া পর্যন্ত ধূসর বাক্সে ঘুরন্ত বিন্দুর
 *     gif (`img-loading.gif`, ২০০ × ২০০); ছবি না এলে "MEGA WIN"
 *     (`default.png`)।
 *   মোবাইল (react-lazy-load-image, effect "blur"): লোড হওয়া পর্যন্ত কার্ড
 *     ফাঁকা; এলে ঝাপসা থেকে ০.১৪ সেকেন্ডে পরিষ্কার হয়ে ফুটে ওঠে।
 */
const LOADING_GIF = "/assets/site/img-loading.gif";
const FALLBACK = "/assets/site/game-default.png";

const GameImage = ({ src, desktop, className, style }) => {
  const [state, setState] = useState("loading");
  const failed = state === "error" || !src;

  const img = (
    <img
      className={className}
      src={failed ? FALLBACK : src}
      alt=""
      loading="lazy"
      onLoad={() => !failed && setState("loaded")}
      onError={() => setState("error")}
      style={{
        ...style,
        ...(desktop
          ? { opacity: state === "loaded" || failed ? 1 : 0 }
          : {
              opacity: state === "loaded" || failed ? 1 : 0,
              filter: state === "loaded" || failed ? "blur(0)" : "blur(15px)",
              transition: "filter .14s, opacity .15s",
            }),
      }}
    />
  );

  if (!desktop) return img;

  return (
    <>
      {state === "loading" && !failed && (
        <img
          src={LOADING_GIF}
          alt=""
          className="absolute inset-0"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {img}
    </>
  );
};

const GameCard = ({ game, showHot = false }) => {
  const { t, lang } = useLanguage();
  // ইংরেজিতে ইংরেজি নাম, বাংলায় বাংলা (না থাকলে ইংরেজি)
  const title = lang === "en" ? game.nameEn || game.name : game.name;
  const isDesktop = useIsDesktop();
  // "এখন খেলুন" আসল টাকায় (লগইন লাগে), "ফ্রি ট্রায়াল" লগইন ছাড়া
  const openGame = useOpenGame();
  const open = (e) => {
    e?.stopPropagation();
    openGame(game);
  };
  const openTrial = (e) => {
    e?.stopPropagation();
    openGame(game, { trial: true });
  };
  // ♥ — এই ব্রাউজারে "আমার প্রিয়" তে রাখা (স্ট্যাটিক গেমের uid নেই, তাই শুধু API এর গেমে)
  const favs = useFavorites();
  const fav = isFavorite(favs, game);
  const onFav = (e) => {
    e.stopPropagation();
    toggleFavorite(game);
  };

  if (!isDesktop) {
    return (
      <div className="relative cursor-pointer" style={{ width: "100%" }} onClick={open}>
        <div
          className="relative"
          style={{
            width: "100%",
            aspectRatio: "217 / 245",
            borderRadius: m(16),
            overflow: "hidden",
            background: "rgb(255 255 255 / 0.04)",
          }}
        >
          <GameImage
            key={game.icon}
            src={game.icon}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />

          {/* মোবাইলের হার্ট ডেস্কটপেরটা নয় — কালো বৃত্ত ছাড়া, শুধু
              সাদা আউটলাইন (`stroke: #fff`, width ৩.৬) */}
          <button
            type="button"
            aria-label="favourite"
            aria-pressed={fav}
            onClick={onFav}
            className="absolute flex items-center justify-center"
            style={{ top: m(8), left: m(8), width: m(32), height: m(29) }}
          >
            {fav ? (
              <HeartFilled size="100%" />
            ) : (
              <img
                src="/assets/mobile/icons/game-fav.svg"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            )}
          </button>

        </div>

        {/* ব্যাজটা ছবির বাক্সের **বাইরে** — নইলে radius ১৬ এর কারণে
            উপরের-ডান কোণাটা কেটে যায় (মূল সাইটেও এটা ভাইপর্যায়ে) */}
        {game.vendor && (
          <span
            className="absolute flex items-center justify-center"
            style={{
              top: 0,
              right: 0,
              minWidth: m(73),
              height: m(33),
              padding: `${m(5)} ${m(22)}`,
              background: "var(--home-badge, var(--accent-bright))",
              // `.game-item-display-name` — TR ও BL কোণা ৫
              borderRadius: `0 ${m(5)} 0 ${m(5)}`,
              color: "#fff",
              fontSize: m(20),
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {game.vendorName || vendorLabel(game.vendor)}
          </span>
        )}

        {/* `.game-item-name` — ডেস্কটপের মতো গ্রেডিয়েন্ট নয়, সাদা;
            ডানে ৩২.৫ জায়গা ছাড়া থাকে ("গরম" ব্যাজের জন্য) */}
        <div
          className="truncate"
          style={{
            height: m(31),
            marginTop: m(5),
            // "গরম" চিহ্ন থাকলে নামটা তার আগেই কাটে
            paddingInlineEnd: showHot && game.isHot ? m(60) : m(32.5),
            fontSize: m(26),
            color: "var(--home-card-name, #fff)",
          }}
        >
          {title}
        </div>

        {/* খেলার কেন্দ্রে গরম গেমের নামের ডানে ছোট "গরম" চিহ্ন */}
        {showHot && game.isHot && (
          <span
            className="absolute"
            style={{
              right: 0,
              bottom: m(6),
              padding: `0 ${m(4)}`,
              borderRadius: m(4),
              background: "var(--home-hot, #FBD029)",
              color: "var(--home-hot-text, #7c2d12)",
              fontSize: m(16),
              fontWeight: 700,
              lineHeight: m(24),
            }}
          >
            {t.games.hot}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="tb-game-card cursor-pointer" style={{ width: "var(--card-w)" }}>
      <div
        className="relative"
        style={{
          width: "var(--card-img)",
          aspectRatio: "1 / 1",
          borderRadius: "var(--card-radius)",
          overflow: "hidden",
          background: "rgb(255 255 255 / 0.04)",
        }}
      >
        <GameImage
          key={game.icon}
          desktop
          className="tb-game-img"
          src={game.icon}
          style={{
            width: "100%",
            height: "100%",
            // Oracle এর ছবি ৪২০ × ৫০০ — contain দিলে দুপাশে ফাঁকা থাকত;
            // মূল সাইটের বর্গ ছবিতে cover আর contain একই দেখায়
            objectFit: "cover",
            display: "block",
            transition: "transform .5s",
          }}
        />

        {game.vendor && (
          <span
            className="absolute right-0 bottom-0 flex items-center justify-center"
            style={{
              minWidth: "var(--badge-w)",
              height: "var(--badge-h)",
              padding: "0 9px",
              background: "var(--home-badge, var(--accent-bright))",
              borderRadius: "var(--badge-radius)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {game.vendorName || vendorLabel(game.vendor)}
          </span>
        )}

        <button
          type="button"
          aria-label="favourite"
          aria-pressed={fav}
          onClick={onFav}
          className="absolute flex cursor-pointer items-center justify-center"
          style={{
            top: 5,
            left: 5,
            width: 43.8,
            height: 43.8,
            borderRadius: "50%",
            background: "rgb(0 0 0 / 0.37)",
            // hover এর ঢাকনার উপরে, নইলে চাপা যায় না
            zIndex: 2,
          }}
        >
          {fav ? <HeartFilled size={22} /> : <Icon name="game-fav-default" size={22} />}
        </button>

        <div
          className="tb-action-wrap absolute flex flex-col items-center justify-center"
          style={{
            inset: 0,
            background: "rgb(0 0 0 / 0.6)",
            borderRadius: "var(--card-radius)",
            gap: 15,
          }}
        >
          <span
            onClick={open}
            className="tb-action-btn flex cursor-pointer items-center justify-center"
            style={{
              width: 130,
              height: 40,
              borderRadius: 7,
              background: "var(--home-play, #da394f)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {t.playNow}
          </span>
          <span
            onClick={openTrial}
            className="tb-action-btn flex cursor-pointer items-center justify-center"
            style={{
              width: 130,
              height: 40,
              borderRadius: 7,
              background: "var(--home-trial, #1678ff)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {t.freeTrial}
          </span>
        </div>
      </div>

      <div className="flex items-start" style={{ height: 31.7, paddingTop: 9.7 }}>
        <div
          className="truncate"
          style={{
            width: "100%",
            height: "var(--card-name-h)",
            fontSize: 17,
            fontWeight: 500,
            backgroundImage: "var(--name-gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
};

export default GameCard;
