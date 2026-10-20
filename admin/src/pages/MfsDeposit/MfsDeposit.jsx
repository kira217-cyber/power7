import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ImageUp, KeyRound, Loader2, Plus, Power, RefreshCw, Save, Smartphone, Trash2, TriangleAlert, X } from "lucide-react";

import { api } from "../../api/axios";
import SecretInput from "../../components/SecretInput/SecretInput";
import ProviderPicker from "../../components/ProviderPicker/ProviderPicker";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const imageUrl = (url) => (!url ? "" : url.startsWith("http") ? url : `${API_URL}${url}`);

const fetchSetting = async () => {
  const { data } = await api.get("/api/mfs-deposit/admin");
  return data?.data || {};
};

const methodsFrom = (setting) =>
  (setting?.methods || []).map((method) => ({
    _id: method._id,
    code: method.code || "",
    nameBn: method.name?.bn || "",
    nameEn: method.name?.en || "",
    logoUrl: method.logoUrl || "",
    active: method.active !== false,
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
    providers: (bonus.eligibleProviders || []).map((item) => ({ providerCode: item.providerCode || "", percent: Number(item.percent ?? 100) })),
  }));

/**
 * পার্সোনাল অটো ডিপোজিট (MFSWallet)।
 *
 * SIM-ভিত্তিক গেটওয়ে — আপনাদের নিজের bKash/Nagad/Rocket/Upay নম্বরে টাকা আসে,
 * MFSWallet এর Android অ্যাপ SMS পড়ে মিলিয়ে নিশ্চিত করে। এখানে API Key, চালু/বন্ধ,
 * খেলোয়াড়কে দেখানো নাম, মাধ্যম আর বোনাস।
 */
