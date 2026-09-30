/**
 * সাহায্য কেন্দ্রের লেখা (মূল সাইটের "গোপনীয়তা নীতি" আর "ব্যবহারের শর্তাবলী")
 * admin এ বসানো — `scripts/help-articles.json` থেকে, API দিয়ে।
 * আগে থেকে কোনো লেখা থাকলে কিছু করে না।
 *
 *   node scripts/seed-help.mjs <API_URL> <ADMIN_TOKEN>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [API = "http://localhost:5000", TOKEN] = process.argv.slice(2);
if (!TOKEN) {
  console.error("usage: node scripts/seed-help.mjs <API_URL> <ADMIN_TOKEN>");
  process.exit(1);
}

const call = async (method, url, body) => {
  const res = await fetch(`${API}/api/help/admin${url}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(`${method} ${url}: ${data.message}`);
  return data.data;
};

const { articles } = await call("GET", "");
if (articles.length) {
  console.log(`help articles already exist (${articles.length}) — nothing to do`);
  process.exit(0);
}
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "help-articles.json");
for (const item of JSON.parse(fs.readFileSync(file, "utf8"))) {
  await call("POST", "", { ...item, showMobile: true, showDesktop: false, isActive: true });
  console.log("article", item.title.bn);
}
