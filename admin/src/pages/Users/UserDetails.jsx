import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  BadgeCheck,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CircleCheck,
  CircleX,
  Clock,
  Crown,
  Dices,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Shuffle,
  UserCheck,
  Users as UsersIcon,
  UserX,
  Wallet,
  KeyRound,
} from "lucide-react";

import { api } from "../../api/axios";
import HistoryTable from "./HistoryTable";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import ProviderChips from "../../components/ProviderPicker/ProviderChips";


const money = (value) => Number(value || 0).toFixed(2);

const STATUS_COLOR = {
  win: "var(--status-success)",
  loss: "var(--status-danger)",
  push: "var(--text-muted)",
  pending: "var(--status-pending)",
  approved: "var(--status-success)",
  rejected: "var(--status-danger)",
  running: "var(--status-pending)",
  completed: "var(--status-success)",
  PENDING: "var(--status-pending)",
  PAID: "var(--status-success)",
  FAILED: "var(--status-danger)",
  PROCESSING: "var(--status-pending)",
  COMPLETED: "var(--status-success)",
  REJECTED: "var(--status-danger)",
  upgrade: "var(--primary500)",
  convert: "var(--status-info)",
  bonus: "var(--status-success)",
  adjust: "var(--status-pending)",
};

const Section = ({ title, children }) => (
  <div className="ad-card mt-4">
    <h2 className="mb-4 text-[16px] font-extrabold text-[var(--neutral100)]">
      {title}
    </h2>
    {children}
  </div>
);

const Field = ({ label, htmlFor, children }) => (
  <div>
    <label className="ad-label" htmlFor={htmlFor}>
      {label}
    </label>
    {children}
  </div>
);

const ReadOnly = ({ label, value }) => (
  <div>
    <p className="ad-label">{label}</p>
    <div className="ad-input flex items-center text-[var(--text-muted)]">
      {value || "—"}
    </div>
  </div>
);

const Pill = ({ value }) => (
  <span
    className="rounded-full px-2 py-[2px] text-[11px] font-bold capitalize"
    style={{
      background: `color-mix(in srgb, ${
        STATUS_COLOR[value] || "var(--text-muted)"
      }, transparent 88%)`,
      color: STATUS_COLOR[value] || "var(--text-muted)",
    }}
  >
    {value}
  </span>
);

const blankDraft = {
  userId: "",
  email: "",
  countryCode: "+880",
  phone: "",
  firstName: "",
  lastName: "",
  currency: "BDT",
  password: "",
  isActive: true,
  balance: "0",
  referCommission: "0",
  depositCommission: "0",
  gameWinCommission: "0",
  gameLossCommission: "0",
  referCommissionBalance: "0",
  depositCommissionBalance: "0",
  gameWinCommissionBalance: "0",
  gameLossCommissionBalance: "0",
};

const draftFrom = (user) => ({
  userId: user.userId || "",
  email: user.email || "",
  countryCode: user.countryCode || "+880",
  phone: user.phone || "",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  currency: user.currency || "BDT",
  password: "",
  isActive: user.isActive !== false,
  balance: String(user.balance ?? 0),
  referCommission: String(user.referCommission ?? 0),
  depositCommission: String(user.depositCommission ?? 0),
  gameWinCommission: String(user.gameWinCommission ?? 0),
  gameLossCommission: String(user.gameLossCommission ?? 0),
  referCommissionBalance: String(user.referCommissionBalance ?? 0),
  depositCommissionBalance: String(user.depositCommissionBalance ?? 0),
  gameWinCommissionBalance: String(user.gameWinCommissionBalance ?? 0),
  gameLossCommissionBalance: String(user.gameLossCommissionBalance ?? 0),
});

/**
 * একজনের পুরো পাতা — Bajiman এর মতো।
 *
 * উপরে চারটে সংখ্যা, তারপর ভাগে ভাগে: বদলানোর মতো তথ্য, ওয়ালেট ও
 * কমিশনের জমা, কমিশনের হার, আর শুধু-পড়ার তথ্য। নিচে ডিপোজিট, অটো
 * ডিপোজিট ও টার্নওভারের ইতিহাস — প্রতিটা নিজের পাতা ঘোরায়।
 *
 * ব্যালেন্স এখান থেকে সরাসরি বসানো যায়। সাধারণ জমা-খরচ Manual Deposit
 * দিয়েই করা উচিত (তাতে রেকর্ড থাকে); এটা হিসাব শুধরানোর জন্য।
 */
