import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Gift,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../../api/axios";
import ProviderPicker from "../../components/ProviderPicker/ProviderPicker";
import ProviderChips from "../../components/ProviderPicker/ProviderChips";

const fetchCampaigns = async () => {
  const { data } = await api.get("/api/register-bonus");
  return data?.data?.campaigns || [];
};

// <input type="datetime-local"> এর জন্য স্থানীয় সময়ে "YYYY-MM-DDTHH:mm"
const localInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const emptyDraft = {
  startDate: "",
  endDate: "",
  titleBn: "",
  titleEn: "",
  descriptionBn: "",
  descriptionEn: "",
  bonusAmount: "",
  turnoverMultiplier: "3",
  order: "0",
  status: "active",
  eligibleProviders: [],
};

const draftFrom = (campaign) => ({
  titleBn: campaign.title?.bn || "",
  titleEn: campaign.title?.en || "",
  descriptionBn: campaign.description?.bn || "",
  descriptionEn: campaign.description?.en || "",
  bonusAmount: String(campaign.bonusAmount ?? ""),
  turnoverMultiplier: String(campaign.turnoverMultiplier ?? ""),
  order: String(campaign.order ?? 0),
  status: campaign.status || "active",
  eligibleProviders: campaign.eligibleProviders || [],
  startDate: localInput(campaign.startDate),
  endDate: localInput(campaign.endDate),
});

/**
 * রেজিস্টার বোনাস।
 *
 * নতুন অ্যাকাউন্ট খুললে যে টাকাটা দেওয়া হয় — সাথে সাথে তোলা যায় না,
 * গুণক অনুযায়ী খেলা শেষ হলে তবেই খোলে। একসাথে একটাই ক্যাম্পেইন চালু
 * থাকে; উপরের অবস্থানের (order) চালু ক্যাম্পেইনটাই কাজে লাগে।
 */
