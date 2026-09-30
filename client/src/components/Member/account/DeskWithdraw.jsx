import React, { useCallback, useEffect, useState } from "react";

import api from "../../../api/axios";
import { useLanguage } from "../../../Context/LanguageProvider";
import { useWithdrawFlow, maskNumber } from "../../../features/withdraw/useWithdrawFlow";
import { useProfile } from "../../../features/profile/useProfile";
import { assetUrl } from "../../../utils/siteLink";
import { TxDrawer, WalletPanel } from "./DeskDrawer";
import { ChangeModeButton } from "../PaymentModeGate";
import { autoWithdrawRow } from "../../../features/payment/usePaymentModes";

/**
 * ডেস্কটপের "উত্তোলন" — মূল সাইটের `#mc_container.withdraw-page`, তাদের
 * CSS আর মাপা DOM থেকে (১১১০ × ৬২০):
 *
 *   উপরে `.tab-nav` ৪৭ উঁচু — "উত্তোলন" / "অ্যাকাউন্ট ব্যবস্থাপনা"
 *     (সক্রিয় লাল #FD2F2F, নিচে ৩px দাগ)
 *   বাঁয়ে ৮১০: ওয়ালেটের ধরন (১২০ × ৪৮, লাল দাগ) + সবুজ ৩৪ গোল "সম্পাদনা";
 *     ওয়ালেট কার্ডের স্তূপ (৩৫৬ × ১৩০, পিছনেরগুলো ছোট হয়ে উপরে উঁকি দেয়)
 *     বা খালি ছবি (২৮৮ × ১৭৫) + লাল "ওয়ালেট যোগ করুন"; নিচে ফর্ম —
 *     লেবেল ১০২ চওড়া, টাকা ২০px ৭০০ #0094D1, ইনপুট ১৩৬ × ৩৪
 *   মাঝে-ডানে "উত্তোলন সময়" এর কমলা বাক্স (২৮৮, বাঁয়ে ৪৭ ফাঁক)
 *   ডানে ২৯০ ধূসর #F5F5F5 "সাম্প্রতিক উত্তোলন" (নীল দাগ) — শেষের আবেদনগুলো
 *   নিচে ৪৮ উঁচু ফুটার, "জমা দিন" ৯৮ × ৩৪
 *
 * "অ্যাকাউন্ট ব্যবস্থাপনা" = ওয়ালেট যোগ + নিবন্ধিত তালিকা (অ্যাকাউন্টের
 * ড্রয়ারের সাথে একই কম্পোনেন্ট)।
 */

const IMG = "/assets/member-desk";
const RED = "var(--member-accent, #fd2f2f)";
const BLUE = "#0094d1";

const two = (n) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "১,২৩৪.৫৬" → বড় পূর্ণ অংশ, ছোট দশমিক — মূল সাইটের `.balance small` */
const Money = ({ value }) => {
  const [whole, cents] = two(value).split(".");
  return (
    <span style={{ fontSize: 20, fontWeight: 700, color: BLUE }}>
      {whole}.<small style={{ fontSize: 14 }}>{cents}</small>
    </span>
  );
};

const Label = ({ children, top }) => (
  <span className="shrink-0" style={{ width: 102, fontSize: 14, color: "var(--member-text, #666)", lineHeight: 1.25, display: "flex", alignItems: top ? "flex-start" : "center", paddingTop: top ? 8 : 0 }}>
    {children}:
  </span>
);

const inputBox = {
  width: 136,
  height: 34,
  borderRadius: 5,
  border: "1px solid var(--member-line, #e5e5e5)",
  background: "#f5f5f5",
  color: "#646464",
  outline: "none",
  paddingLeft: 5,
  fontSize: 12,
  boxShadow: "0 1px 5px rgba(0,0,0,.08) inset",
};

/* ─────────────── সাম্প্রতিক উত্তোলন ─────────────── */

