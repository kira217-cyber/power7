// লোকালে দেখার জন্য লাইভ DB এর কপি — লাইভ থেকে শুধু পড়া হয়, লেখা হয় `power7_local` এ।
// server ফোল্ডার থেকে চলে (ops/dev-local.sh নিজেই চালায়); প্রতিবার কপিটা নতুন করে বানায়।
import "dotenv/config";
import mongoose from "mongoose";

const live = process.env.MONGO_URI;
const target = "power7_local";

const from = await mongoose.createConnection(live).asPromise();
const to = await mongoose.createConnection(live.replace(/\/([^/?]+)(\?|$)/, `/${target}$2`)).asPromise();
if (to.db.databaseName !== target || from.db.databaseName === target) throw new Error("কপির DB নাম ভুল");

await to.db.dropDatabase();
const collections = await from.db.listCollections({ type: "collection" }).toArray();
let total = 0;
for (const { name } of collections) {
  const docs = await from.db.collection(name).find({}).toArray();
  if (docs.length) await to.db.collection(name).insertMany(docs, { ordered: false });
  total += docs.length;
}

// লোকালের লগইন/ডিপোজিটে মালিকের ফোনে আসল notification না যায়
await to.db.collection("adminnotifysettings").updateMany({}, { $set: { active: false } });

console.log(`${from.db.databaseName} → ${target}: ${collections.length} collection, ${total} doc`);
await Promise.all([from.close(), to.close()]);
