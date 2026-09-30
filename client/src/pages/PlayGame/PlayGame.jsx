import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { X } from "lucide-react";

import { Spinner } from "../../components/Loader/Loader";
import { useLanguage } from "../../Context/LanguageProvider";
import { useHideBootLoader } from "../../hook/useHideBootLoader";
import { launchGame, launchTrial } from "../../features/game/useOpenGame";
import { refreshMe } from "../../features/auth/authSlice";
import { notify } from "../../utils/notify";
import { fetchMaintenance } from "../../features/maintenance/maintenanceSlice";
import { selectMaintenance } from "../../features/maintenance/maintenanceSelectors";
import { useApiRecovery } from "../../features/maintenance/useApiRecovery";
import MaintenanceScreen from "../../components/Maintenance/MaintenanceScreen";

/**
 * খেলার পেজ — `/play/:gameUId`, পুরো পর্দায় গেম (iframe)।
 *
 * দুই ধরন:
 *   আসল খেলা (`/play/:uid`) — লগইন লাগে; গেম খোলে ব্যালেন্স দেখিয়ে, আর
 *     প্রতিটা বাজির কাটা-জমা server এর callback এ। বন্ধ করলে ব্যালেন্স
 *     নতুন করে আনা হয়।
 *   ফ্রি ট্রায়াল (`?trial=1`) — লগইন ছাড়া, ০ ব্যালেন্সে।
 * উপরে ছোট বার — বাঁয়ে বন্ধ, মাঝে গেমের নাম, ডানে ব্যালেন্স বা
 * "ফ্রি ট্রায়াল" চিহ্ন, যাতে খেলোয়াড় ভুল না বোঝেন।
 */
const BAR_H = 44;

const PlayGame = () => {
  const { gameUId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const [params] = useSearchParams();
  const trial = params.get("trial") === "1";
  const [state, setState] = useState({ status: "loading", url: "", name: location.state?.name || "", balance: null });

  useHideBootLoader(true);

  // এই পাতা সাইটের কাঠামোর বাইরে, তাই মেইনটেন্যান্স এখানে আলাদা করে দেখা হয়
  const dispatch = useDispatch();
  const maintenance = useSelector(selectMaintenance);
  useApiRecovery(maintenance.outage);
  useEffect(() => {
    if (!maintenance.loaded) dispatch(fetchMaintenance());
  }, [dispatch, maintenance.loaded]);

  const start = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    const result = trial ? await launchTrial(gameUId) : await launchGame(gameUId);

    if (result.launchUrl) {
      const name = lang === "en" ? result.game?.nameEn : result.game?.name;
      setState({
        status: "ready",
        url: result.launchUrl,
        name: name || location.state?.name || "",
        balance: trial ? null : Number(result.balance) || 0,
      });
      if (!trial && !(Number(result.balance) >= 1)) notify.info(t.games.lowBalance);
    } else if (result.error === "needLogin") {
      // টোকেনের মেয়াদ শেষ — লগইনের পর এই গেমেই ফেরা
      notify.warning(t.games.needLogin);
      navigate("/login", { replace: true, state: { from: `/play/${encodeURIComponent(gameUId)}` } });
    } else if (result.error === "maintenance") {
      // খেলার মাঝে মোড চালু হলে — অবস্থাটা নতুন করে এনে পুরো পর্দার বার্তা
      dispatch(fetchMaintenance());
    } else {
      setState((prev) => ({ ...prev, status: result.error === "gameNotReady" ? "notReady" : "failed" }));
    }
  }, [gameUId, location.state, lang, dispatch, trial, t, navigate]);

  useEffect(() => {
    start();
  }, [start]);

  const close = () => {
    // খেলার মাঝে ব্যালেন্স বদলেছে — হেডারে নতুনটা
    if (!trial) dispatch(refreshMe());
    if (location.state?.from) navigate(location.state.from);
    else if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  if (maintenance.isOn) return <MaintenanceScreen setting={maintenance} />;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#000", zIndex: 1000, fontSize: 14 }}>
      <div
        className="flex shrink-0 items-center"
        style={{ height: BAR_H, padding: "0 8px", gap: 10, background: "#0F0238", color: "#fff" }}
      >
        <button
          type="button"
          onClick={close}
          aria-label={t.games.close}
          className="flex shrink-0 cursor-pointer items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: "50%", background: "rgb(255 255 255 / 0.1)" }}
        >
          <X size={18} />
        </button>

        <span className="min-w-0 flex-1 truncate" style={{ fontSize: 15, fontWeight: 600 }}>
          {state.name}
        </span>

        {trial ? (
          <span
            className="shrink-0"
            title={t.games.trialHint}
            style={{
              padding: "3px 10px",
              borderRadius: 20,
              background: "#1678ff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {t.games.trialBadge}
          </span>
        ) : (
          state.balance !== null && (
            <span
              className="shrink-0"
              title={t.games.balance}
              style={{ padding: "3px 10px", borderRadius: 20, background: "rgb(255 255 255 / 0.1)", color: "var(--gold)", fontSize: 13, fontWeight: 700 }}
            >
              ৳ {state.balance.toFixed(2)}
            </span>
          )
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        {state.status === "ready" && (
          <iframe
            key={state.url}
            src={state.url}
            title={state.name || "game"}
            allow="fullscreen; autoplay; encrypted-media"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          />
        )}

        {state.status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: 16 }}>
            <Spinner />
            <span style={{ color: "rgb(255 255 255 / 0.7)", fontSize: 14 }}>{t.games.starting}</span>
          </div>
        )}

        {(state.status === "failed" || state.status === "notReady") && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ padding: 20 }}>
            <div
              className="flex flex-col items-center text-center"
              style={{ maxWidth: 340, padding: "28px 24px", borderRadius: 16, background: "#241A3E", gap: 14 }}
            >
              <span style={{ color: "#fff", fontSize: 17, fontWeight: 700 }}>{t.games.failed}</span>
              <span style={{ color: "rgb(255 255 255 / 0.65)", fontSize: 14 }}>
                {state.status === "notReady" ? t.games.notReady : trial ? t.games.trialHint : ""}
              </span>
              <div className="flex" style={{ gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={start}
                  className="cursor-pointer"
                  style={{ padding: "9px 18px", borderRadius: 8, background: "#BC43F4", color: "#fff", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  {t.games.retry}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="cursor-pointer"
                  style={{ padding: "9px 18px", borderRadius: 8, background: "rgb(255 255 255 / 0.1)", color: "#fff", fontSize: 14, whiteSpace: "nowrap" }}
                >
                  {t.games.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayGame;
