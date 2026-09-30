import React, { useState } from "react";
import { useSelector } from "react-redux";

import { useIsDesktop } from "../../hook/useIsDesktop";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { selectUser } from "../../features/auth/authSelectors";
import { tk, useReferral } from "../../features/referral/useReferral";
import MemberShell from "./MemberShell";
import { IncomePanel, InviteesPanel, MilestoneList, ProgramCard, RecordsPanel, Rules, ShareBox } from "./referral/ReferralParts";

/**
 * "বন্ধুদের আমন্ত্রণ জানান" — ডেস্কটপে মডালের ট্যাব, মোবাইলে
 * `/member/referral` (মূল সাইটের `/m/inviteFriends`)।
 *
 * পাঁচ ট্যাব, মূল সাইটের মতো:
 *   সারসংক্ষেপ — শেয়ার (QR + লিংক), আজ/গতকালের আয়, বন্ধুর সংখ্যা,
 *     "বাজি কমিশন" ব্যানার, কারা পেলেন, সাইটে কোন পুরস্কার কতজন পেলেন
 *   পুরস্কার — মোট যোগ্য বন্ধুর মাইলফলক, পৌঁছালে "দাবি করুন"
 *   আয় — আজ আর মোট, ধরন অনুযায়ী
 *   রেকর্ড — ধরন + তারিখ ধরে প্রতিটা পুরস্কার
 *   আমন্ত্রিতদের তালিকা — কে কবে এলেন, যোগ্য কিনা
 *
 * আমন্ত্রণ পুরস্কার আর জমা/বাজির কমিশন নিজে থেকেই ব্যালেন্সে যায়;
 * দাবি করতে হয় শুধু মাইলফলক।
 */

const REWARD_TYPES = ["invitation", "achievement", "deposit", "betting"];

const TILES = [
  { key: "today", bg: "linear-gradient(135deg,#7dd3fc,#38bdf8)", pick: (ov) => tk(ov.todayIncome) },
  { key: "yesterday", bg: "linear-gradient(135deg,#c4b5fd,#a78bfa)", pick: (ov) => tk(ov.yesterdayIncome) },
  { key: "members", bg: "linear-gradient(135deg,#a5b4fc,#818cf8)", pick: (ov) => ov.memberCount ?? 0 },
  { key: "qualified", bg: "linear-gradient(135deg,#7dd3fc,#38bdf8)", pick: (ov) => ov.qualifiedCount ?? 0 },
];

/** বন্ধ/অ্যাফিলিয়েট — লেখা দেখানো */
const Notice = ({ text, style }) => (
  <div className="flex flex-1 items-center justify-center text-center" style={{ color: "var(--member-muted, #999)", ...style }}>
    {text}
  </div>
);

/* ─────────────────── ডেস্কটপ (মডালের ভিতরে) ─────────────────── */

/**
 * সারসংক্ষেপ — মূল সাইট থেকে মাপা দুই কলাম:
 *   বাঁয়ে (~৬২০): কালচে-বেগুনি কমিশন ব্যানার (দুপাশে স্লট মেশিন, মাঝে
 *     লোগো, ৳ ৭,৫০০.০০), গোলাপি-নীল কার্ডে "যারা পুরস্কার পেয়েছেন",
 *     তারপর "এখন পর্যন্ত প্রাপ্ত পুরস্কার" — চারটে কার্ড
 *   ডানে (~৪৩০): ২×২ পরিসংখ্যান টাইল, "এজেন্ট ৪ সুপার কমিশন", শেয়ার বাক্স
 */
