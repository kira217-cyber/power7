import React, { useState } from "react";

import { useLanguage } from "../../Context/LanguageProvider";
import SimpleText from "./SimpleText";

/**
 * ডেস্কটপের সাহায্য কেন্দ্র — ফুটারের "help" কলামের লেখায় চাপলে। মোবাইলের
 * পাতার মতোই: উপরে শিরোনামের ট্যাব (সক্রিয়টা নীল মোটা), নিচে লেখা।
 */
const HelpModal = ({ articles, start = 0, onClose }) => {
  const { t, lang } = useLanguage();
  const [active, setActive] = useState(start);
  const tv = (v) => (lang === "en" ? v?.en || v?.bn : v?.bn || v?.en) || "";
  const current = articles[active];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center" style={{ background: "rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="relative flex flex-col overflow-hidden" style={{ width: 1000, height: 680, borderRadius: 10, background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center" style={{ height: 56, background: "#180836", color: "#fff", padding: "0 24px", fontSize: 18 }}>
          {t.memberPage.pages.help.title}
          <button type="button" aria-label="close" onClick={onClose} className="ml-auto grid cursor-pointer place-items-center" style={{ width: 30, height: 30, borderRadius: "50%", background: "#2b3248", fontSize: 18 }}>
            ×
          </button>
        </div>
        <div className="flex" style={{ height: 52, padding: "0 24px", gap: 28, borderBottom: "10px solid #f5f7fa" }}>
          {articles.map((a, i) => (
            <button key={a.id} type="button" onClick={() => setActive(i)} className="cursor-pointer whitespace-nowrap" style={{ fontSize: 17, color: i === active ? "#1e88ff" : "#555", fontWeight: i === active ? 700 : 400 }}>
              {tv(a.title)}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {current && (
            <SimpleText
              key={current.id}
              text={tv(current.body)}
              paragraphGap="12px"
              headingStyle={{ fontSize: 17, color: "#333" }}
              style={{ padding: "20px 24px 30px", fontSize: 15, lineHeight: "24px", color: "#64656b", wordBreak: "break-word" }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
