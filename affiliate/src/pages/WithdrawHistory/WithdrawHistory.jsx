import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { BanknoteArrowDown, CircleCheck, CircleX, Clock3, MessageSquareText, Receipt } from "lucide-react";

import { Loading, Pager } from "../../components/Panel/Panel";
import { Badge, Blank, Glass, Hero, Segmented } from "../../components/Panel/Pro";
import { HEROES, TONES } from "../../components/Panel/tones";
import { money, when } from "../../components/Panel/panelFormat";
import { useLanguage } from "../../Context/LanguageProvider";
import { fetchMyWithdraws } from "../../features/affiliate/affiliateApi";

const TONE = TONES.history;

const FILTERS = [
  { key: "all", label: "filterAll" },
  { key: "pending", label: "statusPending" },
  { key: "approved", label: "statusApproved" },
  { key: "rejected", label: "statusRejected" },
];

const STATUS = {
  pending: { tone: TONES.pending, Icon: Clock3, label: "statusPending" },
  approved: { tone: TONES.success, Icon: CircleCheck, label: "statusApproved" },
  rejected: { tone: TONES.danger, Icon: CircleX, label: "statusRejected" },
};

/**
 * নিজের তোলা টাকার ইতিহাস — "টাইমলাইন", নীল রঙে।
 *
 * প্রতিটা আবেদন একটা খাড়া রেখার উপর বিন্দু, বিন্দুর রঙ অবস্থা বলে।
 * আবেদনের সময় যে ঘরগুলো ভরা হয়েছিল সেগুলোর নাম আবেদনের সাথেই তোলা
 * থাকে — admin পরে উপায় বদলালেও পুরোনো আবেদনে সেই নামই দেখায়।
 */
const WithdrawHistory = () => {
  const { t, tv } = useLanguage();

  const labelOf = (row, key) => {
    const field = (row.methodSnapshot?.fields || []).find((f) => f.key === key);
    return field ? tv(field.label) : key;
  };

  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ requests: [], meta: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMyWithdraws({ page, status: status === "all" ? "" : status })
      .then((next) => alive && setData(next))
      .catch(() => alive && setData({ requests: [], meta: {} }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, status]);

  return (
    <div className="flex flex-col gap-5">
      <Hero
        tone={TONE}
        heroBg={HEROES.history}
        Icon={Receipt}
        eyebrow={t("navDashboard")}
        title={t("navWithdrawHistory")}
        subtitle={t("withdrawHistoryText")}
        aside={
          <Link to="/dashboard/withdraw" className="pbtn pbtn--rgb rgb-edge h-12 self-start px-6 lg:self-center">
            <BanknoteArrowDown size={17} style={{ color: TONES.withdraw }} />
            {t("navWithdraw")}
          </Link>
        }
      >
        <div className="mt-5">
          <Segmented
            tone={TONE}
            items={FILTERS.map((item) => ({ key: item.key, label: t(item.label) }))}
            value={status}
            onChange={(key) => {
              setStatus(key);
              setPage(1);
            }}
          />
        </div>
      </Hero>

      <Glass tone={TONE} lined className="p-4 lg:p-6">
        {loading ? (
          <Loading label={t("loading")} />
        ) : data.requests.length === 0 ? (
          <Blank tone={TONE} Icon={Receipt} label={t("noWithdrawYet")} />
        ) : (
          <ol className="relative flex flex-col gap-4 ps-8 lg:ps-10">
            {/* টাইমলাইনের খাড়া রেখা */}
            <span
              aria-hidden="true"
              className="absolute bottom-3 top-3 start-[13px] w-[2px] rounded-full lg:start-[17px]"
              style={{ background: `linear-gradient(${TONE}, color-mix(in srgb, ${TONE}, transparent 85%))` }}
            />
            {data.requests.map((row) => {
              const s = STATUS[row.status] || STATUS.pending;
              const fields = Object.entries(row.fields || {});
              return (
                <li key={row._id} className="relative">
                  <span
                    className="absolute top-4 -start-8 flex h-7 w-7 items-center justify-center rounded-full lg:-start-10 lg:h-9 lg:w-9"
                    style={{ background: "var(--neutral900)", border: `2px solid ${s.tone}`, color: s.tone, boxShadow: `0 0 14px -2px ${s.tone}` }}
                  >
                    <s.Icon size={15} />
                  </span>

                  <div className="rounded-[16px] border border-white/[0.06] bg-[rgb(1_9_40_/_0.45)] p-4 transition hover:border-white/[0.12]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-[var(--text-primary)]">{tv(row.methodSnapshot?.name) || row.methodId}</p>
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{when(row.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[22px] font-black leading-tight" style={{ color: TONES.withdraw }}>
                          {money(row.amount)}
                        </p>
                        <Badge tone={s.tone}>{t(s.label)}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {fields.length === 0 ? null : (
                        <div className="rounded-[12px] bg-white/[0.03] p-2.5 text-[12.5px] text-[var(--text-secondary)]">
                          {fields.map(([key, value]) => (
                            <p key={key} className="truncate">
                              <span className="text-[var(--text-muted)]">{labelOf(row, key)}:</span> <span className="font-semibold">{value}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="rounded-[12px] bg-white/[0.03] p-2.5 text-[12.5px]">
                        <p className="text-[var(--text-muted)]">{t("thAfter")}</p>
                        <p className="font-bold text-[var(--text-primary)]">{money(row.balanceAfter)}</p>
                      </div>
                    </div>

                    {row.adminNote ? (
                      <p className="mt-3 flex items-start gap-2 text-[12.5px]" style={{ color: s.tone }}>
                        <MessageSquareText size={14} className="mt-0.5 shrink-0" />
                        {row.adminNote}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <Pager
          page={data.meta.page || 1}
          totalPages={data.meta.totalPages || 1}
          busy={loading}
          onChange={setPage}
          labels={{ prev: t("labelPrev"), next: t("labelNext") }}
        />
      </Glass>
    </div>
  );
};

export default WithdrawHistory;
