import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  CircleCheck,
  Loader2,
  RefreshCw,
  Save,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { api } from "../../api/axios";

const fetchSetting = async () => {
  const { data } = await api.get("/api/maintenance");
  return data?.data?.setting || null;
};

const Row = ({ label, children }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
    <span className="min-w-[170px] text-[13px] text-[var(--text-muted)]">
      {label}
    </span>
    <span className="text-[14px] font-semibold text-[var(--neutral100)]">
      {children}
    </span>
  </div>
);

/**
 * সাইট রক্ষণাবেক্ষণ।
 *
 * দুইভাবে চালু হয় — অ্যাডমিন নিজে, অথবা গেম API পরপর কয়েকবার ব্যর্থ
 * হলে সার্ভার নিজেই। দুটোর অবস্থা আলাদা দেখানো হয়, যাতে বোঝা যায়
 * সাইট কেন বন্ধ।
 */
const Maintenance = () => {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [form, setForm] = useState({
    titleBn: "",
    titleEn: "",
    messageBn: "",
    messageEn: "",
  });

  const fill = (next) => {
    setSetting(next);

    if (next) {
      setForm({
        titleBn: next.title?.bn || "",
        titleEn: next.title?.en || "",
        messageBn: next.message?.bn || "",
        messageEn: next.message?.en || "",
      });
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

  const run = async (action, request) => {
    try {
      setBusy(action);
      const { data } = await request();

      // status/clear-auto শুধু public অংশ ফেরত দেয় — বাকিটার জন্য আবার আনি
      await load();
      toast.success(data?.message || "Updated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Request failed");
    } finally {
      setBusy("");
    }
  };

  const handleSaveMessage = (event) => {
    event.preventDefault();

    run("message", () =>
      api.put("/api/maintenance/message", {
        title: { bn: form.titleBn, en: form.titleEn },
        message: { bn: form.messageBn, en: form.messageEn },
      }),
    );
  };

  const isOn = Boolean(setting?.isOn);
  const manualOn = Boolean(setting?.manualOn);
  const autoOn = Boolean(setting?.autoOn);

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            Site Maintenance
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Show a maintenance notice on the client site.
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
              borderColor: isOn
                ? "color-mix(in srgb, var(--status-danger), transparent 70%)"
                : "color-mix(in srgb, var(--status-success), transparent 70%)",
              background: isOn
                ? "color-mix(in srgb, var(--status-danger), transparent 90%)"
                : "color-mix(in srgb, var(--status-success), transparent 90%)",
              color: isOn ? "var(--status-danger)" : "var(--status-success)",
            }}
          >
            {isOn ? <Wrench size={18} /> : <CircleCheck size={18} />}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {loading
                ? "Loading…"
                : isOn
                  ? "Site is showing the maintenance notice"
                  : "Site is running normally"}
            </h2>

            <div className="mt-3">
              <Row label="Turned on by admin">
                <span
                  style={{
                    color: manualOn
                      ? "var(--status-danger)"
                      : "var(--text-muted)",
                  }}
                >
                  {manualOn ? "Yes" : "No"}
                </span>
              </Row>

              <Row label="Turned on automatically">
                <span
                  style={{
                    color: autoOn ? "var(--status-danger)" : "var(--text-muted)",
                  }}
                >
                  {autoOn ? "Yes" : "No"}
                </span>
              </Row>

              {autoOn && setting?.autoReason && (
                <Row label="Reason">
                  <span className="flex items-center gap-2 text-[var(--status-pending)]">
                    <TriangleAlert size={15} />
                    {setting.autoReason}
                  </span>
                </Row>
              )}

              {autoOn && setting?.autoTriggeredAt && (
                <Row label="Since">
                  {new Date(setting.autoTriggeredAt).toLocaleString()}
                </Row>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.07] pt-5">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              run("status", () =>
                api.patch("/api/maintenance/status", { manualOn: !manualOn }),
              )
            }
            className={`ad-btn ad-btn--sm ${
              manualOn ? "ad-btn--ghost" : "ad-btn--danger"
            }`}
          >
            {busy === "status" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Wrench size={15} />
            )}
            {manualOn ? "Turn maintenance off" : "Turn maintenance on"}
          </button>

          {autoOn && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                run("clear", () => api.post("/api/maintenance/clear-auto"))
              }
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              {busy === "clear" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CircleCheck size={15} />
              )}
              Clear the automatic one
            </button>
          )}
        </div>
      </div>

      {/* ── লেখা ── */}
      <div className="ad-card mt-4">
        <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
          Notice text
        </h2>

        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Shown on the client site in the visitor&apos;s language.
        </p>

        <form onSubmit={handleSaveMessage} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ad-label" htmlFor="title-bn">
                Title (Bangla)
              </label>
              <input
                id="title-bn"
                value={form.titleBn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, titleBn: e.target.value }))
                }
                className="ad-input"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="title-en">
                Title (English)
              </label>
              <input
                id="title-en"
                value={form.titleEn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, titleEn: e.target.value }))
                }
                className="ad-input"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ad-label" htmlFor="message-bn">
                Message (Bangla)
              </label>
              <textarea
                id="message-bn"
                rows={4}
                value={form.messageBn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, messageBn: e.target.value }))
                }
                className="ad-input h-auto py-3"
              />
            </div>

            <div>
              <label className="ad-label" htmlFor="message-en">
                Message (English)
              </label>
              <textarea
                id="message-en"
                rows={4}
                value={form.messageEn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, messageEn: e.target.value }))
                }
                className="ad-input h-auto py-3"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={Boolean(busy)}
            className="ad-btn ad-btn--primary w-full sm:w-auto"
          >
            {busy === "message" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save text
          </button>
        </form>
      </div>

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        The automatic mode switches on after the game API fails three times in
        a row, and switches itself off again on the first successful call — so
        a short outage recovers without anyone touching this page.
      </p>
    </div>
  );
};

export default Maintenance;
