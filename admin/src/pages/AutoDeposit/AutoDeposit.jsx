import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  ImageUp,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";

import { api } from "../../api/axios";
import SecretInput from "../../components/SecretInput/SecretInput";
import ProviderPicker from "../../components/ProviderPicker/ProviderPicker";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** সার্ভারে রাখা ছবির পুরো ঠিকানা */
const imageUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
};

const fetchSetting = async () => {
  const { data } = await api.get("/api/auto-deposit/admin");
  return data?.data?.setting || null;
};

const methodsFrom = (setting) =>
  (setting?.methods || []).map((method) => ({
    _id: method._id,
    code: method.code || "",
    nameBn: method.name?.bn || "",
    nameEn: method.name?.en || "",
    logoUrl: method.logoUrl || "",
    active: method.active !== false,
    manual: Boolean(method.manual),
    order: Number(method.order ?? 0),
    minAmount: String(method.minAmount ?? 0),
    maxAmount: String(method.maxAmount ?? 0),
  }));

const bonusesFrom = (setting) =>
  (setting?.bonuses || []).map((bonus) => ({
    _id: bonus._id,
    titleBn: bonus.title?.bn || "",
    titleEn: bonus.title?.en || "",
    bonusType: bonus.bonusType || "fixed",
    bonusValue: String(bonus.bonusValue ?? 0),
    turnoverMultiplier: String(bonus.turnoverMultiplier ?? 1),
    bonusScope: bonus.bonusScope || "all-time",
    isActive: bonus.isActive !== false,
    providers: (bonus.eligibleProviders || []).map((item) => ({
      providerCode: item.providerCode || "",
      percent: Number(item.percent ?? 100),
    })),
  }));

/**
 * অটো ডিপোজিট।
 *
 * গেটওয়ে নিজেই টাকা নিশ্চিত করে, তাই ম্যানুয়ালের মতো চ্যানেল নেই —
 * বোনাস বেছে নেওয়ার তালিকাটাই এখানে। টোকেন না থাকলে বা বন্ধ থাকলে
 * ক্লায়েন্টে অটো অংশটা দেখায় না, ম্যানুয়াল দিয়েই কাজ চলে।
 */
