import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Field, Loading, Modal, MoveButtons, PageHead, StatusPill } from "./bits";
import { errorOf, imageUrl, swapIds } from "./helpers";

/** আইকন চাপলে কী খোলে — admin এর ভাষায় */
const KINDS = {
  signin: { label: "Sign-in (daily check-in)", image: "entry-LOGIN.webp" },
  temu: { label: "TEMU grand prize ticket", image: "entry-TEMU.gif", ticket: true },
  redPacket: { label: "Red packet ticket", image: "entry-RAFFLE.gif", ticket: true },
  wheel: { label: "Lucky wheel ticket", image: "reward-wheel.png", ticket: true },
  claim: { label: "Reward Center — claim list", image: "promo-box.png" },
  referral: { label: "Invite friends page", image: "item-default.png" },
  promotion: { label: "A promotion (number)", image: "item-default.png", link: "Promotion number" },
  link: { label: "Any web address", image: "item-default.png", link: "https://…" },
};
const POSITIONS = { RIGHT_BOTTOM: "Right · bottom", RIGHT_MIDDLE: "Right · middle", LEFT_BOTTOM: "Left · bottom", LEFT_MIDDLE: "Left · middle" };
const PLATFORMS = { all: "Mobile + Desktop", mobile: "Mobile only", desktop: "Desktop only" };
const defaultImage = (kind) => `/assets/events/${KINDS[kind]?.image || "item-default.png"}`;

/** ফোনের ছোট ছবিতে কোথায় বসবে */
const PositionPreview = ({ position }) => (
  <div className="relative rounded-[14px] border border-white/15 bg-black/30" style={{ width: 90, height: 160 }}>
    <span
      className="absolute rounded-full bg-[var(--primary500)]"
      style={{ width: 16, height: 16, [position.startsWith("RIGHT") ? "right" : "left"]: 6, ...(position.endsWith("MIDDLE") ? { top: 72 } : { bottom: 26 }) }}
    />
  </div>
);

const EventForm = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState(() => ({
    kind: initial?.kind || "signin",
    titleBn: initial?.title?.bn || "",
    titleEn: initial?.title?.en || "",
    link: initial?.link || "",
    platform: initial?.platform || "all",
    onlyWithTicket: initial?.onlyWithTicket ?? true,
    isActive: initial?.isActive ?? true,
  }));
  const [file, setFile] = useState(null);
  const [clear, setClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const kind = KINDS[f.kind];
  const preview = file ? URL.createObjectURL(file) : !clear && initial?.image ? imageUrl(initial.image) : defaultImage(f.kind);

  const save = async () => {
    const body = new FormData();
    body.append("kind", f.kind);
    body.append("title", JSON.stringify({ bn: f.titleBn, en: f.titleEn }));
    body.append("link", kind.link ? f.link : "");
    body.append("platform", f.platform);
    body.append("onlyWithTicket", String(Boolean(kind.ticket && f.onlyWithTicket)));
    body.append("isActive", String(f.isActive));
    if (file) body.append("image", file);
    else if (clear) body.append("clearImage", "true");
    try {
      setBusy(true);
      if (initial?._id) await api.put(`/api/site-content/admin/events/${initial._id}`, body);
      else await api.post("/api/site-content/admin/events", body);
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(errorOf(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={initial?._id ? "Edit event icon" : "New event icon"} onClose={onClose} width={720}>
      <div className="grid gap-4 md:grid-cols-[1fr_170px]">
        <div className="grid gap-3">
          <Field label="When tapped, open">
            <select className="ad-input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {Object.entries(KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          {kind.link && (
            <Field label={kind.link}>
              <input className="ad-input" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
            </Field>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name (বাংলা)" hint="Shown when the mouse is over the icon.">
              <input className="ad-input" value={f.titleBn} onChange={(e) => setF({ ...f, titleBn: e.target.value })} />
            </Field>
            <Field label="Name (English)">
              <input className="ad-input" value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} />
            </Field>
          </div>
          <Field label="Show on">
            <select className="ad-input" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>
              {Object.entries(PLATFORMS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          {kind.ticket && (
            <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--text-secondary)]">
              <input type="checkbox" checked={f.onlyWithTicket} onChange={(e) => setF({ ...f, onlyWithTicket: e.target.checked })} /> Show only to players who have this ticket
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--text-secondary)]">
            <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Active
          </label>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="ad-label self-start">Icon</p>
          <div className="grid place-items-center rounded-[14px] bg-black/40" style={{ width: 150, height: 150 }}>
            <img src={preview} alt="" style={{ maxWidth: 120, maxHeight: 120, objectFit: "contain" }} />
          </div>
          <label className="ad-btn ad-btn--ghost ad-btn--sm cursor-pointer">
            Upload image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setClear(false);
              }}
            />
          </label>
          {(file || (initial?.image && !clear)) && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setClear(true);
              }}
              className="text-[12px] text-[var(--text-muted)] underline"
            >
              Use the default image
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="ad-btn ad-btn--ghost">
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={save} className="ad-btn ad-btn--primary">
          {busy ? <Loader2 size={15} className="animate-spin" /> : null} Save
        </button>
      </div>
    </Modal>
  );
};

