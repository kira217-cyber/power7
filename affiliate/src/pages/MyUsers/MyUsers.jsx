import React, { useEffect, useState } from "react";
import { Clock3, Search, TrendingUp, Users, Wallet, X } from "lucide-react";

import { Loading, Pager } from "../../components/Panel/Panel";
import { Avatar, Badge, Blank, Glass, Hero, Segmented } from "../../components/Panel/Pro";
import { HEROES, TONES } from "../../components/Panel/tones";
import { money, when } from "../../components/Panel/panelFormat";
import { useLanguage } from "../../Context/LanguageProvider";
import { fetchMyUsers } from "../../features/affiliate/affiliateApi";

const TONE = TONES.users;
const AVATAR_TONES = [TONES.users, TONES.commission, TONES.profile, TONES.verify, TONES.withdraw, TONES.history];

const FILTERS = [
  { key: "all", label: "filterAll" },
  { key: "active", label: "statusActive" },
  { key: "inactive", label: "statusInactive" },
];

/**
 * নিজের আনা খেলোয়াড়েরা — "লোকের খাতা", সায়ান রঙে।
 *
 * উপরে ব্যানারে তিনটা মোট সংখ্যা; নিচে ফিল্টার আর খোঁজা এক সারিতে।
 * ডেস্কটপে অবতারসহ টেবিল, ফোনে প্রতি খেলোয়াড়ের আলাদা কার্ড — ছোট
 * পর্দায় ছয় কলামের টেবিল পাশে টেনে দেখতে হতো।
 */
const MyUsers = () => {
  const { t } = useLanguage();

  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ rows: [], summary: {}, meta: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetchMyUsers({ page, q: query, status: status === "all" ? "" : status })
      .then((next) => alive && setData(next))
      .catch(() => alive && setData({ rows: [], summary: {}, meta: {} }))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [page, query, status]);

  const search = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(term.trim());
  };

  const clear = () => {
    setTerm("");
    setQuery("");
    setStatus("all");
    setPage(1);
  };

  const totals = [
    { label: t("statTotalPlayers"), value: data.summary.count ?? 0, tone: TONE, Icon: Users },
    { label: t("statPlayerDeposit"), value: money(data.summary.deposit), tone: TONES.withdraw, Icon: Wallet },
    { label: t("statTurnover"), value: money(data.summary.turnover), tone: TONES.success, Icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Hero
        tone={TONE}
        heroBg={HEROES.users}
        Icon={Users}
        eyebrow={t("navDashboard")}
        title={t("navMyUsers")}
        subtitle={t("myUsersText")}
        aside={
          <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[460px]">
            {totals.map((item) => (
              <div
                key={item.label}
                className="rounded-[16px] border p-3 text-center"
                style={{ borderColor: `color-mix(in srgb, ${item.tone}, transparent 72%)`, background: `color-mix(in srgb, ${item.tone}, transparent 90%)` }}
              >
                <item.Icon size={18} className="mx-auto" style={{ color: item.tone }} />
                <p className="mt-1.5 truncate text-[18px] font-black lg:text-[20px]" style={{ color: item.tone }}>
                  {item.value}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{item.label}</p>
              </div>
            ))}
          </div>
        }
      />

      <Glass tone={TONE} lined className="p-4 lg:p-5">
        {/* ── ফিল্টার আর খোঁজা ── */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Segmented
            tone={TONE}
            items={FILTERS.map((item) => ({ key: item.key, label: t(item.label) }))}
            value={status}
            onChange={(key) => {
              setStatus(key);
              setPage(1);
            }}
          />

          <form onSubmit={search} className="ms-auto flex min-w-[240px] flex-1 gap-2 sm:max-w-[340px]">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]" />
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={t("searchPlayer")}
                className="pro-input !h-10 text-[13px]"
                style={{ "--tone": TONE, paddingInlineStart: 38 }}
              />
            </div>
            {query || status !== "all" ? (
              <button type="button" onClick={clear} aria-label={t("close")} className="pbtn pbtn--soft pbtn--sm !h-10 !px-3" style={{ "--tone": TONE }}>
                <X size={15} />
              </button>
            ) : null}
          </form>
        </div>

        {loading ? (
          <Loading label={t("loading")} />
        ) : data.rows.length === 0 ? (
          <Blank tone={TONE} Icon={Users} label={t("noPlayersYet")} />
        ) : (
          <>
            {/* ডেস্কটপ — টেবিল */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.6fr_1.1fr_1fr_1fr_1.1fr_0.8fr] gap-3 rounded-[12px] bg-white/[0.03] px-4 py-2.5 text-[11.5px] font-bold text-[var(--text-muted)]">
                {["thPlayer", "thJoined", "thDeposit", "thTurnover", "thLastLogin", "thStatus"].map((key) => (
                  <span key={key}>{t(key)}</span>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {data.rows.map((row, i) => (
                  <div
                    key={row._id}
                    className="pro-rail grid grid-cols-[1.6fr_1.1fr_1fr_1fr_1.1fr_0.8fr] items-center gap-3 px-4 py-3"
                    style={{ "--tone": row.isActive ? TONES.success : "rgb(255 255 255 / 0.15)" }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={row.userId} tone={AVATAR_TONES[i % AVATAR_TONES.length]} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{row.userId}</p>
                        <p className="truncate text-[12px] text-[var(--text-muted)]">{row.phone || "—"}</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-[var(--text-muted)]">{when(row.createdAt)}</span>
                    <span className="text-[14px] font-bold" style={{ color: TONES.withdraw }}>
                      {money(row.totalDeposit)}
                    </span>
                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">{money(row.totalTurnover)}</span>
                    <span className="text-[12px] text-[var(--text-muted)]">{row.lastLoginAt ? when(row.lastLoginAt) : "—"}</span>
                    <span>
                      <Badge tone={row.isActive ? TONES.success : "var(--text-disabled)"}>{t(row.isActive ? "statusActive" : "statusInactive")}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ফোন — প্রতি খেলোয়াড়ের কার্ড */}
            <div className="flex flex-col gap-3 md:hidden">
              {data.rows.map((row, i) => (
                <div key={row._id} className="rounded-[16px] border border-white/[0.06] bg-[rgb(1_9_40_/_0.45)] p-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.userId} tone={AVATAR_TONES[i % AVATAR_TONES.length]} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{row.userId}</p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">{row.phone || "—"}</p>
                    </div>
                    <Badge tone={row.isActive ? TONES.success : "var(--text-disabled)"}>{t(row.isActive ? "statusActive" : "statusInactive")}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-[12px] bg-white/[0.03] p-2.5">
                      <p className="text-[11px] text-[var(--text-muted)]">{t("thDeposit")}</p>
                      <p className="text-[15px] font-bold" style={{ color: TONES.withdraw }}>
                        {money(row.totalDeposit)}
                      </p>
                    </div>
                    <div className="rounded-[12px] bg-white/[0.03] p-2.5">
                      <p className="text-[11px] text-[var(--text-muted)]">{t("thTurnover")}</p>
                      <p className="text-[15px] font-bold text-[var(--text-primary)]">{money(row.totalTurnover)}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[var(--text-disabled)]">
                    <Clock3 size={12} />
                    {t("thJoined")}: {when(row.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </>
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

export default MyUsers;
