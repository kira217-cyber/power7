import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  CalendarDays,
  ChartPie,
  Clock,
  Coins,
  Handshake,
  Receipt,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { api } from "../../api/axios";
import { selectAdmin } from "../../features/auth/authSelectors";

const format = (v) => new Intl.NumberFormat("en-US").format(v || 0);
const money = (v) => "৳" + format(v);
const toDateStr = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate(),
  ).padStart(2, "0")}`;
};

const GOLD = "var(--primary500)";

/* ── সোনালি রঙে অ্যাক্সেন্ট বক্স ── */
const IconBox = ({ children, size = 56 }) => (
  <span
    className="flex shrink-0 items-center justify-center rounded-[16px] text-[var(--neutral900)]"
    style={{
      height: size,
      width: size,
      background:
        "linear-gradient(135deg, var(--primary400), var(--primary500) 55%, var(--primary600))",
      boxShadow: "0 12px 30px color-mix(in srgb, var(--primary500), transparent 72%)",
    }}
  >
    {children}
  </span>
);

/* ── pie এর পাশে active/inactive সারি ── */
const StatusRow = ({ label, value, percent, color }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-[14px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-bold text-[var(--neutral100)]">
        {format(value)} · {percent}%
      </span>
    </div>
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  </div>
);

const SUMMARY_CARDS = [
  { key: "allUsers", label: "All Users", Icon: Users, to: "/users" },
  { key: "activeUsers", label: "Active Users", Icon: UserCheck, to: "/users" },
  { key: "allAffiliateUsers", label: "Affiliate Users", Icon: Handshake, to: "/affiliates" },
  { key: "allDepositBalances", label: "Total Deposit", Icon: ArrowDownToLine, money: true, to: "/deposit-requests" },
  { key: "pendingDepositRequest", label: "Pending Deposit", Icon: Clock, to: "/deposit-requests" },
  { key: "allWithdrawBalances", label: "Total Withdraw", Icon: ArrowUpFromLine, money: true, to: "/withdraw-requests" },
  { key: "pendingWithdrawRequest", label: "Pending Withdraw", Icon: Clock, to: "/withdraw-requests" },
  { key: "totalUserBalance", label: "Total User Balance", Icon: Coins, money: true, to: "/users" },
];

const TODAY_CARDS = [
  { key: "newUsers", label: "New Users", Icon: Users, to: "/users" },
  { key: "newAffiliates", label: "New Affiliates", Icon: Handshake, to: "/affiliates" },
  { key: "deposit", label: "Deposit", Icon: ArrowDownToLine, money: true, to: "/deposit-requests" },
  { key: "withdraw", label: "Withdraw", Icon: ArrowUpFromLine, money: true, to: "/withdraw-requests" },
  { key: "depositCount", label: "Deposit Count", Icon: Receipt, to: "/deposit-requests" },
  { key: "withdrawCount", label: "Withdraw Count", Icon: Receipt, to: "/withdraw-requests" },
  { key: "pendingDeposit", label: "Pending Deposit", Icon: Clock, to: "/deposit-requests" },
  { key: "pendingWithdraw", label: "Pending Withdraw", Icon: Clock, to: "/withdraw-requests" },
];

const cardCls =
  "cursor-pointer text-left rounded-[24px] border border-white/[0.07] bg-[var(--neutral800)] p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary500)]/60 hover:shadow-[0_0_35px_color-mix(in_srgb,var(--primary500),transparent_78%)]";
const panelCls =
  "rounded-[24px] border border-white/[0.07] bg-[var(--neutral800)] p-5 md:p-6 shadow-xl";

const Dashboard = () => {
  const navigate = useNavigate();
  const admin = useSelector(selectAdmin);

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [now, setNow] = useState(new Date());
  const todayStr = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [today, setToday] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // লাইভ ঘড়ি
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/dashboard/summary");
      setSummary(res?.data?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadToday = async (dateStr) => {
    try {
      setTodayLoading(true);
      const res = await api.get("/api/dashboard/today", { params: { date: dateStr } });
      setToday(res?.data?.data?.cards || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load day summary");
    } finally {
      setTodayLoading(false);
    }
  };

  // প্রথম লোড — effect এর ভিতরে সরাসরি setState না করে পরের মাইক্রোটাস্কে
  useEffect(() => {
    queueMicrotask(loadSummary);
  }, []);
  useEffect(() => {
    queueMicrotask(() => loadToday(selectedDate));
  }, [selectedDate]);

  const cards = useMemo(() => summary?.cards || {}, [summary]);

  const activeUsers = Number(cards.activeUsers || 0);
  const inactiveUsers = Math.max(0, Number(cards.allUsers || 0) - activeUsers);
  const totalUsers = activeUsers + inactiveUsers;
  const activePercent = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const inactivePercent = totalUsers ? 100 - activePercent : 0;

  const requestBars = useMemo(() => {
    const data = [
      { label: "Pending Deposit", value: Number(cards.pendingDepositRequest || 0) },
      { label: "Pending Withdraw", value: Number(cards.pendingWithdrawRequest || 0) },
      { label: "Deposit Amount", value: Number(cards.allDepositBalances || 0) },
      { label: "Withdraw Amount", value: Number(cards.allWithdrawBalances || 0) },
    ];
    const max = Math.max(...data.map((d) => d.value), 1);
    return data.map((d) => ({
      ...d,
      height: `${Math.max((d.value / max) * 100, d.value > 0 ? 12 : 4)}%`,
    }));
  }, [cards]);

  const calendar = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < startDay; i += 1) days.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) days.push(d);
    return {
      days,
      monthLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }, [viewYear, viewMonth]);

  const isSelectedToday = selectedDate === todayStr;

  const pickDay = (d) => {
    if (!d) return;
    setSelectedDate(toDateStr(new Date(viewYear, viewMonth, d)));
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="overflow-hidden rounded-[28px] border border-white/[0.07] bg-[var(--neutral900)] shadow-2xl">
        {/* ── হেডার ── */}
        <div className="flex flex-col gap-4 border-b border-white/[0.07] bg-[var(--primary500)]/[0.06] px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <IconBox>
              <BarChart3 size={26} />
            </IconBox>
            <div>
              <h1 className="ad-title text-[26px] md:text-[32px]">Dashboard</h1>
              <p className="mt-1 text-[14px] text-[var(--text-muted)]">
                Welcome back, {admin?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="ad-btn ad-btn--primary"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="space-y-8 p-4 md:p-6 lg:p-8">
          {/* ── সারসংক্ষেপ কার্ড ── */}
          <div className="grid grid-cols-2 gap-4 md:gap-5 xl:grid-cols-4">
            {SUMMARY_CARDS.map((card) => {
              const value = loading
                ? "—"
                : card.money
                  ? money(cards[card.key])
                  : format(cards[card.key]);

              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => navigate(card.to)}
                  className={cardCls}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-[14px] font-medium text-[var(--text-muted)]">
                      {card.label}
                    </p>
                    <IconBox size={52}>
                      <card.Icon size={22} />
                    </IconBox>
                  </div>
                  <h3 className="mt-3 truncate text-[22px] font-black text-[var(--neutral100)] md:text-[28px]">
                    {value}
                  </h3>
                  <div className="mt-5 text-[12px] text-[var(--primary500)]">
                    Click to open
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── নির্দিষ্ট দিনের সারসংক্ষেপ ── */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--primary500)]/15 text-[var(--primary500)]">
                  <CalendarDays size={20} />
                </span>
                <div>
                  <h2 className="text-[18px] font-bold text-[var(--neutral100)]">
                    {isSelectedToday ? "Today's Summary" : "Selected Day Summary"}
                  </h2>
                  <p className="text-[13px] text-[var(--text-muted)]">{selectedDate}</p>
                </div>
              </div>

              {!isSelectedToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                >
                  Back to Today
                </button>
              )}
            </div>

            <div
              className={`grid grid-cols-2 gap-4 transition-opacity md:grid-cols-4 ${
                todayLoading ? "opacity-60" : ""
              }`}
            >
              {TODAY_CARDS.map((card) => {
                const value = todayLoading
                  ? "—"
                  : card.money
                    ? money(today?.[card.key])
                    : format(today?.[card.key]);

                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => navigate(card.to)}
                    className="cursor-pointer rounded-[20px] border border-white/[0.06] bg-[var(--neutral800)] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--primary500)]/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[13px] text-[var(--text-muted)]">
                          {card.label}
                        </p>
                        <h3 className="mt-2 text-[20px] font-black text-[var(--neutral100)]">
                          {value}
                        </h3>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--primary500)]/10 text-[var(--primary500)]">
                        <card.Icon size={18} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── চার্ট ── */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* পাই — ইউজার স্ট্যাটাস */}
            <div className={panelCls}>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--primary500)]/15 text-[var(--primary500)]">
                  <ChartPie size={20} />
                </span>
                <div>
                  <h2 className="text-[18px] font-bold text-[var(--neutral100)]">
                    User Status Chart
                  </h2>
                  <p className="text-[13px] text-[var(--text-muted)]">
                    Active vs inactive users
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-8 md:flex-row">
                <div
                  className="relative h-48 w-48 shrink-0 rounded-full"
                  style={{
                    background: `conic-gradient(${GOLD} 0% ${activePercent}%, var(--neutral600) ${activePercent}% 100%)`,
                  }}
                >
                  <div className="absolute inset-[20px] flex flex-col items-center justify-center rounded-full bg-[var(--neutral800)]">
                    <span className="text-[28px] font-black text-[var(--neutral100)]">
                      {format(totalUsers)}
                    </span>
                    <span className="text-[13px] text-[var(--text-muted)]">
                      Total Users
                    </span>
                  </div>
                </div>

                <div className="w-full flex-1 space-y-5">
                  <StatusRow
                    label="Active Users"
                    value={activeUsers}
                    percent={activePercent}
                    color={GOLD}
                  />
                  <StatusRow
                    label="Inactive Users"
                    value={inactiveUsers}
                    percent={inactivePercent}
                    color="var(--neutral600)"
                  />
                </div>
              </div>
            </div>

            {/* বার — রিকোয়েস্ট ও অঙ্ক */}
            <div className={panelCls}>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--primary500)]/15 text-[var(--primary500)]">
                  <BarChart3 size={20} />
                </span>
                <div>
                  <h2 className="text-[18px] font-bold text-[var(--neutral100)]">
                    Requests & Amount Chart
                  </h2>
                  <p className="text-[13px] text-[var(--text-muted)]">
                    Deposit / withdraw overview
                  </p>
                </div>
              </div>

              <div className="h-[300px] rounded-[20px] border border-white/[0.06] bg-black/20 p-4">
                <div className="flex h-full items-end justify-between gap-3">
                  {requestBars.map((bar) => (
                    <div
                      key={bar.label}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                    >
                      <div className="text-center text-[12px] font-semibold text-[var(--neutral100)]">
                        {format(bar.value)}
                      </div>
                      <div className="flex h-[200px] w-full items-end justify-center">
                        <div
                          className="w-full max-w-[64px] rounded-t-[12px] transition-all duration-500"
                          style={{
                            height: bar.height,
                            background:
                              "linear-gradient(to top, var(--primary600), var(--primary500) 60%, var(--primary400))",
                          }}
                        />
                      </div>
                      <div className="min-h-[28px] text-center text-[11px] leading-tight text-[var(--text-muted)]">
                        {bar.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── ক্যালেন্ডার + লাইভ ঘড়ি ── */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* ক্যালেন্ডার */}
            <div className={`${panelCls} xl:col-span-2`}>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--primary500)]/15 text-[var(--primary500)]">
                    <CalendarDays size={20} />
                  </span>
                  <div>
                    <h2 className="text-[18px] font-bold text-[var(--neutral100)]">
                      Calendar
                    </h2>
                    <p className="text-[13px] text-[var(--text-muted)]">
                      {calendar.monthLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth((m) => {
                        if (m === 0) {
                          setViewYear((y) => y - 1);
                          return 11;
                        }
                        return m - 1;
                      })
                    }
                    className="h-9 w-9 rounded-[10px] border border-white/[0.1] bg-[var(--neutral900)] font-bold text-[var(--primary500)] transition hover:bg-white/[0.05]"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const n = new Date();
                      setViewYear(n.getFullYear());
                      setViewMonth(n.getMonth());
                    }}
                    className="ad-btn ad-btn--ghost ad-btn--sm"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth((m) => {
                        if (m === 11) {
                          setViewYear((y) => y + 1);
                          return 0;
                        }
                        return m + 1;
                      })
                    }
                    className="h-9 w-9 rounded-[10px] border border-white/[0.1] bg-[var(--neutral900)] font-bold text-[var(--primary500)] transition hover:bg-white/[0.05]"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[12px] font-semibold text-[var(--primary500)]"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendar.days.map((d, i) => {
                  if (!d) return <div key={i} className="h-12 sm:h-14" />;

                  const dateStr = toDateStr(new Date(viewYear, viewMonth, d));
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickDay(d)}
                      className="flex h-12 items-center justify-center rounded-[12px] border text-[14px] font-semibold transition sm:h-14"
                      style={{
                        borderColor: isSelected
                          ? "var(--primary500)"
                          : isToday
                            ? "color-mix(in srgb, var(--primary500), transparent 55%)"
                            : "rgba(255,255,255,0.06)",
                        background: isSelected
                          ? "var(--primary500)"
                          : "var(--neutral900)",
                        color: isSelected
                          ? "var(--neutral900)"
                          : "var(--neutral100)",
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[12px] text-[var(--text-disabled)]">
                একটা তারিখে ক্লিক করলে উপরের "Day Summary" ওই দিনের হিসাব দেখায়।
              </p>
            </div>

            {/* লাইভ ঘড়ি + কুইক স্ট্যাট */}
            <div className="space-y-6">
              <div className={panelCls}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--primary500)]/15 text-[var(--primary500)]">
                    <Clock size={20} />
                  </span>
                  <div>
                    <h2 className="text-[18px] font-bold text-[var(--neutral100)]">
                      Live Clock
                    </h2>
                    <p className="text-[13px] text-[var(--text-muted)]">
                      Live date & time
                    </p>
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/[0.06] bg-black/20 p-5 text-center">
                  <div className="text-[32px] font-black tracking-wide text-[var(--neutral100)] md:text-[38px]">
                    {now.toLocaleTimeString("en-US")}
                  </div>
                  <div className="mt-2 text-[14px] text-[var(--text-muted)]">
                    {now.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>

              <div className={panelCls}>
                <h2 className="mb-5 flex items-center gap-2 text-[18px] font-bold text-[var(--neutral100)]">
                  <ShieldCheck size={18} className="text-[var(--primary500)]" />
                  Quick Stats
                </h2>
                <div className="space-y-3">
                  {[
                    ["Admin Accounts", format(cards.totalAdmins)],
                    ["Active Users", format(cards.activeUsers)],
                    ["Pending Deposit", format(cards.pendingDepositRequest)],
                    ["Pending Withdraw", format(cards.pendingWithdrawRequest)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.06] bg-[var(--neutral900)] px-4 py-3"
                    >
                      <span className="text-[14px] text-[var(--text-muted)]">
                        {label}
                      </span>
                      <span className="text-[15px] font-bold text-[var(--neutral100)]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