/**
 * হোমের ভাসমান ইভেন্ট আইকন — মূল সাইটের ডান-নিচের চলন্ত LOGIN / TEMU /
 * RAFFLE। উপরে পুরো অংশের নিয়ম (কোন কোণে, কোন দিকে খোলে, কত সেকেন্ড
 * পরপর বদলায়), নিচে আইকনগুলো।
 */
const HomeEvents = () => {
  const [setting, setSetting] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([api.get("/api/site-content/admin/event-setting"), api.get("/api/site-content/admin/events")])
      .then(([a, b]) => {
        if (!alive) return;
        setSetting(a.data?.data?.setting);
        setRows(b.data?.data?.items || []);
      })
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
  const run = async (fn, ok) => {
    try {
      setBusy(true);
      await fn();
      if (ok) toast.success(ok);
      reload();
    } catch (err) {
      toast.error(errorOf(err));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (row) => {
    const body = new FormData();
    body.append("isActive", String(!row.isActive));
    return run(() => api.put(`/api/site-content/admin/events/${row._id}`, body));
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHead title="Home Events" subtitle="The floating event icons on the site (like the LOGIN / TEMU / RAFFLE icons at the bottom-right of the main site).">
        <button type="button" onClick={reload} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button type="button" onClick={() => setEditing({})} className="ad-btn ad-btn--primary ad-btn--sm">
          <Plus size={15} /> New icon
        </button>
      </PageHead>

      {loading && !setting ? (
        <Loading />
      ) : (
        <>
          {setting && (
            <div className="ad-card mb-5 grid gap-5 md:grid-cols-[1fr_110px]">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--text-secondary)] md:col-span-2">
                  <input type="checkbox" checked={setting.enabled} onChange={(e) => setSetting({ ...setting, enabled: e.target.checked })} /> Show the floating icons
                </label>
                <Field label="Corner">
                  <select className="ad-input" value={setting.position} onChange={(e) => setSetting({ ...setting, position: e.target.value })}>
                    {Object.entries(POSITIONS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Opens">
                  <select className="ad-input" value={setting.direction} onChange={(e) => setSetting({ ...setting, direction: e.target.value })}>
                    <option value="vertical">Up and down (column)</option>
                    <option value="horizontal">Side by side (row)</option>
                  </select>
                </Field>
                <Field label="Change icon every (seconds)" hint="When closed, the icons take turns.">
                  <input type="number" min={1} max={30} className="ad-input" value={setting.interval} onChange={(e) => setSetting({ ...setting, interval: e.target.value })} />
                </Field>
                <label className="flex cursor-pointer items-center gap-2 self-end pb-3 text-[14px] text-[var(--text-secondary)]">
                  <input type="checkbox" checked={setting.showGuests} onChange={(e) => setSetting({ ...setting, showGuests: e.target.checked })} /> Also show to visitors who are not logged in
                </label>
                <div className="md:col-span-2">
                  <button type="button" disabled={busy} onClick={() => run(() => api.put("/api/site-content/admin/event-setting", setting), "Saved")} className="ad-btn ad-btn--primary ad-btn--sm">
                    <Save size={15} /> Save settings
                  </button>
                </div>
              </div>
              <PositionPreview position={setting.position} />
            </div>
          )}

          {rows.length === 0 ? (
            <div className="ad-card flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
              <Sparkles size={26} /> No icons yet.
            </div>
          ) : (
            <div className="ad-card ad-table-wrap ad-scroll p-0">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    {["Order", "Icon", "Opens", "Shown on", "Only with ticket", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row._id} className="border-b border-white/[0.05] last:border-0">
                      <td className="px-4 py-3">
                        <MoveButtons
                          busy={busy}
                          onUp={i > 0 ? () => run(() => api.patch("/api/site-content/admin/events/reorder", { ids: swapIds(rows, i, i - 1) })) : null}
                          onDown={i < rows.length - 1 ? () => run(() => api.patch("/api/site-content/admin/events/reorder", { ids: swapIds(rows, i, i + 1) })) : null}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={row.image ? imageUrl(row.image) : defaultImage(row.kind)} alt="" className="rounded-md bg-black/30 object-contain" style={{ width: 48, height: 48 }} />
                          <span className="text-[14px] text-[var(--neutral100)]">{row.title?.bn || row.title?.en || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                        {KINDS[row.kind]?.label}
                        {row.link ? <span className="block text-[12px] text-[var(--text-muted)]">{row.link}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{PLATFORMS[row.platform]}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{KINDS[row.kind]?.ticket ? (row.onlyWithTicket ? "Yes" : "No") : "—"}</td>
                      <td className="px-4 py-3">
                        <button type="button" title="Show / hide" onClick={() => toggle(row)}>
                          <StatusPill on={row.isActive} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
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
        </>
      )}

      {editing && (
        <EventForm
          initial={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete this icon?"
        message="It disappears from the site."
        confirmText="Delete"
        danger
        busy={busy}
        onConfirm={() => run(() => api.delete(`/api/site-content/admin/events/${deleting._id}`), "Deleted").then(() => setDeleting(null))}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export default HomeEvents;
