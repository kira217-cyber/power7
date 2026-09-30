import React from "react";

import { useLanguage } from "../../../Context/LanguageProvider";
import { slashDateTime, useTemuHistory } from "../../../features/reward/useRewards";
import MemberShell from "../MemberShell";
import { IMG, money, useTv, useZ } from "./RewardParts";

/**
 * "TEMU টিকিট ইতিহাস" — মূল সাইটের `/m/temuTicket`।
 *
 * কমলা আলোর মঞ্চে ঝলমলে সিন্দুক (৪২৪), নিচে "মোট দাবিকৃত পরিমাণ"; তারপর
 * সাদা তালিকায় প্রতিটা ঘটনা — তারিখ, টিকিটের নাম, শর্ত, যোগ করা পরিমাণ।
 * ডেস্কটপের "টেমু টিকিট" এও এটাই (`TemuHistoryBody`)।
 */
export const TemuHistoryBody = () => {
  const { t } = useLanguage();
  const rf = t.rewardFlow;
  const tv = useTv();
  const z = useZ();
  const { data } = useTemuHistory();
  const list = data?.list || [];
  const [whole, cents] = money(data?.claimed).split(".");

  return (
    <div style={{ minHeight: "calc(100vh - 1rem)", background: `url(${IMG}/temu-history-bg.png) center top / 100% auto no-repeat #ffe9c4`, paddingBottom: z(45) }}>
      <div className="relative flex flex-col items-center overflow-hidden" style={{ height: z(530) }}>
        <div className="absolute inset-0" style={{ background: `url(${IMG}/temu-amount-bg.png) center bottom / cover no-repeat` }} />
        <div className="relative" style={{ marginTop: z(-33) }}>
          <img src={`${IMG}/temu-history-box-bg.gif`} alt="" className="absolute left-0 top-0" style={{ width: z(424), zIndex: 1 }} />
          <img src={`${IMG}/temu-history-box.gif`} alt="" className="relative" style={{ width: z(424), zIndex: 2 }} />
        </div>
        <div className="absolute flex flex-col items-center text-center" style={{ bottom: z(55), width: "50%", zIndex: 1 }}>
          <span className="w-full truncate" style={{ color: "#ffe9c3", fontWeight: 600, fontSize: z(30), lineHeight: 1.5 }}>
            {rf.totalClaimed}
          </span>
          <span className="flex items-end" style={{ color: "#fff9f0", fontSize: z(64), fontWeight: 700, lineHeight: z(74) }}>
            <span style={{ fontSize: z(42), marginRight: z(14) }}>৳</span>
            {whole}
            <span style={{ fontSize: z(42) }}>.{cents}</span>
          </span>
        </div>
      </div>

      <ul className="flex flex-col" style={{ width: `calc(100% - ${z(90)})`, margin: "0 auto", background: "var(--member-surface, #fff)", borderRadius: z(15), color: "#826849", fontSize: z(24), fontWeight: 600, minHeight: z(600), overflow: "hidden" }}>
        {list.length === 0 && <li style={{ padding: z(60), textAlign: "center", color: "#b8a06c" }}>{rf.noHistory}</li>}
        {list.map((row, i) => (
          <li key={`${row.at}-${i}`} className="flex flex-col" style={{ padding: z(20), gap: z(12), background: i % 2 ? "rgba(255,227,181,.2)" : "transparent" }}>
            {[
              [rf.date, slashDateTime(row.at)],
              [rf.ticketName, tv(row.ticketName)],
              [rf.condition, rf.conditions[row.condition] || row.condition],
              [rf.added, `+${money(row.score)}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between" style={{ gap: z(10) }}>
                <span style={{ width: "40%", color: "#b8a06c" }}>{label}</span>
                <span className="flex flex-1 justify-end text-right" style={{ wordBreak: "break-word" }}>
                  {value}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
};

const TemuHistory = () => {
  const { t } = useLanguage();
  return (
    <MemberShell title={t.rewardFlow.temuHistory}>
      <TemuHistoryBody />
    </MemberShell>
  );
};

export default TemuHistory;
