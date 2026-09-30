import React, { useEffect, useState } from "react";
import { Dices, Info, Percent, Receipt, TrendingDown, TrendingUp, UserPlus, Wallet } from "lucide-react";

import { Loading, Pager } from "../../components/Panel/Panel";
import { Badge, Blank, Donut, Glass, Hero, Segmented, Title } from "../../components/Panel/Pro";
import { HEROES, PARTS, TONES } from "../../components/Panel/tones";
import { money, when } from "../../components/Panel/panelFormat";
import { useLanguage } from "../../Context/LanguageProvider";
import { fetchCommissionHistory, fetchCommissionStatus } from "../../features/affiliate/affiliateApi";

const TONE = TONES.commission;

const PART = PARTS;

const TYPES = [
  { key: "all", label: "filterAll" },
  { key: "game-loss", label: "cmGameLoss" },
  { key: "game-win", label: "cmGameWin" },
];

/**
 * কমিশনের হিসাব — "আর্থিক বিবরণী", বেগুনি রঙে।
 *
 * ব্যানারে আয়ের গোল চার্ট: চার ভাগের কোনটা কতটা, মাঝে শেষ হিসাব। তারপর
 * হারের চারটা রঙিন টাইল, আর কোন খেলোয়াড়ের কোন রাউন্ড থেকে কত এল তার
 * খাতা — শুধু যোগফল দেখালে বিশ্বাস করতে হতো।
 */
