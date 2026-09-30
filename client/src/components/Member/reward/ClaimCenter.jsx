import React from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router";

import { useLanguage } from "../../../Context/LanguageProvider";
import { m } from "../../../hook/useUnits";
import { selectUser } from "../../../features/auth/authSelectors";
import { useTickets } from "../../../features/reward/useRewards";
import MemberShell, { EmptyState } from "../MemberShell";
import { IMG, TicketCard, money, useTicketPopups } from "./RewardParts";

/**
 * "দাবি করা" — মূল সাইটের `/m/receivingCenter`।
 *
 * উপরে নীল ঢেউয়ের পটভূমিতে (৩৩০ উঁচু) অবতার আর ব্যালেন্স, নিচে টিকিটের
 * সারি। হেডারের ডানের টিকিট-আইকন দাবি হয়ে যাওয়া/মেয়াদ পেরোনো টিকিটের
 * রেকর্ড (`?tab=history`) খোলে।
 */
const ClaimCenter = () => {
  const { t } = useLanguage();
  const rf = t.rewardFlow;
  const user = useSelector(selectUser);
  const [params, setParams] = useSearchParams();
  const history = params.get("tab") === "history";
  const { tickets, loading, reload } = useTickets(history ? "history" : "available");
  const popups = useTicketPopups({ reload });

  return (
    <MemberShell
      title={history ? rf.records : t.memberPage.pages.reward.tiles.claim}
      right={
        <button type="button" aria-label={rf.records} onClick={() => setParams(history ? {} : { tab: "history" })} className="cursor-pointer" style={{ width: m(79), height: m(51) }}>
          {/* টিকিট আকৃতি — দুই পাশে খাঁজ, ভিতরে ছোট ছক (মূল সাইটের আইকনের মতো) */}
          <svg viewBox="0 0 40 26" style={{ width: "100%", height: "100%", opacity: history ? 0.6 : 1 }} aria-hidden="true">
            <path d="M3 1h34a2 2 0 0 1 2 2v6a4 4 0 0 0 0 8v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-6a4 4 0 0 0 0-8V3a2 2 0 0 1 2-2z" fill="#fff" />
            {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={12 + c * 4.5} y={7 + r * 4.5} width="3" height="3" rx=".6" fill="#180836" />))}
          </svg>
        </button>
      }
    >
      <div style={{ background: "var(--member-page-bg, #f5f5f9)", minHeight: "calc(100vh - 1rem)" }}>
        <div style={{ height: m(330), background: `url(${IMG}/mall-bg.jpg) center / cover`, overflow: "hidden" }}>
          <img
            src={user?.avatar || "/assets/mobile/avatar.png"}
            alt=""
            style={{ float: "left", width: m(150), height: m(150), margin: `${m(24)} 0 0 ${m(60)}`, borderRadius: "50%", border: `${m(10)} solid #9fd2f9`, objectFit: "cover", background: "var(--member-surface, #fff)" }}
          />
          <div style={{ float: "left", margin: `${m(30)} 0 0 ${m(30)}`, color: "#fff" }}>
            <p style={{ fontSize: m(26), fontWeight: 700, padding: `${m(5)} 0` }}>{user?.userId || user?.username}</p>
            <p style={{ fontSize: m(42), fontWeight: 700 }}>৳ {money(user?.balance)}</p>
          </div>
        </div>

        <div style={{ paddingTop: m(20) }}>
          {loading ? null : tickets.length ? (
            tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} history={history} onClaim={popups.open} onInfo={popups.info} />)
          ) : (
            <div style={{ background: "var(--member-surface, #fff)" }}>
              <EmptyState />
            </div>
          )}
        </div>
      </div>
      {popups.popup}
    </MemberShell>
  );
};

export default ClaimCenter;
