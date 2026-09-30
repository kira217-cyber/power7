import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ClipboardList, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { api } from "../../api/axios";

const fetchAll = async () => {
  const [methodsRes, configsRes] = await Promise.all([
    api.get("/api/deposit-methods"),
    api.get("/api/deposit-fields"),
  ]);

  return {
    methods: methodsRes.data?.data?.methods || [],
    configs: configsRes.data?.data?.configs || [],
  };
};

const emptyDraft = { instructionsBn: "", instructionsEn: "", inputs: [] };

const draftFrom = (config) => ({
  instructionsBn: config?.instructions?.bn || "",
  instructionsEn: config?.instructions?.en || "",
  inputs: (config?.inputs || []).map((input) => ({
    key: input.key || "",
    labelBn: input.label?.bn || "",
    labelEn: input.label?.en || "",
    placeholderBn: input.placeholder?.bn || "",
    placeholderEn: input.placeholder?.en || "",
    type: input.type || "text",
    required: input.required !== false,
    uniqueValue: Boolean(input.uniqueValue),
  })),
});

/**
 * ডিপোজিট ফর্মের ঘর।
 *
 * কোন উপায়ে টাকা পাঠালে ব্যবহারকারীকে কী কী লিখতে হবে সেটা এখান থেকেই
 * ঠিক হয় — কোডে বাঁধা নেই, তাই নতুন তথ্য চাইতে ডেভেলপার লাগে না।
 * প্রতিটা মেথডের নিজের একটা ফর্ম।
 */
const DepositField = () => {
  const [methods, setMethods] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    let alive = true;

    fetchAll()
      .then((data) => {
        if (!alive) return;

        setMethods(data.methods);
        setConfigs(data.configs);
      })
      .catch((error) =>
        toast.error(error?.response?.data?.message || "Failed to load"),
      )
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchAll();

      setMethods(data.methods);
      setConfigs(data.configs);

      if (selected) {
        const found = data.configs.find(
          (config) => String(config.depositMethod?._id) === selected,
        );

        setDraft(found ? draftFrom(found) : emptyDraft);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  /** মেথড বেছে নিলে তার আগের ফর্মটা তুলে আনা হয় */
  const pick = (methodId) => {
    setSelected(methodId);

    if (!methodId) {
      setDraft(emptyDraft);
      return;
    }

    const found = configs.find(
      (config) => String(config.depositMethod?._id) === methodId,
    );

    setDraft(found ? draftFrom(found) : emptyDraft);
  };

  const setInput = (index, key, value) =>
    setDraft((prev) => ({
      ...prev,
      inputs: prev.inputs.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selected) {
      toast.error("Choose a deposit method first");
      return;
    }

    try {
      setBusy("save");

      const { data } = await api.post("/api/deposit-fields", {
        depositMethod: selected,
        instructions: { bn: draft.instructionsBn, en: draft.instructionsEn },
        inputs: draft.inputs
          .filter((input) => input.key.trim())
          .map((input) => ({
            key: input.key.trim(),
            label: { bn: input.labelBn, en: input.labelEn },
            placeholder: { bn: input.placeholderBn, en: input.placeholderEn },
            type: input.type,
            required: input.required,
            uniqueValue: input.uniqueValue,
          })),
      });

      toast.success(data?.message || "Saved");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const configuredIds = new Set(
    configs.map((config) => String(config.depositMethod?._id)),
  );

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">Deposit Field</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            What a player has to fill in for each deposit method.
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

      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </div>
      ) : methods.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <ClipboardList size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No deposit method yet
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            Add a method first — the form belongs to a method.
          </p>
        </div>
      ) : (
        <>
          <div className="ad-card mb-4">
            <label className="ad-label" htmlFor="df-method">
              Deposit method
            </label>

            <select
              id="df-method"
              value={selected}
              onChange={(e) => pick(e.target.value)}
              className="ad-input"
            >
              <option value="">Choose a method…</option>
              {methods.map((method) => (
                <option key={method._id} value={method._id}>
                  {method.methodName?.en || method.methodId}
                  {configuredIds.has(String(method._id)) ? " — form set" : " — no form"}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <form onSubmit={handleSubmit} className="ad-card flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="ad-label" htmlFor="df-inst-bn">
                    Instruction (Bangla)
                  </label>
                  <textarea
                    id="df-inst-bn"
                    rows={3}
                    value={draft.instructionsBn}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, instructionsBn: e.target.value }))
                    }
                    className="ad-input h-auto py-3"
                  />
                </div>

                <div>
                  <label className="ad-label" htmlFor="df-inst-en">
                    Instruction (English)
                  </label>
                  <textarea
                    id="df-inst-en"
                    rows={3}
                    value={draft.instructionsEn}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, instructionsEn: e.target.value }))
                    }
                    className="ad-input h-auto py-3"
                  />
                </div>
              </div>

              <div className="rounded-[14px] border border-white/[0.07] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-extrabold text-[var(--neutral100)]">
                      Form fields
                    </h3>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      The key is what the answer is stored under — keep it unique.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        inputs: [
                          ...prev.inputs,
                          {
                            key: "",
                            labelBn: "",
                            labelEn: "",
                            placeholderBn: "",
                            placeholderEn: "",
                            type: "text",
                            required: true,
                            uniqueValue: false,
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

                {draft.inputs.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-disabled)]">
                    No field — the player only enters an amount.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {draft.inputs.map((input, index) => (
                      <div
                        key={index}
                        className="rounded-[12px] border border-white/[0.06] p-3"
                      >
                        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
                          <input
                            value={input.key}
                            onChange={(e) => setInput(index, "key", e.target.value)}
                            placeholder="trxId"
                            className="ad-input"
                          />

                          <input
                            value={input.labelBn}
                            onChange={(e) => setInput(index, "labelBn", e.target.value)}
                            placeholder="Label (Bangla)"
                            className="ad-input"
                          />

                          <input
                            value={input.labelEn}
                            onChange={(e) => setInput(index, "labelEn", e.target.value)}
                            placeholder="Label (English)"
                            className="ad-input"
                          />

                          <select
                            value={input.type}
                            onChange={(e) => setInput(index, "type", e.target.value)}
                            className="ad-input"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="tel">Phone</option>
                          </select>

                          <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                            <input
                              type="checkbox"
                              checked={input.required}
                              onChange={(e) =>
                                setInput(index, "required", e.target.checked)
                              }
                            />
                            Required
                          </label>

                          {/* TrxID এর মতো ঘর — একই মান দিয়ে দ্বিতীয়বার জমা নেয় না */}
                          <label
                            className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]"
                            title="The same value (e.g. a transaction ID) cannot be used in another pending or approved deposit"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(input.uniqueValue)}
                              onChange={(e) =>
                                setInput(index, "uniqueValue", e.target.checked)
                              }
                            />
                            Must be unique (e.g. TrxID)
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                inputs: prev.inputs.filter((_, i) => i !== index),
                              }))
                            }
                            className="ad-btn ad-btn--danger ad-btn--sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <input
                            value={input.placeholderBn}
                            onChange={(e) =>
                              setInput(index, "placeholderBn", e.target.value)
                            }
                            placeholder="Placeholder (Bangla)"
                            className="ad-input"
                          />

                          <input
                            value={input.placeholderEn}
                            onChange={(e) =>
                              setInput(index, "placeholderEn", e.target.value)
                            }
                            placeholder="Placeholder (English)"
                            className="ad-input"
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
                Save form
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default DepositField;
