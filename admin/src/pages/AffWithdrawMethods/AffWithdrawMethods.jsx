import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Banknote,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../../api/axios";

const TYPES = ["text", "number", "tel", "email"];

const blank = {
  methodId: "",
  name: { bn: "", en: "" },
  minimumWithdrawAmount: 0,
  maximumWithdrawAmount: 0,
  sort: 0,
  isActive: true,
  fields: [
    {
      key: "accountNo",
      label: { bn: "অ্যাকাউন্ট নম্বর", en: "Account number" },
      placeholder: { bn: "", en: "" },
      type: "text",
      required: true,
    },
  ],
};

/**
 * অ্যাফিলিয়েট কোন উপায়ে টাকা তুলবেন।
 *
 * খেলোয়াড়ের উইথড্র মেথড থেকে আলাদা: এখানে প্রতিটা উপায়ের জন্য আলাদা
 * করে ঠিক করে দেওয়া যায় কোন কোন ঘর ভরতে হবে — ব্যাংকের নাম, অ্যাকাউন্ট
 * নম্বর, শাখা যা লাগে। তাই নতুন ব্যাংক যোগ করতে কোড বদলাতে হয় না।
 *
 * সেটিংয়ের সুইচ দুটো ঠিক করে কখন তোলা যাবে — কতজন সক্রিয় খেলোয়াড়
 * আনতে হবে, আর জমে থাকা কমিশন মেলানো বাধ্যতামূলক কিনা।
 */
