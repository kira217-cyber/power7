import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  BadgeCheck,
  BanknoteArrowDown,
  ChartPie,
  Coins,
  Copy,
  Dices,
  Gamepad2,
  HandCoins,
  LayoutDashboard,
  Percent,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { Loading } from "../../components/Panel/Panel";
import { Avatar, Badge, Blank, Glass, Hero, Metric, StackBar, Title } from "../../components/Panel/Pro";
import { HEROES, PARTS, TONES } from "../../components/Panel/tones";
import { day, money, referralLink } from "../../components/Panel/panelFormat";
import { useLanguage } from "../../Context/LanguageProvider";
import { fetchAffiliate, fetchMyUsers } from "../../features/affiliate/affiliateApi";
import { notify } from "../../utils/notify";

const TONE = TONES.dashboard;

/** কমিশনের চার ভাগের রঙ — ভাগ-বার, তালিকা আর হারের টাইলে একই */
const PART = PARTS;

/**
 * অ্যাফিলিয়েটের প্রথম পাতা — "কন্ট্রোল রুম"।
 *
 * উপরে সোনালি ব্যানার: নাম, হাতে কত, আর **RGB বর্ডারের রেফারেল কার্ড**
 * (QR + লিংক) — লগইন করে সবার আগে এগুলোই খোঁজা হয়। তারপর চার রঙের চারটা
 * সংখ্যা, কমিশন কোন ভাগ থেকে এল তার ভাগ-বার, হারের টাইল, খেলার হিসাব আর
 * নতুন খেলোয়াড়েরা।
 *
 * কমিশনের শেষ হিসাব = (রেফার + ডিপোজিট + খেলোয়াড়ের হার) − খেলোয়াড়ের
 * জেতা; জেতার ভাগ বাদ যায় বলে ঋণাত্মকও হতে পারে।
 */
