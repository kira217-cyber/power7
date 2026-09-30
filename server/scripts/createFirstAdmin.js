/**
 * প্রথম mother অ্যাডমিন তৈরি করে।
 *
 *   node scripts/createFirstAdmin.js <email> <password>
 *
 * পাসওয়ার্ড না দিলে নিজে একটা শক্ত পাসওয়ার্ড বানিয়ে দেখিয়ে দেয়।
 * ইমেইলটা আগে থেকেই থাকলে কিছু বদলায় না।
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dotenv from "dotenv";

import Admin from "../models/Admin.js";

dotenv.config();

const BCRYPT_ROUNDS = 12;

const makePassword = () => {
  // বিভ্রান্তিকর অক্ষর (O/0, l/1) বাদ — হাতে লিখতে গিয়ে ভুল কম হয়
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";

  return Array.from(
    crypto.randomBytes(20),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
};

const run = async () => {
  const email = (process.argv[2] || "").toLowerCase().trim();
  const password = process.argv[3] || makePassword();

  if (!email) {
    console.error("ব্যবহার: node scripts/createFirstAdmin.js <email> [password]");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const existing = await Admin.findOne({ email });

  if (existing) {
    console.log(`⚠️  '${email}' আগে থেকেই আছে (role: ${existing.role}) — কিছু বদলানো হয়নি`);
    await mongoose.disconnect();
    return;
  }

  await Admin.create({
    email,
    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
    role: "mother",
    permissions: [],
  });

  console.log("✅ mother অ্যাডমিন তৈরি হয়েছে");
  console.log("   ইমেইল   :", email);
  console.log("   পাসওয়ার্ড :", password);
  console.log("\n   পাসওয়ার্ডটা এখনই সংরক্ষণ করুন — ডেটাবেসে hash আকারে থাকে,");
  console.log("   তাই পরে আর দেখা যাবে না।");

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("❌", error.message);
  process.exit(1);
});