const AffWithdrawMethods = () => {
  const [methods, setMethods] = useState([]);
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [draft, setDraft] = useState(null);
  const [logo, setLogo] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const [methodRes, settingRes] = await Promise.all([
        api.get("/api/aff-withdraw/admin/methods"),
        api.get("/api/aff-withdraw/admin/setting"),
      ]);

      setMethods(methodRes?.data?.data?.methods || []);
      setSetting(settingRes?.data?.data?.setting || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    Promise.all([
      api.get("/api/aff-withdraw/admin/methods"),
      api.get("/api/aff-withdraw/admin/setting"),
    ])
      .then(([methodRes, settingRes]) => {
        if (!alive) return;

        setMethods(methodRes?.data?.data?.methods || []);
        setSetting(settingRes?.data?.data?.setting || null);
      })
      .catch((error) =>
        toast.error(error?.response?.data?.message || "Failed to load"),
      )
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  const saveSetting = async (patch) => {
    try {
      setBusy("setting");

      const { data } = await api.put("/api/aff-withdraw/admin/setting", patch);

      setSetting(data?.data?.setting || null);
      toast.success("Saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const saveMethod = async (event) => {
    event.preventDefault();

    try {
      setBusy("method");

      const form = new FormData();

      form.append("methodId", draft.methodId);
      form.append("name", JSON.stringify(draft.name));
      form.append("minimumWithdrawAmount", String(draft.minimumWithdrawAmount));
      form.append("maximumWithdrawAmount", String(draft.maximumWithdrawAmount));
      form.append("sort", String(draft.sort));
      form.append("isActive", String(draft.isActive));
      form.append("fields", JSON.stringify(draft.fields));

      if (logo) form.append("logo", logo);

      if (draft._id) {
        await api.put(`/api/aff-withdraw/admin/methods/${draft._id}`, form);
      } else {
        await api.post("/api/aff-withdraw/admin/methods", form);
      }

      toast.success("Saved");
      setDraft(null);
      setLogo(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const remove = async (method) => {
    if (!window.confirm(`Remove ${method.name?.en || method.methodId}?`)) return;

    try {
      setBusy(method._id);
      await api.delete(`/api/aff-withdraw/admin/methods/${method._id}`);

      toast.success("Removed");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Remove failed");
    } finally {
      setBusy("");
    }
  };

  const setField = (index, patch) =>
    setDraft((prev) => {
      const fields = structuredClone(prev.fields);
      fields[index] = { ...fields[index], ...patch };
      return { ...prev, fields };
    });

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            Affiliate Withdraw
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            How affiliates take their money out — separate from players.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setDraft(structuredClone(blank));
              setLogo(null);
            }}
            className="ad-btn ad-btn--primary ad-btn--sm"
          >
            <Plus size={15} />
            New method
          </button>
        </div>
      </div>

      {/* ── কখন তোলা যাবে ── */}
      {setting ? (
        <div className="ad-card mb-4">
          <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
            When an affiliate may withdraw
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ad-label" htmlFor="aff-required-referrals">
                Active players they must bring in
              </label>
              <input
                id="aff-required-referrals"
                type="number"
                min="0"
                value={setting.requiredActiveReferrals}
                onChange={(event) =>
                  setSetting((prev) => ({
                    ...prev,
                    requiredActiveReferrals: Number(event.target.value),
                  }))
                }
                onBlur={() =>
                  saveSetting({
                    requiredActiveReferrals: setting.requiredActiveReferrals,
                  })
                }
                className="ad-input"
              />
            </div>

            <div>
              <p className="ad-label">Commission must be settled first</p>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() =>
                  saveSetting({
                    requireSettledCommission: !setting.requireSettledCommission,
                  })
                }
                className={`ad-btn ad-btn--sm ${
                  setting.requireSettledCommission
                    ? "ad-btn--primary"
                    : "ad-btn--ghost"
                }`}
              >
                {setting.requireSettledCommission ? "Required" : "Not required"}
              </button>

              <p className="mt-2 text-[12px] text-[var(--text-disabled)]">
                With this on, an affiliate cannot withdraw while commission is
                still waiting for a Bulk Adjustment — that stops the same money
                going out twice.
              </p>
            </div>
          </div>

          {/* উত্তোলন পাতার উপরের নোট — অ্যাফিলিয়েট সাইটে যেমন দেখায় */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ["bn", "Note on the withdraw page (Bangla)"],
              ["en", "Note on the withdraw page (English)"],
            ].map(([code, label]) => (
              <div key={code}>
                <label className="ad-label" htmlFor={`aff-note-${code}`}>
                  {label}
                </label>
                <textarea
                  id={`aff-note-${code}`}
                  rows={3}
                  value={setting.note?.[code] || ""}
                  onChange={(event) =>
                    setSetting((prev) => ({
                      ...prev,
                      note: { ...(prev.note || {}), [code]: event.target.value },
                    }))
                  }
                  onBlur={() => saveSetting({ note: setting.note || {} })}
                  className="ad-input"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── উপায়ের ফর্ম ── */}
      {draft ? (
        <form onSubmit={saveMethod} className="ad-card mb-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {draft._id ? "Edit method" : "New method"}
            </h2>

            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setLogo(null);
              }}
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              <X size={14} />
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="ad-label" htmlFor="awm-id">
                Method id
              </label>
              <input
                id="awm-id"
                value={draft.methodId}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    methodId: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="BANK"
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="awm-logo">
                Logo
              </label>
              <input
                id="awm-logo"
                type="file"
                accept="image/*"
                onChange={(event) => setLogo(event.target.files?.[0] || null)}
                className="ad-input py-2"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="awm-name-bn">
                Name (Bangla)
              </label>
              <input
                id="awm-name-bn"
                value={draft.name.bn}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    name: { ...prev.name, bn: event.target.value },
                  }))
                }
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="awm-name-en">
                Name (English)
              </label>
              <input
                id="awm-name-en"
                value={draft.name.en}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    name: { ...prev.name, en: event.target.value },
                  }))
                }
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="awm-min">
                Minimum
              </label>
              <input
                id="awm-min"
                type="number"
                min="0"
                value={draft.minimumWithdrawAmount}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    minimumWithdrawAmount: Number(event.target.value),
                  }))
                }
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="awm-max">
                Maximum
              </label>
              <input
                id="awm-max"
                type="number"
                min="0"
                value={draft.maximumWithdrawAmount}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    maximumWithdrawAmount: Number(event.target.value),
                  }))
                }
                className="ad-input"
              />
            </div>
          </div>

          {/* ── কোন ঘরগুলো ভরতে হবে ── */}
          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--neutral100)]">
              Fields the affiliate fills in
            </h3>

            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  fields: [
                    ...prev.fields,
                    {
                      key: "",
                      label: { bn: "", en: "" },
                      placeholder: { bn: "", en: "" },
                      type: "text",
                      required: true,
                    },
                  ],
                }))
              }
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              <Plus size={14} />
              Add field
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {draft.fields.map((field, index) => (
              <div
                key={index}
                className="rounded-[14px] border border-white/[0.07] bg-black/20 p-3"
              >
                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    value={field.key}
                    onChange={(event) =>
                      setField(index, { key: event.target.value })
                    }
                    placeholder="key (accountNo)"
                    className="ad-input h-10"
                  />

                  <input
                    value={field.label.bn}
                    onChange={(event) =>
                      setField(index, {
                        label: { ...field.label, bn: event.target.value },
                      })
                    }
                    placeholder="Label (Bangla)"
                    className="ad-input h-10"
                  />

                  <input
                    value={field.label.en}
                    onChange={(event) =>
                      setField(index, {
                        label: { ...field.label, en: event.target.value },
                      })
                    }
                    placeholder="Label (English)"
                    className="ad-input h-10"
                  />

                  <div className="flex gap-2">
                    <select
                      value={field.type}
                      onChange={(event) =>
                        setField(index, { type: event.target.value })
                      }
                      className="ad-input h-10 w-auto flex-1"
                    >
                      {TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setField(index, { required: !field.required })
                      }
                      className={`ad-btn ad-btn--sm ${
                        field.required ? "ad-btn--primary" : "ad-btn--ghost"
                      }`}
                    >
                      {field.required ? "Required" : "Optional"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          fields: prev.fields.filter((_, i) => i !== index),
                        }))
                      }
                      className="ad-btn ad-btn--danger ad-btn--sm"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={Boolean(busy)}
            className="ad-btn ad-btn--primary mt-5 w-full sm:w-auto"
          >
            {busy === "method" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save method
          </button>
        </form>
      ) : null}

      {/* ── তালিকা ── */}
      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </div>
      ) : methods.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <Banknote size={26} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No method yet
          </p>
          <p className="max-w-[420px] text-[13px] text-[var(--text-muted)]">
            Affiliates cannot withdraw until at least one method is here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {methods.map((method) => (
            <div key={method._id} className="ad-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[16px] font-extrabold text-[var(--neutral100)]">
                    {method.name?.en}
                    <span
                      className="ms-2 text-[11px] font-bold"
                      style={{
                        color: method.isActive
                          ? "var(--status-success)"
                          : "var(--text-disabled)",
                      }}
                    >
                      {method.isActive ? "Active" : "Off"}
                    </span>
                  </p>

                  <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                    {method.name?.bn} · {method.methodId}
                  </p>

                  <p className="mt-2 text-[13px] text-[var(--text-muted)]">
                    Min {method.minimumWithdrawAmount} · Max{" "}
                    {method.maximumWithdrawAmount} · {method.fields?.length || 0}{" "}
                    field(s)
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {(method.fields || []).map((field) => (
                      <span
                        key={field.key}
                        className="rounded-full bg-white/[0.06] px-2 py-[2px] text-[11px] text-[var(--text-secondary)]"
                      >
                        {field.label?.en || field.key}
                        {field.required ? "" : " (optional)"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(structuredClone(method));
                      setLogo(null);
                    }}
                    className="ad-btn ad-btn--ghost ad-btn--sm"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>

                  <button
                    type="button"
                    disabled={busy === method._id}
                    onClick={() => remove(method)}
                    className="ad-btn ad-btn--danger ad-btn--sm"
                  >
                    {busy === method._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffWithdrawMethods;