const DeskOverview = ({ data }) => {
  const { t } = useLanguage();
  const page = t.member.desk.referral;
  const r = t.referralFlow;
  const ov = data.overview || {};
  const setting = data.setting || {};

  return (
    <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "10px 25px 20px" }}>
      <div className="flex" style={{ gap: 20 }}>
        {/* বাঁ (৬১৮) — কমিশন ব্যানার, কারা পুরস্কার পেয়েছেন */}
        <div style={{ width: 618, flexShrink: 0 }}>
          <div className="relative flex items-center overflow-hidden" style={{ height: 152, borderRadius: 10, background: "linear-gradient(90deg,#1e0b3c,#3a1670 50%,#1e0b3c)", padding: "0 26px", gap: 22 }}>
            <img src="/assets/referral/slot-side.png" alt="" style={{ position: "absolute", left: 0, top: 0, height: "100%", opacity: 0.6 }} />
            <img src="/assets/referral/slot-side.png" alt="" style={{ position: "absolute", right: 0, top: 0, height: "100%", opacity: 0.6, transform: "scaleX(-1)" }} />
            <span className="relative" style={{ fontSize: 26, fontWeight: 700, fontStyle: "italic", color: "#fff", marginLeft: 60, width: 180 }}>
              {page.commission}
            </span>
            <img src="/assets/referral/logo-coin.png" alt="" className="relative" style={{ width: 88, height: 88, objectFit: "contain" }} />
            <div className="relative">
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fbbf24" }}>{tk(setting.estimatePerInvitee)}</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 700, marginTop: 8 }}>{page.commission}</div>
            </div>
          </div>

          <div style={{ marginTop: 10, height: 248, borderRadius: 10, background: "linear-gradient(90deg,#cfe6ff,#e6c9f3)", padding: "22px 10px 10px" }}>
            <div style={{ fontSize: 24, color: "#2b2e83", fontWeight: 700, marginBottom: 8, paddingLeft: 0 }}>{page.winnersTitle}</div>
            <div className="hide-scrollbar" style={{ height: 170, overflowY: "auto" }}>
              {(data.winners || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--member-muted, #888)", padding: "8px 4px" }}>{r.noWinners}</div>
              ) : (
                data.winners.map((w, i) => (
                  <div key={i} className="flex items-center" style={{ height: 34, borderRadius: 17, background: "linear-gradient(180deg,#f4f6f9,#dfe5ec)", marginBottom: 10, fontSize: 14, color: "#444" }}>
                    <span style={{ flex: 1, textAlign: "center" }}>{w.user}</span>
                    <span style={{ flex: 1, textAlign: "center" }}>{page.received}</span>
                    <span style={{ flex: 1, textAlign: "center", fontWeight: 600 }}>{tk(w.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ডান (৪২০) — ২×২ টাইল, এজেন্ট লিংক, শেয়ার */}
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {TILES.map((tile) => (
              <div key={tile.key} className="flex flex-col items-center justify-center" style={{ height: 100, background: tile.bg, borderRadius: 10, color: "#fff" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{page.stats[tile.key]}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{tile.pick(ov)}</div>
              </div>
            ))}
          </div>

          <AgentLink href={setting.agentLink} style={{ marginTop: 40, fontSize: 15, fontWeight: 700, color: "var(--member-title, #333)" }} dot={18} />

          <div style={{ marginTop: "auto" }}>
            <ShareBox code={data.referralCode} domain={setting.inviteDomain} title={page.shareTitle} />
          </div>
        </div>
      </div>

      {/* নিচে পুরো চওড়ায় — এখন পর্যন্ত প্রাপ্ত পুরস্কার, তারপর নিয়ম */}
      <div style={{ marginTop: 10, borderRadius: 8, background: "linear-gradient(180deg,#f4f6fb,#e4e9f1)", padding: "12px 10px" }}>
        <div style={{ fontSize: 22, color: "#2b2e83", fontWeight: 700 }}>{page.rewardTitle}</div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {REWARD_TYPES.map((key) => (
            <div key={key} className="flex items-center" style={{ background: "var(--member-surface, #fff)", borderRadius: 8, padding: 10, gap: 8 }}>
              <img src={`/assets/referral/reward-${key}.png`} alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--member-text, #666)" }}>{r.types[key]}</div>
                <div className="truncate" style={{ fontSize: 14, color: "#4c1d95", fontWeight: 700, marginTop: 3 }}>{tk(data.site?.[key]?.amount)}</div>
                <div style={{ fontSize: 11, color: "var(--member-muted, #999)", marginTop: 2 }}>{r.claimedCount.replace("{n}", data.site?.[key]?.members ?? 0)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Rules setting={setting} />
    </div>
  );
};

/** "এজেন্ট ৪ সুপার কমিশন" — admin লিংক দিলে তবেই চাপা যায় */
const AgentLink = ({ href, style, dot }) => {
  const { t } = useLanguage();
  const body = (
    <>
      <span className="grid place-items-center" style={{ width: dot, height: dot, borderRadius: "50%", background: "var(--member-accent, #e8474c)", color: "#fff", fontSize: dot * 0.6 }}>
        ›
      </span>
      {t.referralFlow.agentLink}
    </>
  );
  const common = { className: "flex items-center justify-center", style: { gap: 8, color: "#4c1d95", ...style } };
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" {...common}>
      {body}
    </a>
  ) : (
    <div {...common}>{body}</div>
  );
};

const Desktop = () => {
  const { t } = useLanguage();
  const user = useSelector(selectUser);
  const page = t.member.desk.referral;
  const r = t.referralFlow;
  const [tab, setTab] = useState(0);
  const ref = useReferral();
  const data = ref.data;
  const off = data && !data.setting?.isActive;

  let body;
  if (ref.error) body = <Notice text={ref.error} style={{ fontSize: 14 }} />;
  else if (!data) body = <Notice text={r.loading} style={{ fontSize: 13 }} />;
  else if (tab === 0) body = <DeskOverview data={data} />;
  else
    body = (
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
        {tab === 1 && (
          <>
            <ProgramCard setting={data.setting} />
            <MilestoneList milestones={data.milestones} busy={ref.busy} onClaim={ref.claim} />
          </>
        )}
        {tab === 2 && <IncomePanel data={data} />}
        {tab === 3 && <RecordsPanel />}
        {tab === 4 && <InviteesPanel vipName={`VIP${user?.vipLevel ?? 0}`} />}
      </div>
    );

  return (
    <div className="flex flex-col" style={{ width: 1110, height: 620, background: "var(--member-surface, #fff)" }}>
      <div className="flex items-center" style={{ height: 47, borderBottom: "1px solid var(--member-line, #eee)", padding: "0 60px 0 30px", gap: 20 }}>
        {page.tabs.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(index)}
            className="relative h-full cursor-pointer"
            style={{ padding: "0 10px", fontSize: 14, color: index === tab ? "var(--member-accent, #fd2f2f)" : "var(--member-text, #666)" }}
          >
            {label}
            {index === tab && <span className="absolute bottom-0 left-0 right-0" style={{ height: 3, background: "var(--member-accent, #fd2f2f)" }} />}
          </button>
        ))}
        {off ? <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--member-accent, #e8474c)" }}>{r.off}</span> : null}
      </div>
      {body}
    </div>
  );
};

/* ─────────────────── মোবাইল (আলাদা পেজ) ─────────────────── */

/**
 * মূল সাইটের `/m/inviteFriends` — উপরে পাঁচটা ট্যাব; সারসংক্ষেপে:
 *   ধূসর কার্ডে QR ("কোড সংরক্ষণ") + লিংকের সাদা পিল + সাতটা সোশ্যাল বোতাম
 *   চারটে গ্রেডিয়েন্ট টাইল, কালো "বাজি কমিশন" ব্যানার,
 *   "প্রাপ্ত পুরস্কার" — চারটে হালকা নীল কার্ড, "এজেন্ট ৪ সুপার কমিশন",
 *   শেষে কারা পুরস্কার পেলেন
 */
const MobOverview = ({ data }) => {
  const { t } = useLanguage();
  const page = t.memberPage.pages.referral;
  const desk = t.member.desk.referral;
  const r = t.referralFlow;
  const ov = data.overview || {};
  const setting = data.setting || {};

  return (
    <div style={{ background: "var(--member-surface, #fff)", padding: `${m(24)} ${m(24)} ${m(60)}` }}>
      <ShareBox code={data.referralCode} domain={setting.inviteDomain} title={page.shareTitle} />

      <div style={{ marginTop: m(20), display: "grid", gridTemplateColumns: "1fr 1fr", gap: m(16) }}>
        {TILES.map((tile) => (
          <div key={tile.key} className="flex flex-col items-center justify-center" style={{ height: m(110), background: tile.bg, borderRadius: m(12), color: "#fff" }}>
            <div style={{ fontSize: m(24), fontWeight: 700 }}>{page.stats[tile.key]}</div>
            <div style={{ fontSize: m(38), fontWeight: 700, marginTop: m(4) }}>{tile.pick(ov)}</div>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden" style={{ marginTop: m(20), height: m(377), borderRadius: m(10), background: "linear-gradient(90deg,#140a2a,#2d1656 50%,#140a2a)" }}>
        <img src="/assets/referral/slot-side.png" alt="" className="absolute" style={{ right: 0, bottom: 0, height: "70%", opacity: 0.45, transform: "scaleX(-1)" }} />
        <div className="relative flex items-center" style={{ padding: `${m(24)} ${m(30)} 0`, gap: m(40) }}>
          <img src="/assets/referral/logo-coin.png" alt="" style={{ width: m(172), height: m(172), objectFit: "contain", flexShrink: 0 }} />
          <div style={{ fontSize: m(56), color: "#fff", fontWeight: 700 }}>{page.commission}</div>
        </div>
        <div className="relative text-center" style={{ marginTop: m(22), paddingLeft: m(120) }}>
          <div style={{ fontSize: m(50), color: "#fbbf24", fontWeight: 700 }}>{tk(setting.estimatePerInvitee)}</div>
          <div style={{ fontSize: m(24), color: "#fff", fontWeight: 700, marginTop: m(16) }}>{page.commission}</div>
        </div>
      </div>

      <div className="text-center" style={{ fontSize: m(42), fontWeight: 700, color: "var(--member-title, #222)", margin: `${m(20)} 0 ${m(20)}` }}>{page.rewardTitle}</div>
      {REWARD_TYPES.map((key) => (
        <div key={key} className="flex items-center" style={{ height: m(186), background: "linear-gradient(180deg,#f4f6fb,#e6ebf4)", borderRadius: m(10), padding: `0 ${m(20)}`, gap: m(24), marginBottom: m(22) }}>
          <img src={`/assets/referral/reward-${key}.png`} alt="" style={{ width: m(170), height: m(170), objectFit: "contain", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: m(34), color: "#444" }}>{r.types[key]}</div>
            <div style={{ fontSize: m(44), color: "#35287f", fontWeight: 700, marginTop: m(4) }}>{tk(data.site?.[key]?.amount)}</div>
            <div style={{ fontSize: m(26), color: "var(--member-text, #555)", marginTop: m(2) }}>{r.claimedCount.replace("{n}", data.site?.[key]?.members ?? 0)}</div>
          </div>
        </div>
      ))}

      <AgentLink href={setting.agentLink} style={{ margin: `${m(20)} 0`, fontSize: m(28) }} dot={16} />

      <div style={{ borderRadius: m(16), background: "linear-gradient(135deg,#f3e8ff,#dbeafe)", padding: m(26) }}>
        <div style={{ fontSize: m(32), color: "#2b2e83", fontWeight: 700, marginBottom: m(18) }}>{desk.winnersTitle}</div>
        {(data.winners || []).length === 0 ? (
          <div style={{ fontSize: m(26), color: "var(--member-muted, #888)" }}>{r.noWinners}</div>
        ) : (
          data.winners.map((w, i) => (
            <div key={i} className="flex items-center" style={{ height: m(68), borderRadius: m(34), background: "rgb(255 255 255 / 0.8)", marginBottom: m(14), fontSize: m(26), color: "#444" }}>
              <span style={{ flex: 1, textAlign: "center" }}>{w.user}</span>
              <span style={{ flex: 1, textAlign: "center" }}>{desk.received}</span>
              <span style={{ flex: 1, textAlign: "center" }}>{tk(w.amount)}</span>
            </div>
          ))
        )}
      </div>

      <Rules setting={setting} />
    </div>
  );
};

const Mobile = () => {
  const { t } = useLanguage();
  const user = useSelector(selectUser);
  const page = t.memberPage.pages.referral;
  const r = t.referralFlow;
  const [tab, setTab] = useState(0);
  const ref = useReferral();
  const data = ref.data;

  let body;
  if (ref.error) body = <Notice text={ref.error} style={{ fontSize: m(30), padding: `${m(200)} ${m(40)}` }} />;
  else if (!data) body = <Notice text={r.loading} style={{ fontSize: m(28), padding: `${m(200)} 0` }} />;
  else if (tab === 0) body = <MobOverview data={data} />;
  else
    body = (
      <div style={{ background: "var(--member-surface, #fff)", padding: `${m(24)} ${m(24)} ${m(60)}`, minHeight: "60vh" }}>
        {tab === 1 && (
          <>
            <ProgramCard setting={data.setting} />
            <MilestoneList milestones={data.milestones} busy={ref.busy} onClaim={ref.claim} />
          </>
        )}
        {tab === 2 && <IncomePanel data={data} />}
        {tab === 3 && <RecordsPanel />}
        {tab === 4 && <InviteesPanel vipName={`VIP${user?.vipLevel ?? 0}`} />}
      </div>
    );

  return (
    <MemberShell title={page.title}>
      <div className="hide-scrollbar flex overflow-x-auto" style={{ background: "var(--member-surface, #fff)", height: m(110) }}>
        {page.tabs.map((item, index) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(index)}
            className="relative shrink-0 cursor-pointer"
            style={{ padding: `0 ${m(34)}`, color: index === tab ? "var(--member-link, #1e9bf0)" : "var(--member-title, #333)", fontSize: m(32) }}
          >
            {item}
            {index === tab && <span className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: "80%", height: m(6), background: "var(--member-link, #1e9bf0)" }} />}
          </button>
        ))}
      </div>
      {data && !data.setting?.isActive ? (
        <div className="text-center" style={{ background: "#fff5f5", color: "var(--member-accent, #e60012)", fontSize: m(26), padding: m(16) }}>{r.off}</div>
      ) : null}
      {body}
    </MemberShell>
  );
};

const ReferralSection = (props) => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <Desktop {...props} /> : <Mobile {...props} />;
};

export default ReferralSection;
