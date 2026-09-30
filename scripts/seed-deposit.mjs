/**
 * মূল সাইটের ডিপোজিট মেথডগুলো admin এ বসানো (বারবার চালানো যায় — যা আছে তা ছেড়ে দেয়)।
 *
 * মূল সাইটে দেখা: NAGAD, Send Money Bkash, Bkash, Send Money Nagad, ROCKET;
 * সীমা ৳১০০ – ৳৩০,০০০; চ্যানেল "চ্যানেল ২ 10 / 6 / 18 / 4 / 9"; TrxID দিতে হয়।
 * এজেন্টের নম্বর জানা নেই — `01000000000` বসে (কোনো অপারেটরের নয়),
 * admin › Add Deposit Method থেকে আসল নম্বর বসাতে হবে।
 *
 *   node scripts/seed-deposit.mjs <API_URL> <ADMIN_TOKEN>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [API = "http://localhost:5000", TOKEN] = process.argv.slice(2);
if (!TOKEN) {
  console.error("usage: node scripts/seed-deposit.mjs <API_URL> <ADMIN_TOKEN>");
  process.exit(1);
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BANK = path.join(ROOT, "..", "client", "public", "assets", "mobile", "bank");
const auth = { Authorization: `Bearer ${TOKEN}` };

const METHODS = [
  { methodId: "nagad", code: "NAGAD", bn: "নগদ", en: "NAGAD", type: "agent" },
  { methodId: "bkash-sm", code: "BKASHSM", bn: "সেন্ড মানি বিকাশ", en: "Send Money Bkash", type: "personal" },
  { methodId: "bkash", code: "BKASH", bn: "বিকাশ", en: "Bkash", type: "agent" },
  { methodId: "nagad-sm", code: "NAGADSM", bn: "সেন্ড মানি নগদ", en: "Send Money Nagad", type: "personal" },
  { methodId: "rocket", code: "ROCKET", bn: "রকেট", en: "ROCKET", type: "agent" },
];

const CHANNELS = ["10", "6", "18", "4", "9"].map((n) => ({
  id: `ch-${n}`,
  name: { bn: `চ্যানেল ২ ${n}`, en: `Channel 2 ${n}` },
  tagText: "",
  bonusPercent: 0,
  isActive: true,
}));

const call = async (method, url, body, isForm = false) => {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: isForm ? auth : { ...auth, "Content-Type": "application/json" },
    body: isForm ? body : body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url}: ${data.message || res.status}`);
  return data.data;
};

const existing = (await call("GET", "/api/deposit-methods")).methods || [];

for (const [index, item] of METHODS.entries()) {
  let method = existing.find((m) => m.methodId === item.methodId);

  if (!method) {
    const form = new FormData();
    form.set("methodId", item.methodId);
    form.set("methodName", JSON.stringify({ bn: item.bn, en: item.en }));
    form.set("methodType", item.type);
    form.set("group", "ewallet");
    form.set("minDepositAmount", "100");
    form.set("maxDepositAmount", "30000");
    form.set("sort", String(index));
    form.set("contacts", JSON.stringify([{ label: { bn: "এজেন্ট", en: "Agent" }, number: "01000000000", isActive: true }]));
    const logo = path.join(BANK, `${item.code}.png`);
    if (fs.existsSync(logo)) form.set("logo", new Blob([fs.readFileSync(logo)], { type: "image/png" }), `${item.code}.png`);
    method = (await call("POST", "/api/deposit-methods", form, true)).method;
    console.log("created", item.methodId);
  } else {
    console.log("exists ", item.methodId);
  }

  await call("POST", "/api/deposit-fields", {
    depositMethod: method._id,
    instructions: {
      bn: "উপরের নম্বরে টাকা পাঠিয়ে ট্রানজেকশন আইডি (TrxID) লিখুন। TrxID না দিলে ডিপোজিট জমা হবে না।",
      en: "Send the money to the number above, then enter the transaction ID (TrxID). Without it the deposit cannot be credited.",
    },
    inputs: [
      {
        key: "trxId",
        label: { bn: "ট্রানজেকশন আইডি (TrxID)", en: "Transaction ID (TrxID)" },
        placeholder: { bn: "যেমন 8N7A6D5C4B", en: "e.g. 8N7A6D5C4B" },
        type: "text",
        required: true,
        uniqueValue: true,
      },
    ],
  });

  await call("POST", "/api/deposit-bonus-turnover", {
    depositMethod: method._id,
    turnoverMultiplier: 1,
    eligibleProviders: [],
    channels: CHANNELS,
    promotions: [],
  });
}

console.log("done");
