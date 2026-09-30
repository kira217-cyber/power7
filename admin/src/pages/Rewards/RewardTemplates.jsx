import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Gift, Loader2, Pencil, Plus, RefreshCw, Send, Trash2, X } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Field, Loading, Modal, PageHead, StatusPill } from "../SiteContent/bits";
import { errorOf } from "../SiteContent/helpers";

import { KINDS } from "./kinds";
const TASKS = { wallet: "Bind withdrawal wallet", deposit: "Make a deposit", invite: "Each qualified friend" };

const blank = {
  kind: "redPacket",
  name: { bn: "", en: "" },
  label: { bn: "", en: "" },
  description: { bn: "", en: "" },
  validDays: 7,
  turnoverMultiplier: 1,
  redPacket: { min: 5, max: 38 },
  wheel: { segments: [3, 5, 8, 10, 18, 28, 58, 88].map((amount, i) => ({ amount, weight: [30, 25, 18, 12, 8, 4, 2, 1][i] })) },
  temu: { target: 1088, initMinPct: 86, initMaxPct: 90, stepMinPct: 35, stepMaxPct: 60, finishBelow: 8, tasks: ["wallet", "deposit", "invite"], maxInvites: 10 },
  isActive: true,
};

const Num = ({ value, onChange, step = "any", ...rest }) => (
  <input type="number" step={step} className="ad-input" value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} {...rest} />
);

/** বাংলা + ইংরেজি দুই ঘর পাশাপাশি */
const Both = ({ label, value, onChange, area = false }) => (
  <div className="grid gap-3 md:grid-cols-2">
    {["bn", "en"].map((lng) => (
      <Field key={lng} label={`${label} (${lng === "bn" ? "বাংলা" : "English"})`}>
        {area ? (
          <textarea rows={3} className="ad-input" value={value?.[lng] || ""} onChange={(e) => onChange({ ...value, [lng]: e.target.value })} />
        ) : (
          <input className="ad-input" value={value?.[lng] || ""} onChange={(e) => onChange({ ...value, [lng]: e.target.value })} />
        )}
      </Field>
    ))}
  </div>
);

