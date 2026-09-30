import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { api } from "../../api/axios";

const fetchData = async () => {
  const { data } = await api.get("/api/referral/admin/setting");
  return data?.data?.setting || null;
};

/** ছোট চালু/বন্ধ বোতাম */
export const Switch = ({ checked, onChange, label }) => (
  <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[var(--text-secondary)]">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-[22px] w-[40px] rounded-full transition"
      style={{ background: checked ? "var(--primary500)" : "rgb(255 255 255 / 0.12)" }}
    >
      <span
        className="absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white transition-all"
        style={{ left: checked ? 21 : 3 }}
      />
    </button>
    {label}
  </label>
);

const Section = ({ title, hint, on, onToggle, children }) => (
  <div className="ad-card mb-4">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[16px] font-bold text-[var(--neutral100)]">{title}</h2>
        {hint ? <p className="mt-1 text-[13px] text-[var(--text-muted)]">{hint}</p> : null}
      </div>
      {onToggle ? <Switch checked={on} onChange={onToggle} label={on ? "On" : "Off"} /> : null}
    </div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="ad-label">{label}</label>
    {children}
  </div>
);

const TIERS = [1, 2, 3];
const tierValue = (tiers, tier) => tiers?.find((t) => t.tier === tier)?.percent ?? 0;

/**
 * "বন্ধুদের আমন্ত্রণ করুন" প্রোগ্রামের নিয়ম — আমন্ত্রণ পুরস্কার, মাসিক
 * মাইলফলক, জমার রিবেট আর বাজির কমিশন (৩ স্তর)। অ্যাফিলিয়েটের খেলোয়াড়
 * এই প্রোগ্রামের বাইরে — তাঁদের কমিশন অ্যাফিলিয়েট থেকেই।
 */
const ReferralProgram = () => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setForm(await fetchData());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchData()
      .then((next) => alive && setForm(next))
      .catch((error) => toast.error(error?.response?.data?.message || "Failed to load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const set = (path, value) =>
    setForm((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let obj = next;
      keys.slice(0, -1).forEach((k) => {
        obj[k] = obj[k] || {};
        obj = obj[k];
      });
      obj[keys.at(-1)] = value;
      return next;
    });

  const setTier = (key, tier, percent) =>
    setForm((prev) => {
      const next = structuredClone(prev);
      const tiers = TIERS.map((t) => ({ tier: t, percent: t === tier ? percent : tierValue(prev[key].tiers, t) }));
      next[key].tiers = tiers;
      return next;
    });

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await api.put("/api/referral/admin/setting", form);
      setForm(data?.data?.setting || form);
      toast.success("Referral program saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  const milestones = form.achievement?.milestones || [];
  const sumOf = (key) => TIERS.reduce((s, t) => s + Number(tierValue(form[key]?.tiers, t) || 0), 0).toFixed(2);

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">Referral Program</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Rewards players earn by inviting friends (&quot;Invite friends&quot; on the client).
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="ad-btn ad-btn--ghost ad-btn--sm">
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" onClick={save} disabled={saving} className="ad-btn ad-btn--primary ad-btn--sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
        </div>
      </div>

      <Section
        title="Program"
        hint="Turning this off hides every reward below; rewards already earned can still be claimed."
        on={form.isActive}
        onToggle={(v) => set("isActive", v)}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Estimate per invitee (৳, display only)">
            <input type="number" min="0" className="ad-input" value={form.estimatePerInvitee} onChange={(e) => set("estimatePerInvitee", e.target.value)} />
          </Field>
          <Field label="Invite link domain (blank = site address)">
            <input className="ad-input" placeholder="https://www.example.com" value={form.inviteDomain} onChange={(e) => set("inviteDomain", e.target.value)} />
          </Field>
          <Field label="Agent (affiliate) link">
            <input className="ad-input" placeholder="https://aff.example.com" value={form.agentLink} onChange={(e) => set("agentLink", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Invitation reward"
        hint="Paid once when an invited friend becomes qualified — both totals must be reached."
        on={form.invitation?.enabled}
        onToggle={(v) => set("invitation.enabled", v)}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Reward (৳)">
            <input type="number" min="0" className="ad-input" value={form.invitation.amount} onChange={(e) => set("invitation.amount", e.target.value)} />
          </Field>
          <Field label="Friend's total deposit ≥">
            <input type="number" min="0" className="ad-input" value={form.invitation.requireDeposit} onChange={(e) => set("invitation.requireDeposit", e.target.value)} />
          </Field>
          <Field label="Friend's total bets ≥">
            <input type="number" min="0" className="ad-input" value={form.invitation.requireTurnover} onChange={(e) => set("invitation.requireTurnover", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Achievement (monthly)"
        hint="Extra lump sum when this many friends qualify in the same month."
        on={form.achievement?.enabled}
        onToggle={(v) => set("achievement.enabled", v)}
      >
        <div className="grid gap-2">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="number" min="1" className="ad-input" value={m.count} placeholder="Friends" onChange={(e) => set("achievement.milestones", milestones.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))} />
              <span className="whitespace-nowrap text-[13px] text-[var(--text-muted)]">friends →</span>
              <input type="number" min="0" className="ad-input" value={m.amount} placeholder="৳" onChange={(e) => set("achievement.milestones", milestones.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
              <button type="button" title="Remove" onClick={() => set("achievement.milestones", milestones.filter((_, j) => j !== i))} className="ad-btn ad-btn--ghost ad-btn--sm">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set("achievement.milestones", [...milestones, { count: "", amount: "" }])} className="ad-btn ad-btn--ghost ad-btn--sm w-fit">
            <Plus size={14} /> Add milestone
          </button>
        </div>
      </Section>

      {[
        ["depositRebate", "Deposit rebate", "A percent of every approved deposit by friends (real money, not the bonus)."],
        ["bettingRebate", "Betting commission", "A percent of every bet by friends — collected into one row per day."],
      ].map(([key, title, hint]) => (
        <Section key={key} title={`${title} — total ${sumOf(key)}%`} hint={hint} on={form[key]?.enabled} onToggle={(v) => set(`${key}.enabled`, v)}>
          <div className="grid gap-3 sm:grid-cols-3">
            {TIERS.map((tier) => (
              <Field key={tier} label={tier === 1 ? "Level 1 — direct friend (%)" : `Level ${tier} (%)`}>
                <input type="number" min="0" max="10" step="0.01" className="ad-input" value={tierValue(form[key]?.tiers, tier)} onChange={(e) => setTier(key, tier, e.target.value)} />
              </Field>
            ))}
          </div>
        </Section>
      ))}

      <Section title="Rules" hint="Shown to players under the program. One rule per line.">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="বাংলা">
            <textarea rows={7} className="ad-input" value={form.rules?.bn || ""} onChange={(e) => set("rules.bn", e.target.value)} />
          </Field>
          <Field label="English">
            <textarea rows={7} className="ad-input" value={form.rules?.en || ""} onChange={(e) => set("rules.en", e.target.value)} />
          </Field>
        </div>
      </Section>

      <p className="text-[12px] text-[var(--text-disabled)]">
        Players referred by an affiliate are outside this program — the affiliate earns their own commission instead,
        so nobody is paid twice for the same player.
      </p>
    </div>
  );
};

export default ReferralProgram;
