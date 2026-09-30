import React from "react";
import { useSelector } from "react-redux";

import { useLanguage } from "../../../Context/LanguageProvider";
import { selectUser } from "../../../features/auth/authSelectors";
import { useSignIn } from "../../../features/reward/useRewards";
import MemberShell from "../MemberShell";
import { IMG, money, useTicketPopups, useTv, useZ } from "./RewardParts";

/**
 * "সাইন ইন" — মূল সাইটের `/m/activity/signIn`।
 *
 * কমলা পটভূমিতে অবতার ও ব্যালেন্স, তার উপরে সাদা কার্ডে "চেক-ইন দিন" আর
 * "সাইন ইন মোট পুরস্কার"; তারপর আজকের অবস্থা আর শর্ত (জমা / বাজি), দিনের
 * কার্ড (নীল মাথা, চাকার ছবি, নাম, বোতাম), শেষে নিয়ম। সাইন-ইন হলে
 * সেদিনের টিকিট সাথে সাথে খোলার পপআপ আসে।
 *
 * ডেস্কটপের "সাইন-ইন কাজ" এও এটাই (`embedded`) — তখন হেডার ছাড়া।
 */
export const SignInBody = ({ onGo }) => {
  const { t } = useLanguage();
  const rf = t.rewardFlow;
  const tv = useTv();
  const z = useZ();
  const user = useSelector(selectUser);
  const { data, loading, reload } = useSignIn();
  const popups = useTicketPopups({ reload, onGo });

  const sign = async () => {
    const res = await popups.actions.signIn();
    if (res?.ticket) popups.open(res.ticket);
  };

  if (loading || !data) return <div style={{ minHeight: z(600) }} />;

  return (
    <div style={{ background: "var(--member-page-bg, #f5f5f9)", paddingBottom: z(40) }}>
      {/* মাথা */}
      <div className="relative" style={{ height: z(330), background: `url(${IMG}/signin-bg.png) center / cover` }}>
        <div className="absolute flex items-center" style={{ top: "50%", transform: "translateY(-68%)", paddingLeft: z(50), gap: z(30) }}>
          <img src={user?.avatar || "/assets/mobile/avatar.png"} alt="" style={{ width: z(138), height: z(138), borderRadius: "50%", border: `${z(6)} solid #fff`, objectFit: "cover", background: "var(--member-surface, #fff)" }} />
          <div style={{ color: "#fff" }}>
            <p style={{ fontSize: z(26), fontWeight: 700 }}>{user?.username}</p>
            <p style={{ fontSize: z(42), fontWeight: 700, marginTop: z(8) }}>৳ {money(user?.balance)}</p>
          </div>
        </div>
      </div>

      {/* দুই সংখ্যা */}
      <div className="relative flex" style={{ width: "94%", margin: `${z(-60)} auto 0`, background: "var(--member-surface, #fff)", borderRadius: z(25), padding: z(20) }}>
        {[
          [data.streak, rf.checkinDays, "#2476ff"],
          [money(data.totalReward), rf.signinTotal, "var(--member-accent, #f32246)"],
        ].map(([value, label, color], i) => (
          <div key={label} className="flex-1 text-center" style={{ borderRight: i ? "none" : "1px solid #b3b3b3", padding: `${z(10)} 0` }}>
            <div style={{ color, fontSize: z(40), fontWeight: 700 }}>{value}</div>
            <div style={{ color: "var(--member-muted, #999)", fontSize: z(24), marginTop: z(12) }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="truncate" style={{ color: "#2476ff", fontSize: z(28), padding: `${z(30)} ${z(20)} ${z(16)}` }}>
        {tv(data.title)}
      </div>

      {/* আজকের অবস্থা ও শর্ত */}
      <div className="flex flex-col" style={{ background: "var(--member-surface, #fff)", padding: `${z(26)} ${z(40)}` }}>
        <div className="flex items-center" style={{ gap: z(20) }}>
          <span className="shrink-0" style={{ width: z(82), height: z(72), background: `url(${IMG}/gift.png) center / contain no-repeat` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--member-accent, #f32246)", fontSize: z(30), fontWeight: 700, lineHeight: 1.4 }}>{tv(data.title)}</div>
            <div style={{ color: data.claimedToday ? "#2476ff" : "#8e0019", fontSize: z(24), fontWeight: 700, marginTop: z(6) }}>
              {data.claimedToday ? rf.signedToday : rf.notSignedToday}
            </div>
          </div>
        </div>
        <div className="flex" style={{ marginTop: z(15), background: "#fff8f1", borderRadius: z(20), padding: `0 ${z(25)}` }}>
          {[
            [rf.depositReq, data.depositReq, data.today.deposit],
            [rf.betReq, data.betReq, data.today.bet],
          ].map(([label, need, have]) => (
            <div key={label} className="flex flex-col" style={{ flex: "0 0 50%", padding: `${z(21)} 0` }}>
              <span style={{ color: "#6f6f6f", fontSize: z(26) }}>{label}</span>
              <span style={{ color: "var(--member-accent, #f32246)", fontSize: z(26), marginTop: z(8) }}>৳ {money(need)}</span>
              <span style={{ color: have >= need ? "#30a300" : "var(--member-muted, #999)", fontSize: z(22), marginTop: z(6) }}>
                {rf.today} ৳ {money(have)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* দিনের কার্ড */}
      <ul className="flex flex-wrap" style={{ background: "var(--member-surface, #fff)", marginTop: z(14), padding: `${z(10)} ${z(13)}` }}>
        {data.days.map((day) => {
          const today = day.state === "today";
          const done = day.state === "claimed";
          return (
            <li key={day.dayNo} style={{ flex: "0 0 33.33%", padding: `${z(20)} ${z(7)}` }}>
              <div className="flex h-full flex-col items-center overflow-hidden" style={{ border: `${z(3)} solid #cfe3ff`, borderRadius: z(14), background: "radial-gradient(circle at 50% 38%,#fff3c4 0%,#fffaf0 55%,var(--member-surface, #fff) 100%)" }}>
                <div className="w-full text-center" style={{ background: "linear-gradient(180deg,#4a95ff,#2b77f5)", color: "#fff", fontSize: z(26), padding: `${z(6)} 0`, borderRadius: `${z(10)} ${z(10)} 0 0` }}>
                  {rf.day} {day.dayNo}
                </div>
                <span style={{ width: z(110), height: z(110), marginTop: z(18), background: `url(${IMG}/${day.kind === "redPacket" ? "item-r" : day.kind === "temu" ? "item-temu" : "item-w"}.png) center / contain no-repeat` }} />
                <span className="w-full" style={{ color: "var(--member-text, #666)", fontSize: z(22), fontWeight: 700, lineHeight: 1.35, padding: `${z(14)} ${z(12)} 0`, minHeight: z(80) }}>
                  {tv(day.name)}
                </span>
                <button
                  type="button"
                  disabled={!today || popups.actions.busy}
                  onClick={sign}
                  className="cursor-pointer"
                  style={{ width: "86%", margin: `${z(10)} 0 ${z(16)}`, minHeight: z(46), borderRadius: z(40), fontSize: z(26), color: "#fff", background: today ? "linear-gradient(90deg,#f8493f,#fd603f)" : "#cecece" }}
                >
                  {done ? rf.signedShort : rf.signIn}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* নিয়ম */}
      {tv(data.rules) && (
        <div style={{ background: "var(--member-surface, #fff)", marginTop: z(14), padding: z(20) }}>
          <div style={{ color: "#f94b3f", fontSize: z(28), fontWeight: 700, marginBottom: z(20) }}>{rf.rules}</div>
          <p style={{ color: "var(--member-title, #333)", fontSize: z(26), lineHeight: 1.45, whiteSpace: "pre-line" }}>{tv(data.rules)}</p>
        </div>
      )}
      {popups.popup}
    </div>
  );
};

const SignInPage = () => {
  const { t } = useLanguage();
  return (
    <MemberShell title={t.rewardFlow.signIn}>
      <SignInBody />
    </MemberShell>
  );
};

export default SignInPage;
