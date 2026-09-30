import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Power,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { api } from "../../api/axios";

/** সেটিং আনে — কম্পোনেন্টের বাইরে, যাতে effect আর বোতাম দুজনেই ব্যবহার করতে পারে */
const fetchSetting = async () => {
  const { data } = await api.get("/api/admin/game-api-key");
  return data?.data?.setting || null;
};

const Row = ({ label, children }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
    <span className="min-w-[150px] text-[13px] text-[var(--text-muted)]">
      {label}
    </span>
    <span className="text-[14px] font-semibold text-[var(--neutral100)]">
      {children}
    </span>
  </div>
);

/**
 * গেম API key — ক্যাটাগরি, প্রোভাইডার ও গেমের উৎস।
 *
 * কী শুধু এখানেই বসে; সার্ভার সেটা ডেটাবেসে রেখে নিজে master এ কল করে।
 * ব্রাউজারে কখনো পুরো কী ফেরত আসে না, শেষ চার অক্ষর দেখানো হয়।
 */
const GameApiKey = () => {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

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

  const handleSave = async (event) => {
    event.preventDefault();

    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    try {
      setSaving(true);

      const { data } = await api.post("/api/admin/game-api-key", {
        apiKey: apiKey.trim(),
      });

      setSetting(data?.data?.setting || null);
      setApiKey("");

      if (data?.data?.setting?.isVerified) {
        toast.success("API key saved and verified");
      } else {
        toast.warn("Saved, but master could not verify the key");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const run = async (action, request, okMessage) => {
    try {
      setBusy(action);
      const { data } = await request();
      setSetting(data?.data?.setting ?? null);
      toast.success(data?.message || okMessage);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Request failed");
    } finally {
      setBusy("");
    }
  };

  const verified = setting?.isVerified;
  const active = setting?.isActive;

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">Game API Key</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Categories, providers and games all come from this key.
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

      {/* ── এখনকার অবস্থা ── */}
      <div className="ad-card">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[var(--primary500)]/25 bg-[var(--primary500)]/10 text-[var(--primary500)]">
            <KeyRound size={18} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              Current key
            </h2>

            {loading ? (
              <p className="mt-3 text-[14px] text-[var(--text-muted)]">
                Loading…
              </p>
            ) : !setting ? (
              <p className="mt-3 text-[14px] text-[var(--text-muted)]">
                No key saved yet. The client site is still showing its built-in
                sample data — it will switch to live data the moment a valid key
                is saved below.
              </p>
            ) : (
              <div className="mt-3">
                <Row label="Key">
                  <span className="font-mono">{setting.keyPreview}</span>
                </Row>

                <Row label="Verified">
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      color: verified
                        ? "var(--status-success)"
                        : "var(--status-danger)",
                    }}
                  >
                    {verified ? (
                      <BadgeCheck size={16} />
                    ) : (
                      <TriangleAlert size={16} />
                    )}
                    {verified ? "Yes" : "No"}
                  </span>
                </Row>

                <Row label="Active">
                  <span
                    style={{
                      color: active
                        ? "var(--status-success)"
                        : "var(--text-muted)",
                    }}
                  >
                    {active ? "Yes" : "No"}
                  </span>
                </Row>

                {setting.lastVerifiedAt && (
                  <Row label="Last verified">
                    {new Date(setting.lastVerifiedAt).toLocaleString()}
                  </Row>
                )}

                {setting.lastVerifyError && (
                  <Row label="Last error">
                    <span className="text-[var(--status-danger)]">
                      {setting.lastVerifyError}
                    </span>
                  </Row>
                )}

                {setting.siteInfo?.name && (
                  <Row label="Master site">{setting.siteInfo.name}</Row>
                )}
              </div>
            )}
          </div>
        </div>

        {setting && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.07] pt-5">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                run(
                  "verify",
                  () => api.post("/api/admin/game-api-key/verify"),
                  "Verified",
                )
              }
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              {busy === "verify" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <BadgeCheck size={15} />
              )}
              Verify again
            </button>

            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                run(
                  "status",
                  () =>
                    api.patch("/api/admin/game-api-key/status", {
                      isActive: !active,
                    }),
                  "Status updated",
                )
              }
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              {busy === "status" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Power size={15} />
              )}
              {active ? "Turn off" : "Turn on"}
            </button>

            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => {
                if (
                  !window.confirm(
                    "Remove the key? The client site will fall back to its built-in sample data.",
                  )
                ) {
                  return;
                }

                run(
                  "delete",
                  () => api.delete("/api/admin/game-api-key"),
                  "Key removed",
                );
              }}
              className="ad-btn ad-btn--danger ad-btn--sm"
            >
              {busy === "delete" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              Remove
            </button>
          </div>
        )}
      </div>

      {/* ── কী বসানো ── */}
      <div className="ad-card mt-4">
        <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
          {setting ? "Replace key" : "Save key"}
        </h2>

        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Paste the POWER7 site token from White-label → All Sites. It is verified
          straight away and never sent back to the browser.
        </p>

        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="ad-label" htmlFor="game-api-key">
              API key
            </label>

            <div className="ad-field">
              <KeyRound size={17} className="shrink-0 text-[var(--primary500)]" />

              <input
                id="game-api-key"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste the master API key"
                className="w-full bg-transparent font-mono text-[14px] text-white outline-none placeholder:font-sans placeholder:text-[var(--text-disabled)]"
              />

              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? "Hide key" : "Show key"}
                className="shrink-0 cursor-pointer text-[var(--text-secondary)] transition hover:text-white"
              >
                {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="ad-btn ad-btn--primary w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={16} />
                Save and verify
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        Game data is cached on the server for 30 seconds, so the client site
        stays fast. Saving, verifying or turning the key off clears that cache
        immediately.
      </p>
    </div>
  );
};

export default GameApiKey;
