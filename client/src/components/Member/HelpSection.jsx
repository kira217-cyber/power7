import React, { useState } from "react";

import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { useHelp } from "../../features/help/useHelp";
import SimpleText from "../Help/SimpleText";
import MemberShell, { EmptyState } from "./MemberShell";

/**
 * সাহায্য কেন্দ্র — মূল সাইটের `/m/helpCenter` (শুধু মোবাইলে)।
 *
 * উপরে সাদা সারিতে লেখাগুলোর শিরোনাম (১০৪ উঁচু, পাশাপাশি সরে; সক্রিয়টা
 * নীল মোটা), নিচে ২০ এর ধূসর ফাঁক, তারপর লেখা (৩২ মাপ, লাইন ৪৮,
 * #64656b)। মূল সাইটে লেখার রং সাদা হয়ে পটভূমিতে মিশে যায় — সেটা বাগ,
 * এখানে পাত্রের নিজের রঙ। লেখা admin এর "Help Center" থেকে।
 */
const HelpSection = () => {
  const { t, lang } = useLanguage();
  const { articles, loading } = useHelp("mobile");
  const [active, setActive] = useState(0);
  const tv = (v) => (lang === "en" ? v?.en || v?.bn : v?.bn || v?.en) || "";
  const current = articles[Math.min(active, articles.length - 1)];

  return (
    <MemberShell title={t.memberPage.pages.help.title}>
      {loading ? null : !current ? (
        <EmptyState />
      ) : (
        <>
          <div className="hide-scrollbar flex overflow-x-auto" style={{ height: m(104), background: "var(--member-surface, #fff)", padding: `0 ${m(20)}`, gap: m(42) }}>
            {articles.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActive(i)}
                className="shrink-0 cursor-pointer whitespace-nowrap"
                style={{ fontSize: m(34), color: i === active ? "#1e88ff" : "var(--member-text, #555)", fontWeight: i === active ? 700 : 400 }}
              >
                {tv(a.title)}
              </button>
            ))}
          </div>
          <div style={{ height: m(20), background: "#f5f7fa" }} />
          <SimpleText
            key={current.id}
            text={tv(current.body)}
            paragraphGap={m(24)}
            headingStyle={{ fontSize: m(34), color: "var(--member-title, #333)" }}
            style={{ padding: `${m(40)} ${m(20)}`, fontSize: m(32), lineHeight: m(48), color: "#64656b", background: "var(--member-surface, #fff)", wordBreak: "break-word" }}
          />
        </>
      )}
    </MemberShell>
  );
};

export default HelpSection;
