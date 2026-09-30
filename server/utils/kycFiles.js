import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { KYC_DIR } from "../config/kycUpload.js";

/**
 * KYC ছবির সই করা লিংক — `/api/verification/file/<name>?exp=…&sig=…`।
 *
 * সই JWT_SECRET দিয়ে HMAC, মেয়াদ ১০ মিনিট। admin পাতা আর খেলোয়াড় নিজে
 * শুধু API থেকে এই লিংক পান; লিংক ফাঁস হলেও অল্প সময়েই অচল।
 */
const TTL_MS = 10 * 60 * 1000;
const NAME_RE = /^[a-f0-9]{32}\.(png|jpg|webp)$/;

const sign = (name, exp) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(`kyc:${name}:${exp}`).digest("hex");

/** সংরক্ষিত নাম → সই করা লিংক (ফাঁকা হলে ফাঁকা) */
export const signedKycUrl = (name) => {
  if (!name || !NAME_RE.test(name)) return "";
  const exp = Date.now() + TTL_MS;
  return `/api/verification/file/${name}?exp=${exp}&sig=${sign(name, exp)}`;
};

/** সই মেলে আর মেয়াদ আছে কিনা — থাকলে ফাইলের পথ */
export const resolveSignedFile = (name, exp, sig) => {
  if (!NAME_RE.test(String(name)) || !/^\d+$/.test(String(exp)) || Number(exp) < Date.now()) return null;
  const expected = Buffer.from(sign(name, exp));
  const given = Buffer.from(String(sig || ""));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const file = path.join(KYC_DIR, name);
  return fs.existsSync(file) ? path.resolve(file) : null;
};

export const removeKycFile = (name) => {
  if (name && NAME_RE.test(name)) fs.promises.unlink(path.join(KYC_DIR, name)).catch(() => {});
};

/** রেকর্ডের ছবির ঘরগুলো সই করা লিংকে বদলে দেওয়া (উত্তরে পাঠানোর আগে) */
export const withSignedImages = (row) =>
  row
    ? {
        ...row,
        frontImage: signedKycUrl(row.frontImage),
        backImage: signedKycUrl(row.backImage),
        selfieImage: signedKycUrl(row.selfieImage),
      }
    : row;
