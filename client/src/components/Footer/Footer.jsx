import React, { useState } from "react";
import { useNavigate } from "react-router";

import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { useHelp } from "../../features/help/useHelp";
import { pickLang, siteImage, useSiteSettings } from "../../site/siteSettings";
import HelpModal from "../Help/HelpModal";

/**
 * ফুটার — সব কিছু admin এর "Footer Setting" থেকে (site/siteSettings.js)।
 *
 * তিন কলাম: আমাদের সম্পর্কে (লোগো + লেখা), প্রয়োজনীয় খেলা (ক্লিক করলে
 * সেই ক্যাটাগরির খেলার কেন্দ্র — সাইডবারের মতো), সার্টিফিকেট (Gaming
 * Curacao, Oracle API — লিংক থাকলে নতুন ট্যাবে)। নিচে প্রোভাইডার লোগো আর
 * কপিরাইট। ডেস্কটপে তিন কলাম পাশাপাশি; মোবাইলে (৭৫০-ডিজাইন) "সম্পর্কে"
 * উপরে পুরো চওড়া, নিচে খেলা আর সার্টিফিকেট পাশাপাশি।
 *
 * রঙ admin এর "Client Colours › Footer" থেকে (`--footer-*`)।
 */

const C = {
  bg: "var(--footer-bg, var(--surface))",
  heading: "var(--footer-heading, #fff)",
  line: "var(--footer-line, var(--gold))",
  text: "var(--footer-text, #d9d9d9)",
  link: "var(--footer-link, #fff)",
  bullet: "var(--footer-bullet, #fff)",
};

/** লিংক থাকলে নতুন ট্যাবে খোলে, না থাকলে শুধু ছবি */
const MaybeLink = ({ href, label, children }) =>
  href ? (
    <a href={href} target="_blank" rel="noreferrer noopener" aria-label={label} className="tb-hover-fade block">
      {children}
    </a>
  ) : (
    children
  );

/** কলামের শিরোনাম — নিচে সোনালি দাগ */
const Heading = ({ children, size, gap }) => (
  <div
    style={{
      display: "inline-block",
      fontSize: size,
      fontWeight: 600,
      color: C.heading,
      paddingBottom: `calc(${typeof gap === "number" ? `${gap}px` : gap} / 3)`,
      borderBottom: `2px solid ${C.line}`,
      marginBottom: gap,
      lineHeight: 1.3,
    }}
  >
    {children}
  </div>
);

/** খেলার ক্যাটাগরিতে যাওয়া — ডেস্কটপে হোমের ট্যাব, মোবাইলে খেলার কেন্দ্র (সাইডবারের মতো) */
const useOpenCategory = () => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  return (key) => {
    navigate(isDesktop ? `/?tab=${encodeURIComponent(key)}` : `/games/${encodeURIComponent(key)}`);
    window.scrollTo({ top: 0 });
  };
};

