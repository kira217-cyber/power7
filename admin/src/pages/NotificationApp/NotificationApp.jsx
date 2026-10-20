import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { BellRing, Download, Eye, EyeOff, Link2, Loader2, Power, RefreshCw, Save, Send, Smartphone, TriangleAlert } from "lucide-react";

import { api } from "../../api/axios";
import SecretInput from "../../components/SecretInput/SecretInput";

/** APK — admin সাইটের নিজের ফাইল (public/notification.apk) */
export const NOTIFICATION_APK = `${import.meta.env.BASE_URL}notification.apk`;

const SOUNDS = [
  { key: "important", icon: "🚨", label: "Loud", hint: "Ring + alarm" },
  { key: "normal", icon: "🔔", label: "Normal", hint: "Standard chime" },
  { key: "silent", icon: "🔕", label: "Silent", hint: "No sound" },
];

const fmtTime = (value) => (value ? new Date(value).toLocaleString("en-GB") : "—");

/**
 * Notification App — সাইটের মালিকের ফোনে push (adminnoti.oraclesoft.online)।
 *
 * মালিক APK বসিয়ে নিচের ফোন + PIN দিয়ে ঢোকেন। কোন ঘটনায় notification যাবে,
 * কোন শব্দে, আর চাপলে admin এর কোন পাতা খুলবে — সব এখান থেকে।
 */
