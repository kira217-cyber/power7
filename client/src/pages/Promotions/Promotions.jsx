import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router";

import { selectPromotions } from "../../features/global/globalSelectors";
import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";

/**
 * প্রমোশন পেজ।
 *
 * মূল সাইট থেকে মাপা (ডেস্কটপ, `/promotions`):
 *   উপরে ক্যাটাগরির পিল — `.promo-menu-item` ১২৬ × ৪৮.৮, radius ১৪,
 *     bg ক্রিম, লেখা #1D212D
 *   কার্ড গ্রিড y ১৯৮.৮, প্রস্থ ১০৮৫, gap `৩০px ২০px` — ৩ কলাম
 *   কার্ড ৩৪৮ × ২১৭, radius ১৭; ছবি পুরো কার্ড জুড়ে
 *   নিচে ওভারলে বার `.active-item-info` y ১৭২ উঁচু ৪৫,
 *     bg rgba(53,27,108,.8)
 *   শিরোনাম x ১৪ fs ১৮ সাদা; "আরও" বোতাম ৭৮.৪ × ৩১.২ radius ২০
 *
 * মোবাইলে একই কার্ড, কিন্তু এক কলামে পুরো প্রস্থে।
 */
/** বিস্তারিত — লম্বা ছবিগুলো, ঐচ্ছিক লেখা, আর লিংক থাকলে "যোগ দিন" */
const PromoBody = ({ promo, desktop = false }) => {
  const { t, lang } = useLanguage();
  const text = (lang === "en" && promo.content?.en) || promo.content?.bn || "";
  return (
    <div style={desktop ? {} : { background: "var(--promo-card-bg, #1b1a3d)", borderRadius: m(12), padding: m(24), marginTop: m(-8) }}>
      {(promo.body || []).map((src) => (
        <img key={src} src={src} alt="" loading="lazy" style={{ width: desktop ? 440 : "100%", maxWidth: "100%", display: "block" }} />
      ))}
      {text && <div style={{ whiteSpace: "pre-line", color: "var(--promo-text, #dcdcea)", fontSize: desktop ? 15 : m(26), lineHeight: 1.6, marginTop: desktop ? 16 : m(20) }}>{text}</div>}
      {promo.link && (
        <a
          href={promo.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center"
          style={{ marginTop: desktop ? 18 : m(24), height: desktop ? 40 : m(80), padding: desktop ? "0 30px" : `0 ${m(50)}`, borderRadius: desktop ? 20 : m(40), background: "var(--promo-btn-bg, #c0392f)", color: "#fff", fontSize: desktop ? 16 : m(28), fontWeight: 600 }}
        >
          {t.promo.join}
        </a>
      )}
    </div>
  );
};

/**
 * ডেস্কটপের বিস্তারিত — মূল সাইটের মতো মাঝখানে গাঢ় মডাল (৯২০ × ৬০০,
 * radius ২০), উপরে-ডানে সাদা ক্রস, বাঁয়ে সোনালি বড় শিরোনাম, নিচে
 * লম্বা ছবি স্ক্রল হয়।
 */
const PromoModal = ({ promo, title, onClose }) => {
  const { t } = useLanguage();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center" style={{ background: "rgb(0 0 0 / 0.6)" }} onClick={onClose}>
      <div
        className="relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 920, height: 600, borderRadius: 20, background: "var(--promo-modal-bg, #12112b)", padding: "70px 20px 20px" }}
      >
        <button type="button" aria-label={t.promo.close} onClick={onClose} className="absolute cursor-pointer" style={{ top: 22, right: 24, color: "#fff", fontSize: 34, lineHeight: 1 }}>
          ×
        </button>
        <div style={{ fontSize: 32, fontWeight: 800, background: "linear-gradient(180deg,#fff3b0,#f5c542 60%,#d99a1e)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginBottom: 20 }}>
          {title}
        </div>
        <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
          <PromoBody promo={promo} desktop />
        </div>
      </div>
    </div>
  );
};

const Promotions = () => {
  const { t, lang } = useLanguage();
  const titleOf = (promo) => (lang === "en" && promo.titleEn) || promo.title;
  const isDesktop = useIsDesktop();
  const promotions = useSelector(selectPromotions);
  const [category, setCategory] = useState("all");
  // খোলা প্রমোশন — ডেস্কটপে মডাল, মোবাইলে কার্ডের নিচে (মূল সাইটের মতো)
  const [openId, setOpenId] = useState(null);
  const [params, setParams] = useSearchParams();

  // ব্যানার/পপআপ থেকে `?open=<কোড>` এলে সেই প্রমোশন খোলা
  const wanted = params.get("open");
  useEffect(() => {
    if (!wanted || !promotions.length) return;
    const hit = promotions.find((p) => p.code === wanted || p.id === wanted || String(p.id) === wanted);
    if (hit) setOpenId(hit.id);
    setParams({}, { replace: true });
  }, [wanted, promotions, setParams]);

  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));
  const opened = promotions.find((p) => p.id === openId);

  const categories = [{ key: "all", label: t.promo.all }];

  return (
    <div style={{ paddingBottom: isDesktop ? 0 : m(140) }}>
      {/* ক্যাটাগরির পিল */}
      <div
        className="hide-scrollbar flex overflow-x-auto"
        style={{
          paddingTop: isDesktop ? 38 : m(24),
          paddingInline: isDesktop ? 0 : m(24),
          gap: isDesktop ? 14 : m(16),
        }}
      >
        {categories.map((item) => {
          const active = item.key === category;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
              className="shrink-0 cursor-pointer"
              style={{
                height: isDesktop ? 48.8 : m(68),
                minWidth: isDesktop ? 126 : m(160),
                padding: isDesktop ? "0 15px" : `0 ${m(24)}`,
                borderRadius: isDesktop ? 14 : m(20),
                background: active ? "var(--promo-tab-active, #f3e6cd)" : "rgb(255 255 255 / 0.06)",
                color: active ? "var(--promo-tab-active-text, #1d212d)" : "#fff",
                fontSize: isDesktop ? 16 : m(24),
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* কার্ড গ্রিড */}
      <div
        style={{
          marginTop: isDesktop ? 48.8 : m(24),
          paddingInline: isDesktop ? 0 : m(24),
          display: "grid",
          gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr",
          gap: isDesktop ? "30px 20px" : m(24),
        }}
      >
        {promotions.length === 0 && (
          <div style={{ color: "var(--promo-muted, #8c8fa3)", fontSize: isDesktop ? 15 : m(28), padding: isDesktop ? "40px 0" : `${m(80)} 0` }}>{t.promo.empty}</div>
        )}
        {promotions.map((promo) => (
          <React.Fragment key={promo.id}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggle(promo.id)}
            className="relative cursor-pointer"
            style={{
              aspectRatio: "348 / 217",
              borderRadius: isDesktop ? 17 : m(20),
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            {promo.image && (
              <img
                src={promo.image}
                alt={titleOf(promo)}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}

            <div
              className="absolute right-0 bottom-0 left-0 flex items-center"
              style={{
                height: isDesktop ? 45 : m(64),
                background: "rgb(53 27 108 / 0.8)",
                padding: isDesktop ? "0 9px 0 14px" : `0 ${m(14)} 0 ${m(20)}`,
                gap: isDesktop ? 10 : m(12),
              }}
            >
              <span
                className="flex-1 truncate"
                style={{ fontSize: isDesktop ? 18 : m(24), color: "#fff" }}
              >
                {titleOf(promo)}
              </span>
              <span
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: isDesktop ? 78.4 : m(110),
                  height: isDesktop ? 31.2 : m(44),
                  borderRadius: isDesktop ? 20 : m(30),
                  background: "var(--promo-btn-bg, #c0392f)",
                  color: "#fff",
                  fontSize: isDesktop ? 16 : m(22),
                  fontWeight: 600,
                }}
              >
                {isDesktop ? t.promo.more : t.promo.moreMobile}
              </span>
            </div>
          </div>
          {!isDesktop && openId === promo.id && <PromoBody promo={promo} />}
          </React.Fragment>
        ))}
      </div>

      {isDesktop && opened && <PromoModal promo={opened} title={titleOf(opened)} onClose={() => setOpenId(null)} />}
    </div>
  );
};

export default Promotions;