const CommissionStatus = () => {
  const { t } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState({ rows: [], meta: {} });
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchCommissionStatus()
      .then((next) => alive && setData(next))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchCommissionHistory({ page, type: type === "all" ? "" : type })
      .then((next) => alive && setHistory(next))
      .catch(() => alive && setHistory({ rows: [], meta: {} }))
      .finally(() => alive && setLoadingHistory(false));
    return () => {
      alive = false;
    };
  }, [page, type]);

  if (loading) return <Loading label={t("loading")} />;
  if (!data) return <Glass className="p-5">{t("somethingWrong")}</Glass>;

  const { commission } = data;
  const net = Number(commission.net) || 0;
  const netTone = net >= 0 ? TONES.success : TONES.danger;
  const b = commission.balances;
  const r = commission.rates;

  const parts = [
    { label: t("cmRefer"), value: b.refer, tone: PART.refer },
    { label: t("cmDeposit"), value: b.deposit, tone: PART.deposit },
    { label: t("cmGameLoss"), value: b.gameLoss, tone: PART.gameLoss },
    { label: t("cmGameWin"), value: b.gameWin, tone: PART.gameWin, minus: true },
  ];

  const rates = [
    { label: t("cmRefer"), value: money(r.refer), hint: t("statPerInvite"), tone: PART.refer, Icon: UserPlus },
    { label: t("cmDeposit"), value: `${r.deposit}%`, tone: PART.deposit, Icon: Wallet },
    { label: t("cmGameLoss"), value: `${r.gameLoss}%`, tone: PART.gameLoss, Icon: TrendingUp },
    { label: t("cmGameWin"), value: `${r.gameWin}%`, tone: PART.gameWin, Icon: TrendingDown },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Hero
        tone={TONE}
        heroBg={HEROES.commission}
        Icon={Percent}
        eyebrow={t("navDashboard")}
        title={t("navCommissionStatus")}
        subtitle={t("commissionBalancesText")}
        aside={
          <div className="flex w-full flex-col items-center gap-5 sm:flex-row lg:w-auto">
            <Donut parts={parts} size={168} stroke={18}>
              <p className="text-[11px] text-[var(--text-muted)]">{t("cmNet")}</p>
              <p className="text-[20px] font-black leading-tight" style={{ color: netTone }}>
                {money(net)}
              </p>
            </Donut>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-[230px] sm:grid-cols-1">
              {parts.map((p) => (
                <div key={p.label} className="flex items-center justify-between gap-3 rounded-[12px] bg-white/[0.04] px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.tone, boxShadow: `0 0 8px ${p.tone}` }} />
                    <span className="truncate">{p.label}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-bold" style={{ color: p.tone }}>
                    {p.minus ? "-" : ""}
                    {money(p.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        }
      >
        <div className="mt-6 grid max-w-[560px] grid-cols-3 gap-3">
          {[
            { label: t("mainBalance"), value: money(data.balance), tone: TONES.dashboard },
            { label: t("cmGross"), value: money(commission.gross), tone: TONE },
            { label: t("cmNet"), value: money(net), tone: netTone },
          ].map((item) => (
            <div key={item.label} className="rounded-[14px] border border-white/[0.07] bg-[rgb(1_9_40_/_0.45)] p-3">
              <p className="truncate text-[11px] text-[var(--text-muted)]">{item.label}</p>
              <p className="mt-1 truncate text-[17px] font-black lg:text-[20px]" style={{ color: item.tone }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-[var(--text-disabled)]">
          {t("cmGrossText")} · {net >= 0 ? t("statPayable") : t("statOwed")}
        </p>
      </Hero>

      {/* ── হারের টাইল ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {rates.map((rate) => (
          <Glass key={rate.label} tone={rate.tone} lined hover className="overflow-hidden p-4">
            <rate.Icon size={54} className="absolute -right-2 -bottom-3 opacity-[0.1]" style={{ color: rate.tone }} />
            <p className="text-[12px] text-[var(--text-muted)]">{rate.label}</p>
            <p className="mt-1.5 text-[30px] font-black leading-none" style={{ color: rate.tone }}>
              {rate.value}
            </p>
            <p className="mt-2 text-[11px] text-[var(--text-disabled)]">{rate.hint || t("commissionRates")}</p>
          </Glass>
        ))}
      </div>

      {/* ── কোথা থেকে এল — রাউন্ডের খাতা ── */}
      <Glass tone={TONE} lined className="p-4 lg:p-5">
        <Title
          tone={TONE}
          Icon={Receipt}
          title={t("commissionHistory")}
          subtitle={t("commissionHistoryText")}
          action={
            <Segmented
              tone={TONE}
              items={TYPES.map((item) => ({ key: item.key, label: t(item.label) }))}
              value={type}
              onChange={(key) => {
                setType(key);
                setPage(1);
              }}
            />
          }
        />

        {loadingHistory ? (
          <Loading label={t("loading")} />
        ) : history.rows.length === 0 ? (
          <Blank tone={TONE} Icon={Percent} label={t("noCommissionYet")} />
        ) : (
          <div className="flex flex-col gap-2">
            {history.rows.map((row) => {
              const plus = row.affiliateCommissionType === "game-loss";
              const tone = plus ? TONES.success : TONES.danger;
              return (
                <div key={row._id} className="pro-rail flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3" style={{ "--tone": tone }}>
                  <div className="flex min-w-[180px] flex-1 items-center gap-3">
                    <span className="pro-badge h-9 w-9 rounded-[11px]" style={{ "--tone": tone }}>
                      <Dices size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{row.userId}</p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">
                        {row.gameName || "—"} · {row.providerCode || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)]">
                    {t("thBet")}: <span className="font-semibold text-[var(--text-primary)]">{money(row.betAmount)}</span>
                  </div>
                  <Badge tone={row.resultType === "win" ? TONES.success : row.resultType === "loss" ? TONES.danger : "var(--text-muted)"}>
                    {String(row.resultType || "—").toUpperCase()}
                  </Badge>
                  <div className="ms-auto text-right">
                    <p className="text-[16px] font-black" style={{ color: tone }}>
                      {plus ? "+" : "-"}
                      {money(row.affiliateCommissionAmount)}
                    </p>
                    <p className="text-[11px] text-[var(--text-disabled)]">{when(row.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pager
          page={history.meta.page || 1}
          totalPages={history.meta.totalPages || 1}
          busy={loadingHistory}
          onChange={setPage}
          labels={{ prev: t("labelPrev"), next: t("labelNext") }}
        />
      </Glass>

      <Glass tone={TONE} className="flex items-start gap-3 p-4">
        <Info size={16} className="mt-0.5 shrink-0" style={{ color: TONE }} />
        <p className="text-[13px] text-[var(--text-muted)]">{t("commissionSettleNote")}</p>
      </Glass>
    </div>
  );
};

export default CommissionStatus;
