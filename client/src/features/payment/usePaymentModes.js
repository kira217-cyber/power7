import { useEffect, useState } from "react";

import api from "../../api/axios";

/**
 * ডিপোজিট বা উত্তোলনের কোন পথ খোলা — `/api/payment-modes`।
 * `{ loading, manual, auto }`; জানা না গেলে দুটোই বন্ধ ধরে নেওয়া হয়
 * না — ম্যানুয়াল খোলা ধরা হয়, যাতে সার্ভারের এক মুহূর্তের ভুলে পুরো
 * ডিপোজিট "বন্ধ" না দেখায় (ম্যানুয়াল সত্যিই বন্ধ থাকলে জমার সময় সার্ভার আটকায়)।
 */
export const usePaymentModes = (kind) => {
  const [state, setState] = useState({ loading: true, manual: false, auto: false });

  useEffect(() => {
    let alive = true;
    api
      .get("/api/payment-modes")
      .then(({ data }) => {
        const modes = data?.data?.[kind] || {};
        if (alive) setState({ loading: false, manual: Boolean(modes.manual), auto: Boolean(modes.auto) });
      })
      .catch(() => alive && setState({ loading: false, manual: true, auto: false }));
    return () => {
      alive = false;
    };
  }, [kind]);

  return state;
};

/** অটো উত্তোলনের সারি → ম্যানুয়াল আবেদনের রূপ (তালিকাগুলো একসাথে দেখাতে) */
const WD_STATUS = { PENDING: "pending", PROCESSING: "pending", COMPLETED: "approved", REJECTED: "rejected" };
export const autoWithdrawRow = (row) => ({
  ...row,
  auto: true,
  status: WD_STATUS[row.status] || "pending",
  methodId: String(row.paymentMethod || "").toUpperCase(),
  walletSnapshot: { methodName: row.methodName, walletNumber: row.accountNumber },
  adminNote: row.status === "REJECTED" ? row.reason : "",
  // সফল হলে OraclePay এর এজেন্টের ট্রানজেকশন আইডি — খেলোয়াড় নিজের ওয়ালেটে মেলাতে পারেন
  trxId: row.status === "COMPLETED" ? row.transactionId || "" : "",
  approvedAt: row.completedAt,
});

/** অটো ডিপোজিটের সারি → ম্যানুয়াল আবেদনের রূপ */
const DEP_STATUS = { PENDING: "pending", PAID: "approved", FAILED: "rejected" };
export const autoDepositRow = (row) => ({
  ...row,
  auto: true,
  status: DEP_STATUS[row.status] || "pending",
  methodId: String(row.bank || "AUTO").toUpperCase(),
  display: { methodName: { bn: `অটো ${row.bank || ""}`.trim(), en: `Auto ${row.bank || ""}`.trim() } },
  calc: { ...row.calc, totalBonus: row.calc?.bonusAmount || 0 },
  approvedAt: row.paidAt,
  adminNote: row.reviewNote || "",
});
