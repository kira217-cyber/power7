/**
 * উত্তোলনের মেথড admin এ বসানো (বারবার চালানো যায় — যা আছে তা ছেড়ে দেয়)।
 *
 * মূল সাইটের ই-ওয়ালেট: বিকাশ, নগদ, রকেট। সীমা ৳১০০ – ৳৩০,০০০ ধরা হয়েছে
 * (মূল সাইটে মাপা নেই) — admin › Add Withdraw Method থেকে বদলানো যায়।
 *
 *   node scripts/seed-withdraw.mjs <API_URL> <ADMIN_TOKEN>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [API = "http://localhost:5000", TOKEN] = process.argv.slice(2);
if (!TOKEN) {
  console.error("usage: node scripts/seed-withdraw.mjs <API_URL> <ADMIN_TOKEN>");
  process.exit(1);
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BANK = path.join(ROOT, "..", "client", "public", "assets", "mobile", "bank");
const auth = { Authorization: `Bearer ${TOKEN}` };

const METHODS = [
  { methodId: "BKASH", bn: "বিকাশ", en: "Bkash" },
  { methodId: "NAGAD", bn: "নগদ", en: "Nagad" },
  { methodId: "ROCKET", bn: "রকেট", en: "Rocket" },
];

const existing = (await (await fetch(`${API}/api/withdraw-methods`, { headers: auth })).json()).data?.methods || [];

for (const [index, item] of METHODS.entries()) {
  if (existing.some((m) => m.methodId === item.methodId)) {
    console.log("exists ", item.methodId);
    continue;
  }
  const form = new FormData();
  form.set("methodId", item.methodId);
  form.set("name", JSON.stringify({ bn: item.bn, en: item.en }));
  form.set("minimumWithdrawAmount", "100");
  form.set("maximumWithdrawAmount", "30000");
  form.set("sort", String(index));
  const logo = path.join(BANK, `${item.methodId}.png`);
  if (fs.existsSync(logo)) form.set("logo", new Blob([fs.readFileSync(logo)], { type: "image/png" }), `${item.methodId}.png`);
  const res = await fetch(`${API}/api/withdraw-methods`, { method: "POST", headers: auth, body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  console.log("created", item.methodId);
}
console.log("done");