const UserDetails = ({ kind }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const isAffiliate = kind === "affiliates";
  const listPath = isAffiliate ? "/affiliates" : "/users";

  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState(blankDraft);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleAsk, setRoleAsk] = useState(false);
  const [settleAsk, setSettleAsk] = useState(false);
  const [rejectAsk, setRejectAsk] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [vipDraft, setVipDraft] = useState({ vipLevel: 0, vipXP: 0, vipPoints: 0 });

  // VIP অ্যাডজাস্ট ফর্ম আলাদা এন্ডপয়েন্টে যায়, তাই আলাদা স্টেট — তথ্য
  // আসার সাথেই ভরে (effect এ নয়, তাতে একবার বাড়তি রেন্ডার হতো)
  const fillVip = (u) =>
    setVipDraft({ vipLevel: u.vipLevel ?? 0, vipXP: u.vipXP ?? 0, vipPoints: u.vipPoints ?? 0 });

  const load = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);

      const { data } = await api.get(`/api/admin/manage/${kind}/${id}`);
      const next = data?.data;

      if (next?.user) {
        setDetail(next);
        setDraft(draftFrom(next.user));
        fillVip(next.user);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    api
      .get(`/api/admin/manage/${kind}/${id}`)
      .then(({ data }) => {
        if (!alive) return;

        const next = data?.data;

        if (next?.user) {
          setDetail(next);
          setDraft(draftFrom(next.user));
          fillVip(next.user);
        }
      })
      .catch((error) =>
        toast.error(error?.response?.data?.message || "Failed to load"),
      )
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [kind, id]);

  const set = (key) => (event) =>
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  const user = detail?.user;


  /** লেনদেন পাসওয়ার্ড মুছে দেওয়া — খেলোয়াড় ভুলে গেলে বা লক হলে; পরে তিনি নিজে নতুনটা বসান */
  const resetTxPassword = async () => {
    if (!window.confirm("Reset this player's transaction password? They will set a new one with their login password.")) return;
    try {
      setBusy("tx");
      await api.patch(`/api/admin/manage/${id}/tx-password/reset`);
      toast.success("Transaction password reset");
      load(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Reset failed");
    } finally {
      setBusy("");
    }
  };

  const saveVip = async () => {
    try {
      setBusy("vip");
      // উপরে তুললে মাঝের ধাপগুলোর বোনাসও যায় (একবারই); নামালে কিছু কাটে না
      await api.put(`/api/vip/admin/user/${id}/level`, { lv: Number(vipDraft.vipLevel) || 0 });
      toast.success("VIP updated");
      await load(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save VIP");
    } finally {
      setBusy("");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    try {
      setBusy("save");

      const payload = {
        userId: draft.userId,
        email: draft.email,
        countryCode: draft.countryCode,
        phone: draft.phone,
        firstName: draft.firstName,
        lastName: draft.lastName,
        currency: draft.currency,
        balance: Number(draft.balance) || 0,
        // খালি পাঠালে পাসওয়ার্ড আগেরটাই থাকে
        ...(draft.password ? { password: draft.password } : {}),
        ...(isAffiliate
          ? {
              referCommission: Number(draft.referCommission) || 0,
              depositCommission: Number(draft.depositCommission) || 0,
              gameWinCommission: Number(draft.gameWinCommission) || 0,
              gameLossCommission: Number(draft.gameLossCommission) || 0,
              referCommissionBalance: Number(draft.referCommissionBalance) || 0,
              depositCommissionBalance:
                Number(draft.depositCommissionBalance) || 0,
              gameWinCommissionBalance:
                Number(draft.gameWinCommissionBalance) || 0,
              gameLossCommissionBalance:
                Number(draft.gameLossCommissionBalance) || 0,
            }
          : {}),
      };

      await api.patch(`/api/admin/manage/${id}`, payload);

      // স্ট্যাটাস আলাদা রুটে — একসাথে বদলালে দুটোই বসে
      if (draft.isActive !== (user?.isActive !== false)) {
        await api.patch(`/api/admin/manage/${id}/status`, {
          isActive: draft.isActive,
        });
      }

      toast.success("Saved");
      await load(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  /**
   * অ্যাফিলিয়েটের আবেদন — অনুমোদন বা বাতিল।
   *
   * অনুমোদনের সময় ফর্মে বসানো কমিশনের হারগুলোও একসাথে পাঠানো হয়,
   * তাই আলাদা করে আগে সেভ করতে হয় না। চারটে হারই শূন্য থাকলে সার্ভার
   * অনুমোদন আটকে দেয় — নইলে হার ছাড়াই অনুমোদন হয়ে যেত।
   */
  const handleReview = async (status, note = "") => {
    if (status === "rejected" && !note.trim()) return;

    try {
      setBusy(status);

      await api.patch(`/api/admin/manage/${id}/affiliate-status`, {
        status,
        note: note.trim(),
        ...(status === "approved"
          ? {
              referCommission: Number(draft.referCommission) || 0,
              depositCommission: Number(draft.depositCommission) || 0,
              gameWinCommission: Number(draft.gameWinCommission) || 0,
              gameLossCommission: Number(draft.gameLossCommission) || 0,
            }
          : {}),
      });

      toast.success(status === "approved" ? "Affiliate approved" : "Affiliate rejected");
      await load(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save");
    } finally {
      setBusy("");
    }
  };

  // ব্রাউজারের ডিফল্ট confirm নয় — নিজেদের মডাল দিয়ে নিশ্চিত করা হয়
  const handleRole = async () => {
    const next = isAffiliate ? "user" : "aff-user";

    try {
      setBusy("role");
      await api.patch(`/api/admin/manage/${id}/role`, { role: next });

      toast.success("Role changed");
      setRoleAsk(false);
      navigate(next === "aff-user" ? "/affiliates" : "/users");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
        <UsersIcon size={28} className="text-[var(--text-disabled)]" />
        <p className="text-[15px] font-semibold text-[var(--neutral100)]">
          Not found
        </p>
        <button
          type="button"
          onClick={() => navigate(listPath)}
          className="ad-btn ad-btn--ghost ad-btn--sm"
        >
          Back
        </button>
      </div>
    );
  }

  const commissionDue =
    Number(user.referCommissionBalance || 0) +
    Number(user.depositCommissionBalance || 0) +
    Number(user.gameLossCommissionBalance || 0) -
    Number(user.gameWinCommissionBalance || 0);

  const reviewPending =
    isAffiliate && user.affiliateStatus && user.affiliateStatus !== "approved";

  const stats = [
    { label: "Main balance", value: `${money(user.balance)} ${user.currency}`, Icon: Wallet },
    ...(isAffiliate
      ? [{ label: "Commission due", value: money(commissionDue), Icon: BadgeCheck }]
      : [{ label: "Approved deposits", value: money(detail.summary?.depositTotal), Icon: BadgeCheck }]),
    { label: "Referrals", value: user.referralCount || 0, Icon: UsersIcon },
    {
      label: "Status",
      /*
       * আবেদন অনুমোদিত না হলে সেটাই দেখানো হয়।
       *
       * নতুন অ্যাকাউন্টে `isActive` সত্যি থাকে, তাই অপেক্ষায় থাকা
       * আবেদনও "Active" দেখাত — অ্যাডমিন ভাবতেন কাজ শেষ।
       */
      value: reviewPending
        ? user.affiliateStatus === "rejected"
          ? "Rejected"
          : "Pending review"
        : user.isActive !== false
          ? "Active"
          : "Disabled",
      Icon: reviewPending || user.isActive === false ? UserX : UserCheck,
    },
  ];

  return (
    <div className="mx-auto max-w-[1150px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            aria-label="back"
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            <ArrowLeft size={15} />
          </button>

          <div>
            <h1 className="ad-title text-[26px] lg:text-[30px]">{user.userId}</h1>
            <p className="mt-1 text-[14px] text-[var(--text-muted)]">
              {isAffiliate ? "Affiliate" : "Player"} · joined{" "}
              {new Date(user.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => load()}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          {!isAffiliate && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={resetTxPassword}
              title={user.hasTxPassword === false ? "No transaction password set yet" : ""}
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              {busy === "tx" ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              Reset tx password
            </button>
          )}

          {/* অ্যাফিলিয়েটের জমে থাকা কমিশন (রেফার + জমা + হার − জিত) ব্যালেন্সে তোলা */}
          {isAffiliate && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => setSettleAsk(true)}
              className="ad-btn ad-btn--primary ad-btn--sm"
            >
              {busy === "settle" ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}
              Settle commission
            </button>
          )}

          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => setRoleAsk(true)}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            {busy === "role" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Shuffle size={15} />
            )}
            {isAffiliate ? "Make normal player" : "Make affiliate"}
          </button>
        </div>
      </div>

      {/* ── এক নজরে ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const StatIcon = item.Icon;

          return (
            <div key={item.label} className="ad-card py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--text-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-[20px] font-black text-[var(--neutral100)]">
                    {item.value}
                  </p>
                </div>

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[var(--primary500)]/25 bg-[color-mix(in_srgb,var(--primary500),transparent_92%)] text-[var(--primary500)]">
                  <StatIcon size={18} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── আবেদনের অবস্থা ── */}
      {isAffiliate && user?.affiliateStatus !== "approved" ? (
        <div
          className="ad-card mt-4"
          style={{
            borderColor:
              user?.affiliateStatus === "rejected"
                ? "color-mix(in srgb, var(--status-danger), transparent 60%)"
                : "color-mix(in srgb, var(--status-pending), transparent 60%)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                style={{
                  background:
                    user?.affiliateStatus === "rejected"
                      ? "color-mix(in srgb, var(--status-danger), transparent 88%)"
                      : "color-mix(in srgb, var(--status-pending), transparent 88%)",
                  color:
                    user?.affiliateStatus === "rejected"
                      ? "var(--status-danger)"
                      : "var(--status-pending)",
                }}
              >
                {user?.affiliateStatus === "rejected" ? (
                  <CircleX size={20} />
                ) : (
                  <Clock size={20} />
                )}
              </span>

              <div>
                <p className="text-[16px] font-extrabold text-[var(--neutral100)]">
                  {user?.affiliateStatus === "rejected"
                    ? "Application rejected"
                    : "Waiting for your review"}
                </p>

                <p className="mt-1 max-w-[520px] text-[13px] text-[var(--text-muted)]">
                  They cannot log in yet. Set the commission rates below, then
                  approve — approving with every rate at zero is refused, because
                  they would bring players in and earn nothing.
                </p>

                {user?.affiliateNote ? (
                  <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                    Note: {user.affiliateNote}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => handleReview("approved")}
                className="ad-btn ad-btn--primary ad-btn--sm"
              >
                {busy === "approved" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CircleCheck size={15} />
                )}
                Approve
              </button>

              {user?.affiliateStatus === "pending" ? (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    setRejectNote("");
                    setRejectAsk(true);
                  }}
                  className="ad-btn ad-btn--danger ad-btn--sm"
                >
                  {busy === "rejected" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CircleX size={15} />
                  )}
                  Reject
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSave}>
        <Section title="Editable user information">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Username" htmlFor="ud-userId">
              <input
                id="ud-userId"
                value={draft.userId}
                onChange={set("userId")}
                className="ad-input"
              />
            </Field>

            <Field label="Email" htmlFor="ud-email">
              <input
                id="ud-email"
                type="email"
                value={draft.email}
                onChange={set("email")}
                className="ad-input"
              />
            </Field>

            <Field label="Country code" htmlFor="ud-code">
              <input
                id="ud-code"
                value={draft.countryCode}
                onChange={set("countryCode")}
                className="ad-input"
              />
            </Field>

            <Field label="Phone" htmlFor="ud-phone">
              <input
                id="ud-phone"
                value={draft.phone}
                onChange={set("phone")}
                className="ad-input"
              />
            </Field>

            <Field label="First name" htmlFor="ud-first">
              <input
                id="ud-first"
                value={draft.firstName}
                onChange={set("firstName")}
                className="ad-input"
              />
            </Field>

            <Field label="Last name" htmlFor="ud-last">
              <input
                id="ud-last"
                value={draft.lastName}
                onChange={set("lastName")}
                className="ad-input"
              />
            </Field>

            <Field label="Currency" htmlFor="ud-currency">
              <select
                id="ud-currency"
                value={draft.currency}
                onChange={set("currency")}
                className="ad-input"
              >
                <option value="BDT">BDT</option>
                <option value="USDT">USDT</option>
              </select>
            </Field>

            <Field label="New password" htmlFor="ud-password">
              <div className="relative">
                <input
                  id="ud-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep the current one"
                  value={draft.password}
                  onChange={set("password")}
                  style={{ paddingInlineEnd: "44px" }}
                  className="ad-input"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute end-4 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--text-disabled)] transition hover:text-[var(--neutral100)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Account status" htmlFor="ud-status">
              <button
                id="ud-status"
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, isActive: !prev.isActive }))
                }
                className="ad-input flex cursor-pointer items-center justify-center gap-2 font-bold"
                style={{
                  color: draft.isActive
                    ? "var(--status-success)"
                    : "var(--status-danger)",
                  borderColor: draft.isActive
                    ? "color-mix(in srgb, var(--status-success), transparent 60%)"
                    : "color-mix(in srgb, var(--status-danger), transparent 60%)",
                }}
              >
                {draft.isActive ? <UserCheck size={16} /> : <UserX size={16} />}
                {draft.isActive ? "Active" : "Disabled"}
              </button>
            </Field>
          </div>
        </Section>

        <Section title="Wallet & commission balance">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Main balance" htmlFor="ud-balance">
              <input
                id="ud-balance"
                type="number"
                step="0.01"
                min="0"
                value={draft.balance}
                onChange={set("balance")}
                className="ad-input"
              />
            </Field>

            {isAffiliate &&
              [
                ["referCommissionBalance", "Refer balance"],
                ["depositCommissionBalance", "Deposit balance"],
                ["gameLossCommissionBalance", "Game loss balance"],
                ["gameWinCommissionBalance", "Game win balance"],
              ].map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`ud-${key}`}>
                  <input
                    id={`ud-${key}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft[key]}
                    onChange={set(key)}
                    className="ad-input"
                  />
                </Field>
              ))}
          </div>

          <p className="mt-3 text-[12px] text-[var(--text-disabled)]">
            Normal top-ups belong in Manual Deposit — that leaves a record. Use
            these fields only to correct a wrong figure.
          </p>
        </Section>

        {isAffiliate && (
          <Section title="Commission settings (%)">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["referCommission", "Refer"],
                ["depositCommission", "Deposit"],
                ["gameLossCommission", "Game loss"],
                ["gameWinCommission", "Game win"],
              ].map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`ud-${key}`}>
                  <input
                    id={`ud-${key}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={draft[key]}
                    onChange={set(key)}
                    className="ad-input"
                  />
                </Field>
              ))}
            </div>
          </Section>
        )}

        <Section title="Read only information">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReadOnly label="Role" value={user.role} />
            <ReadOnly label="Game play name" value={user.userGamePlayName} />
            <ReadOnly label="Referral code" value={user.referralCode} />
            <ReadOnly label="Referral count" value={user.referralCount || 0} />
            <ReadOnly label="Referred by" value={user.referredBy?.userId} />
            <ReadOnly label="Referrer phone" value={user.referredBy?.phone} />
            <ReadOnly label="Referrer code" value={user.referredBy?.referralCode} />
            <ReadOnly
              label="Last login"
              value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : ""}
            />
            <ReadOnly
              label="Created"
              value={new Date(user.createdAt).toLocaleString()}
            />
            <ReadOnly
              label="Updated"
              value={new Date(user.updatedAt).toLocaleString()}
            />
          </div>
        </Section>

        <button
          type="submit"
          disabled={Boolean(busy)}
          className="ad-btn ad-btn--primary mt-4 w-full sm:w-auto"
        >
          {busy === "save" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save changes
        </button>
      </form>

      {/* ── VIP ──
          ধাপ নিজের endpoint এ বসে (VIP History তে লেখা থাকে), তাই মূল
          ফর্মের বাইরে নিজের Save বোতাম। XP শুধু দেখানো — বাজি থেকে বাড়ে। */}
      <Section title="VIP level">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="VIP level" htmlFor="vip-level">
            <input
              id="vip-level"
              type="number"
              min="0"
              value={vipDraft.vipLevel}
              onChange={(e) => setVipDraft((p) => ({ ...p, vipLevel: e.target.value }))}
              className="ad-input"
            />
          </Field>
          <Field label="XP (from bets)" htmlFor="vip-xp">
            <input id="vip-xp" value={vipDraft.vipXP} disabled className="ad-input" />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={saveVip}
              disabled={Boolean(busy)}
              className="ad-btn ad-btn--primary w-full"
            >
              {busy === "vip" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save VIP
            </button>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-[var(--text-disabled)]">
          The level rises by itself as the player bets. Raising it here pays each skipped level&apos;s bonus once;
          lowering it takes nothing back. Every change shows in VIP History.
        </p>
      </Section>

      {/* ── ইতিহাস ──
          Bajiman এর single-user সেকশনগুলোর মতো: প্রতিটার নিজের
          সারাংশ, খোঁজা, ছাঁকনি আর পাতা। সারাংশের অঙ্কগুলো ছাঁকনি
          মেনেই আসে, তাই "শুধু অনুমোদিত" বাছলে অঙ্কও সেটারই */}
      <HistoryTable
        title="Game history"
        subtitle="Every round this player has played."
        icon={<Dices size={17} />}
        userId={id}
        path="games"
        primaryKeys={["when", "game", "bet", "win", "net", "result"]}
        minWidth={1150}
        statuses={[
          { key: "all", label: "All" },
          { key: "win", label: "Win" },
          { key: "loss", label: "Loss" },
          { key: "push", label: "Push" },
        ]}
        summaryCards={[
          (sum) => ({
            label: "Total bet",
            value: money(sum.bet),
            tone: "var(--primary500)",
            sub: `${sum.count || 0} rounds`,
          }),
          (sum) => ({
            label: "Total win",
            value: money(sum.win),
            tone: "var(--status-success)",
          }),
          (sum) => ({
            label: "Player net",
            value: money(sum.net),
            tone:
              Number(sum.net) >= 0
                ? "var(--status-success)"
                : "var(--status-danger)",
            sub: Number(sum.net) >= 0 ? "Player ahead" : "Player behind",
          }),
          (sum, counts) => ({
            label: "Win / loss / push",
            value: `${counts.win || 0} / ${counts.loss || 0} / ${counts.push || 0}`,
          }),
        ]}
        columns={[
          { key: "when", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
          {
            key: "game",
            label: "Game",
            render: (r) => (
              <>
                <span className="font-semibold text-[var(--neutral100)]">
                  {r.gameName || "—"}
                </span>
                <span className="mt-0.5 block break-all text-[11px] text-[var(--text-disabled)]">
                  {r.gameUId}
                </span>
              </>
            ),
          },
          { key: "provider", label: "Provider", render: (r) => r.providerCode || "—" },
          {
            key: "round",
            label: "Round",
            render: (r) => (
              <>
                <span className="block break-all">{r.gameRound || "—"}</span>
                <span className="mt-0.5 block break-all text-[11px] text-[var(--text-disabled)]">
                  {r.serialNumber || "—"}
                </span>
              </>
            ),
          },
          { key: "bet", label: "Bet", render: (r) => money(r.betAmount) },
          { key: "win", label: "Win", render: (r) => money(r.winAmount) },
          { key: "net", label: "Net", render: (r) => money(r.netAmount) },
          { key: "before", label: "Before", render: (r) => money(r.balanceBefore) },
          { key: "after", label: "After", render: (r) => money(r.balanceAfter) },
          {
            key: "turnover",
            label: "Turnover",
            render: (r) => (r.turnoverApplied ? "counted" : "—"),
          },
          { key: "result", label: "Result", render: (r) => <Pill value={r.resultType} /> },
        ]}
      />

      <HistoryTable
        title="Deposit history"
        subtitle="Manual deposits this player has sent in."
        icon={<Wallet size={17} />}
        userId={id}
        path="deposits"
        primaryKeys={["when", "method", "amount", "credited", "status"]}
        minWidth={1100}
        statuses={[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ]}
        summaryCards={[
          (sum) => ({
            label: "Total deposit",
            value: money(sum.amount),
            tone: "var(--primary500)",
            sub: `${sum.count || 0} requests`,
          }),
          (sum) => ({
            label: "Total bonus",
            value: money(sum.bonus),
            tone: "var(--status-success)",
          }),
          (sum) => ({ label: "Credited", value: money(sum.credited) }),
          (sum, counts) => ({
            label: "Pending / rejected",
            value: `${counts.pending || 0} / ${counts.rejected || 0}`,
            tone: counts.pending ? "var(--status-pending)" : undefined,
          }),
        ]}
        columns={[
          { key: "when", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
          { key: "method", label: "Method", render: (r) => r.display?.methodName?.en || r.methodId },
          { key: "channel", label: "Channel", render: (r) => r.display?.channelName?.en || r.channelId || "—" },
          {
            key: "trx",
            label: "Transaction",
            render: (r) =>
              r.fields?.transactionId || r.fields?.trxId || r.fields?.senderNumber || "—",
          },
          { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          { key: "bonus", label: "Bonus", render: (r) => money(r.calc?.totalBonus) },
          { key: "credited", label: "Credited", render: (r) => money(r.calc?.creditedAmount) },
          { key: "turnover", label: "Turnover", render: (r) => `x${r.calc?.turnoverMultiplier ?? 1}` },
          { key: "source", label: "Source", render: (r) => r.display?.source || "User" },
          { key: "note", label: "Note", render: (r) => r.adminNote || "—" },
          { key: "status", label: "Status", render: (r) => <Pill value={r.status} /> },
        ]}
      />

      <HistoryTable
        title="Auto deposit history"
        subtitle="Payments made on the gateway page."
        icon={<Landmark size={17} />}
        userId={id}
        path="auto-deposits"
        primaryKeys={["when", "invoice", "amount", "credited", "status"]}
        minWidth={1080}
        statuses={[
          { key: "all", label: "All" },
          { key: "PENDING", label: "Pending" },
          { key: "PAID", label: "Paid" },
          { key: "FAILED", label: "Failed" },
        ]}
        summaryCards={[
          (sum) => ({
            label: "Total deposit",
            value: money(sum.amount),
            tone: "var(--primary500)",
            sub: `${sum.count || 0} payments`,
          }),
          (sum) => ({
            label: "Total bonus",
            value: money(sum.bonus),
            tone: "var(--status-success)",
          }),
          (sum) => ({ label: "Credited", value: money(sum.credited) }),
          (sum, counts) => ({
            label: "Paid / failed",
            value: `${counts.PAID || 0} / ${counts.FAILED || 0}`,
          }),
        ]}
        columns={[
          { key: "when", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
          { key: "invoice", label: "Invoice", render: (r) => r.invoiceNumber },
          { key: "method", label: "Method", render: (r) => r.bank || "—" },
          { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          { key: "bonus", label: "Bonus", render: (r) => money(r.calc?.bonusAmount) },
          { key: "credited", label: "Credited", render: (r) => money(r.calc?.creditedAmount) },
          { key: "turnover", label: "Turnover", render: (r) => `x${r.calc?.turnoverMultiplier ?? 0}` },
          { key: "added", label: "Balance added", render: (r) => (r.balanceAdded ? "yes" : "—") },
          {
            key: "footprint",
            label: "Footprint",
            render: (r) =>
              r.footprint ? (
                <a
                  href={r.footprint}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--primary500)] underline underline-offset-2"
                >
                  Open
                </a>
              ) : (
                "—"
              ),
          },
          { key: "status", label: "Status", render: (r) => <Pill value={r.status} /> },
        ]}
      />

      <HistoryTable
        title="Withdraw history"
        subtitle="Money this player has asked to take out."
        icon={<BanknoteArrowDown size={17} />}
        userId={id}
        path="withdraws"
        primaryKeys={["when", "method", "amount", "status"]}
        minWidth={1000}
        statuses={[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ]}
        summaryCards={[
          (sum) => ({
            label: "Total withdraw",
            value: money(sum.amount),
            tone: "var(--status-danger)",
            sub: `${sum.count || 0} requests`,
          }),
          (sum, counts) => ({
            label: "Pending",
            value: counts.pending || 0,
            tone: counts.pending ? "var(--status-pending)" : undefined,
          }),
          (sum, counts) => ({
            label: "Approved",
            value: counts.approved || 0,
            tone: "var(--status-success)",
          }),
          (sum, counts) => ({
            label: "Rejected",
            value: counts.rejected || 0,
            tone: counts.rejected ? "var(--status-danger)" : undefined,
          }),
        ]}
        columns={[
          { key: "when", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
          {
            key: "method",
            label: "Method",
            render: (r) => r.walletSnapshot?.methodName?.en || r.methodId,
          },
          {
            key: "wallet",
            label: "Number",
            render: (r) => r.walletSnapshot?.walletNumber || "—",
          },
          { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          { key: "before", label: "Before", render: (r) => money(r.balanceBefore) },
          { key: "after", label: "After", render: (r) => money(r.balanceAfter) },
          { key: "note", label: "Note", render: (r) => r.adminNote || "—" },
          { key: "status", label: "Status", render: (r) => <Pill value={r.status} /> },
        ]}
      />

      <HistoryTable
        title="Auto withdraw history"
        subtitle="Payouts this player took out through the gateway."
        icon={<BanknoteArrowUp size={17} />}
        userId={id}
        path="auto-withdraws"
        primaryKeys={["when", "method", "amount", "status"]}
        minWidth={1050}
        statuses={[
          { key: "all", label: "All" },
          { key: "PENDING", label: "Pending" },
          { key: "PROCESSING", label: "Processing" },
          { key: "COMPLETED", label: "Completed" },
          { key: "REJECTED", label: "Rejected" },
        ]}
        summaryCards={[
          (sum) => ({
            label: "Total withdraw",
            value: money(sum.amount),
            tone: "var(--status-danger)",
            sub: `${sum.count || 0} requests`,
          }),
          (sum, counts) => ({
            label: "Completed",
            value: counts.COMPLETED || 0,
            tone: "var(--status-success)",
          }),
          (sum, counts) => ({
            label: "Pending / processing",
            value: `${counts.PENDING || 0} / ${counts.PROCESSING || 0}`,
            tone:
              counts.PENDING || counts.PROCESSING
                ? "var(--status-pending)"
                : undefined,
          }),
          (sum, counts) => ({
            label: "Rejected (refunded)",
            value: counts.REJECTED || 0,
            tone: counts.REJECTED ? "var(--status-danger)" : undefined,
          }),
        ]}
        columns={[
          { key: "when", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
          { key: "method", label: "Method", render: (r) => r.paymentMethod || "—" },
          {
            key: "wallet",
            label: "Wallet",
            render: (r) => r.accountNumber || r.userIdentityAddress || "—",
          },
          { key: "amount", label: "Amount", render: (r) => money(r.amount) },
          {
            key: "fee",
            label: "Fee",
            render: (r) =>
              r.feeAmount ? `${money(r.feeAmount)} (${r.feePercentage || 0}%)` : "—",
          },
          { key: "wid", label: "Withdrawal ID", render: (r) => r.withdrawalId || "—" },
          { key: "refunded", label: "Refunded", render: (r) => (r.refunded ? "yes" : "—") },
          { key: "status", label: "Status", render: (r) => <Pill value={r.status} /> },
        ]}
      />

      <HistoryTable
        title="Turnover history"
        subtitle="How much play is still owed on each bonus."
        icon={<RotateCcw size={17} />}
        userId={id}
        path="turnovers"
        primaryKeys={["when", "source", "required", "progress", "status"]}
        minWidth={1050}
        statuses={[
          { key: "all", label: "All" },
          { key: "running", label: "Running" },
          { key: "completed", label: "Completed" },
        ]}
        summaryCards={[
          (sum) => ({
            label: "Total required",
            value: money(sum.required),
            tone: "var(--primary500)",
            sub: `${sum.count || 0} conditions`,
          }),
          (sum) => ({
            label: "Played so far",
            value: money(sum.progress),
            tone: "var(--status-success)",
          }),
          (sum) => ({
            label: "Still owed",
            value: money(Math.max(0, Number(sum.required || 0) - Number(sum.progress || 0))),
            tone: "var(--status-pending)",
          }),
          (sum, counts) => ({
            label: "Running / done",
            value: `${counts.running || 0} / ${counts.completed || 0}`,
          }),
        ]}
        columns={[
          { key: "when", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
          { key: "source", label: "Source", render: (r) => r.sourceType },
          { key: "credited", label: "Credited", render: (r) => money(r.creditedAmount) },
          { key: "required", label: "Required", render: (r) => money(r.required) },
          { key: "progress", label: "Progress", render: (r) => `${money(r.progress)} (${
            r.required ? Math.min(100, Math.round((r.progress / r.required) * 100)) : 100
          }%)` },
          {
            key: "left",
            label: "Left",
            render: (r) => money(Math.max(0, Number(r.required || 0) - Number(r.progress || 0))),
          },
          {
            key: "providers",
            label: "Providers",
            render: (r) => <ProviderChips list={r.eligibleProviders} />,
          },
          {
            key: "done",
            label: "Completed",
            render: (r) => (r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"),
          },
          { key: "status", label: "Status", render: (r) => <Pill value={r.status} /> },
        ]}
      />

      <HistoryTable
        title="VIP history"
        subtitle="Level upgrades, point conversions, bonuses and adjustments."
        icon={<Crown size={17} />}
        userId={id}
        path="vip"
        primaryKeys={["when", "type", "level", "points", "amount"]}
        minWidth={1000}
        statuses={[
          { key: "all", label: "All" },
          { key: "upgrade", label: "Upgrade" },
          { key: "convert", label: "Convert" },
          { key: "bonus", label: "Bonus" },
          { key: "adjust", label: "Adjust" },
        ]}
        summaryCards={[
          (sum) => ({
            label: "XP change",
            value: money(sum.xp),
            tone: "var(--primary500)",
            sub: `${sum.count || 0} events`,
          }),
          (sum) => ({ label: "Points change", value: money(sum.points) }),
          (sum) => ({
            label: "Cash paid",
            value: money(sum.amount),
            tone: "var(--status-success)",
          }),
          (sum, counts) => ({
            label: "Upgrades / converts",
            value: `${counts.upgrade || 0} / ${counts.convert || 0}`,
          }),
        ]}
        columns={[
          { key: "when", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
          { key: "type", label: "Type", render: (r) => <Pill value={r.type} /> },
          {
            key: "level",
            label: "Level",
            render: (r) => (r.levelFrom ? `LV${r.levelFrom} → LV${r.levelTo}` : `LV${r.levelTo || "—"}`),
          },
          { key: "xp", label: "XP", render: (r) => (r.xp ? (r.xp > 0 ? `+${r.xp}` : r.xp) : "—") },
          { key: "points", label: "Points", render: (r) => (r.points ? (r.points > 0 ? `+${r.points}` : r.points) : "—") },
          { key: "amount", label: "Amount", render: (r) => (r.amount ? money(r.amount) : "—") },
          { key: "note", label: "Note", render: (r) => r.note || "—" },
        ]}
      />

      {/* ── কমিশন মেলানো ── */}
      <ConfirmModal
        open={settleAsk}
        busy={busy === "settle"}
        title="Settle the commission?"
        message={`Refer ${money(user?.referCommissionBalance)} + Deposit ${money(user?.depositCommissionBalance)} + Game loss ${money(user?.gameLossCommissionBalance)} − Game win ${money(user?.gameWinCommissionBalance)} = ${money(commissionDue)}. This amount moves to the main balance and the four commission balances become 0.${commissionDue < 0 ? " The net is negative: it is taken from the balance as far as it goes, the rest stays as debt." : ""}`}
        confirmText="Settle"
        onConfirm={async () => {
          try {
            setBusy("settle");
            const { data } = await api.post(`/api/affiliate/admin/${user._id}/settle`, {});
            toast.success(`${data.message}: ${money(data.data?.settlement?.applied)}`);
            setSettleAsk(false);
            load(true);
          } catch (err) {
            toast.error(err?.response?.data?.message || "Could not settle");
          } finally {
            setBusy("");
          }
        }}
        onClose={() => busy !== "settle" && setSettleAsk(false)}
      />

      {/* ── ভূমিকা বদলের নিশ্চিতকরণ — ব্রাউজারের ডিফল্ট নয় ── */}
      <ConfirmModal
        open={roleAsk}
        busy={busy === "role"}
        title={isAffiliate ? "Make a normal player?" : "Make an affiliate?"}
        message={
          isAffiliate
            ? `${user?.userId} will lose affiliate access and become a normal player.`
            : `${user?.userId} will become an affiliate and move to the affiliates list.`
        }
        confirmText={isAffiliate ? "Make player" : "Make affiliate"}
        onConfirm={handleRole}
        onClose={() => busy !== "role" && setRoleAsk(false)}
      />

      {/* ── অ্যাফিলিয়েট আবেদন বাতিলের কারণ — ব্রাউজারের prompt নয় ── */}
      <ConfirmModal
        open={rejectAsk}
        danger
        busy={busy === "rejected"}
        title="Reject this application?"
        message="Write why it is rejected — the affiliate will see this note."
        confirmText="Reject application"
        onConfirm={async () => {
          await handleReview("rejected", rejectNote);
          if (rejectNote.trim()) setRejectAsk(false);
        }}
        onClose={() => busy !== "rejected" && setRejectAsk(false)}
      >
        <textarea
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          rows={3}
          placeholder="Reason for rejection"
          className="ad-input"
          autoFocus
        />
      </ConfirmModal>
    </div>
  );
};

export default UserDetails;