const RegisterBonus = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  // তালিকার "Scheduled / Ended" দেখার সময় — পাতা খোলার মুহূর্ত
  const [now] = useState(() => Date.now());

  const [editing, setEditing] = useState(null); // null | "new" | id
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    let alive = true;

    fetchCampaigns()
      .then((list) => alive && setCampaigns(list))
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
      setCampaigns(await fetchCampaigns());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setDraft(emptyDraft);
    setEditing("new");
  };

  const openEdit = (campaign) => {
    setDraft(draftFrom(campaign));
    setEditing(campaign._id);
  };

  const close = () => {
    setEditing(null);
    setDraft(emptyDraft);
  };

  const set = (key) => (event) =>
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      title: { bn: draft.titleBn, en: draft.titleEn },
      description: { bn: draft.descriptionBn, en: draft.descriptionEn },
      bonusAmount: Number(draft.bonusAmount),
      turnoverMultiplier: Number(draft.turnoverMultiplier),
      order: Number(draft.order),
      status: draft.status,
      eligibleProviders: draft.eligibleProviders,
      // ফাঁকা শুরু = এখন থেকে, ফাঁকা শেষ = মেয়াদ নেই
      startDate: draft.startDate ? new Date(draft.startDate).toISOString() : "",
      endDate: draft.endDate ? new Date(draft.endDate).toISOString() : "",
    };

    if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
      toast.error("End date must be after the start date");
      return;
    }

    if (!payload.title.bn && !payload.title.en) {
      toast.error("Give the campaign a title");
      return;
    }

    if (!(payload.bonusAmount > 0)) {
      toast.error("Bonus amount must be more than 0");
      return;
    }

    // সার্ভারও আটকায়, কিন্তু এখানে বললে ফর্ম ছেড়ে যেতে হয় না
    const providerTotal = draft.eligibleProviders.reduce(
      (sum, item) => sum + (Number(item.percent) || 0),
      0,
    );

    if (providerTotal > 100) {
      toast.error("Eligible providers add up to more than 100%");
      return;
    }

    try {
      setBusy("save");

      const { data } =
        editing === "new"
          ? await api.post("/api/register-bonus", payload)
          : await api.put(`/api/register-bonus/${editing}`, payload);

      toast.success(data?.message || "Saved");
      close();
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const handleDelete = async (campaign) => {
    const name = campaign.title?.en || campaign.title?.bn || "this campaign";

    if (!window.confirm(`Delete ${name}? Running turnovers are not touched.`)) {
      return;
    }

    try {
      setBusy(campaign._id);
      const { data } = await api.delete(`/api/register-bonus/${campaign._id}`);

      toast.success(data?.message || "Deleted");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            Register Bonus
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Money given on sign up, released after the turnover is played.
          </p>
        </div>

        <div className="flex gap-3">
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
            onClick={openNew}
            className="ad-btn ad-btn--primary ad-btn--sm"
          >
            <Plus size={15} />
            New campaign
          </button>
        </div>
      </div>

      {/* ── ফর্ম ── */}
      {editing && (
        <div className="ad-card mb-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {editing === "new" ? "New campaign" : "Edit campaign"}
            </h2>

            <button
              type="button"
              onClick={close}
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              <X size={15} />
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="ad-label" htmlFor="rb-title-bn">
                  Title (Bangla)
                </label>
                <input
                  id="rb-title-bn"
                  value={draft.titleBn}
                  onChange={set("titleBn")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="rb-title-en">
                  Title (English)
                </label>
                <input
                  id="rb-title-en"
                  value={draft.titleEn}
                  onChange={set("titleEn")}
                  className="ad-input"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="ad-label" htmlFor="rb-desc-bn">
                  Description (Bangla)
                </label>
                <textarea
                  id="rb-desc-bn"
                  rows={3}
                  value={draft.descriptionBn}
                  onChange={set("descriptionBn")}
                  className="ad-input h-auto py-3"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="rb-desc-en">
                  Description (English)
                </label>
                <textarea
                  id="rb-desc-en"
                  rows={3}
                  value={draft.descriptionEn}
                  onChange={set("descriptionEn")}
                  className="ad-input h-auto py-3"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="ad-label" htmlFor="rb-amount">
                  Bonus amount
                </label>
                <input
                  id="rb-amount"
                  type="number"
                  min="0"
                  value={draft.bonusAmount}
                  onChange={set("bonusAmount")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="rb-multiplier">
                  Turnover multiplier
                </label>
                <input
                  id="rb-multiplier"
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.turnoverMultiplier}
                  onChange={set("turnoverMultiplier")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="rb-order">
                  Order
                </label>
                <input
                  id="rb-order"
                  type="number"
                  min="0"
                  value={draft.order}
                  onChange={set("order")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="rb-status">
                  Status
                </label>
                <select
                  id="rb-status"
                  value={draft.status}
                  onChange={set("status")}
                  className="ad-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="ad-label" htmlFor="rb-start">
                  Starts (empty = now)
                </label>
                <input id="rb-start" type="datetime-local" value={draft.startDate} onChange={set("startDate")} className="ad-input" />
              </div>

              <div>
                <label className="ad-label" htmlFor="rb-end">
                  Ends (empty = no end)
                </label>
                <input id="rb-end" type="datetime-local" value={draft.endDate} onChange={set("endDate")} className="ad-input" />
              </div>
            </div>

            {/* ── কোন প্রোভাইডারে খেললে গোনা হবে ── */}
            <div>
              <p className="ad-label">Eligible providers</p>

              <ProviderPicker
                value={draft.eligibleProviders}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, eligibleProviders: next }))
                }
              />
            </div>

            <p className="text-[13px] text-[var(--text-muted)]">
              A player will have to stake{" "}
              <span className="font-bold text-[var(--primary500)]">
                {(Number(draft.bonusAmount) || 0) *
                  (Number(draft.turnoverMultiplier) || 0)}
              </span>{" "}
              before the bonus becomes real balance.
            </p>

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
              Save campaign
            </button>
          </form>
        </div>
      )}

      {/* ── তালিকা ── */}
      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <Gift size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No campaign yet
          </p>
          <p className="max-w-[420px] text-[13px] text-[var(--text-muted)]">
            Until one is active, new players register without any bonus.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns.map((campaign) => {
            // চালু হলেও সময়ের বাইরে থাকলে বোনাস যায় না — সেটাও দেখানো
            const notYet = campaign.startDate && new Date(campaign.startDate).getTime() > now;
            const ended = campaign.endDate && new Date(campaign.endDate).getTime() < now;
            const isActive = campaign.status === "active" && !notYet && !ended;
            const stateLabel = campaign.status !== "active" ? "Inactive" : notYet ? "Scheduled" : ended ? "Ended" : "Active";

            return (
              <div key={campaign._id} className="ad-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-extrabold text-[var(--neutral100)]">
                        {campaign.title?.en || campaign.title?.bn || "Untitled"}
                      </h3>

                      <span
                        className="rounded-full px-2 py-[2px] text-[11px] font-bold"
                        style={{
                          background: isActive
                            ? "color-mix(in srgb, var(--status-success), transparent 88%)"
                            : "rgba(255,255,255,0.06)",
                          color: isActive
                            ? "var(--status-success)"
                            : "var(--text-muted)",
                        }}
                      >
                        {stateLabel}
                      </span>
                    </div>

                    {campaign.title?.bn && (
                      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                        {campaign.title.bn}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[var(--text-muted)]">
                      <span>
                        Bonus{" "}
                        <b className="text-[var(--primary500)]">
                          {campaign.bonusAmount}
                        </b>
                      </span>
                      <span>
                        Turnover{" "}
                        <b className="text-[var(--neutral100)]">
                          {campaign.bonusAmount * campaign.turnoverMultiplier}
                        </b>{" "}
                        ({campaign.turnoverMultiplier}×)
                      </span>
                      <span>Order {campaign.order}</span>
                      <span>
                        {new Date(campaign.startDate || campaign.createdAt).toLocaleString()} →{" "}
                        {campaign.endDate ? new Date(campaign.endDate).toLocaleString() : "no end"}
                      </span>
                    </div>

                    {/* কোন প্রোভাইডারে খেললে টার্নওভার এগোবে — Edit না
                        খুলেই দেখা যাক, নইলে সেট করা আছে কিনা বোঝা যায় না */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="text-[var(--text-disabled)]">
                        Providers
                      </span>

                      {campaign.eligibleProviders?.length ? (
                        <>
                          <ProviderChips list={campaign.eligibleProviders} />

                          <span className="text-[var(--text-disabled)]">
                            · open{" "}
                            {Math.max(
                              0,
                              100 -
                                campaign.eligibleProviders.reduce(
                                  (sum, item) => sum + Number(item.percent || 0),
                                  0,
                                ),
                            )}
                            %
                          </span>
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)]">
                          any provider counts in full
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(campaign)}
                      className="ad-btn ad-btn--ghost ad-btn--sm"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={busy === campaign._id}
                      onClick={() => handleDelete(campaign)}
                      className="ad-btn ad-btn--danger ad-btn--sm"
                    >
                      {busy === campaign._id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        Only the highest-placed active campaign is given out. Changing a
        campaign never rewrites a bonus somebody already received.
      </p>
    </div>
  );
};

export default RegisterBonus;