const AutoDeposit = () => {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [token, setToken] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [methods, setMethods] = useState([]);
  const [bonuses, setBonuses] = useState([]);

  const fill = (next) => {
    setSetting(next);

    if (next) {
      setMinAmount(String(next.minAmount ?? 0));
      setMaxAmount(String(next.maxAmount ?? 0));
      setMethods(methodsFrom(next));
      setBonuses(bonusesFrom(next));
    }
  };

  useEffect(() => {
    let alive = true;

    fetchSetting()
      .then((next) => alive && fill(next))
      .catch((error) =>
        toast.error(error?.response?.data?.message || "Failed to load setting"),
      )
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      fill(await fetchSetting());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load setting");
    } finally {
      setLoading(false);
    }
  };

  const save = async (action, payload, after) => {
    try {
      setBusy(action);
      const { data } = await api.put("/api/auto-deposit/admin", payload);

      if (data?.data?.setting) fill(data.data.setting);
      toast.success(data?.message || "Saved");
      after?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const setBonus = (index, key, value) =>
    setBonuses((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );

  const setMethod = (index, key, value) =>
    setMethods((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );

  const [uploading, setUploading] = useState(-1);

  // ছবিটা সাথে সাথেই আপলোড হয়ে /uploads পথ ফেরত দেয়, সেটাই মাধ্যমের
  // logoUrl এ বসে — পরে "Save gateway" এ পুরো সেটিং সেভ হয়
  const uploadLogo = async (index, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }

    try {
      setUploading(index);
      const form = new FormData();
      form.append("logo", file);

      const { data } = await api.post("/api/auto-deposit/upload-logo", form);
      const url = data?.data?.logoUrl || "";

      if (url) setMethod(index, "logoUrl", url);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(-1);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const bad = bonuses.find(
      (bonus) =>
        bonus.providers.reduce(
          (sum, item) => sum + (Number(item.percent) || 0),
          0,
        ) > 100,
    );

    if (bad) {
      toast.error(
        `Bonus "${bad.titleEn || bad.titleBn || "untitled"}" providers add up to more than 100%`,
      );
      return;
    }

    save(
      "save",
      {
        // খালি পাঠালে আগের টোকেনটাই থাকে — নইলে ভুল করে মুছে যেত
        ...(token.trim() ? { businessToken: token.trim() } : {}),
        minAmount: Number(minAmount) || 1,
        maxAmount: Number(maxAmount) || 0,
        methods: methods.map((method, index) => ({
          ...(method._id ? { _id: method._id } : {}),
          code: method.code,
          name: { bn: method.nameBn, en: method.nameEn },
          logoUrl: method.logoUrl,
          active: method.active,
          manual: method.manual,
          order: index,
          minAmount: Number(method.minAmount) || 0,
          maxAmount: Number(method.maxAmount) || 0,
        })),
        bonuses: bonuses.map((bonus, index) => ({
          ...(bonus._id ? { _id: bonus._id } : {}),
          title: { bn: bonus.titleBn, en: bonus.titleEn },
          bonusType: bonus.bonusType,
          bonusValue: Number(bonus.bonusValue) || 0,
          turnoverMultiplier: Number(bonus.turnoverMultiplier) || 0,
          bonusScope: bonus.bonusScope,
          isActive: bonus.isActive,
          order: index,
          eligibleProviders: bonus.providers,
        })),
      },
      () => setToken(""),
    );
  };

  const active = Boolean(setting?.active);
  const hasToken = Boolean(setting?.hasToken);

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">Auto Deposit</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            The gateway that confirms deposits without an admin.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ad-btn ad-btn--ghost ad-btn--sm"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── অবস্থা ── */}
      <div className="ad-card">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border"
            style={{
              borderColor: active
                ? "color-mix(in srgb, var(--status-success), transparent 70%)"
                : "rgba(255,255,255,0.12)",
              background: active
                ? "color-mix(in srgb, var(--status-success), transparent 90%)"
                : "rgba(255,255,255,0.05)",
              color: active ? "var(--status-success)" : "var(--text-muted)",
            }}
          >
            <Zap size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {loading
                ? "Loading…"
                : active
                  ? "Auto deposit is on"
                  : "Auto deposit is off"}
            </h2>

            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              {hasToken
                ? `Token ${setting?.tokenPreview}`
                : "No token yet — without one the gateway cannot be turned on."}
            </p>

            {setting?.lastError && (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-[var(--status-danger)]">
                <TriangleAlert size={14} />
                {setting.lastError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-white/[0.07] pt-5">
          <button
            type="button"
            disabled={Boolean(busy) || (!active && !hasToken)}
            onClick={() => save("toggle", { active: !active })}
            className={`ad-btn ad-btn--sm ${
              active ? "ad-btn--ghost" : "ad-btn--primary"
            }`}
          >
            {busy === "toggle" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Power size={15} />
            )}
            {active ? "Turn auto deposit off" : "Turn auto deposit on"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {/* ── টোকেন ও সীমা ── */}
        <div className="ad-card">
          <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
            Gateway
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="ad-label" htmlFor="ad-token">
                Business token
              </label>
              <SecretInput
                id="ad-token"
                autoComplete="off"
                placeholder={hasToken ? "Leave blank to keep the current one" : "Paste the token"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="mt-1 text-[12px] text-[var(--text-disabled)]">
                Stored write-only — it is never sent back to this page.
              </p>
            </div>

            <div>
              <label className="ad-label" htmlFor="ad-min">
                Minimum
              </label>
              <input
                id="ad-min"
                type="number"
                min="1"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="ad-max">
                Maximum
              </label>
              <input
                id="ad-max"
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="ad-input"
              />
            </div>
          </div>
        </div>

        {/* ── পেমেন্ট মাধ্যম ── */}
        <div className="ad-card">
          <div>
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              Payment methods
            </h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Turn each method on or off, and set its own limits. Bank Transfer
              & Crypto are manual — they wait for your confirmation before the
              money is credited.
            </p>
          </div>

          {methods.length === 0 ? (
            <p className="mt-4 text-[13px] text-[var(--text-disabled)]">
              No method yet.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {methods.map((method, index) => (
                <div
                  key={method._id || method.code || index}
                  className="rounded-[12px] border border-white/[0.06] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {method.logoUrl ? (
                        <img
                          src={imageUrl(method.logoUrl)}
                          alt={method.code}
                          className="h-14 w-14 rounded-lg bg-white/[0.04] object-contain p-1"
                        />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/[0.06] text-[13px] uppercase text-[var(--text-muted)]">
                          {method.code.slice(0, 2)}
                        </span>
                      )}
                      <div>
                        <p className="text-[14px] font-bold text-[var(--neutral100)]">
                          {method.nameEn || method.code}
                        </p>
                        <p className="text-[11px] uppercase text-[var(--text-disabled)]">
                          {method.code}
                          {method.manual ? " · manual" : " · auto"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                        <input
                          type="checkbox"
                          checked={method.manual}
                          onChange={(e) =>
                            setMethod(index, "manual", e.target.checked)
                          }
                        />
                        Manual
                      </label>

                      <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                        <input
                          type="checkbox"
                          checked={method.active}
                          onChange={(e) =>
                            setMethod(index, "active", e.target.checked)
                          }
                        />
                        On
                      </label>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      value={method.nameBn}
                      onChange={(e) => setMethod(index, "nameBn", e.target.value)}
                      placeholder="Name (Bangla)"
                      className="ad-input"
                    />
                    <input
                      value={method.nameEn}
                      onChange={(e) => setMethod(index, "nameEn", e.target.value)}
                      placeholder="Name (English)"
                      className="ad-input"
                    />
                    <input
                      type="number"
                      min="0"
                      value={method.minAmount}
                      onChange={(e) =>
                        setMethod(index, "minAmount", e.target.value)
                      }
                      placeholder="Min (0 = use overall)"
                      className="ad-input"
                    />
                    <input
                      type="number"
                      min="0"
                      value={method.maxAmount}
                      onChange={(e) =>
                        setMethod(index, "maxAmount", e.target.value)
                      }
                      placeholder="Max (0 = use overall)"
                      className="ad-input"
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <label className="ad-btn ad-btn--ghost ad-btn--sm cursor-pointer">
                      {uploading === index ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ImageUp size={14} />
                      )}
                      {method.logoUrl ? "Change logo" : "Upload logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          uploadLogo(index, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    {method.logoUrl ? (
                      <button
                        type="button"
                        onClick={() => setMethod(index, "logoUrl", "")}
                        className="ad-btn ad-btn--danger ad-btn--sm"
                        title="Remove logo"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── বোনাস ── */}
        <div className="ad-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
                Bonuses
              </h2>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                What a player can pick when paying through the gateway.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setBonuses((prev) => [
                  ...prev,
                  {
                    titleBn: "",
                    titleEn: "",
                    bonusType: "percent",
                    bonusValue: "0",
                    turnoverMultiplier: "1",
                    bonusScope: "all-time",
                    isActive: true,
                    providers: [],
                  },
                ])
              }
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              <Plus size={14} />
              Add bonus
            </button>
          </div>

          {bonuses.length === 0 ? (
            <p className="mt-4 text-[13px] text-[var(--text-disabled)]">
              No bonus — auto deposits credit the plain amount.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {bonuses.map((bonus, index) => (
                <div
                  key={bonus._id || index}
                  className="rounded-[12px] border border-white/[0.06] p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={bonus.titleBn}
                      onChange={(e) => setBonus(index, "titleBn", e.target.value)}
                      placeholder="Title (Bangla)"
                      className="ad-input"
                    />

                    <input
                      value={bonus.titleEn}
                      onChange={(e) => setBonus(index, "titleEn", e.target.value)}
                      placeholder="Title (English)"
                      className="ad-input"
                    />
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <select
                      value={bonus.bonusType}
                      onChange={(e) => setBonus(index, "bonusType", e.target.value)}
                      className="ad-input"
                    >
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed</option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      value={bonus.bonusValue}
                      onChange={(e) => setBonus(index, "bonusValue", e.target.value)}
                      placeholder="Value"
                      className="ad-input"
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={bonus.turnoverMultiplier}
                      onChange={(e) =>
                        setBonus(index, "turnoverMultiplier", e.target.value)
                      }
                      placeholder="Multiplier"
                      className="ad-input"
                    />

                    <select
                      value={bonus.bonusScope}
                      onChange={(e) => setBonus(index, "bonusScope", e.target.value)}
                      className="ad-input"
                    >
                      <option value="all-time">Every deposit</option>
                      <option value="first-deposit">First deposit only</option>
                    </select>

                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                        <input
                          type="checkbox"
                          checked={bonus.isActive}
                          onChange={(e) =>
                            setBonus(index, "isActive", e.target.checked)
                          }
                        />
                        On
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setBonuses((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="ad-btn ad-btn--danger ad-btn--sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-white/[0.06] pt-3">
                    <p className="ad-label">Eligible providers</p>

                    <ProviderPicker
                      value={bonus.providers}
                      onChange={(next) => setBonus(index, "providers", next)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={Boolean(busy)}
          className="ad-btn ad-btn--primary w-full sm:w-auto"
        >
          {busy === "save" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save gateway
        </button>
      </form>

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        The gateway confirms a payment by calling back with the token above. A
        callback whose token does not match is thrown away, and the same
        callback arriving twice credits the money only once.
      </p>
    </div>
  );
};

export default AutoDeposit;