const useRecentWithdraws = () => {
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    try {
      // ম্যানুয়াল আর অটো দুটো মিলিয়ে সবচেয়ে নতুন পাঁচটা
      const [manual, auto] = await Promise.all([
        api.get("/api/withdraw-requests/my", { params: { limit: 5 } }),
        api.get("/api/auto-withdraw/history/my", { params: { limit: 5 } }).catch(() => null),
      ]);
      const list = [...(manual.data?.data?.requests || []), ...(auto?.data?.data?.withdrawals || []).map(autoWithdrawRow)];
      setRows(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
    } catch {
      setRows([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { rows: rows || [], loaded: rows !== null, load };
};

const pad = (n) => String(n).padStart(2, "0");
const when = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const RecentHistory = ({ recent, tv }) => {
  const { t } = useLanguage();
  const w = t.deskWd;
  const statusColor = { approved: "#0cc06d", rejected: RED, pending: "#f5a623" };
  return (
    <div className="absolute" style={{ top: 47, right: 0, width: 290, height: "calc(100% - 47px)", background: "#f5f5f5" }}>
      <div style={{ lineHeight: "15px", margin: "18px 30px 0", paddingLeft: 10, borderLeft: "4px solid #4c8bff", fontSize: 14, color: "var(--member-text, #666)" }}>{w.recent}</div>
      <div className="hide-scrollbar absolute w-full overflow-y-auto" style={{ top: 53, height: "calc(100% - 53px)" }}>
        {recent.rows.length === 0 ? (
          <div className="flex items-center justify-center" style={{ margin: "0 30px 16px", height: 101, background: "#fafafa", color: "#d1d1d1", borderRadius: 10, width: 240, boxShadow: "0 5px 24px 0 rgba(0,0,0,.08)", fontSize: 14 }}>
            <img src={`${IMG}/no-history.png`} alt="" style={{ width: 20, height: 18, marginRight: 6 }} />
            {w.noHistory}
          </div>
        ) : (
          recent.rows.map((r) => (
            <div key={r._id} className="flex flex-col" style={{ marginLeft: 30, marginBottom: 16, minHeight: 101, width: 240, background: "#fcfcfc", borderRadius: 10, overflow: "hidden", boxShadow: "0 5px 24px 0 rgba(0,0,0,.08)", fontSize: 12 }}>
              <div className="flex justify-between" style={{ background: "var(--member-surface, #fff)", padding: "10px 14px 5px", minHeight: 30, color: "var(--member-muted, #999)" }}>
                <span>{when(r.createdAt)}</span>
                <span style={{ color: statusColor[r.status] || "var(--member-text, #666)" }}>{w.status[r.status] || r.status}</span>
              </div>
              <div className="flex items-start justify-between" style={{ padding: "10px 15px 0", color: "#5e5e5e", gap: 10 }}>
                <span className="flex-1">{tv(r.walletSnapshot?.methodName) || r.methodId}</span>
                <div className="flex flex-col items-end">
                  <span style={{ color: BLUE, fontSize: 14, fontFamily: "Arial, serif" }}>{two(r.amount)}</span>
                  <span style={{ marginTop: 10, color: "#b7b7b7" }}>{maskNumber(r.walletSnapshot?.walletNumber || "")}</span>
                </div>
              </div>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={recent.load}
          className="mx-auto block cursor-pointer"
          style={{ minWidth: 115, height: 34, borderRadius: 20, background: "var(--member-surface, #fff)", color: "#747474", fontSize: 14, boxShadow: "0 1px 7px 0 rgba(148,147,147,.26)", marginBottom: 20 }}
        >
          {w.refresh}
        </button>
      </div>
    </div>
  );
};

/* ─────────────── ওয়ালেট কার্ডের স্তূপ ─────────────── */

const STACK = [
  { transform: "translateZ(0) translateY(0)", zIndex: 6 },
  { transform: "scale(.9) translateY(-16px)", zIndex: 3 },
  { transform: "scale(.8) translateY(-36px)", zIndex: 2 },
  { transform: "scale(.7) translateY(-83px)", zIndex: 1 },
];

const WalletStack = ({ f }) => {
  const index = Math.max(0, f.wallets.findIndex((x) => x._id === f.walletId));
  // বাছাই করা কার্ড সামনে, বাকিগুলো পিছনে ক্রমানুসারে
  const ordered = [...f.wallets.slice(index), ...f.wallets.slice(0, index)];
  return (
    <div className="relative" style={{ marginLeft: 5, width: 361, height: 200, paddingTop: 16 }}>
      <div className="relative" style={{ width: 356, height: 130, transformStyle: "preserve-3d", perspective: 380 }}>
        {ordered.map((wallet, i) => {
          const method = f.methods.find((m) => m.methodId === wallet.methodId);
          return (
            <div
              key={wallet._id}
              role="button"
              tabIndex={0}
              onClick={() => f.setWalletId(wallet._id)}
              className="absolute top-0 left-0 cursor-pointer"
              style={{ width: "100%", height: 130, borderRadius: 14, background: `url(${IMG}/ewallet${(f.wallets.indexOf(wallet) % 4) + 1}.png) center / 100% 100% no-repeat`, color: "#fff", padding: "20px 18px 0", overflow: "hidden", transition: "all .5s linear", ...STACK[Math.min(i, 3)] }}
            >
              <div className="flex items-center" style={{ fontSize: 18, height: 30, gap: 10 }}>
                {method?.logoUrl ? <img src={assetUrl(method.logoUrl)} alt="" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 6, background: "var(--member-surface, #fff)" }} /> : <span style={{ width: 30 }} />}
                <span className="truncate">{f.tv(method?.methodName) || wallet.methodId}</span>
              </div>
              <div style={{ fontSize: 18, marginTop: 17, height: 36 }}>{maskNumber(wallet.walletNumber)}</div>
              <div style={{ fontSize: 14 }}>{wallet.accountName}</div>
              {i === 0 && (
                <span
                  role="presentation"
                  onClick={(e) => {
                    e.stopPropagation();
                    f.removeWallet(wallet);
                  }}
                  className="absolute cursor-pointer"
                  style={{ right: 18, top: 20, width: 11, height: 14, background: `url(${IMG}/dei-icon.png) center / 100% 100% no-repeat` }}
                />
              )}
            </div>
          );
        })}
      </div>
      {f.wallets.length > 1 && (
        <div className="text-center" style={{ marginTop: 16 }}>
          {f.wallets.map((wallet) => (
            <span
              key={wallet._id}
              role="presentation"
              onClick={() => f.setWalletId(wallet._id)}
              style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", marginRight: 10, cursor: "pointer", background: wallet._id === f.walletId ? RED : "#b8b8b8" }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────── লেনদেন পাসওয়ার্ড ড্রয়ার (প্যানেলের ভিতরে) ─────────────── */

const TxSetup = ({ onClose }) => {
  const profile = useProfile();
  return <TxDrawer profile={profile} onClose={onClose} />;
};

/* ─────────────── মূল কম্পোনেন্ট ─────────────── */

const DeskWithdraw = ({ mode = "manual", onChangeMode = null }) => {
  const { t } = useLanguage();
  const w = t.deskWd;
  const wf = t.withdrawFlow;
  const f = useWithdrawFlow({ mode });
  const recent = useRecentWithdraws();
  const [tab, setTab] = useState("withdraw");
  const [showPw, setShowPw] = useState(false);
  const [txDrawer, setTxDrawer] = useState(false);

  const amount = Number(f.amount) || 0;
  const canSubmit = Boolean(f.wallet) && amount > 0 && Boolean(f.txPassword) && !f.busy && !f.block && !f.unsupported;
  const turnoverBlock = f.block && f.block !== "noTx";

  const submit = async () => {
    await f.submit();
    recent.load();
  };

  return (
    <div className="relative overflow-hidden" style={{ width: 1110, height: 620, background: "var(--member-surface, #fff)", fontSize: 14, color: "var(--member-text, #666)", lineHeight: 1.2 }}>
      {/* ট্যাব */}
      <div className="flex" style={{ height: 47, borderBottom: "1px solid #efefef", paddingLeft: 30 }}>
        {[
          ["withdraw", f.isAuto ? t.payMode.autoWithdraw : w.tabWithdraw],
          ["manage", w.tabManage],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="cursor-pointer"
            style={{ height: 46, lineHeight: "44px", marginRight: 20, padding: "0 10px", fontSize: 14, color: tab === key ? RED : "#666", borderBottom: tab === key ? `3px solid ${RED}` : "3px solid transparent" }}
          >
            {label}
          </button>
        ))}
        {/* দুটো পথ খোলা থাকলে — "সাম্প্রতিক উত্তোলন" এর বাঁয়ে */}
        {onChangeMode && (
          <span className="flex items-center" style={{ marginLeft: "auto", marginRight: 310 }}>
            <ChangeModeButton desktop onChange={onChangeMode} />
          </span>
        )}
      </div>

      {tab === "manage" ? (
        <div className="absolute" style={{ top: 47, left: 0, width: 820, height: 573 }}>
          <WalletPanel
            flow={f}
            onChanged={() => {
              f.reload();
            }}
          />
        </div>
      ) : (
        <>
          {/* উপরের সারি — ওয়ালেটের ধরন + সম্পাদনা */}
          <div className="absolute flex items-center" style={{ top: 57, left: 34, gap: 35 }}>
            <div className="flex items-center" style={{ width: 120, height: 48, borderRadius: 6, border: "1px solid var(--member-accent, #ff2f34)", padding: "0 10px", gap: 5 }}>
              <span className="grid place-items-center" style={{ width: 36, height: 36 }}>
                <span style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#ff4fb4,#e3197f)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>ec</span>
              </span>
              <span style={{ color: "var(--member-text, #666)" }}>{w.eWallet}</span>
            </div>
            <button
              type="button"
              title={w.tabManage}
              onClick={() => setTab("manage")}
              className="cursor-pointer"
              style={{ width: 34, height: 34, borderRadius: "50%", background: `#23e63a url(${IMG}/add-edit.png) center / 70% no-repeat`, boxShadow: "0 6px 18px 0 rgba(13,252,30,.33)" }}
            />
          </div>

          {/* বাঁ — কার্ড আর ফর্ম */}
          <div className="absolute" style={{ top: 119, left: 34, width: 366 }}>
            <div style={{ height: 290 }}>
              {f.wallets.length ? (
                <WalletStack f={f} />
              ) : (
                <div style={{ marginLeft: 5, width: 288, textAlign: "center", paddingTop: 16 }}>
                  <div style={{ width: 288, height: 175, background: `url(${IMG}/no-bank-big.png) center / 100% 100% no-repeat` }} />
                  <p style={{ color: "#a9a9a9", fontSize: 14, position: "relative", top: -12 }}>{w.emptyWallet}</p>
                  <button
                    type="button"
                    onClick={() => setTab("manage")}
                    className="cursor-pointer"
                    style={{ marginTop: 15, minWidth: 141, height: 34, padding: "0 10px", borderRadius: 17, background: "var(--member-accent, #ff2f34)", boxShadow: "0 4px 10px 0 rgba(255,47,52,.3)", color: "#fff", fontSize: 14 }}
                  >
                    <img src={`${IMG}/plus.png`} alt="" style={{ width: 15, height: 15, display: "inline", verticalAlign: "-2px", marginRight: 5 }} />
                    {w.addWallet}
                  </button>
                </div>
              )}
            </div>

            <div style={{ width: 348 }}>
              <div className="flex" style={{ marginTop: 4, minHeight: 28, alignItems: "center" }}>
                <Label>{w.central}</Label>
                <Money value={f.balance} />
              </div>
              <div className="flex" style={{ marginTop: 4, minHeight: 20, alignItems: "center" }}>
                <Label>{w.receive}</Label>
                <Money value={amount} />
              </div>
              <div className="flex" style={{ marginTop: 4, minHeight: 44 }}>
                <Label top>{w.amount}</Label>
                <div className="flex items-center" style={{ height: 34 }}>
                  <input
                    value={f.amount}
                    onChange={(e) => f.setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder={f.max ? `${f.min.toLocaleString("en-US")} - ${f.max.toLocaleString("en-US")}` : ""}
                    style={inputBox}
                  />
                  <button type="button" onClick={f.refreshBalance} className="flex cursor-pointer items-center" style={{ marginLeft: 5, color: "var(--member-text, #666)", gap: 6 }}>
                    <img src={`${IMG}/icon-return.png`} alt="" style={{ width: 18, height: 18 }} />
                    {w.recall}
                  </button>
                </div>
              </div>
              <div className="flex" style={{ marginTop: 4, minHeight: 34 }}>
                <Label top>{w.tx}</Label>
                <div>
                  <span className="relative block" style={{ width: 136 }}>
                    <input
                      type={showPw ? "text" : "password"}
                      value={f.txPassword}
                      onChange={(e) => f.setTxPassword(e.target.value)}
                      onPaste={(e) => e.preventDefault()}
                      disabled={f.block === "noTx"}
                      autoComplete="new-password"
                      maxLength={12}
                      style={{ ...inputBox, paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute cursor-pointer" style={{ right: 14, top: 8 }} aria-label="show">
                      <img src={`${IMG}/${showPw ? "eyes-icon-open" : "eyes-icon-close"}.svg`} alt="" style={{ width: 20, height: 18 }} />
                    </button>
                  </span>
                  {f.block === "noTx" && (
                    <div style={{ marginTop: 6, fontSize: 12, color: RED }}>
                      {w.setTx}{" "}
                      <button type="button" onClick={() => setTxDrawer(true)} className="cursor-pointer" style={{ color: "#2a74e7", textDecoration: "underline" }}>
                        {w.setTxBtn}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* মাঝে-ডানে — উত্তোলন সময় আর আটকে থাকার কারণ */}
          <div className="hide-scrollbar absolute overflow-y-auto" style={{ top: 119, left: 410, width: 366, height: 448 }}>
            <div style={{ width: 288, marginLeft: 47, borderRadius: 10, border: "1px solid #f9dacb", padding: "14px 12px 14px 14px", backgroundImage: "linear-gradient(90deg,rgba(255,253,251,.2) 0,#ffe7d6 100%)" }}>
              <span style={{ display: "inline-block", minWidth: 68, height: 21, lineHeight: "21px", textAlign: "center", fontSize: 13, borderRadius: "11px 0 11px 0", padding: "0 5px", background: "#ffe6d1", color: "#f55600", letterSpacing: 1 }}>{w.timeTag}:</span>
              <div style={{ marginTop: 4, fontWeight: 700, color: RED, letterSpacing: 1 }}>{w.time}</div>
              {f.min || f.max ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "#8a6a55", lineHeight: 1.5 }}>
                  {wf.limit}: ৳{two(f.min)} - ৳{two(f.max)}
                </div>
              ) : null}
              {f.isAuto && f.supportedList && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#8a6a55", lineHeight: 1.5 }}>{t.payMode.supported.replace("{list}", f.supportedList)}</div>
              )}
            </div>

            {f.unsupported && (
              <div style={{ width: 288, marginLeft: 47, marginTop: 14, borderRadius: 10, border: "1px solid #ffd0d1", background: "#fff6f6", padding: 14, fontSize: 13, color: RED, lineHeight: 1.5 }}>
                {t.payMode.unsupported}
              </div>
            )}

            {turnoverBlock && (
              <div style={{ width: 288, marginLeft: 47, marginTop: 14, borderRadius: 10, border: "1px solid #ffd0d1", background: "#fff6f6", padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: RED }}>{f.block === "pendingWithdraw" ? wf.pendingTitle : f.block === "verification" ? wf.verifyTitle : f.block === "dailyLimit" ? wf.dailyTitle : wf.turnoverTitle}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--member-text, #555)", lineHeight: 1.5 }}>
                  {f.block === "pendingWithdraw"
                    ? wf.pendingHint.replace("{amount}", two(f.elig?.pendingAmount))
                    : f.block === "verification"
                      ? wf.verifyHint
                      : f.block === "dailyLimit"
                        ? wf.dailyHint.replace("{n}", f.elig?.limit ?? 0)
                        : wf.turnoverHint.replace("{amount}", two(f.elig?.remaining))}
                </div>
                {f.block === "turnover" &&
                  (f.elig?.turnovers || []).map((item, index) => (
                    <div key={index} style={{ marginTop: 10 }}>
                      <div className="flex justify-between" style={{ fontSize: 12, color: "var(--member-title, #333)" }}>
                        <span className="truncate">{item.title}</span>
                        <span>
                          {two(item.progress)} / {two(item.required)}
                        </span>
                      </div>
                      <div style={{ marginTop: 5, height: 6, borderRadius: 99, background: "#f1d5d6", overflow: "hidden" }}>
                        <div style={{ width: `${item.percent}%`, height: "100%", background: RED }} />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* ফুটার */}
          <div className="absolute bottom-0 left-0 flex items-center" style={{ width: 820, height: 48, borderTop: "1px solid #f5f5f5", paddingLeft: 30 }}>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="cursor-pointer"
              style={{ minWidth: 98, height: 34, padding: "0 10px", borderRadius: 20, color: "#fff", fontSize: 14, background: canSubmit ? RED : "#d5d5d5", boxShadow: `0 0 10px ${canSubmit ? "#ffd3d3" : "#d5d5d5"}` }}
            >
              {w.submit}
            </button>
            {/* মূল সাইটের মতো — আজ আর কতবার তোলা যাবে (admin এর দিনের সীমা) */}
            {f.elig?.today?.remaining != null && (
              <span className="flex items-center" style={{ marginLeft: 15, gap: 8, fontSize: 14, color: "var(--member-text, #666)" }}>
                {wf.todayLeft}
                <b style={{ fontSize: 18, color: "#fd4b4b" }}>{f.elig.today.remaining}</b>
              </span>
            )}
          </div>
        </>
      )}

      <RecentHistory recent={recent} tv={f.tv} />

      {txDrawer && (
        <TxSetup
          onClose={() => {
            setTxDrawer(false);
            f.reload();
          }}
        />
      )}
    </div>
  );
};

export default DeskWithdraw;
