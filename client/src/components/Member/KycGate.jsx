import React from "react";
import { useNavigate } from "react-router";

import { useLanguage } from "../../Context/LanguageProvider";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { m } from "../../hook/useUnits";
import { useUI } from "../../Context/uiContext";
import { requestKyc } from "../../features/profile/kycRequest";
import { MEMBER_LINKS } from "./sections";

const RED = "var(--member-accent, #ec2529)";

/** "এখনই যাচাই করুন" — ডেস্কটপে My Account এর KYC ড্রয়ার, মোবাইলে Security এর KYC ফর্ম */
export const VerifyNowButton = ({ status }) => {
  const { t } = useLanguage();
  const g = t.kycGate;
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const { openMember } = useUI();
  const u = (d, mob) => (isDesktop ? d : m(mob));

  const go = () => {
    requestKyc();
    if (isDesktop) openMember("myAccount");
    else navigate(MEMBER_LINKS.security || "/member/security");
  };

  return (
    <button
      type="button"
      onClick={go}
      className="cursor-pointer"
      style={{ marginTop: u(14, 26), height: u(38, 72), padding: isDesktop ? "0 22px" : `0 ${m(40)}`, borderRadius: u(6, 12), background: RED, color: "#fff", fontSize: u(14, 28), fontWeight: 700 }}
    >
      {status === "pending" ? g.view : g.button}
    </button>
  );
};

/** ডিপোজিট আটকে থাকার বার্তা — যাচাই হয়নি / অপেক্ষায় / বাতিল */
const KycGate = ({ status }) => {
  const { t } = useLanguage();
  const g = t.kycGate;
  const isDesktop = useIsDesktop();
  const u = (d, mob) => (isDesktop ? d : m(mob));
  const title = status === "pending" ? g.pendingTitle : g.title;
  const hint = status === "pending" ? g.pendingHint : status === "rejected" ? g.rejectedHint : g.hint;

  return (
    <div
      style={{
        margin: isDesktop ? "24px auto" : `${m(30)} ${m(24)}`,
        maxWidth: isDesktop ? 560 : "none",
        borderRadius: u(8, 16),
        background: "#fff6f6",
        border: `${u(1, 2)} solid #ffd0d1`,
        padding: isDesktop ? "18px 20px" : `${m(32)} ${m(30)}`,
      }}
    >
      <div style={{ fontSize: u(16, 32), fontWeight: 700, color: RED }}>{title}</div>
      <div style={{ marginTop: u(6, 12), fontSize: u(13, 26), color: "var(--member-text, #555)", lineHeight: 1.5 }}>{hint}</div>
      <VerifyNowButton status={status} />
    </div>
  );
};

export default KycGate;