const Dashboard = () => {
  const { t } = useLanguage();

  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;

    Promise.all([fetchAffiliate(), fetchMyUsers({ page: 1, limit: 5 }).catch(() => ({ rows: [] }))])
      .then(([next, players]) => {
        if (!alive) return;
        setData(next);
        setRecent(players.rows || []);
      })
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <Loading label={t("loading")} />;
  if (!data) return <Glass className="p-5">{t("somethingWrong")}</Glass>;

  const { commission, players, games } = data;
  const link = referralLink(data.referralCode);
  const net = Number(commission.net) || 0;
  const netTone = net >= 0 ? TONES.success : TONES.danger;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      notify.success(t("copied"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ক্লিপবোর্ড বন্ধ থাকলে লিংকটা পর্দাতেই দেখা যাচ্ছে
    }
  };

  // ফোনে সিস্টেমের শেয়ার শিট, না থাকলে কপি
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t("brand"), url: link });
      } catch {
        // বাতিল করলে কিছু নয়
      }
      return;
    }
    await copy();
  };

  const b = commission.balances;
  const parts = [
    { key: "refer", label: t("cmRefer"), value: b.refer, tone: PART.refer, Icon: UserPlus },
    { key: "deposit", label: t("cmDeposit"), value: b.deposit, tone: PART.deposit, Icon: Wallet },
    { key: "gameLoss", label: t("cmGameLoss"), value: b.gameLoss, tone: PART.gameLoss, Icon: TrendingUp },
    { key: "gameWin", label: t("cmGameWin"), value: b.gameWin, tone: PART.gameWin, Icon: TrendingDown, minus: true },
  ];

  const r = commission.rates;
  const rates = [
    { label: t("cmRefer"), value: money(r.refer), hint: t("statPerInvite"), tone: PART.refer, Icon: UserPlus },
    { label: t("cmDeposit"), value: `${r.deposit}%`, tone: PART.deposit, Icon: Wallet },
    { label: t("cmGameLoss"), value: `${r.gameLoss}%`, tone: PART.gameLoss, Icon: TrendingUp },
    { label: t("cmGameWin"), value: `${r.gameWin}%`, tone: PART.gameWin, Icon: TrendingDown },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── ব্যানার ── */}
      <Hero
        tone={TONE}
        heroBg={HEROES.dashboard}
        Icon={LayoutDashboard}
        eyebrow={t("welcomeBack")}
        title={
          <>
            {data.user?.userId}
            {data.user?.verificationStatus === "approved" ? (
              <span title={t("verifiedBadge")} aria-label={t("verifiedBadge")} className="flex text-[var(--status-success)]">
                <BadgeCheck size={22} />
              </span>
            ) : null}
          </>
        }
        subtitle={t("dashSubtitle")}
        aside={
          <Glass rgb glow className="w-full shrink-0 p-4 lg:w-[310px]" style={{ background: "rgb(6 3 22 / 0.92)" }}>
            <p className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--text-muted)]">
              <Sparkles size={13} style={{ color: TONE }} />
              {t("scanToJoin")}
            </p>
            <div className="mt-3 flex justify-center">
              <span className="flex h-[132px] w-[132px] items-center justify-center rounded-[14px] bg-white p-2 shadow-[0_10px_30px_-12px_rgb(251_208_41_/_0.6)]">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(link)}`}
                  alt={data.referralCode}
                  className="h-full w-full object-contain"
                  draggable="false"
                />
              </span>
            </div>
            <p className="mt-3 text-center text-[24px] font-black tracking-[0.22em]" style={{ color: TONE }}>
              {data.referralCode}
            </p>
            <p className="mt-2 break-all rounded-[10px] border border-white/[0.06] bg-white/[0.04] p-2.5 text-center text-[11px] text-[var(--text-secondary)]">
              {link}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={copy} className="pbtn pbtn--solid pbtn--sm" style={{ "--tone": TONE }}>
                <Copy size={14} />
                {copied ? t("copied") : t("copyLink")}
              </button>
              <button type="button" onClick={share} className="pbtn pbtn--soft pbtn--sm" style={{ "--tone": TONE }}>
                <Share2 size={14} />
                {t("shareLink")}
              </button>
            </div>
          </Glass>
        }
      >
        <div className="mt-6 flex flex-wrap items-end gap-8">
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-disabled)]">{t("availableBalance")}</p>
            <p className="text-[36px] font-black leading-tight lg:text-[44px]" style={{ color: TONE, textShadow: `0 0 28px color-mix(in srgb, ${TONE}, transparent 67%)` }}>
              {money(data.user?.balance)}
            </p>
          </div>
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
            <p className="text-[11px] font-semibold text-[var(--text-disabled)]">{t("cmNet")}</p>
            <p className="text-[20px] font-black leading-tight" style={{ color: netTone }}>
              {money(net)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-[var(--text-disabled)]">{t("affBalanceText")}</p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link to="/dashboard/withdraw" className="pbtn pbtn--solid" style={{ "--tone": TONE }}>
            <BanknoteArrowDown size={16} />
            {t("navWithdraw")}
          </Link>
          <Link to="/dashboard/my-users" className="pbtn pbtn--soft" style={{ "--tone": TONES.users }}>
            <Users size={16} />
            {t("navMyUsers")}
          </Link>
          <Link to="/dashboard/commission" className="pbtn pbtn--soft" style={{ "--tone": TONES.commission }}>
            <Percent size={16} />
            {t("navCommissionStatus")}
          </Link>
        </div>
      </Hero>

      {/* ── চার রঙের চারটা সংখ্যা ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric tone={TONES.users} Icon={Users} label={t("statTotalPlayers")} value={players.total} sub={`${t("statActive")}: ${players.active}`} />
        <Metric tone={TONES.verify} Icon={UserCheck} label={t("statThisMonth")} value={players.joinedThisMonth} sub={t("statNewPlayers")} />
        <Metric
          tone={TONES.withdraw}
          Icon={Wallet}
          label={t("statPlayerDeposit")}
          value={money(players.depositTotal)}
          valueTone={TONES.withdraw}
          sub={`${players.depositCount} ${t("statDeposits")}`}
        />
        <Metric
          tone={TONES.commission}
          Icon={Coins}
          label={t("statNetCommission")}
          value={money(net)}
          valueTone={netTone}
          sub={net >= 0 ? t("statPayable") : t("statOwed")}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        {/* ── কমিশন কোথা থেকে জমছে — ভাগ-বার ── */}
        <Glass tone={TONE} className="p-5">
          <Title tone={TONES.commission} Icon={ChartPie} title={t("commissionBalances")} subtitle={t("commissionBalancesText")} />
          <StackBar parts={parts.map((p) => ({ value: p.value, tone: p.tone }))} height={12} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {parts.map((p) => (
              <div key={p.key} className="flex items-center gap-3 rounded-[14px] border border-white/[0.05] bg-[rgb(1_9_40_/_0.45)] p-3">
                <span className="pro-badge h-9 w-9 rounded-[11px]" style={{ "--tone": p.tone }}>
                  <p.Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-[var(--text-muted)]">{p.label}</p>
                  <p className="text-[16px] font-black" style={{ color: p.tone }}>
                    {p.minus ? "- " : ""}
                    {money(p.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-4 flex items-center justify-between rounded-[14px] px-4 py-3"
            style={{ background: `color-mix(in srgb, ${netTone}, transparent 88%)`, border: `1px solid color-mix(in srgb, ${netTone}, transparent 70%)` }}
          >
            <span className="text-[13px] font-semibold text-[var(--text-secondary)]">{t("cmNet")}</span>
            <span className="text-[20px] font-black" style={{ color: netTone }}>
              {money(net)}
            </span>
          </div>
        </Glass>

        {/* ── হারের টাইল ── */}
        <Glass tone={TONE} className="p-5">
          <Title tone={TONE} Icon={Percent} title={t("commissionRates")} subtitle={t("commissionRatesText")} />
          <div className="grid grid-cols-2 gap-3">
            {rates.map((rate) => (
              <div
                key={rate.label}
                className="relative overflow-hidden rounded-[16px] border p-4"
                style={{ borderColor: `color-mix(in srgb, ${rate.tone}, transparent 75%)`, background: `linear-gradient(160deg, color-mix(in srgb, ${rate.tone}, transparent 86%), transparent 70%)` }}
              >
                <rate.Icon size={40} className="absolute -right-2 -bottom-2 opacity-[0.12]" style={{ color: rate.tone }} />
                <p className="text-[12px] text-[var(--text-muted)]">{rate.label}</p>
                <p className="mt-1 text-[26px] font-black leading-none" style={{ color: rate.tone }}>
                  {rate.value}
                </p>
                {rate.hint ? <p className="mt-1.5 text-[11px] text-[var(--text-disabled)]">{rate.hint}</p> : null}
              </div>
            ))}
          </div>
        </Glass>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── খেলার হিসাব ── */}
        <Glass tone={TONE} className="p-5">
          <Title tone={TONES.users} Icon={Gamepad2} title={t("gameSummary")} subtitle={t("gameSummaryText")} />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("statRounds"), value: games.rounds, tone: TONES.users, Icon: Dices },
              { label: t("statTurnover"), value: money(games.turnover), tone: TONES.withdraw, Icon: TrendingUp },
              { label: t("statGameCommission"), value: money(games.commission), tone: TONES.success, Icon: HandCoins },
              { label: t("statMonthCommission"), value: money(data.thisMonthCommission), tone: TONES.commission, Icon: Coins },
            ].map((item) => (
              <div key={item.label} className="rounded-[14px] border border-white/[0.05] bg-[rgb(1_9_40_/_0.45)] p-3.5">
                <p className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                  <item.Icon size={13} style={{ color: item.tone }} />
                  {item.label}
                </p>
                <p className="mt-1.5 text-[18px] font-black text-[var(--text-primary)]">{item.value}</p>
              </div>
            ))}
          </div>
        </Glass>

        {/* ── নতুন খেলোয়াড় ── */}
        <Glass tone={TONE} className="p-5">
          <Title
            tone={TONES.verify}
            Icon={UserPlus}
            title={t("recentPlayers")}
            subtitle={t("myUsersText")}
            action={
              <Link to="/dashboard/my-users" className="pbtn pbtn--soft pbtn--sm" style={{ "--tone": TONES.users }}>
                {t("viewAll")}
              </Link>
            }
          />
          {recent.length === 0 ? (
            <Blank tone={TONES.users} Icon={Users} label={t("noPlayersYet")} />
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((player, i) => (
                <div key={player._id} className="flex items-center gap-3 rounded-[14px] border border-white/[0.05] bg-[rgb(1_9_40_/_0.45)] px-3 py-2.5">
                  <Avatar name={player.userId} tone={[TONES.users, TONES.commission, TONES.profile, TONES.verify, TONES.withdraw][i % 5]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{player.userId}</p>
                    <p className="truncate text-[12px] text-[var(--text-muted)]">
                      {t("joinedOn")}: {day(player.createdAt)}
                    </p>
                  </div>
                  <Badge tone={player.isActive ? TONES.success : "var(--text-disabled)"}>{t(player.isActive ? "statusActive" : "statusInactive")}</Badge>
                </div>
              ))}
            </div>
          )}
        </Glass>
      </div>

      {/* ── মনে রাখার কথা ── */}
      <Glass tone={TONE} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-6">
        <p className="flex items-start gap-2 text-[13px] text-[var(--text-muted)]">
          <Dices size={15} className="mt-0.5 shrink-0" style={{ color: TONE }} />
          {t("dashboardNote")}
        </p>
        <p className="flex items-start gap-2 text-[12px] text-[var(--text-disabled)]">
          <TrendingUp size={13} className="mt-0.5 shrink-0" style={{ color: TONES.success }} />
          {t("myReferralHint")}
        </p>
      </Glass>
    </div>
  );
};

export default Dashboard;