const Footer = () => {
  const isDesktop = useIsDesktop();
  const { lang } = useLanguage();
  const { footer: f, identify } = useSiteSettings();
  const openCategory = useOpenCategory();
  // admin এর Help Content এ "Show on desktop" দেওয়া লেখা — কপিরাইটের উপরে ছোট লিংক
  const { articles } = useHelp("desktop");
  const [helpAt, setHelpAt] = useState(null);
  const tx = (v) => pickLang(v, lang);

  // মাপ: ডেস্কটপে px, মোবাইলে ৭৫০-ডিজাইনের rem
  const u = (d, mob) => (isDesktop ? d : m(mob));
  const headingSize = u(22, 30);
  const headingGap = u(16, 20);

  const about = f.about.show && (
    <div>
      <Heading size={headingSize} gap={headingGap}>
        {tx(f.about.title)}
      </Heading>
      <img
        src={siteImage(f.about.logo || identify.logo)}
        alt={identify.siteName}
        style={{ display: "block", height: u(64, 90), maxWidth: "100%", objectFit: "contain", marginBottom: u(14, 18) }}
      />
      <p style={{ fontSize: u(13.5, 22), lineHeight: 1.7, color: C.text, whiteSpace: "pre-line" }}>{tx(f.about.text)}</p>
    </div>
  );

  const games = f.games.show && f.games.items.length > 0 && (
    <div>
      <Heading size={headingSize} gap={headingGap}>
        {tx(f.games.title)}
      </Heading>
      <ul style={{ display: "grid", gap: u(8, 14) }}>
        {f.games.items.map((item, i) => (
          <li key={`${item.category}-${i}`}>
            <button
              type="button"
              onClick={() => openCategory(item.category)}
              className="tb-hover-fade flex cursor-pointer items-center text-left"
              style={{ gap: u(10, 14), fontSize: u(16, 24), color: C.link }}
            >
              <span className="shrink-0" style={{ width: u(16, 22), height: u(16, 22), borderRadius: "50%", background: C.bullet }} />
              {tx(item.label)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const certificates = f.certificates.show && f.certificates.items.length > 0 && (
    <div>
      <Heading size={headingSize} gap={headingGap}>
        {tx(f.certificates.title)}
      </Heading>
      <div className="flex flex-col items-start" style={{ gap: u(16, 22) }}>
        {f.certificates.items.map((item, i) => (
          <MaybeLink key={`${item.image}-${i}`} href={item.link} label={item.name}>
            <img src={siteImage(item.image)} alt={item.name} style={{ display: "block", width: u(210, 270), maxWidth: "100%", height: "auto" }} />
          </MaybeLink>
        ))}
      </div>
    </div>
  );

  const providers = f.showProviders && f.providerLogos.length > 0 && (
    <div
      className="flex flex-wrap items-center justify-center"
      style={{
        marginTop: u(34, 40),
        paddingTop: u(26, 34),
        borderTop: "1px solid rgb(255 255 255 / 0.08)",
        gap: isDesktop ? "20px 46px" : `${m(24)} ${m(34)}`,
      }}
    >
      {f.providerLogos.map((p, i) => (
        <MaybeLink key={`${p.image}-${i}`} href={p.link} label={p.name}>
          <img
            src={siteImage(p.image)}
            alt={p.name}
            style={{ display: "block", height: u(34, 40), objectFit: "contain", filter: "grayscale(1) brightness(1.6)", opacity: 0.75 }}
          />
        </MaybeLink>
      ))}
    </div>
  );

  const helpLinks = articles.length > 0 && (
    <div className="flex flex-wrap justify-center" style={{ marginTop: u(22, 26), gap: isDesktop ? "8px 22px" : `${m(10)} ${m(26)}` }}>
      {articles.map((a, i) => (
        <button key={a.id} type="button" onClick={() => setHelpAt(i)} className="cursor-pointer hover:underline" style={{ fontSize: u(14, 22), color: C.text }}>
          {tx(a.title)}
        </button>
      ))}
    </div>
  );

  return (
    <footer style={{ background: C.bg, padding: isDesktop ? "35px 0 36px" : `${m(40)} 0 ${m(150)}` }}>
      <div style={{ width: isDesktop ? "var(--content-w)" : m(700), marginInline: "auto" }}>
        {isDesktop ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) 230px", gap: 56 }}>
            <div style={{ maxWidth: 360 }}>{about}</div>
            <div>{games}</div>
            <div>{certificates}</div>
          </div>
        ) : (
          <>
            {about}
            <div className="flex" style={{ marginTop: f.about.show ? m(40) : 0, gap: m(30) }}>
              <div className="min-w-0 flex-1">{games}</div>
              <div className="shrink-0" style={{ width: m(290) }}>
                {certificates}
              </div>
            </div>
          </>
        )}

        {providers}
        {helpLinks}

        <div className="text-center" style={{ marginTop: u(26, 30), fontSize: u(15, 20), color: "var(--footer-copy, var(--text-dim))" }}>
          {tx(f.copyright)}
        </div>
      </div>
      {helpAt !== null && <HelpModal articles={articles} start={helpAt} onClose={() => setHelpAt(null)} />}
    </footer>
  );
};

export default Footer;
