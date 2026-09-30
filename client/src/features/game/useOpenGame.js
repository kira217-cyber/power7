import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";

import api from "../../api/axios";
import { useUI } from "../../Context/uiContext";
import { selectIsLoggedIn } from "../auth/authSelectors";

/**
 * গেম খোলা — খেলার পেজে (`/play/:gameUId`) নিয়ে যায়।
 *
 *   `openGame(game)` — "এখন খেলুন": আসল টাকায়। লগইন না থাকলে আগে লগইন
 *     (ডেস্কটপে মডাল, মোবাইলে পেজ), আর লগইনের পর সোজা এই গেমেই।
 *   `openGame(game, { trial: true })` — "ফ্রি ট্রায়াল": লগইন ছাড়া, ০ ব্যালেন্সে।
 *
 * স্ট্যাটিক ডেটার গেমের gameUId নেই — সেগুলো খোলে না।
 */
export const useOpenGame = () => {
  const navigate = useNavigate();
  const loggedIn = useSelector(selectIsLoggedIn);
  const { openAuth } = useUI();

  return useCallback(
    (game, { trial = false } = {}) => {
      if (!game?.gameUId) return false;
      const path = `/play/${encodeURIComponent(game.gameUId)}${trial ? "?trial=1" : ""}`;

      if (!trial && !loggedIn) {
        openAuth("login", { after: path });
        return true;
      }

      navigate(path, {
        state: { name: game.name, from: window.location.pathname + window.location.search },
      });
      return true;
    },
    [navigate, loggedIn, openAuth],
  );
};

/** server এ আসল খেলা চালু — `{ launchUrl, game, balance }` অথবা `{ error: code }` */
export const launchGame = async (gameUId) => {
  try {
    const res = await api.post("/api/play-game/playgame", { game_uid: gameUId });
    return res.data?.data || { error: "gameLaunchFailed" };
  } catch (error) {
    const status = error?.response?.status;
    return { error: error?.response?.data?.code || (status === 401 ? "needLogin" : "gameLaunchFailed") };
  }
};

const GUEST_KEY = "power7:guest";

/**
 * ট্রায়ালের জন্য ব্রাউজারের নিজের ৭ অক্ষরের পরিচয় — server সামনে `tbt`
 * বসিয়ে Oracle এর ১০ অক্ষরের নাম বানায়। একই ব্রাউজারে সবসময় একই নাম,
 * তাই প্রতিবার নতুন অ্যাকাউন্ট তৈরি হয় না।
 */
export const getGuestId = () => {
  try {
    const saved = localStorage.getItem(GUEST_KEY);
    if (/^[a-z]{7}$/.test(saved || "")) return saved;
  } catch {
    /* প্রাইভেট মোডে localStorage না-ও থাকতে পারে */
  }

  const letters = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  const id = [...bytes].map((b) => letters[b % 26]).join("");

  try {
    localStorage.setItem(GUEST_KEY, id);
  } catch {
    /* না রাখতে পারলেও এবারের খেলা চলবে */
  }
  return id;
};

/** server এ ট্রায়াল চালু — `{ launchUrl, game }` অথবা `{ error: code }` */
export const launchTrial = async (gameUId) => {
  try {
    const res = await api.post("/api/play-game/trial", { game_uid: gameUId, guestId: getGuestId() });
    return res.data?.data || { error: "gameLaunchFailed" };
  } catch (error) {
    return { error: error?.response?.data?.code || "gameLaunchFailed" };
  }
};