const MfsDeposit = () => {
  const [setting, setSetting] = useState(null);
  const [webhookBase, setWebhookBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [quickAmounts, setQuickAmounts] = useState("");
  const [methods, setMethods] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [uploading, setUploading] = useState(-1);

  const fill = (next) => {
    setSetting(next);
    if (!next) return;
    setApiUrl(next.apiUrl || "");
    setNameBn(next.displayName?.bn || "");
    setNameEn(next.displayName?.en || "");
    setMinAmount(String(next.minAmount ?? 0));
    setMaxAmount(String(next.maxAmount ?? 0));
    setQuickAmounts((next.quickAmounts || []).join(", "));
    setMethods(methodsFrom(next));
    setBonuses(bonusesFrom(next));
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchSetting();
      fill(data.setting || null);
      setWebhookBase(data.webhookBase || "");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load setting");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (action, payload, after) => {
    try {
      setBusy(action);
      const { data } = await api.put("/api/mfs-deposit/admin", payload);
      if (data?.data?.setting) fill(data.data.setting);
      toast.success(data?.message || "Saved");
      after?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const setMethod = (index, key, value) => setMethods((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const setBonus = (index, key, value) => setBonuses((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const uploadLogo = async (index, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be 5MB or smaller");
    try {
      setUploading(index);
      const form = new FormData();
      form.append("logo", file);
      const { data } = await api.post("/api/mfs-deposit/upload-logo", form);
      if (data?.data?.logoUrl) setMethod(index, "logoUrl", data.data.logoUrl);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(-1);
    }
    return undefined;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const bad = bonuses.find((bonus) => bonus.providers.reduce((sum, item) => sum + (Number(item.percent) || 0), 0) > 100);
    if (bad) {
      toast.error(`Bonus "${bad.titleEn || bad.titleBn || "untitled"}" providers add up to more than 100%`);
      return;
    }
    save(
      "save",
      {
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        apiUrl: apiUrl.trim(),
        displayName: { bn: nameBn, en: nameEn },
        minAmount: Number(minAmount) || 1,
        maxAmount: Number(maxAmount) || 0,
        quickAmounts,
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
      () => setApiKey(""),
    );
  };

  const active = Boolean(setting?.active);
  const hasKey = Boolean(setting?.hasKey);
  const onCount = methods.filter((m) => m.active).length;

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">Personal Auto Deposit</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">MFSWallet — money comes to your own bKash / Nagad / Rocket / Upay numbers and the MFSWallet app confirms it.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
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
              borderColor: active ? "color-mix(in srgb, var(--status-success), transparent 70%)" : "rgba(255,255,255,0.12)",
              background: active ? "color-mix(in srgb, var(--status-success), transparent 90%)" : "rgba(255,255,255,0.05)",
              color: active ? "var(--status-success)" : "var(--text-muted)",
            }}
          >
            <Smartphone size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {loading ? "Loading…" : active ? "Personal auto deposit is on" : "Personal auto deposit is off"}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              {hasKey ? `API key ${setting?.keyPreview}` : "No API key yet — without one it cannot be turned on."}
              {active && onCount === 0 ? " · No method is on, so players do not see it." : ""}
            </p>
            {setting?.lastError && (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-[var(--status-danger)]">
                <TriangleAlert size={14} />
                Last gateway error: {setting.lastError}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.07] pt-5">
          <button
            type="button"
            disabled={Boolean(busy) || (!active && !hasKey)}
            onClick={() => save("toggle", { active: !active })}
            className={`ad-btn ad-btn--sm ${active ? "ad-btn--ghost" : "ad-btn--primary"}`}
          >
            {busy === "toggle" ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
            {active ? "Turn personal auto deposit off" : "Turn personal auto deposit on"}
          </button>
          {hasKey && (
            <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmClear(true)} className="ad-btn ad-btn--danger ad-btn--sm">
              <KeyRound size={15} />
              Remove API key
            </button>
          )}
        </div>
      </div>

      {/* ── চালুর আগে ── */}
      <div className="ad-card mt-4">
        <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">Before players can pay</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-[var(--text-secondary)]">
          <li>In the MFSWallet panel, install the MFSWallet Android app on the phone that has your SIMs and register it (SIM Devices).</li>
          <li>Set up your receiving numbers in the app — they appear under Payment Numbers. Without a device online, payments cannot be matched.</li>
          <li>Copy the API key from MFSWallet's Dashboard (API Integration Key) and paste it below, then turn it on.</li>
        </ol>
        {webhookBase && (
          <p className="mt-3 text-[12px] text-[var(--text-disabled)]">
            Webhooks are sent automatically with each payment to <span className="font-mono text-[var(--text-muted)]">{webhookBase}/…</span> — nothing to set in MFSWallet.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        {/* ── গেটওয়ে ── */}
        <div className="ad-card">
          <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">Gateway</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="ad-label" htmlFor="mfs-key">
                API key
              </label>
              <SecretInput
                id="mfs-key"
                autoComplete="off"
                placeholder={hasKey ? "Leave blank to keep the current one" : "opay_live_…"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="mt-1 text-[12px] text-[var(--text-disabled)]">Stored write-only — it is never sent back to this page.</p>
            </div>
            <div className="sm:col-span-3">
              <label className="ad-label" htmlFor="mfs-url">
                Create-link URL
              </label>
              <input id="mfs-url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="ad-input font-mono" placeholder="https://api.mfswallet.com/api/gateway/create-link" />
            </div>
            <div>
              <label className="ad-label" htmlFor="mfs-name-bn">
                Name for players (বাংলা)
              </label>
              <input id="mfs-name-bn" value={nameBn} onChange={(e) => setNameBn(e.target.value)} className="ad-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="ad-label" htmlFor="mfs-name-en">
                Name for players (English)
              </label>
              <input id="mfs-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="ad-input" />
            </div>
            <div>
              <label className="ad-label" htmlFor="mfs-min">
                Minimum
              </label>
              <input id="mfs-min" type="number" min="1" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="ad-input" />
            </div>
            <div>
              <label className="ad-label" htmlFor="mfs-max">
                Maximum
              </label>
              <input id="mfs-max" type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="ad-input" />
            </div>
            <div>
              <label className="ad-label" htmlFor="mfs-quick">
                Quick amounts
              </label>
              <input id="mfs-quick" value={quickAmounts} onChange={(e) => setQuickAmounts(e.target.value)} className="ad-input" placeholder="100, 300, 500, 1000" />
            </div>
          </div>
        </div>

        {/* ── মাধ্যম ── */}
        <div className="ad-card">
          <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">Payment methods</h2>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            The player picks one of these before paying. Turn on only the ones your MFSWallet numbers accept. Limit 0 = use the overall limit.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {methods.map((method, index) => (
              <div key={method._id || method.code} className="rounded-[12px] border border-white/[0.06] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {method.logoUrl ? (
                      <img src={imageUrl(method.logoUrl)} alt={method.code} className="h-14 w-14 rounded-lg bg-white/[0.04] object-contain p-1" />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/[0.06] text-[13px] uppercase text-[var(--text-muted)]">{method.code.slice(0, 2)}</span>
                    )}
                    <div>
                      <p className="text-[14px] font-bold text-[var(--neutral100)]">{method.nameEn || method.code}</p>
                      <p className="text-[11px] uppercase text-[var(--text-disabled)]">{method.code}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                    <input type="checkbox" checked={method.active} onChange={(e) => setMethod(index, "active", e.target.checked)} />
                    On
                  </label>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input value={method.nameBn} onChange={(e) => setMethod(index, "nameBn", e.target.value)} placeholder="Name (Bangla)" className="ad-input" />
                  <input value={method.nameEn} onChange={(e) => setMethod(index, "nameEn", e.target.value)} placeholder="Name (English)" className="ad-input" />
                  <input type="number" min="0" value={method.minAmount} onChange={(e) => setMethod(index, "minAmount", e.target.value)} placeholder="Min (0 = overall)" className="ad-input" />
                  <input type="number" min="0" value={method.maxAmount} onChange={(e) => setMethod(index, "maxAmount", e.target.value)} placeholder="Max (0 = overall)" className="ad-input" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="ad-btn ad-btn--ghost ad-btn--sm cursor-pointer">
                    {uploading === index ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />}
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
                    <button type="button" onClick={() => setMethod(index, "logoUrl", "")} className="ad-btn ad-btn--danger ad-btn--sm" title="Remove logo">
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── বোনাস ── */}
        <div className="ad-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">Bonuses</h2>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">What a player can pick when paying this way.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setBonuses((prev) => [...prev, { titleBn: "", titleEn: "", bonusType: "percent", bonusValue: "0", turnoverMultiplier: "1", bonusScope: "all-time", isActive: true, providers: [] }])
              }
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              <Plus size={14} />
              Add bonus
            </button>
          </div>
          {bonuses.length === 0 ? (
            <p className="mt-4 text-[13px] text-[var(--text-disabled)]">No bonus — the plain amount is credited.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {bonuses.map((bonus, index) => (
                <div key={bonus._id || index} className="rounded-[12px] border border-white/[0.06] p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={bonus.titleBn} onChange={(e) => setBonus(index, "titleBn", e.target.value)} placeholder="Title (Bangla)" className="ad-input" />
                    <input value={bonus.titleEn} onChange={(e) => setBonus(index, "titleEn", e.target.value)} placeholder="Title (English)" className="ad-input" />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <select value={bonus.bonusType} onChange={(e) => setBonus(index, "bonusType", e.target.value)} className="ad-input">
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed</option>
                    </select>
                    <input type="number" min="0" value={bonus.bonusValue} onChange={(e) => setBonus(index, "bonusValue", e.target.value)} placeholder="Value" className="ad-input" />
                    <input type="number" min="0" step="0.5" value={bonus.turnoverMultiplier} onChange={(e) => setBonus(index, "turnoverMultiplier", e.target.value)} placeholder="Multiplier" className="ad-input" />
                    <select value={bonus.bonusScope} onChange={(e) => setBonus(index, "bonusScope", e.target.value)} className="ad-input">
                      <option value="all-time">Every deposit</option>
                      <option value="first-deposit">First deposit only</option>
                    </select>
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                        <input type="checkbox" checked={bonus.isActive} onChange={(e) => setBonus(index, "isActive", e.target.checked)} />
                        On
                      </label>
                      <button type="button" onClick={() => setBonuses((prev) => prev.filter((_, i) => i !== index))} className="ad-btn ad-btn--danger ad-btn--sm">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-white/[0.06] pt-3">
                    <p className="ad-label">Eligible providers</p>
                    <ProviderPicker value={bonus.providers} onChange={(next) => setBonus(index, "providers", next)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={Boolean(busy)} className="ad-btn ad-btn--primary w-full sm:w-auto">
          {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      </form>

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        Every payment gets its own secret webhook address. A webhook with a wrong key, a different amount or a different method is thrown away, and the same
        payment is never credited twice. When MFSWallet cannot match a payment it sends "pending" — those wait in Personal Auto Deposit History for you to
        confirm or reject.
      </p>

      <ConfirmModal
        open={confirmClear}
        title="Remove the API key?"
        message="Personal auto deposit turns off until a new key is added."
        confirmText="Remove"
        danger
        busy={busy === "clear"}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => save("clear", { clearKey: true }, () => setConfirmClear(false))}
      />
    </div>
  );
};

export default MfsDeposit;
