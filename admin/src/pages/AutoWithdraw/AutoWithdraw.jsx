import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Banknote,
  ImageUp,
  Loader2,
  Power,
  RefreshCw,
  Save,
  TriangleAlert,
  X,
} from "lucide-react";

import { api } from "../../api/axios";
import SecretInput from "../../components/SecretInput/SecretInput";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** সার্ভারে রাখা ছবির পুরো ঠিকানা */
const imageUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
};

const fetchSetting = async () => {
  const { data } = await api.get("/api/auto-withdraw/admin");
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
    order: Number(method.order ?? 0),
    minAmount: String(method.minAmount ?? 0),
    maxAmount: String(method.maxAmount ?? 0),
  }));

/**
 * অটো উইথড্র।
 *
 * গেটওয়ে নিজেই খেলোয়াড়কে টাকা পাঠায় — অ্যাডমিনের হাতে অনুমোদন লাগে
 * না। এখান থেকে টোকেন, সীমা আর কোন মাধ্যমগুলো চালু তা ঠিক হয়। বন্ধ
 * থাকলে ক্লায়েন্টে অটো উইথড্র দেখায় না, ম্যানুয়াল দিয়েই কাজ চলে।
 */
const AutoWithdraw = () => {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [token, setToken] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [methods, setMethods] = useState([]);

  const fill = (next) => {
    setSetting(next);

    if (next) {
      setMinAmount(String(next.minAmount ?? 0));
      setMaxAmount(String(next.maxAmount ?? 0));
      setFeePercent(String(next.feePercent ?? 0));
      setMethods(methodsFrom(next));
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
      const { data } = await api.put("/api/auto-withdraw/admin", payload);

      if (data?.data?.setting) fill(data.data.setting);
      toast.success(data?.message || "Saved");
      after?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const setMethod = (index, key, value) =>
    setMethods((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );

  const [uploading, setUploading] = useState(-1);

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

      const { data } = await api.post("/api/auto-withdraw/upload-logo", form);
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

    save(
      "save",
      {
        ...(token.trim() ? { businessToken: token.trim() } : {}),
        minAmount: Number(minAmount) || 1,
        maxAmount: Number(maxAmount) || 0,
        feePercent: Number(feePercent) || 0,
        methods: methods.map((method, index) => ({
          ...(method._id ? { _id: method._id } : {}),
          code: method.code,
          name: { bn: method.nameBn, en: method.nameEn },
          logoUrl: method.logoUrl,
          active: method.active,
          order: index,
          minAmount: Number(method.minAmount) || 0,
          maxAmount: Number(method.maxAmount) || 0,
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
          <h1 className="ad-title text-[26px] lg:text-[30px]">Auto Withdraw</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            The gateway that pays players out without an admin.
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
            <Banknote size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {loading
                ? "Loading…"
                : active
                  ? "Auto withdraw is on"
                  : "Auto withdraw is off"}
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
            {active ? "Turn auto withdraw off" : "Turn auto withdraw on"}
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
              <label className="ad-label" htmlFor="aw-token">
                Business token
              </label>
              <SecretInput
                id="aw-token"
                autoComplete="off"
                placeholder={
                  hasToken ? "Leave blank to keep the current one" : "Paste the token"
                }
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="mt-1 text-[12px] text-[var(--text-disabled)]">
                Stored write-only — it is never sent back to this page.
              </p>
            </div>

            <div>
              <label className="ad-label" htmlFor="aw-min">
                Minimum
              </label>
              <input
                id="aw-min"
                type="number"
                min="1"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="aw-max">
                Maximum
              </label>
              <input
                id="aw-max"
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="aw-fee">
                Fee %
              </label>
              <input
                id="aw-fee"
                type="number"
                min="0"
                step="0.1"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
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
              The gateway supports four mobile wallets. Turn each on or off and
              set its own limits.
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
                        </p>
                      </div>
                    </div>

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
        When a player asks to withdraw through an auto method, the amount is
        held from their balance and sent to the gateway. The gateway calls back
        as it processes, completes (with proof) or rejects — a rejection returns
        the money to the player automatically.
      </p>
    </div>
  );
};

export default AutoWithdraw;
