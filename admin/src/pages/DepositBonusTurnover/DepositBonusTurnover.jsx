import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Layers, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { api } from "../../api/axios";
import ProviderPicker from "../../components/ProviderPicker/ProviderPicker";

const fetchAll = async () => {
  const [methodsRes, configsRes] = await Promise.all([
    api.get("/api/deposit-methods"),
    api.get("/api/deposit-bonus-turnover"),
  ]);

  return {
    methods: methodsRes.data?.data?.methods || [],
    configs: configsRes.data?.data?.configs || [],
  };
};

const emptyDraft = {
  turnoverMultiplier: "1",
  eligibleProviders: [],
  channels: [],
  promotions: [],
};

const draftFrom = (config) => ({
  turnoverMultiplier: String(config?.turnoverMultiplier ?? 1),
  eligibleProviders: (config?.eligibleProviders || []).map((item) => ({
    providerCode: item.providerCode || "",
    percent: Number(item.percent ?? 100),
  })),
  channels: (config?.channels || []).map((channel) => ({
    id: channel.id || "",
    nameBn: channel.name?.bn || "",
    nameEn: channel.name?.en || "",
    tagText: channel.tagText || "+0%",
    bonusPercent: String(channel.bonusPercent ?? 0),
    isActive: channel.isActive !== false,
  })),
  promotions: (config?.promotions || []).map((promo) => ({
    id: promo.id || "",
    nameBn: promo.name?.bn || "",
    nameEn: promo.name?.en || "",
    bonusType: promo.bonusType || "fixed",
    bonusValue: String(promo.bonusValue ?? 0),
    turnoverMultiplier: String(promo.turnoverMultiplier ?? 1),
    bonusScope: promo.bonusScope || "all-time",
    isActive: promo.isActive !== false,
    eligibleProviders: (promo.eligibleProviders || []).map((item) => ({
      providerCode: item.providerCode || "",
      percent: Number(item.percent ?? 100),
    })),
  })),
});

/**
 * বোনাস ও টার্নওভার।
 *
 * চ্যানেল হলো ডিপোজিট পেজে মেথডের নিচের ট্যাবগুলো — প্রতিটার নিজের
 * বোনাসের হার। প্রোমোশন তার উপরে বাড়তি যোগ হয় আর নিজের টার্নওভার
 * গুণক নিয়ে আসে। হিসাবটা ব্যবহারকারী জমা দেওয়ার মুহূর্তেই বসে যায়,
 * তাই পরে এখানে বদলালেও পুরোনো ডিপোজিটের শর্ত বদলায় না।
 */
