import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Check, Loader2, Search, UserRound, Wallet } from "lucide-react";

import { api } from "../../api/axios";

const fetchOptions = async () => {
  const { data } = await api.get("/api/manual-deposit/options");
  return data?.data?.methods || [];
};

const searchUsers = async (q) => {
  const { data } = await api.get(
    `/api/manual-deposit/users?q=${encodeURIComponent(q)}`,
  );
  return data?.data?.users || [];
};

const num = (value) => Number(value) || 0;

/**
 * অ্যাডমিন সরাসরি টাকা জমা করে।
 *
 * ব্যবহারকারীর নিজের ডিপোজিটের মতো একই নিয়মে চলে — একই মেথড, চ্যানেল
 * আর প্রোমো থেকে বেছে নিতে হয়, তাই বোনাস ও টার্নওভারের হিসাব দুই পথে
 * আলাদা হয়ে যেতে পারে না।
 */
const ManualDeposit = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);

  const [methodId, setMethodId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [promoId, setPromoId] = useState("none");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;

    fetchOptions()
      .then((list) => alive && setMethods(list))
      .catch((error) =>
        toast.error(error?.response?.data?.message || "Failed to load"),
      )
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  // টাইপ করার সময় প্রতি অক্ষরে রিকোয়েস্ট না গিয়ে একটু থেমে যায়
  useEffect(() => {
    let alive = true;

    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setUsers([]);
        setSearching(false);
        return;
      }

      searchUsers(query.trim())
        .then((list) => alive && setUsers(list))
        .catch(() => alive && setUsers([]))
        .finally(() => alive && setSearching(false));
    }, 350);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const method = methods.find((item) => item.methodId === methodId);
  const channels = method?.channels || [];
  const promotions = method?.promotions || [];

  const channel = channels.find((item) => item.id === channelId);
  const promo = promotions.find((item) => item.id === promoId);

  // ব্যবহারকারী যা পাবেন তার আগাম হিসাব — সার্ভারও ঠিক এভাবেই গোনে
  const amountNum = num(amount);
  const channelPercent = num(channel?.bonusPercent);
  const percentBonus = (amountNum * channelPercent) / 100;
  const promoBonus = promo
    ? promo.bonusType === "percent"
      ? (amountNum * num(promo.bonusValue)) / 100
      : num(promo.bonusValue)
    : 0;
  const credited = amountNum + percentBonus + promoBonus;
  const multiplier = promo
    ? num(promo.turnoverMultiplier)
    : num(method?.turnoverMultiplier);
  const target = credited * multiplier;

  const pickMethod = (value) => {
    setMethodId(value);

    // মেথড বদলালে আগের চ্যানেল/প্রোমো আর মেলে না
    const next = methods.find((item) => item.methodId === value);

    setChannelId(next?.channels?.[0]?.id || "");
    setPromoId("none");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!picked) {
      toast.error("Choose a player first");
      return;
    }

    if (!methodId || !channelId) {
      toast.error("Choose a method and a channel");
      return;
    }

    if (amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (
      !window.confirm(
        `Add ${credited} to ${picked.userId}? This cannot be undone from here.`,
      )
    ) {
      return;
    }

    try {
      setBusy("credit");

      const { data } = await api.post("/api/manual-deposit/credit", {
        userId: picked._id,
        methodId,
        channelId,
        promoId,
        amount: amountNum,
        adminNote: note,
      });

      toast.success(data?.message || "Balance added");

      setPicked({ ...picked, balance: data?.data?.balance ?? picked.balance });
      setAmount("");
      setNote("");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add balance");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6">
        <h1 className="ad-title text-[26px] lg:text-[30px]">Manual Deposit</h1>
        <p className="mt-1 text-[14px] text-[var(--text-muted)]">
          Put money into a player&apos;s balance yourself.
        </p>
      </div>

      {/* ── ব্যবহারকারী ── */}
      <div className="ad-card mb-4">
        <label className="ad-label" htmlFor="md-search">
          Player
        </label>

        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]"
          />
          <input
            id="md-search"
            value={query}
            onChange={(e) => {
              setSearching(true);
              setQuery(e.target.value);
            }}
            placeholder="Search by username or phone"
            style={{ paddingInlineStart: "38px" }}
            className="ad-input"
          />
        </div>

        {picked ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--primary500)]/30 bg-[color-mix(in_srgb,var(--primary500),transparent_94%)] p-3">
            <div className="flex items-center gap-3">
              <UserRound size={18} className="text-[var(--primary500)]" />
              <div>
                <p className="text-[15px] font-extrabold text-[var(--neutral100)]">
                  {picked.userId}
                </p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  {picked.phone} · balance {picked.balance}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPicked(null)}
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              Change
            </button>
          </div>
        ) : searching && query.trim().length >= 2 ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
            <Loader2 size={14} className="animate-spin" />
            Searching…
          </p>
        ) : users.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {users.map((user) => (
              <button
                key={user._id}
                type="button"
                onClick={() => {
                  setPicked(user);
                  setUsers([]);
                  setQuery("");
                }}
                className="flex items-center justify-between rounded-[12px] border border-white/[0.07] px-3 py-2 text-left transition hover:bg-white/[0.05]"
              >
                <span className="text-[14px] font-semibold text-[var(--neutral100)]">
                  {user.userId}
                </span>
                <span className="text-[12px] text-[var(--text-muted)]">
                  {user.phone} · {user.balance}
                </span>
              </button>
            ))}
          </div>
        ) : query.trim().length >= 2 ? (
          <p className="mt-3 text-[13px] text-[var(--text-disabled)]">
            Nobody matched.
          </p>
        ) : null}
      </div>

      {/* ── জমা ── */}
      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading methods…
        </div>
      ) : methods.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <Wallet size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No active deposit method
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            A manual deposit still goes through a method, so add one first.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="ad-card flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="ad-label" htmlFor="md-method">
                Method
              </label>
              <select
                id="md-method"
                value={methodId}
                onChange={(e) => pickMethod(e.target.value)}
                className="ad-input"
              >
                <option value="">Choose…</option>
                {methods.map((item) => (
                  <option key={item._id} value={item.methodId}>
                    {item.methodName?.en || item.methodId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="ad-label" htmlFor="md-channel">
                Channel
              </label>
              <select
                id="md-channel"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                disabled={!methodId}
                className="ad-input disabled:opacity-60"
              >
                <option value="">Choose…</option>
                {channels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name?.en || item.id} {item.tagText}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="ad-label" htmlFor="md-promo">
                Promotion
              </label>
              <select
                id="md-promo"
                value={promoId}
                onChange={(e) => setPromoId(e.target.value)}
                disabled={!methodId}
                className="ad-input disabled:opacity-60"
              >
                <option value="none">None</option>
                {promotions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name?.en || item.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ad-label" htmlFor="md-amount">
                Amount
              </label>
              <input
                id="md-amount"
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="md-note">
                Note
              </label>
              <input
                id="md-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="ad-input"
              />
            </div>
          </div>

          {amountNum > 0 && channel && (
            <div className="rounded-[14px] border border-white/[0.07] p-4 text-[13px]">
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Deposit</span>
                <span className="font-semibold text-[var(--neutral100)]">
                  {amountNum}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">
                  Channel bonus ({channelPercent}%)
                </span>
                <span className="font-semibold text-[var(--neutral100)]">
                  {percentBonus}
                </span>
              </div>

              {promo && (
                <div className="flex justify-between py-1">
                  <span className="text-[var(--text-muted)]">
                    Promotion ({promo.bonusType === "percent"
                      ? `${promo.bonusValue}%`
                      : promo.bonusValue})
                  </span>
                  <span className="font-semibold text-[var(--neutral100)]">
                    {promoBonus}
                  </span>
                </div>
              )}

              <div className="mt-2 flex justify-between border-t border-white/[0.07] pt-2">
                <span className="text-[var(--text-muted)]">Goes to balance</span>
                <span className="text-[18px] font-black text-[var(--primary500)]">
                  {credited}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">
                  Turnover ({multiplier}×)
                </span>
                <span className="font-semibold text-[var(--neutral100)]">
                  {target || "none"}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={Boolean(busy) || !picked}
            className="ad-btn ad-btn--primary w-full sm:w-auto"
          >
            {busy === "credit" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Add balance
          </button>
        </form>
      )}

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        This creates an already-approved deposit record, so it shows up in the
        player&apos;s history and in Deposit Requests like any other deposit.
      </p>
    </div>
  );
};

export default ManualDeposit;