const NotificationApp = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [adminUrl, setAdminUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [events, setEvents] = useState([]);

  const fill = (next) => {
    setData(next);
    const s = next?.setting || {};
    setApiBase(s.apiBase || "");
    setAdminUrl(s.adminUrl || "");
    setPhone(s.phone || "");
    setPinCode(s.pinCode || "");
    setCompanyName(s.companyName || "");
    setEvents((next?.events || []).map((e) => ({ ...e })));
  };

  const load = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get("/api/admin-notify/admin");
      fill(res?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (action, request, after) => {
    try {
      setBusy(action);
      const { data: res } = await request();
      if (res?.data?.setting) fill(res.data);
      toast.success(res?.message || "Done");
      after?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed");
    } finally {
      setBusy("");
    }
  };

  const setting = data?.setting || {};
  const active = Boolean(setting.active);
  const ready = Boolean(setting.hasKey) && Boolean(setting.companyId || setting.phone);

  const setEvent = (key, patch) => setEvents((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  const groups = useMemo(() => {
    const map = new Map();
    events.forEach((e) => map.set(e.group, [...(map.get(e.group) || []), e]));
    return [...map.entries()];
  }, [events]);

  const saveAll = (e) => {
    e?.preventDefault();
    run(
      "save",
      () =>
        api.put("/api/admin-notify/admin", {
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          apiBase,
          adminUrl,
          phone,
          pinCode,
          companyName,
          events: Object.fromEntries(events.map((ev) => [ev.key, { enabled: ev.enabled, priority: ev.priority, url: ev.url }])),
        }),
      () => setApiKey(""),
    );
  };

  const setAll = (enabled) => setEvents((prev) => prev.map((e) => ({ ...e, enabled })));

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">Notification App</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">Push alerts to the owner's phone — deposits, withdraws, sign-ups and more.</p>
        </div>
        <div className="flex gap-2">
          <a href={NOTIFICATION_APK} download="notification.apk" className="ad-btn ad-btn--primary ad-btn--sm">
            <Download size={15} />
            Download App (APK)
          </a>
          <button type="button" onClick={load} disabled={loading} className="ad-btn ad-btn--ghost ad-btn--sm">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
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
            <BellRing size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {loading ? "Loading…" : active ? "Notifications are on" : "Notifications are off"}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              {setting.hasKey ? `API key ${setting.keyPreview}` : "No API key yet."} · Sent {setting.sentCount || 0} · Last {fmtTime(setting.lastSentAt)}
            </p>
            {setting.lastError && (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-[var(--status-danger)]">
                <TriangleAlert size={14} />
                Last error ({fmtTime(setting.lastErrorAt)}): {setting.lastError}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.07] pt-5">
          <button
            type="button"
            disabled={Boolean(busy) || (!active && !ready)}
            onClick={() => run("toggle", () => api.put("/api/admin-notify/admin", { active: !active }))}
            className={`ad-btn ad-btn--sm ${active ? "ad-btn--ghost" : "ad-btn--primary"}`}
          >
            {busy === "toggle" ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
            {active ? "Turn notifications off" : "Turn notifications on"}
          </button>
          {SOUNDS.map((sound) => (
            <button
              key={sound.key}
              type="button"
              disabled={Boolean(busy) || !ready}
              onClick={() => run(`test-${sound.key}`, () => api.post("/api/admin-notify/admin/test", { priority: sound.key }))}
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              {busy === `test-${sound.key}` ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Test {sound.label.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── App এ লগইন ── */}
      <div className="ad-card mt-4">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[var(--neutral100)]">
          <Smartphone size={17} />
          Login in the app
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-[var(--text-secondary)]">
          <li>Download the APK (button above) and install it on the owner's Android phone.</li>
          <li>Open it and log in with the phone number and PIN below. Allow notifications.</li>
          <li>Press "Test loud" — the phone should ring.</li>
        </ol>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[12px] border border-white/[0.07] bg-[var(--neutral900)] p-3">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-disabled)]">Account</p>
            <p className="mt-1 text-[15px] font-bold text-[var(--neutral100)]">{setting.companyName || "—"}</p>
          </div>
          <div className="rounded-[12px] border border-white/[0.07] bg-[var(--neutral900)] p-3">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-disabled)]">Phone</p>
            <p className="mt-1 font-mono text-[15px] font-bold text-[var(--neutral100)]">{setting.phone || "—"}</p>
          </div>
          <div className="rounded-[12px] border border-white/[0.07] bg-[var(--neutral900)] p-3">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-disabled)]">PIN</p>
            <p className="mt-1 flex items-center gap-2 font-mono text-[15px] font-bold text-[var(--neutral100)]">
              {setting.pinCode ? (showPin ? setting.pinCode : "••••••") : "—"}
              {setting.pinCode && (
                <button type="button" onClick={() => setShowPin((v) => !v)} className="text-[var(--text-muted)] hover:text-[var(--neutral100)]" aria-label="Show PIN">
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              )}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={saveAll} className="mt-4 flex flex-col gap-4">
        {/* ── ঘটনা ── */}
        <div className="ad-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">What sends a notification</h2>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">Turn each one on or off, pick its sound, and the page it opens when tapped.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAll(true)} className="ad-btn ad-btn--ghost ad-btn--sm">
                All on
              </button>
              <button type="button" onClick={() => setAll(false)} className="ad-btn ad-btn--ghost ad-btn--sm">
                All off
              </button>
            </div>
          </div>

          {groups.map(([group, list]) => (
            <div key={group} className="mt-5">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--primary500)]">{group}</p>
              <div className="flex flex-col gap-2">
                {list.map((ev) => (
                  <div key={ev.key} className={`rounded-[12px] border border-white/[0.06] p-3 ${ev.enabled ? "" : "opacity-60"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input type="checkbox" checked={ev.enabled} onChange={(e) => setEvent(ev.key, { enabled: e.target.checked })} className="h-4 w-4 accent-[var(--primary500)]" />
                        <span>
                          <span className="block text-[14px] font-bold text-[var(--neutral100)]">{ev.label}</span>
                          <span className="block text-[12px] text-[var(--text-muted)]">{ev.title}</span>
                        </span>
                      </label>
                      <div className="flex gap-1.5">
                        {SOUNDS.map((sound) => (
                          <button
                            key={sound.key}
                            type="button"
                            title={sound.hint}
                            onClick={() => setEvent(ev.key, { priority: sound.key })}
                            className={`rounded-[10px] border px-2.5 py-1.5 text-[12px] font-semibold transition ${
                              ev.priority === sound.key
                                ? "border-[var(--primary500)] bg-[var(--primary500)]/15 text-[var(--neutral100)]"
                                : "border-white/[0.08] text-[var(--text-muted)] hover:border-white/20"
                            }`}
                          >
                            {sound.icon} {sound.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Link2 size={14} className="shrink-0 text-[var(--text-disabled)]" />
                      <input
                        value={ev.url}
                        onChange={(e) => setEvent(ev.key, { url: e.target.value })}
                        placeholder={ev.link || "Set the admin URL below"}
                        className="ad-input !h-9 font-mono !text-[12px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── সংযোগ ── */}
        <div className="ad-card">
          <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">Connection</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="ad-label" htmlFor="nt-admin">
                Admin URL (opened when a notification is tapped)
              </label>
              <input id="nt-admin" value={adminUrl} onChange={(e) => setAdminUrl(e.target.value)} className="ad-input font-mono" placeholder={data?.defaultAdminUrl || "https://admin.example.com"} />
              <p className="mt-1 text-[12px] text-[var(--text-disabled)]">Each notification opens its page here, e.g. {(adminUrl || data?.defaultAdminUrl || "https://admin…").replace(/\/+$/, "")}/deposit-requests. A link typed on a row above wins.</p>
            </div>
            <div>
              <label className="ad-label" htmlFor="nt-name">
                Account name
              </label>
              <input id="nt-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="ad-input" />
            </div>
            <div>
              <label className="ad-label" htmlFor="nt-phone">
                App login phone
              </label>
              <input id="nt-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="ad-input font-mono" placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="ad-label" htmlFor="nt-pin">
                App login PIN
              </label>
              <input id="nt-pin" value={pinCode} onChange={(e) => setPinCode(e.target.value)} className="ad-input font-mono" placeholder="6 digits" />
              <p className="mt-1 text-[12px] text-[var(--text-disabled)]">Only a note for you — change the real PIN in the notification panel.</p>
            </div>
            <div>
              <label className="ad-label" htmlFor="nt-base">
                Notification API URL
              </label>
              <input id="nt-base" value={apiBase} onChange={(e) => setApiBase(e.target.value)} className="ad-input font-mono" />
            </div>
            <div className="sm:col-span-2">
              <label className="ad-label" htmlFor="nt-key">
                API key (x-api-key)
              </label>
              <SecretInput id="nt-key" autoComplete="off" placeholder={setting.hasKey ? `Saved ✓ ${setting.keyPreview} — leave blank to keep it` : "x-api-key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <button type="submit" disabled={Boolean(busy)} className="ad-btn ad-btn--primary shadow-xl">
            {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationApp;