const DepositBonusTurnover = () => {
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

  const setRow = (listKey, index, key, value) =>
    setDraft((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));

  const removeRow = (listKey, index) =>
    setDraft((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, i) => i !== index),
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selected) {
      toast.error("Choose a deposit method first");
      return;
    }

    if (draft.channels.length === 0) {
      toast.error("At least one channel is needed — a deposit picks one");
      return;
    }

    const over = (list) =>
      (list || []).reduce((sum, item) => sum + (Number(item.percent) || 0), 0) >
      100;

    if (over(draft.eligibleProviders)) {
      toast.error("Default eligible providers add up to more than 100%");
      return;
    }

    const badPromo = draft.promotions.find((promo) =>
      over(promo.eligibleProviders),
    );

    if (badPromo) {
      toast.error(
        `Promotion "${badPromo.id || "untitled"}" providers add up to more than 100%`,
      );
      return;
    }

    try {
      setBusy("save");

      const { data } = await api.post("/api/deposit-bonus-turnover", {
        depositMethod: selected,
        turnoverMultiplier: Number(draft.turnoverMultiplier) || 0,
        eligibleProviders: draft.eligibleProviders,
        channels: draft.channels.map((channel, index) => ({
          id: channel.id.trim() || `channel-${index}`,
          name: { bn: channel.nameBn, en: channel.nameEn },
          tagText: channel.tagText,
          bonusPercent: Number(channel.bonusPercent) || 0,
          isActive: channel.isActive,
        })),
        promotions: draft.promotions.map((promo, index) => ({
          id: promo.id.trim() || `promotion-${index}`,
          name: { bn: promo.nameBn, en: promo.nameEn },
          bonusType: promo.bonusType,
          bonusValue: Number(promo.bonusValue) || 0,
          turnoverMultiplier: Number(promo.turnoverMultiplier) || 0,
          bonusScope: promo.bonusScope,
          isActive: promo.isActive,
          sort: index,
          eligibleProviders: promo.eligibleProviders,
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
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            Bonus &amp; Turnover
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            How much bonus a deposit earns, and how much play it takes to free it.
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
          <Layers size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No deposit method yet
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            Add a method first — bonus rules belong to a method.
          </p>
        </div>
      ) : (
        <>
          <div className="ad-card mb-4">
            <label className="ad-label" htmlFor="bt-method">
              Deposit method
            </label>

            <select
              id="bt-method"
              value={selected}
              onChange={(e) => pick(e.target.value)}
              className="ad-input"
            >
              <option value="">Choose a method…</option>
              {methods.map((method) => (
                <option key={method._id} value={method._id}>
                  {method.methodName?.en || method.methodId}
                  {configuredIds.has(String(method._id)) ? " — rules set" : " — no rules"}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* ── সাধারণ নিয়ম ── */}
              <div className="ad-card">
                <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
                  Default rule
                </h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  Used when a deposit takes only a channel bonus, with no
                  promotion picked.
                </p>

                <div className="mt-4 flex flex-col gap-4">
                  <div className="sm:max-w-[240px]">
                    <label className="ad-label" htmlFor="bt-multiplier">
                      Turnover multiplier
                    </label>
                    <input
                      id="bt-multiplier"
                      type="number"
                      min="0"
                      step="0.5"
                      value={draft.turnoverMultiplier}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, turnoverMultiplier: e.target.value }))
                      }
                      className="ad-input"
                    />
                  </div>

                  <div>
                    <p className="ad-label">Eligible providers</p>

                    <ProviderPicker
                      value={draft.eligibleProviders}
                      onChange={(next) =>
                        setDraft((prev) => ({ ...prev, eligibleProviders: next }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* ── চ্যানেল ── */}
              <div className="ad-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
                      Channels
                    </h2>
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                      The tabs under the method on the deposit page — each with
                      its own bonus rate.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        channels: [
                          ...prev.channels,
                          {
                            id: "",
                            nameBn: "",
                            nameEn: "",
                            tagText: "+0%",
                            bonusPercent: "0",
                            isActive: true,
                          },
                        ],
                      }))
                    }
                    className="ad-btn ad-btn--ghost ad-btn--sm"
                  >
                    <Plus size={14} />
                    Add channel
                  </button>
                </div>

                {draft.channels.length === 0 ? (
                  <p className="mt-4 text-[13px] text-[var(--status-pending)]">
                    A method needs at least one channel, or nobody can deposit
                    with it.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    {draft.channels.map((channel, index) => (
                      <div
                        key={index}
                        className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_110px_110px_auto_auto]"
                      >
                        <input
                          value={channel.id}
                          onChange={(e) => setRow("channels", index, "id", e.target.value)}
                          placeholder="cashout"
                          className="ad-input"
                        />

                        <input
                          value={channel.nameBn}
                          onChange={(e) =>
                            setRow("channels", index, "nameBn", e.target.value)
                          }
                          placeholder="Name (Bangla)"
                          className="ad-input"
                        />

                        <input
                          value={channel.nameEn}
                          onChange={(e) =>
                            setRow("channels", index, "nameEn", e.target.value)
                          }
                          placeholder="Name (English)"
                          className="ad-input"
                        />

                        <input
                          value={channel.tagText}
                          onChange={(e) =>
                            setRow("channels", index, "tagText", e.target.value)
                          }
                          placeholder="+5%"
                          className="ad-input"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={channel.bonusPercent}
                          onChange={(e) =>
                            setRow("channels", index, "bonusPercent", e.target.value)
                          }
                          placeholder="5"
                          className="ad-input"
                        />

                        <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                          <input
                            type="checkbox"
                            checked={channel.isActive}
                            onChange={(e) =>
                              setRow("channels", index, "isActive", e.target.checked)
                            }
                          />
                          On
                        </label>

                        <button
                          type="button"
                          onClick={() => removeRow("channels", index)}
                          className="ad-btn ad-btn--danger ad-btn--sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── প্রোমোশন ── */}
              <div className="ad-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
                      Promotions
                    </h2>
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                      Extra bonus on top of the channel. A promotion brings its
                      own multiplier, which replaces the default one.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        promotions: [
                          ...prev.promotions,
                          {
                            id: "",
                            nameBn: "",
                            nameEn: "",
                            bonusType: "percent",
                            bonusValue: "0",
                            turnoverMultiplier: "1",
                            bonusScope: "all-time",
                            isActive: true,
                            eligibleProviders: [],
                          },
                        ],
                      }))
                    }
                    className="ad-btn ad-btn--ghost ad-btn--sm"
                  >
                    <Plus size={14} />
                    Add promotion
                  </button>
                </div>

                {draft.promotions.length === 0 ? (
                  <p className="mt-4 text-[13px] text-[var(--text-disabled)]">
                    No promotion — deposits take only the channel bonus.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-col gap-4">
                    {draft.promotions.map((promo, index) => (
                      <div
                        key={index}
                        className="rounded-[12px] border border-white/[0.06] p-3"
                      >
                        <div className="grid gap-3 lg:grid-cols-3">
                          <input
                            value={promo.id}
                            onChange={(e) =>
                              setRow("promotions", index, "id", e.target.value)
                            }
                            placeholder="first100"
                            className="ad-input"
                          />

                          <input
                            value={promo.nameBn}
                            onChange={(e) =>
                              setRow("promotions", index, "nameBn", e.target.value)
                            }
                            placeholder="Name (Bangla)"
                            className="ad-input"
                          />

                          <input
                            value={promo.nameEn}
                            onChange={(e) =>
                              setRow("promotions", index, "nameEn", e.target.value)
                            }
                            placeholder="Name (English)"
                            className="ad-input"
                          />
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <select
                            value={promo.bonusType}
                            onChange={(e) =>
                              setRow("promotions", index, "bonusType", e.target.value)
                            }
                            className="ad-input"
                          >
                            <option value="percent">Percent</option>
                            <option value="fixed">Fixed</option>
                          </select>

                          <input
                            type="number"
                            min="0"
                            value={promo.bonusValue}
                            onChange={(e) =>
                              setRow("promotions", index, "bonusValue", e.target.value)
                            }
                            placeholder="Value"
                            className="ad-input"
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={promo.turnoverMultiplier}
                            onChange={(e) =>
                              setRow(
                                "promotions",
                                index,
                                "turnoverMultiplier",
                                e.target.value,
                              )
                            }
                            placeholder="Multiplier"
                            className="ad-input"
                          />

                          <select
                            value={promo.bonusScope}
                            onChange={(e) =>
                              setRow("promotions", index, "bonusScope", e.target.value)
                            }
                            className="ad-input"
                          >
                            <option value="all-time">Every deposit</option>
                            <option value="first-deposit">First deposit only</option>
                          </select>

                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                              <input
                                type="checkbox"
                                checked={promo.isActive}
                                onChange={(e) =>
                                  setRow("promotions", index, "isActive", e.target.checked)
                                }
                              />
                              On
                            </label>

                            <button
                              type="button"
                              onClick={() => removeRow("promotions", index)}
                              className="ad-btn ad-btn--danger ad-btn--sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-white/[0.06] pt-3">
                          <p className="ad-label">
                            Eligible providers for this promotion
                          </p>

                          <ProviderPicker
                            value={promo.eligibleProviders}
                            onChange={(next) =>
                              setRow("promotions", index, "eligibleProviders", next)
                            }
                          />

                          <p className="mt-2 text-[12px] text-[var(--text-disabled)]">
                            Leaving this empty means the default list above is
                            used — not that the promotion is unrestricted.
                          </p>
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
                Save rules
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default DepositBonusTurnover;
