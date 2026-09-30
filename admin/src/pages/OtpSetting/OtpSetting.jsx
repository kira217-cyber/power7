import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Loader2,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { api } from "../../api/axios";
import SecretInput from "../../components/SecretInput/SecretInput";

const fetchSetting = async () => {
  const { data } = await api.get("/api/otp-setting");
  return data?.data?.setting || null;
};

/** যে জায়গাগুলোতে OTP বসানো যায় */
const FLOWS = [
  { key: "register", label: "Register", hint: "New account sign up" },
  { key: "login", label: "Login", hint: "Every login needs a code" },
  { key: "forgotPassword", label: "Forgot password", hint: "Password reset" },
  { key: "withdraw", label: "Withdraw", hint: "Money going out" },
  { key: "profileVerify", label: "Profile verify", hint: "Phone confirmation" },
];

const SITES = [
  { key: "client", label: "Client site" },
  { key: "affiliate", label: "Affiliate site" },
];

/** ছোট সুইচ — on হলে সোনালি */
const Toggle = ({ on, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className="relative h-[24px] w-[44px] shrink-0 rounded-full border transition-colors disabled:opacity-50"
    style={{
      borderColor: on
        ? "color-mix(in srgb, var(--primary500), transparent 45%)"
        : "rgba(255,255,255,0.12)",
      background: on
        ? "color-mix(in srgb, var(--primary500), transparent 70%)"
        : "rgba(255,255,255,0.06)",
    }}
  >
    <span
      className="absolute top-[2px] h-[18px] w-[18px] rounded-full transition-all"
      style={{
        left: on ? "22px" : "2px",
        background: on ? "var(--primary500)" : "var(--text-muted)",
      }}
    />
  </button>
);

/**
 * OTP সেটিং।
 *
 * টোকেনটা এখান থেকেই বসে — কোডে বা .env এ নয়, তাই SMS প্রোভাইডার
 * বদলালে ডিপ্লয় লাগে না। আর কোন কোন কাজে OTP লাগবে সেটা ক্লায়েন্ট ও
 * অ্যাফিলিয়েট সাইটের জন্য আলাদা করে ঠিক করা যায়।
 */
const OtpSetting = () => {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    let alive = true;

    fetchSetting()
      .then((next) => alive && setSetting(next))
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
      setSetting(await fetchSetting());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load setting");
    } finally {
      setLoading(false);
    }
  };

  const run = async (action, request, after) => {
    try {
      setBusy(action);
      const { data } = await request();

      if (data?.data?.setting) setSetting(data.data.setting);
      toast.success(data?.message || "Updated");
      after?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Request failed");
    } finally {
      setBusy("");
    }
  };

  const handleSaveKey = (event) => {
    event.preventDefault();

    if (!apiKey.trim()) {
      toast.error("Paste the API key first");
      return;
    }

    run("key", () => api.put("/api/otp-setting/key", { apiKey: apiKey.trim() }), () =>
      setApiKey(""),
    );
  };

  const handleTest = (event) => {
    event.preventDefault();

    if (!testPhone.trim()) {
      toast.error("Enter a phone number");
      return;
    }

    run("test", () =>
      api.post("/api/otp-setting/test", { phone: testPhone.trim() }),
    );
  };

  /** একটা টগল বদলালে সেই সাইটের পুরো সেটটাই পাঠানো হয় */
  const toggleFlow = (site, flow, value) => {
    const next = { ...(setting?.[site] || {}), [flow]: value };

    setSetting((prev) => (prev ? { ...prev, [site]: next } : prev));

    run(`${site}-${flow}`, () => api.put("/api/otp-setting/flows", { [site]: next }));
  };

  const hasKey = Boolean(setting?.hasKey);
  const isActive = Boolean(setting?.isActive);

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">OTP Setting</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            SMS verification key and where the code is asked for.
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

      {/* ── অবস্থা ও চাবি ── */}
      <div className="ad-card">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border"
            style={{
              borderColor: hasKey
                ? "color-mix(in srgb, var(--status-success), transparent 70%)"
                : "color-mix(in srgb, var(--status-pending), transparent 70%)",
              background: hasKey
                ? "color-mix(in srgb, var(--status-success), transparent 90%)"
                : "color-mix(in srgb, var(--status-pending), transparent 90%)",
              color: hasKey ? "var(--status-success)" : "var(--status-pending)",
            }}
          >
            {hasKey ? <ShieldCheck size={18} /> : <TriangleAlert size={18} />}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {loading
                ? "Loading…"
                : hasKey
                  ? "API key is saved"
                  : "No API key yet"}
            </h2>

            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              {hasKey
                ? `Key ${setting?.keyPreview} · provider api.o-sms.com`
                : "Without a key no OTP is sent, so every flow below is skipped."}
            </p>

            {setting?.lastTestError ? (
              <p className="mt-2 flex items-center gap-2 text-[13px] text-[var(--status-danger)]">
                <TriangleAlert size={14} />
                Last test failed: {setting.lastTestError}
              </p>
            ) : setting?.lastTestedAt ? (
              <p className="mt-2 text-[13px] text-[var(--status-success)]">
                Last test passed at{" "}
                {new Date(setting.lastTestedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>

        <form
          onSubmit={handleSaveKey}
          className="mt-5 border-t border-white/[0.07] pt-5"
        >
          <label className="ad-label" htmlFor="otp-key">
            {hasKey ? "Replace the API key" : "API key"}
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SecretInput
              id="otp-key"
              autoComplete="off"
              placeholder="Paste the o-sms API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />

            <button
              type="submit"
              disabled={Boolean(busy)}
              className="ad-btn ad-btn--primary"
            >
              {busy === "key" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save key
            </button>

            {hasKey && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() =>
                  run("remove", () => api.delete("/api/otp-setting/key"))
                }
                className="ad-btn ad-btn--danger"
              >
                {busy === "remove" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Remove
              </button>
            )}
          </div>

          <p className="mt-2 text-[12px] text-[var(--text-disabled)]">
            The key is stored write-only — it is never sent back to this page.
          </p>
        </form>
      </div>

      {/* ── মাস্টার সুইচ ── */}
      <div className="ad-card mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              OTP system
            </h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Turning this off skips every flow below at once.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-[13px] font-semibold"
              style={{
                color: isActive ? "var(--status-success)" : "var(--text-muted)",
              }}
            >
              {isActive ? "On" : "Off"}
            </span>

            <Toggle
              on={isActive}
              disabled={Boolean(busy)}
              onChange={(value) =>
                run("active", () =>
                  api.put("/api/otp-setting/flows", { isActive: value }),
                )
              }
            />
          </div>
        </div>
      </div>

      {/* ── সাইটভিত্তিক ফ্লো ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {SITES.map((site) => (
          <div key={site.key} className="ad-card">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {site.label}
            </h2>

            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Where a code is asked for on this site.
            </p>

            <div className="mt-4 flex flex-col">
              {FLOWS.map((flow) => {
                const on = Boolean(setting?.[site.key]?.[flow.key]);

                return (
                  <div
                    key={flow.key}
                    className="flex items-center justify-between gap-3 border-t border-white/[0.06] py-3 first:border-t-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--neutral100)]">
                        {flow.label}
                      </p>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        {flow.hint}
                      </p>
                    </div>

                    <Toggle
                      on={on}
                      disabled={Boolean(busy) || !isActive}
                      onChange={(value) => toggleFlow(site.key, flow.key, value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── পরীক্ষা ── */}
      <div className="ad-card mt-4">
        <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[var(--neutral100)]">
          <MessageSquare size={16} />
          Send a test code
        </h2>

        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          A real SMS goes out, so use your own number.
        </p>

        <form onSubmit={handleTest} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="tel"
            placeholder="01XXXXXXXXX"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="ad-input flex-1"
          />

          <button
            type="submit"
            disabled={Boolean(busy) || !hasKey}
            className="ad-btn ad-btn--ghost"
          >
            {busy === "test" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Send test
          </button>
        </form>
      </div>

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        A code stays valid for 5 minutes, can be resent after 60 seconds, and
        locks out after 5 wrong tries.
      </p>
    </div>
  );
};

export default OtpSetting;
