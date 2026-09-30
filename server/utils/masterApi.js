import GameApiKeySetting from "../models/GameApiKeySetting.js";

/**
 * White-label master এর সাথে কথা বলার সব কিছু এক জায়গায়।
 *
 * POWER7 এর নিজের ক্যাটালগ master এ `tb-global` নামে — BetChokkor এর
 * `bc-global` এর থেকে আলাদা, তাই ডেটা মেশে না।
 */

const TIMEOUT_MS = 30000;
const CLIENT_PATH = "/api/master/tb-global/client";

const text = (value) => String(value ?? "").trim();

export const masterBaseUrl = () => text(process.env.MASTER_API_URL).replace(/\/+$/, "");

/**
 * কী সহ সেটিংটা আনে। কী স্কিমায় `select: false`, তাই আলাদা করে চাইতে হয় —
 * এতে অন্য কোনো কোয়েরিতে ভুল করে কী বেরিয়ে যাওয়ার পথ থাকে না।
 */
export const loadSetting = () =>
  GameApiKeySetting.findOne().sort({ createdAt: -1 }).select("+apiKey");

export const loadUsableKey = async () => {
  const setting = await loadSetting();

  if (!setting?.apiKey) return { reason: "not-configured" };
  if (!setting.isActive) return { reason: "inactive" };
  if (!setting.isVerified) return { reason: "not-verified" };

  return { setting, apiKey: setting.apiKey };
};

const request = async (url, options = {}) => {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.success === false) {
    const error = new Error(body?.message || `Master responded ${res.status}`);
    error.status = res.status;
    throw error;
  }

  return body;
};

/** master এ GET — কী হেডারে বসিয়ে */
export const masterGet = async (path, apiKey, params = {}) => {
  const base = masterBaseUrl();
  if (!base) throw new Error("MASTER_API_URL is missing in .env");

  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  ).toString();

  return request(`${base}${CLIENT_PATH}${path}${query ? `?${query}` : ""}`, {
    headers: { "x-api-key": apiKey },
  });
};

/** master এ কী যাচাই */
export const verifyWithMaster = async (apiKey) => {
  const base = masterBaseUrl();
  if (!base) throw new Error("MASTER_API_URL is missing in .env");
  if (!text(apiKey)) throw new Error("API key is missing");

  const body = await request(`${base}${CLIENT_PATH}/verify-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: text(apiKey) }),
  });

  return {
    valid: body?.data?.valid === true,
    site: body?.data?.site || null,
  };
};
