import React from "react";
import { useNavigate } from "react-router";

import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { maskNumber, useWithdrawFlow } from "../../features/withdraw/useWithdrawFlow";
import { assetUrl } from "../../utils/siteLink";
import MemberShell from "./MemberShell";

/**
 * "আমার কার্ড" — মূল সাইটের `/m/myWithdrawCards` (শুধু মোবাইল; ডেস্কটপে
 * একই কাজ উত্তোলনের "অ্যাকাউন্ট ব্যবস্থাপনা" ট্যাবে)।
 *
 * উপরে কমলা বিন্দু সহ "ই-ওয়ালেট যোগ করা হয়েছে: N", তারপর ওয়ালেটের রঙিন
 * কার্ড (মূল সাইটের ewallet1–4 পটভূমি) বা ধূসর "খালি ই-ওয়ালেট", আর
 * নিচে মাঝখানে লাল গোল "+" — যোগ করার ফর্মে নিয়ে যায়।
 */
const IMG = "/assets/member-desk";

const CardsSection = () => {
  const { t } = useLanguage();
  const c = t.cardsPage;
  const f = useWithdrawFlow();
  const navigate = useNavigate();
  const full = f.wallets.length >= f.cap;

  return (
    <MemberShell title={t.memberPage.cardBtn}>
      <div style={{ background: "var(--member-surface, #fff)", minHeight: "calc(100vh - 1rem)", padding: `${m(24)} ${m(24)} ${m(220)}` }}>
        <div className="flex items-center" style={{ fontSize: m(28), color: "var(--member-title, #333)", gap: m(12), marginBottom: m(24) }}>
          <span style={{ width: m(12), height: m(12), borderRadius: "50%", background: "#f5a623" }} />
          {c.added}: {f.wallets.length}
        </div>

        {f.loading ? null : f.wallets.length === 0 ? (
          <div className="flex items-center" style={{ height: m(140), borderRadius: m(14), background: "linear-gradient(90deg,#efeff1,#f7f7f9)", padding: `0 ${m(30)}`, gap: m(18), color: "var(--member-text, #666)", fontSize: m(28) }}>
            <span className="grid place-items-center" style={{ width: m(54), height: m(54), borderRadius: "50%", background: "var(--member-surface, #fff)", color: "#aaa", fontSize: m(26) }}>
              ▭
            </span>
            {c.empty}
          </div>
        ) : (
          f.wallets.map((wallet, index) => {
            const method = f.methods.find((x) => x.methodId === wallet.methodId);
            return (
              <div
                key={wallet._id}
                className="relative"
                style={{ height: m(250), marginBottom: m(24), borderRadius: m(24), background: `url(${IMG}/ewallet${(index % 4) + 1}.png) center / 100% 100% no-repeat`, color: "#fff", padding: `${m(34)} ${m(32)} 0` }}
              >
                <div className="flex items-center" style={{ gap: m(16), fontSize: m(32), height: m(56) }}>
                  {method?.logoUrl ? (
                    <img src={assetUrl(method.logoUrl)} alt="" style={{ width: m(56), height: m(56), objectFit: "contain", background: "var(--member-surface, #fff)", borderRadius: m(10) }} />
                  ) : null}
                  {f.tv(method?.methodName) || wallet.methodId}
                </div>
                <div style={{ fontSize: m(36), marginTop: m(30), letterSpacing: 1 }}>{maskNumber(wallet.walletNumber)}</div>
                <div style={{ fontSize: m(26), marginTop: m(10) }}>{wallet.accountName}</div>
                <button
                  type="button"
                  aria-label={c.remove}
                  onClick={() => f.removeWallet(wallet)}
                  className="absolute cursor-pointer"
                  style={{ right: m(32), top: m(38), width: m(26), height: m(32), background: `url(${IMG}/dei-icon.png) center / 100% 100% no-repeat` }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* নিচের লাল "+" — যোগ করার ফর্ম (উত্তোলন পাতায়) */}
      {!full && (
        <button
          type="button"
          aria-label={c.add}
          onClick={() => navigate("/member/withdraw?add=1")}
          className="fixed grid cursor-pointer place-items-center"
          style={{ left: "50%", transform: "translateX(-50%)", bottom: m(40), width: m(84), height: m(84), borderRadius: "50%", background: "var(--member-accent, #f5333f)", color: "#fff", fontSize: m(56), lineHeight: 1, boxShadow: "0 4px 12px rgba(245,51,63,.4)", zIndex: 5 }}
        >
          +
        </button>
      )}
    </MemberShell>
  );
};

export default CardsSection;
