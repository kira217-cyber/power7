import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  Gamepad2,
  KeyRound,
  Link2,
  Loader2,
  Play,
  Power,
  RefreshCw,
  Save,
  TriangleAlert,
} from "lucide-react";

import { api } from "../../api/axios";

const fetchSetting = async () => {
  const { data } = await api.get("/api/play-game/admin/setting");
  return data?.data?.setting || null;
};

const Row = ({ label, children }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
    <span className="min-w-[150px] text-[13px] text-[var(--text-muted)]">
      {label}
    </span>
    <span className="text-[14px] font-semibold break-all text-[var(--neutral100)]">
      {children}
    </span>
  </div>
);

/**
 * গেম চালু করার কী।
 *
 * গেম API key (তালিকার উৎস) আর এই কী এক নয় — এটা দিয়ে একজন
 * খেলোয়াড়ের জন্য গেমের লিংক বানানো হয়। আগে কীটা কোডে বসানো থাকত,
 * ফলে বদলাতে হলে সার্ভার নতুন করে ডেপ্লয় করতে হতো; এখন এখান থেকেই
 * বদলানো যায়।
 *
 * কী ব্রাউজারে ফেরত আসে না — শুধু শেষ চার অক্ষর দেখা যায়।
 */
const GameLaunchKey = () => {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");

  const [launchKey, setLaunchKey] = useState("");
  const [launchUrl, setLaunchUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testUid, setTestUid] = useState("");

  useEffect(() => {
    let alive = true;

    fetchSetting()
      .then((next) => {
        if (!alive) return;
        setSetting(next);
        setLaunchUrl(next?.launchUrl || "");
      })
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
      const next = await fetchSetting();
      setSetting(next);
      setLaunchUrl(next?.launchUrl || "");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load setting");
    } finally {
      setLoading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();

    if (!setting && !launchKey.trim()) {
      toast.error("Launch key is required");
      return;
    }

    try {
      setSaving(true);

      const { data } = await api.put("/api/play-game/admin/setting", {
        // খালি রাখলে আগের কী-ই থাকে, তাই ঠিকানা বদলাতে কী টাইপ করতে হয় না
        ...(launchKey.trim() ? { launchKey: launchKey.trim() } : {}),
        ...(launchUrl.trim() ? { launchUrl: launchUrl.trim() } : {}),
      });

      setSetting(data?.data?.setting || null);
      setLaunchKey("");
      toast.success("Saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // UID না দিলে সার্ভার ক্যাটালগের প্রথম গেম দিয়েই যাচাই করে
  const test = async () => {
    try {
      setBusy("test");

      const { data } = await api.post("/api/play-game/admin/test", {
        gameUId: testUid.trim(),
      });

      setSetting(data?.data?.setting || null);
      toast.success(`Launch key works (game ${data?.data?.gameUId || testUid.trim()})`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Test failed");
      await load();
    } finally {
      setBusy("");
    }
  };

  const toggle = async () => {
    try {
      setBusy("status");

      const { data } = await api.put("/api/play-game/admin/setting", {
        isActive: !setting?.isActive,
      });

      setSetting(data?.data?.setting || null);
      toast.success("Status updated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Update failed");
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
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            Game Launch Key
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            The key that turns a game into a playable link for one player.
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
            <Gamepad2 size={18} />
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
                No launch key saved yet. Players can browse games, but opening
                one will tell them the game is not ready.
              </p>
            ) : (
              <div className="mt-3">
                <Row label="Key">
                  <span className="font-mono">{setting.keyPreview}</span>
                </Row>

                <Row label="Endpoint">
                  <span className="font-mono text-[13px]">
                    {setting.launchUrl}
                  </span>
                </Row>

                <Row label="Tested">
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
                  <Row label="Last tested">
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
              </div>
            )}
          </div>
        </div>

        {setting && (
          <div className="mt-5 border-t border-white/[0.07] pt-5">
            <label className="ad-label" htmlFor="launch-test-uid">
              Test with a game UID (optional)
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <div className="ad-field min-w-[260px] flex-1">
                <Play size={17} className="shrink-0 text-[var(--primary500)]" />

                <input
                  id="launch-test-uid"
                  value={testUid}
                  onChange={(event) => setTestUid(event.target.value)}
                  placeholder="Leave empty — the first catalog game is used"
                  className="w-full bg-transparent font-mono text-[14px] text-white outline-none placeholder:font-sans placeholder:text-[var(--text-disabled)]"
                />
              </div>

              <button
                type="button"
                onClick={test}
                disabled={Boolean(busy)}
                className="ad-btn ad-btn--ghost ad-btn--sm"
              >
                {busy === "test" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <BadgeCheck size={15} />
                )}
                Test
              </button>

              <button
                type="button"
                onClick={toggle}
                disabled={Boolean(busy)}
                className="ad-btn ad-btn--ghost ad-btn--sm"
              >
                {busy === "status" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Power size={15} />
                )}
                {active ? "Turn off" : "Turn on"}
              </button>
            </div>

            <p className="mt-2 text-[12px] text-[var(--text-disabled)]">
              The test only asks for a link — nothing is opened and no player
              balance changes.
            </p>
          </div>
        )}
      </div>

      {/* ── কী বসানো ── */}
      <div className="ad-card mt-4">
        <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
          {setting ? "Replace key" : "Save key"}
        </h2>

        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Leave the key blank to change only the endpoint. A new key is marked
          untested until you test it above.
        </p>

        <form onSubmit={save} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="ad-label" htmlFor="game-launch-key">
              Launch key
            </label>

            <div className="ad-field">
              <KeyRound
                size={17}
                className="shrink-0 text-[var(--primary500)]"
              />

              <input
                id="game-launch-key"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                value={launchKey}
                onChange={(event) => setLaunchKey(event.target.value)}
                placeholder={setting ? "Leave blank to keep the current key" : "Paste the launch key"}
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

          <div>
            <label className="ad-label" htmlFor="game-launch-url">
              Endpoint
            </label>

            <div className="ad-field">
              <Link2 size={17} className="shrink-0 text-[var(--primary500)]" />

              <input
                id="game-launch-url"
                value={launchUrl}
                onChange={(event) => setLaunchUrl(event.target.value)}
                placeholder="https://oraclegames.net/api/getgameurl"
                className="w-full bg-transparent font-mono text-[14px] text-white outline-none placeholder:font-sans placeholder:text-[var(--text-disabled)]"
              />
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
                Save
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GameLaunchKey;