/** টেমপ্লেট তৈরি/বদলানো */
const TemplateForm = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState(() => ({ ...blank, ...initial, temu: { ...blank.temu, ...(initial?.temu || {}) }, redPacket: { ...blank.redPacket, ...(initial?.redPacket || {}) }, wheel: initial?.wheel?.segments?.length ? initial.wheel : blank.wheel }));
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setF((v) => ({ ...v, [key]: value }));
  const setIn = (group, key, value) => setF((v) => ({ ...v, [group]: { ...v[group], [key]: value } }));
  const segs = f.wheel.segments;
  const totalWeight = segs.reduce((s, x) => s + Number(x.weight || 0), 0) || 1;

  const save = async () => {
    try {
      setBusy(true);
      if (initial?._id) await api.put(`/api/rewards/admin/templates/${initial._id}`, f);
      else await api.post("/api/rewards/admin/templates", f);
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(errorOf(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={initial?._id ? "Edit ticket template" : "New ticket template"} onClose={onClose} width={760}>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Ticket type">
            <select className="ad-input" value={f.kind} disabled={Boolean(initial?._id)} onChange={(e) => set("kind", e.target.value)}>
              {Object.entries(KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valid for (days)">
            <Num value={f.validDays} onChange={(v) => set("validDays", v)} min={1} />
          </Field>
          <Field label="Turnover × (0 = none)" hint="Winnings must be played this many times before withdrawal.">
            <Num value={f.turnoverMultiplier} onChange={(v) => set("turnoverMultiplier", v)} min={0} />
          </Field>
        </div>
        <Both label="Name" value={f.name} onChange={(v) => set("name", v)} />
        <Both label="Coupon label" value={f.label} onChange={(v) => set("label", v)} />
        <Both label="Description" value={f.description} onChange={(v) => set("description", v)} area />

        {f.kind === "redPacket" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Minimum amount (৳)">
              <Num value={f.redPacket.min} onChange={(v) => setIn("redPacket", "min", v)} min={0} />
            </Field>
            <Field label="Maximum amount (৳)">
              <Num value={f.redPacket.max} onChange={(v) => setIn("redPacket", "max", v)} min={0} />
            </Field>
          </div>
        )}

        {f.kind === "wheel" && (
          <div>
            <p className="ad-label">Wheel segments (2–12) — a bigger weight lands more often</p>
            <div className="grid gap-2">
              {segs.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-[12px] text-[var(--text-muted)]">{i + 1}</span>
                  <div style={{ width: 150 }}>
                    <Num value={seg.amount} placeholder="Amount ৳" onChange={(v) => set("wheel", { segments: segs.map((s, j) => (j === i ? { ...s, amount: v } : s)) })} min={0} />
                  </div>
                  <div style={{ width: 120 }}>
                    <Num value={seg.weight} placeholder="Weight" onChange={(v) => set("wheel", { segments: segs.map((s, j) => (j === i ? { ...s, weight: v } : s)) })} min={0} />
                  </div>
                  <span className="w-16 text-[12px] text-[var(--text-muted)]">{((Number(seg.weight || 0) / totalWeight) * 100).toFixed(1)}%</span>
                  <button type="button" disabled={segs.length <= 2} onClick={() => set("wheel", { segments: segs.filter((_, j) => j !== i) })} className="ad-btn ad-btn--ghost ad-btn--sm">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            {segs.length < 12 && (
              <button type="button" onClick={() => set("wheel", { segments: [...segs, { amount: 1, weight: 1 }] })} className="ad-btn ad-btn--ghost ad-btn--sm mt-2">
                <Plus size={14} /> Add segment
              </button>
            )}
            <p className="mt-2 text-[12px] text-[var(--text-muted)]">
              Average payout per spin: ৳ {(segs.reduce((s, x) => s + Number(x.amount || 0) * Number(x.weight || 0), 0) / totalWeight).toFixed(2)}
            </p>
          </div>
        )}

        {f.kind === "temu" && (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Target (৳) — paid when reached">
                <Num value={f.temu.target} onChange={(v) => setIn("temu", "target", v)} min={1} />
              </Field>
              <Field label="Start at min % of target">
                <Num value={f.temu.initMinPct} onChange={(v) => setIn("temu", "initMinPct", v)} min={1} max={99} />
              </Field>
              <Field label="Start at max % of target">
                <Num value={f.temu.initMaxPct} onChange={(v) => setIn("temu", "initMaxPct", v)} min={1} max={99} />
              </Field>
              <Field label="Each task adds min % of what is left">
                <Num value={f.temu.stepMinPct} onChange={(v) => setIn("temu", "stepMinPct", v)} min={1} max={100} />
              </Field>
              <Field label="Each task adds max % of what is left">
                <Num value={f.temu.stepMaxPct} onChange={(v) => setIn("temu", "stepMaxPct", v)} min={1} max={100} />
              </Field>
              <Field label="Finish when less than (৳) is left" hint="So the target can really be reached.">
                <Num value={f.temu.finishBelow} onChange={(v) => setIn("temu", "finishBelow", v)} min={0} />
              </Field>
            </div>
            <div className="flex flex-wrap items-end gap-5">
              {Object.entries(TASKS).map(([k, v]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={f.temu.tasks.includes(k)}
                    onChange={(e) => setIn("temu", "tasks", e.target.checked ? [...f.temu.tasks, k] : f.temu.tasks.filter((x) => x !== k))}
                  />
                  {v}
                </label>
              ))}
              <div style={{ width: 160 }}>
                <Field label="Max friends counted">
                  <Num value={f.temu.maxInvites} onChange={(v) => setIn("temu", "maxInvites", v)} min={0} />
                </Field>
              </div>
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--text-secondary)]">
          <input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active (can be sent)
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ad-btn ad-btn--ghost">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={save} className="ad-btn ad-btn--primary">
            {busy ? <Loader2 size={15} className="animate-spin" /> : null} Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

/** টেমপ্লেট থেকে ইউজারনেম ধরে টিকিট পাঠানো */
const SendForm = ({ template, onClose }) => {
  const [ids, setIds] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    try {
      setBusy(true);
      const { data } = await api.post("/api/rewards/admin/issue", { template: template._id, userIds: ids });
      toast.success(data.message);
      if (data.data?.missing?.length) toast.warn(`Not found: ${data.data.missing.join(", ")}`);
      onClose();
    } catch (err) {
      toast.error(errorOf(err, "Could not send"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Send "${template.name?.en || template.name?.bn}"`} onClose={onClose}>
      <Field label="Usernames" hint="Separate with commas, spaces or new lines (up to 500).">
        <textarea rows={5} className="ad-input" value={ids} onChange={(e) => setIds(e.target.value)} />
      </Field>
      <div className="mt-4 flex justify-end">
        <button type="button" disabled={busy || !ids.trim()} onClick={send} className="ad-btn ad-btn--primary">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send ticket
        </button>
      </div>
    </Modal>
  );
};

const prizeText = (t) =>
  t.kind === "redPacket"
    ? `৳ ${t.redPacket?.min} – ${t.redPacket?.max}`
    : t.kind === "wheel"
      ? (t.wheel?.segments || []).map((s) => s.amount).join(" / ")
      : `Target ৳ ${t.temu?.target} · ${(t.temu?.tasks || []).join(", ")}`;

/**
 * পুরস্কার কেন্দ্রের টিকিট — admin আগে টেমপ্লেট বানান (লাল প্যাকেট / চাকা /
 * টেমু), তারপর খেলোয়াড়দের পাঠান। সাইন-ইনের দিন আর নিবন্ধনও এগুলোই দেয়।
 */
const RewardTemplates = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState(null);
  const [sending, setSending] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/api/rewards/admin/templates")
      .then(({ data }) => alive && setRows(data?.data?.templates || []))
      .catch((e) => toast.error(errorOf(e, "Failed to load")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = () => {
    setLoading(true);
    setTick((x) => x + 1);
  };

  const remove = async () => {
    try {
      setBusy(true);
      const { data } = await api.delete(`/api/rewards/admin/templates/${deleting._id}`);
      toast.success(data.message);
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHead title="Reward Tickets" subtitle="Ticket templates for the Reward Center (red packet, lucky wheel, TEMU). Send them to players or use them in Sign-in.">
        <button type="button" onClick={reload} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button type="button" onClick={() => setEditing({})} className="ad-btn ad-btn--primary ad-btn--sm">
          <Plus size={15} /> New template
        </button>
      </PageHead>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
          <Gift size={26} /> No templates yet.
        </div>
      ) : (
        <div className="ad-card ad-table-wrap ad-scroll p-0">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Name", "Type", "Prize", "Valid", "Turnover", "Tickets (open / claimed / expired)", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-white/[0.05] align-top last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-[14px] font-semibold text-[var(--neutral100)]">{row.name?.bn || row.name?.en}</p>
                    <p className="text-[12px] text-[var(--text-muted)]">{row.name?.en}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{KINDS[row.kind]}</td>
                  <td className="max-w-[240px] px-4 py-3 text-[13px] text-[var(--text-secondary)]">{prizeText(row)}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{row.validDays} d</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{row.turnoverMultiplier}×</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    {row.stats.available} / {row.stats.claimed} / {row.stats.expired}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill on={row.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" title="Send to players" disabled={!row.isActive} onClick={() => setSending(row)} className="ad-btn ad-btn--ghost ad-btn--sm">
                        <Send size={14} />
                      </button>
                      <button type="button" title="Edit" onClick={() => setEditing(row)} className="ad-btn ad-btn--ghost ad-btn--sm">
                        <Pencil size={14} />
                      </button>
                      <button type="button" title="Delete" onClick={() => setDeleting(row)} className="ad-btn ad-btn--ghost ad-btn--sm">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TemplateForm
          initial={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {sending && (
        <SendForm
          template={sending}
          onClose={() => {
            setSending(null);
            reload();
          }}
        />
      )}
      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete this template?"
        message="If players already have tickets from it, it is turned off instead (their tickets keep working)."
        confirmText="Delete"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export default RewardTemplates;
