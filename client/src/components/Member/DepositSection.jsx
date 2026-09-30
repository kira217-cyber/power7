import React from "react";

import { Copy } from "lucide-react";

import Icon from "../Icon/Icon";
import { useIsDesktop } from "../../hook/useIsDesktop";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import MemberShell from "./MemberShell";
import { assetUrl, useDepositFlow } from "../../features/deposit/useDepositFlow";
import { useAutoDeposit } from "../../features/deposit/useAutoDeposit";
import { useUI } from "../../Context/uiContext";
import PaymentModeGate, { ChangeModeButton } from "./PaymentModeGate";

/**
 * ম্যানুয়াল ডিপোজিট — মূল সাইটের নকশায়, BetChokkor এর কাজে।
 *
 * মাপ `MoneySection.jsx` এর মাথার মন্তব্যে (মূল সাইট থেকে মাপা); এখানে
 * শুধু ডেটা server এর: মেথড (লোগো, সীমা), চ্যানেল (বোনাস ট্যাগ),
 * প্রমোশন, এজেন্টের নম্বর আর admin এর চাওয়া ঘর (TrxID)।
 *
 * দ্বিতীয় ধাপ ("টাকা পাঠান") মূল সাইটের পেমেন্ট পাতার মতো — নম্বর কপি,
 * হিসাব, আর TrxID লিখে জমা।
 */

const RED = "var(--member-accent, #ec2529)";
const DRED = "var(--member-accent, #ff2f34)";

/** চ্যানেলের বোনাস ট্যাগ — শূন্য হলে ("+0%") কিছু না */
const bonusTag = (channel) => {
  const pct = Number(channel?.bonusPercent) || parseFloat(String(channel?.tagText || "").replace(/[+%]/g, "")) || 0;
  return pct > 0 ? channel.tagText || `+${pct}%` : "";
};

const fmt = (n) => (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** মেথডের লোগো — না থাকলে নামের প্রথম দুই অক্ষর */
const MethodLogo = ({ method, size, radius }) =>
  method.logoUrl ? (
    <img src={assetUrl(method.logoUrl)} alt="" style={{ width: size, height: size, objectFit: "contain", borderRadius: radius }} />
  ) : (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "#f2f2f2",
        display: "grid",
        placeItems: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--member-muted, #888)",
      }}
    >
      {String(method.methodName?.en || method.methodId).slice(0, 2).toUpperCase()}
    </span>
  );

/* ─────────────────── ডেস্কটপ ─────────────────── */

const DeskChip = ({ active, onClick, children, width }) => (
  <button
    type="button"
    onClick={onClick}
    className="cursor-pointer"
    style={{
      width,
      minWidth: 116,
      height: 48,
      padding: width ? 0 : "0 25px",
      borderRadius: 6,
      border: `1px solid ${active ? DRED : "#eee"}`,
      color: active ? "#646464" : "#8f8f8f",
      fontSize: 14,
      background: "var(--member-surface, #fff)",
    }}
  >
    {children}
  </button>
);

const DeskRow = ({ label, children, wide }) => (
  <div className="flex items-start" style={{ marginBottom: 18 }}>
    <span style={{ width: wide ? 190 : 100, flexShrink: 0, fontSize: 14, color: "var(--member-title, #222)", lineHeight: wide ? "20px" : "38px", paddingTop: wide ? 10 : 0 }}>{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

const Desktop = ({ onChangeMode }) => {
  const { t } = useLanguage();
  const { openMember } = useUI();
  const d = t.depositFlow;
  const f = useDepositFlow();

  const payStep = f.step === "pay";

  return (
    <div className="flex" style={{ width: 1110, height: 620 }}>
      {/* পেমেন্ট মেথডের তালিকা */}
      <div
        className="hide-scrollbar"
        style={{ width: 255, height: 620, background: "#f7f7f7", padding: "22px 25px", overflowY: "auto" }}
      >
        {f.methods.map((item) => (
          <button
            key={item.methodId}
            type="button"
            disabled={payStep}
            onClick={() => f.chooseMethod(item.methodId)}
            className="relative flex w-full cursor-pointer items-center"
            style={{
              width: 205,
              height: 68,
              borderRadius: 6,
              background: "var(--member-surface, #fff)",
              border: `1px solid ${item.methodId === f.methodId ? DRED : "transparent"}`,
              marginBottom: 15,
              padding: "0 14px",
              gap: 12,
              color: "var(--member-text, #666)",
              fontSize: 14,
              opacity: payStep && item.methodId !== f.methodId ? 0.5 : 1,
            }}
          >
            <MethodLogo method={item} size={38} radius={6} />
            <span className="truncate">{f.tv(item.methodName)}</span>
            {/* মূল সাইটের মতো বেছে নেওয়া কার্ডের ডান-নিচে লাল টিক */}
            {item.methodId === f.methodId && (
              <span className="absolute" style={{ right: 0, bottom: 0, width: 20, height: 20, background: `linear-gradient(135deg, transparent 50%, ${DRED} 50%)`, borderBottomRightRadius: 5 }}>
                <svg viewBox="0 0 10 8" className="absolute" style={{ right: 2, bottom: 3, width: 8, height: 6 }} aria-hidden="true">
                  <path d="M1 4l3 3 5-6" fill="none" stroke="#fff" strokeWidth="1.6" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ডানের ফর্ম */}
      <div className="flex flex-col" style={{ width: 855, height: 620, background: "var(--member-surface, #fff)" }}>
        <div className="flex items-center" style={{ height: 47, padding: "0 61px 0 20px", gap: 8, flexShrink: 0, borderBottom: "1px solid var(--member-line, #eee)" }}>
          <span style={{ width: 4, height: 16, background: "#23e63a" }} />
          <span style={{ fontSize: 16, color: "#000" }}>{payStep ? d.payTitle : t.member.depositInfo}</span>
          <span className="flex-1" />
          <ChangeModeButton desktop onChange={payStep ? null : onChangeMode} />
          {/* "জমা রেকর্ড" — অ্যাকাউন্ট রেকর্ডের জমা ট্যাব খোলে */}
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem("tb_rec_sub", "1");
              } catch {
                /* private mode */
              }
              openMember("accountRecord");
            }}
            className="flex cursor-pointer items-center"
            style={{ height: 32, padding: "0 14px 0 10px", gap: 8, borderRadius: 16, border: "2px solid #c9d5fb", color: "#5076f3", fontSize: 14 }}
          >
            <svg viewBox="0 0 18 20" style={{ width: 17, height: 19 }} aria-hidden="true">
              <rect x="1" y="2" width="12" height="16" rx="2" fill="#5076f3" />
              <path d="M4 7h6M4 10h6M4 13h4" stroke="#fff" strokeWidth="1.4" />
              <circle cx="13.5" cy="15" r="4" fill="#fff" stroke="#5076f3" strokeWidth="1.4" />
              <path d="M13.5 13v4M11.5 15h4" stroke="#5076f3" strokeWidth="1.4" />
            </svg>
            {d.recordBtn}
          </button>
        </div>

        <div className="hide-scrollbar min-h-0 flex-1" style={{ padding: "18px 20px 0", overflowY: "auto" }}>
          {f.loading && <div style={{ color: "var(--member-muted, #999)", fontSize: 13, padding: 20 }}>{d.loading}</div>}
          {!f.loading && !f.methods.length && <div style={{ color: "var(--member-muted, #999)", fontSize: 13, padding: 20 }}>{d.noMethods}</div>}

          {f.method && !payStep && (
            <>
              <div
                style={{
                  display: "inline-block",
                  border: "1px solid #f9dacb",
                  borderRadius: 10,
                  background: "#fdeee6",
                  color: DRED,
                  fontSize: 14,
                  lineHeight: "20px",
                  padding: "9px 15px",
                  marginBottom: 20,
                }}
              >
                {t.member.depositWarning}
              </div>

              {/* মূল সাইটে চ্যানেলের পাশে লেবেল নেই */}
              <div style={{ marginBottom: 18 }}>
                <div className="flex flex-wrap" style={{ gap: 15 }}>
                  {f.method.channels.map((item) => (
                    <DeskChip key={item.id} active={item.id === f.channelId} onClick={() => f.setChannelId(item.id)}>
                      {f.tv(item.name)}
                      {bonusTag(item) && <span style={{ marginInlineStart: 6, color: "var(--member-success, #3fbf6e)", fontSize: 12 }}>{bonusTag(item)}</span>}
                    </DeskChip>
                  ))}
                </div>
              </div>

              {f.method.promotions?.length > 0 && (
                <DeskRow label={d.promoTitle}>
                  <div className="flex flex-wrap" style={{ gap: 12 }}>
                    <DeskChip active={f.promoId === "none"} onClick={() => f.setPromoId("none")}>
                      {d.noPromo}
                    </DeskChip>
                    {f.method.promotions.map((item) => (
                      <DeskChip key={item.id} active={item.id === f.promoId} onClick={() => f.setPromoId(item.id)}>
                        {f.tv(item.name)}
                      </DeskChip>
                    ))}
                  </div>
                </DeskRow>
              )}

              <DeskRow label={t.member.amountLabel}>
                <div className="flex flex-wrap" style={{ columnGap: 6, rowGap: 17, maxWidth: 650 }}>
                  {f.presets.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => f.setAmount(value)}
                      className="cursor-pointer"
                      style={{
                        width: 66,
                        height: 38,
                        borderRadius: 6,
                        border: `1px solid ${String(value) === f.amount ? DRED : "rgba(236,37,55,.25)"}`,
                        color: String(value) === f.amount ? DRED : "#646464",
                        fontSize: 14,
                        background: "var(--member-surface, #fff)",
                      }}
                    >
                      {value.toLocaleString("en-US")}
                    </button>
                  ))}
                </div>
                <input
                  value={f.amount}
                  onChange={(e) => f.setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder={t.member.amountPlaceholder}
                  style={{
                    width: 223,
                    height: 34,
                    marginTop: 10,
                    border: "1px solid var(--member-line, #e5e5e5)",
                    borderRadius: 5,
                    background: "#f5f5f5",
                    padding: "0 12px",
                    fontSize: 13,
                    color: "#646464",
                    outline: "none",
                    display: "block",
                  }}
                />
                <div style={{ marginTop: 14, fontSize: 14, color: "#f00", wordSpacing: 3 }}>
                  {t.member.limit} ৳ {fmt(f.min)} - ৳ {fmt(f.max)}
                </div>
                {f.preview.totalBonus > 0 && (
                  <div style={{ marginTop: 6, fontSize: 13, color: "var(--member-success, #3fbf6e)" }}>
                    {d.bonus}: +৳ {fmt(f.preview.totalBonus)} · {d.credited}: ৳ {fmt(f.preview.credited)}
                  </div>
                )}
              </DeskRow>
            </>
          )}

          {f.method && payStep && <DeskPay f={f} />}
        </div>

        <div className="flex items-center" style={{ height: 48, padding: "0 30px", gap: 12, flexShrink: 0, borderTop: "1px solid var(--member-line, #eee)" }}>
          {payStep && (
            <button
              type="button"
              onClick={f.back}
              className="cursor-pointer"
              style={{ height: 36, padding: "0 20px", borderRadius: 18, border: `1px solid ${DRED}`, color: DRED, fontSize: 14 }}
            >
              {d.back}
            </button>
          )}
          <button
            type="button"
            disabled={f.busy || !f.method}
            onClick={payStep ? f.submit : f.next}
            className="tb-hover-fade cursor-pointer"
            style={{
              height: 34,
              padding: "0 10px",
              minWidth: 171,
              borderRadius: 17,
              background: DRED,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              opacity: f.busy || !f.method ? 0.6 : 1,
            }}
          >
            {payStep ? d.confirm : t.member.submitDeposit}
          </button>
        </div>
      </div>
    </div>
  );
};

/** ডেস্কটপের দ্বিতীয় ধাপ — নম্বর, হিসাব, ঘর */
const DeskPay = ({ f }) => {
  const { t } = useLanguage();
  const d = t.depositFlow;
  const lines = [
    [d.method, f.tv(f.method.methodName)],
    [d.channel, f.tv(f.channel?.name)],
    [d.amountToSend, `৳ ${fmt(f.preview.amount)}`],
    ...(f.preview.totalBonus > 0 ? [[d.bonus, `+৳ ${fmt(f.preview.totalBonus)}`]] : []),
    [d.credited, `৳ ${fmt(f.preview.credited)}`],
    ...(f.preview.target > 0 ? [[d.turnover, `৳ ${fmt(f.preview.target)} (×${f.preview.multiplier})`]] : []),
  ];

  return (
    <div style={{ paddingBottom: 10 }}>
      {f.contact && (
        <div
          className="flex items-center"
          style={{ border: `1px dashed ${DRED}`, borderRadius: 6, padding: "14px 16px", gap: 14, marginBottom: 16, background: "#fff6f6" }}
        >
          <MethodLogo method={f.method} size={44} radius={6} />
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: 13, color: "var(--member-text, #666)" }}>{d.sendTo}{f.contact.label ? ` · ${f.tv(f.contact.label)}` : ""}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--member-title, #222)", letterSpacing: 1 }}>{f.contact.number}</div>
          </div>
          <button
            type="button"
            onClick={() => f.copy(f.contact.number)}
            className="flex cursor-pointer items-center"
            style={{ height: 32, padding: "0 14px", borderRadius: 16, border: `1px solid ${DRED}`, color: DRED, fontSize: 13, gap: 6 }}
          >
            <Copy size={14} />
            {d.copy}
          </button>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginBottom: 16, fontSize: 13 }}>
        {lines.map(([label, value]) => (
          <div key={label} className="flex justify-between" style={{ borderBottom: "1px solid #f2f2f2", padding: "6px 0" }}>
            <span style={{ color: "var(--member-muted, #888)" }}>{label}</span>
            <span style={{ color: "var(--member-title, #333)", fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {f.tv(f.method.instructions) && (
        <div style={{ fontSize: 13, color: DRED, marginBottom: 14, lineHeight: 1.5 }}>{f.tv(f.method.instructions)}</div>
      )}

      {(f.method.inputs || []).map((input) => (
        <DeskRow key={input.key} wide label={f.tv(input.label) || input.key}>
          <input
            value={f.fields[input.key] || ""}
            onChange={(e) => f.setField(input.key, e.target.value)}
            inputMode={input.type === "number" || input.type === "tel" ? "numeric" : "text"}
            placeholder={f.tv(input.placeholder)}
            style={{
              width: 320,
              height: 40,
              border: "1px solid #ddd",
              borderRadius: 4,
              padding: "0 12px",
              fontSize: 14,
              color: "var(--member-title, #333)",
              outline: "none",
            }}
          />
          {input.required && <span style={{ color: DRED, marginInlineStart: 6 }}>*</span>}
        </DeskRow>
      ))}
    </div>
  );
};

/* ─────────────────── মোবাইল ─────────────────── */

const SectionTitle = ({ dot, children }) => (
  <div className="flex items-center" style={{ height: m(70), gap: m(14) }}>
    <span style={{ width: m(12), height: m(12), borderRadius: "50%", background: dot }} />
    <span style={{ fontSize: m(26), fontWeight: 700, color: "var(--member-title, #333)" }}>{children}</span>
  </div>
);

const MobChip = ({ active, onClick, children, height = m(114), fontSize = m(24) }) => (
  <button
    type="button"
    onClick={onClick}
    className="cursor-pointer"
    style={{
      height,
      padding: `0 ${m(10)}`,
      borderRadius: m(10),
      border: `${m(2)} solid ${active ? RED : "#e4e4e4"}`,
      color: active ? RED : "#000",
      fontSize,
      fontWeight: 700,
      background: "var(--member-surface, #fff)",
      lineHeight: 1.2,
    }}
  >
    {children}
  </button>
);

const Mobile = () => {
  const { t } = useLanguage();
  const money = t.money;
  const d = t.depositFlow;
  const f = useDepositFlow();
  const payStep = f.step === "pay";

  return (
    <MemberShell title={payStep ? d.payTitle : money.depositTitle} headerIcon="deprecm3">
      <div style={{ padding: `0 ${m(20)} ${m(140)}`, background: "var(--member-surface, #fff)" }}>
        {f.loading && <div style={{ padding: m(40), color: "var(--member-muted, #999)", fontSize: m(26) }}>{d.loading}</div>}
        {!f.loading && !f.methods.length && <div style={{ padding: m(40), color: "var(--member-muted, #999)", fontSize: m(26) }}>{d.noMethods}</div>}

        {f.method && !payStep && (
          <>
            {/* আমানতের মোড */}
            <SectionTitle dot="#f5a623">{money.modeTitle}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: m(6) }}>
              {f.methods.map((item) => {
                const active = item.methodId === f.methodId;
                return (
                  <button
                    key={item.methodId}
                    type="button"
                    onClick={() => f.chooseMethod(item.methodId)}
                    className="relative flex cursor-pointer flex-col items-center"
                    style={{
                      height: m(183.8),
                      padding: m(15),
                      borderRadius: m(10),
                      border: `${m(2)} solid ${active ? RED : "#e4e4e4"}`,
                      background: "var(--member-surface, #fff)",
                    }}
                  >
                    <span className="grid w-full place-items-center" style={{ height: m(70) }}>
                      <MethodLogo method={item} size={m(64)} radius={m(8)} />
                    </span>
                    <span
                      className="text-center"
                      style={{ marginTop: m(24), fontSize: m(20), fontWeight: 700, color: active ? RED : "#333", lineHeight: 1.15 }}
                    >
                      {f.tv(item.methodName)}
                    </span>
                    {active && (
                      <span className="absolute" style={{ right: 0, bottom: 0, width: m(36), height: m(36), background: `linear-gradient(135deg, transparent 50%, ${RED} 50%)`, borderBottomRightRadius: m(8) }}>
                        <svg viewBox="0 0 10 8" className="absolute" style={{ right: m(3), bottom: m(5), width: m(14), height: m(11) }} aria-hidden="true">
                          <path d="M1 4l3 3 5-6" fill="none" stroke="#fff" strokeWidth="1.6" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: m(20), fontSize: m(28), color: RED, lineHeight: 1.5 }}>{money.trxWarning}</div>

            {/* পেমেন্ট চ্যানেল */}
            <SectionTitle dot="#2ec5b6">{money.channelTitle}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: m(10) }}>
              {f.method.channels.map((item) => (
                <MobChip key={item.id} active={item.id === f.channelId} onClick={() => f.setChannelId(item.id)}>
                  {f.tv(item.name)}
                  {bonusTag(item) && <div style={{ color: "var(--member-success, #3fbf6e)", fontSize: m(20) }}>{bonusTag(item)}</div>}
                </MobChip>
              ))}
            </div>

            {/* প্রমোশন — থাকলে তবেই */}
            {f.method.promotions?.length > 0 && (
              <>
                <SectionTitle dot="#ff7a45">{d.promoTitle}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: m(10) }}>
                  <MobChip height={m(90)} active={f.promoId === "none"} onClick={() => f.setPromoId("none")}>
                    {d.noPromo}
                  </MobChip>
                  {f.method.promotions.map((item) => (
                    <MobChip key={item.id} height={m(90)} active={item.id === f.promoId} onClick={() => f.setPromoId(item.id)}>
                      {f.tv(item.name)}
                    </MobChip>
                  ))}
                </div>
              </>
            )}

            {/* জমা পরিমাণ */}
            <SectionTitle dot="#8e6fd8">{money.amountTitle}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: m(12) }}>
              {f.presets.map((value) => {
                const active = String(value) === f.amount;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => f.setAmount(value)}
                    className="cursor-pointer"
                    style={{
                      height: m(71),
                      borderRadius: m(12),
                      border: `${m(2)} solid ${active ? RED : "rgb(236 37 41 / 0.2)"}`,
                      background: "var(--member-surface, #fff)",
                      color: active ? RED : "#565656",
                      fontSize: m(24),
                      fontWeight: 700,
                    }}
                  >
                    {value.toLocaleString("en-US")}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center" style={{ marginTop: m(20), height: m(70), borderRadius: m(12), border: `${m(2)} solid var(--member-line, #e4e4e4)` }}>
              <span style={{ padding: `0 ${m(20)}`, fontSize: m(26), fontWeight: 700, color: "#1c1c1c" }}>৳</span>
              <input
                value={f.amount}
                onChange={(e) => f.setAmount(e.target.value)}
                inputMode="decimal"
                placeholder={`${fmt(f.min)} - ${fmt(f.max)}`}
                style={{ flex: 1, height: "100%", border: "none", outline: "none", background: "transparent", fontSize: m(28), color: "var(--member-title, #333)" }}
              />
            </div>

            {f.preview.totalBonus > 0 && (
              <div style={{ marginTop: m(14), fontSize: m(24), color: "var(--member-success, #3fbf6e)" }}>
                {d.bonus}: +৳ {fmt(f.preview.totalBonus)} · {d.credited}: ৳ {fmt(f.preview.credited)}
              </div>
            )}
          </>
        )}

        {f.method && payStep && <MobilePay f={f} />}
      </div>

      {/* নিচের ফিক্সড বোতাম বার */}
      <div className="fixed right-0 bottom-0 left-0 flex" style={{ height: m(110), zIndex: 5 }}>
        {payStep && (
          <button type="button" onClick={f.back} className="cursor-pointer" style={{ width: m(250), background: "var(--member-surface, #fff)", color: RED, fontSize: m(30), borderTop: `1px solid ${RED}` }}>
            {d.back}
          </button>
        )}
        <button
          type="button"
          disabled={f.busy || !f.method}
          onClick={payStep ? f.submit : f.next}
          className="flex-1 cursor-pointer"
          style={{
            background: (payStep || f.amount) && !f.busy ? RED : "#cdcdcd",
            color: "#fff",
            fontSize: m(32),
          }}
        >
          {payStep ? d.confirm : money.next}
        </button>
      </div>
    </MemberShell>
  );
};

/** মোবাইলের দ্বিতীয় ধাপ */
const MobilePay = ({ f }) => {
  const { t } = useLanguage();
  const d = t.depositFlow;
  const lines = [
    [d.method, f.tv(f.method.methodName)],
    [d.channel, f.tv(f.channel?.name)],
    [d.amountToSend, `৳ ${fmt(f.preview.amount)}`],
    ...(f.preview.totalBonus > 0 ? [[d.bonus, `+৳ ${fmt(f.preview.totalBonus)}`]] : []),
    [d.credited, `৳ ${fmt(f.preview.credited)}`],
    ...(f.preview.target > 0 ? [[d.turnover, `৳ ${fmt(f.preview.target)}`]] : []),
  ];

  return (
    <div style={{ paddingTop: m(20) }}>
      {f.contact && (
        <div style={{ border: `${m(2)} dashed ${RED}`, borderRadius: m(16), padding: m(24), background: "#fff6f6" }}>
          <div className="flex items-center" style={{ gap: m(16) }}>
            <MethodLogo method={f.method} size={m(70)} radius={m(10)} />
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: m(24), color: "var(--member-text, #666)" }}>{d.sendTo}</div>
              <div style={{ fontSize: m(44), fontWeight: 700, color: "var(--member-title, #222)", letterSpacing: m(2) }}>{f.contact.number}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => f.copy(f.contact.number)}
            className="flex w-full cursor-pointer items-center justify-center"
            style={{ marginTop: m(20), height: m(70), borderRadius: m(35), background: RED, color: "#fff", fontSize: m(28), gap: m(10) }}
          >
            <Copy size={16} />
            {d.copy}
          </button>
        </div>
      )}

      <div style={{ marginTop: m(24), fontSize: m(26) }}>
        {lines.map(([label, value]) => (
          <div key={label} className="flex justify-between" style={{ padding: `${m(14)} 0`, borderBottom: "1px solid #f2f2f2" }}>
            <span style={{ color: "var(--member-muted, #888)" }}>{label}</span>
            <span style={{ color: "var(--member-title, #333)", fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>

      {f.tv(f.method.instructions) && (
        <div style={{ marginTop: m(20), fontSize: m(26), color: RED, lineHeight: 1.5 }}>{f.tv(f.method.instructions)}</div>
      )}

      {(f.method.inputs || []).map((input) => (
        <div key={input.key} style={{ marginTop: m(24) }}>
          <div style={{ fontSize: m(26), fontWeight: 700, color: "var(--member-title, #333)", marginBottom: m(10) }}>
            {f.tv(input.label) || input.key}
            {input.required && <span style={{ color: RED }}> *</span>}
          </div>
          <input
            value={f.fields[input.key] || ""}
            onChange={(e) => f.setField(input.key, e.target.value)}
            inputMode={input.type === "number" || input.type === "tel" ? "numeric" : "text"}
            placeholder={f.tv(input.placeholder)}
            style={{
              display: "block",
              width: "100%",
              height: m(90),
              border: `${m(2)} solid var(--member-line, #e4e4e4)`,
              borderRadius: m(12),
              padding: `0 ${m(24)}`,
              fontSize: m(28),
              color: "var(--member-title, #333)",
              outline: "none",
            }}
          />
        </div>
      ))}
    </div>
  );
};

/* ─────────────────── অটো ডিপোজিট ─────────────────── */

/** admin লোগো না দিলে সাইটের নিজের ছবি (যেগুলো আছে) */
const OWN_LOGO = { bkash: "/assets/mobile/bank/BKASH.png", nagad: "/assets/mobile/bank/NAGAD.png" };

/** অটোর মাধ্যম → `MethodLogo` এর রূপ */
const autoLogo = (item) => ({ logoUrl: item.logoUrl || OWN_LOGO[item.code] || "", methodName: item.name, methodId: item.code });

/** বোনাসের ছোট লেখা — "+১০%" বা "+৳৫০" */
const bonusValue = (b) => (b.bonusType === "percent" ? `+${Number(b.bonusValue) || 0}%` : `+৳${fmt(b.bonusValue)}`);

/** "জমা রেকর্ড" — অ্যাকাউন্ট রেকর্ডের জমা ট্যাব */
const useOpenDepositRecord = () => {
  const { openMember } = useUI();
  return () => {
    try {
      sessionStorage.setItem("tb_rec_sub", "1");
    } catch {
      /* private mode */
    }
    openMember("accountRecord");
  };
};

const AutoDesktop = ({ onChangeMode }) => {
  const { t } = useLanguage();
  const p = t.payMode;
  const d = t.depositFlow;
  const a = useAutoDeposit();
  const openRecord = useOpenDepositRecord();
  const methods = a.status?.methods || [];

  return (
    <div className="flex" style={{ width: 1110, height: 620 }}>
      {/* সমর্থিত মাধ্যম — গেটওয়ের পাতায় এর যেকোনোটা বাছা যায় */}
      <div className="hide-scrollbar" style={{ width: 255, height: 620, background: "#f7f7f7", padding: "22px 25px", overflowY: "auto" }}>
        <div style={{ fontSize: 13, color: "var(--member-muted, #999)", marginBottom: 12 }}>{p.methodsTitle}</div>
        {methods.map((item) => (
          <div
            key={item.code}
            className="flex items-center"
            style={{ width: 205, height: 68, borderRadius: 6, background: "var(--member-surface, #fff)", marginBottom: 15, padding: "0 14px", gap: 12, color: "var(--member-text, #666)", fontSize: 14 }}
          >
            <MethodLogo method={autoLogo(item)} size={38} radius={6} />
            <span className="truncate">{a.tv(item.name) || item.code}</span>
          </div>
        ))}
        {methods.length > 0 && <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>{p.methodsHint}</div>}
      </div>

      <div className="flex flex-col" style={{ width: 855, height: 620, background: "var(--member-surface, #fff)" }}>
        <div className="flex items-center" style={{ height: 47, padding: "0 61px 0 20px", gap: 8, flexShrink: 0, borderBottom: "1px solid var(--member-line, #eee)" }}>
          <span style={{ width: 4, height: 16, background: "#23e63a" }} />
          <span style={{ fontSize: 16, color: "#000" }}>{p.autoDeposit}</span>
          <span className="flex-1" />
          <ChangeModeButton desktop onChange={onChangeMode} />
          <button
            type="button"
            onClick={openRecord}
            className="flex cursor-pointer items-center"
            style={{ height: 32, padding: "0 14px", borderRadius: 16, border: "2px solid #c9d5fb", color: "#5076f3", fontSize: 14 }}
          >
            {d.recordBtn}
          </button>
        </div>

        <div className="hide-scrollbar min-h-0 flex-1" style={{ padding: "18px 20px 0", overflowY: "auto" }}>
          {a.loading ? (
            <div style={{ color: "var(--member-muted, #999)", fontSize: 13, padding: 20 }}>{p.loading}</div>
          ) : (
            <>
              <div
                style={{ display: "inline-block", border: "1px solid #f9dacb", borderRadius: 10, background: "#fdeee6", color: DRED, fontSize: 14, lineHeight: "20px", padding: "9px 15px", marginBottom: 20 }}
              >
                {p.autoNote}
              </div>

              {a.bonuses.length > 0 && (
                <DeskRow label={p.bonusTitle}>
                  <div className="flex flex-wrap" style={{ gap: 12 }}>
                    <DeskChip active={!a.bonusId} onClick={() => a.setBonusId("")}>
                      {p.noBonus}
                    </DeskChip>
                    {a.bonuses.map((b) => (
                      <DeskChip key={b._id} active={a.bonusId === b._id} onClick={() => a.setBonusId(b._id)}>
                        {a.tv(b.title)}
                        <span style={{ marginInlineStart: 6, color: "var(--member-success, #3fbf6e)", fontSize: 12 }}>{bonusValue(b)}</span>
                        {b.bonusScope === "first-deposit" && <span style={{ marginInlineStart: 6, color: "#f5a623", fontSize: 11 }}>{p.firstOnlyTag}</span>}
                      </DeskChip>
                    ))}
                  </div>
                </DeskRow>
              )}

              <DeskRow label={t.member.amountLabel}>
                <div className="flex flex-wrap" style={{ columnGap: 6, rowGap: 17, maxWidth: 650 }}>
                  {a.presets.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => a.setAmount(value)}
                      className="cursor-pointer"
                      style={{
                        width: 66,
                        height: 38,
                        borderRadius: 6,
                        border: `1px solid ${String(value) === a.amount ? DRED : "rgba(236,37,55,.25)"}`,
                        color: String(value) === a.amount ? DRED : "#646464",
                        fontSize: 14,
                        background: "var(--member-surface, #fff)",
                      }}
                    >
                      {value.toLocaleString("en-US")}
                    </button>
                  ))}
                </div>
                <input
                  value={a.amount}
                  onChange={(e) => a.setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder={t.member.amountPlaceholder}
                  style={{ width: 223, height: 34, marginTop: 10, border: "1px solid var(--member-line, #e5e5e5)", borderRadius: 5, background: "#f5f5f5", padding: "0 12px", fontSize: 13, color: "#646464", outline: "none", display: "block" }}
                />
                <div style={{ marginTop: 14, fontSize: 14, color: "#f00", wordSpacing: 3 }}>
                  {t.member.limit} ৳ {fmt(a.min)} - ৳ {fmt(a.max)}
                </div>
                {a.preview.bonus > 0 && (
                  <div style={{ marginTop: 6, fontSize: 13, color: "var(--member-success, #3fbf6e)" }}>
                    {p.bonus}: +৳ {fmt(a.preview.bonus)} · {p.credited}: ৳ {fmt(a.preview.credited)}
                    {a.preview.target > 0 && ` · ${p.turnover}: ৳ ${fmt(a.preview.target)} (×${a.preview.multiplier})`}
                  </div>
                )}
              </DeskRow>
            </>
          )}
        </div>

        <div className="flex items-center" style={{ height: 48, padding: "0 30px", gap: 12, flexShrink: 0, borderTop: "1px solid var(--member-line, #eee)" }}>
          <button
            type="button"
            disabled={a.busy || a.loading}
            onClick={a.pay}
            className="tb-hover-fade cursor-pointer"
            style={{ height: 34, padding: "0 10px", minWidth: 171, borderRadius: 17, background: DRED, color: "#fff", fontSize: 13, fontWeight: 700, opacity: a.busy || a.loading ? 0.6 : 1 }}
          >
            {p.pay}
          </button>
        </div>
      </div>
    </div>
  );
};

const AutoMobile = () => {
  const { t } = useLanguage();
  const p = t.payMode;
  const money = t.money;
  const a = useAutoDeposit();
  const methods = a.status?.methods || [];

  return (
    <MemberShell title={p.autoDeposit} headerIcon="deprecm3">
      <div style={{ padding: `0 ${m(20)} ${m(140)}`, background: "var(--member-surface, #fff)" }}>
        {a.loading ? (
          <div style={{ padding: m(40), color: "var(--member-muted, #999)", fontSize: m(26) }}>{p.loading}</div>
        ) : (
          <>
            {methods.length > 0 && (
              <>
                <SectionTitle dot="#f5a623">{p.methodsTitle}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: m(6) }}>
                  {methods.map((item) => (
                    <div
                      key={item.code}
                      className="flex flex-col items-center"
                      style={{ height: m(160), padding: m(15), borderRadius: m(10), border: `${m(2)} solid var(--member-line, #e4e4e4)`, background: "var(--member-surface, #fff)" }}
                    >
                      <span className="grid w-full place-items-center" style={{ height: m(70) }}>
                        <MethodLogo method={autoLogo(item)} size={m(64)} radius={m(8)} />
                      </span>
                      <span className="text-center" style={{ marginTop: m(16), fontSize: m(20), fontWeight: 700, color: "var(--member-title, #333)", lineHeight: 1.15 }}>
                        {a.tv(item.name) || item.code}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: m(12), fontSize: m(22), color: "var(--member-muted, #999)" }}>{p.methodsHint}</div>
              </>
            )}

            <div style={{ marginTop: m(20), fontSize: m(26), color: RED, lineHeight: 1.5 }}>{p.autoNote}</div>

            {a.bonuses.length > 0 && (
              <>
                <SectionTitle dot="#ff7a45">{p.bonusTitle}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: m(10) }}>
                  <MobChip height={m(90)} active={!a.bonusId} onClick={() => a.setBonusId("")}>
                    {p.noBonus}
                  </MobChip>
                  {a.bonuses.map((b) => (
                    <MobChip key={b._id} height={m(110)} active={a.bonusId === b._id} onClick={() => a.setBonusId(b._id)}>
                      {a.tv(b.title)}
                      <div style={{ color: "var(--member-success, #3fbf6e)", fontSize: m(20) }}>
                        {bonusValue(b)}
                        {b.bonusScope === "first-deposit" && <span style={{ color: "#f5a623" }}> · {p.firstOnlyTag}</span>}
                      </div>
                    </MobChip>
                  ))}
                </div>
              </>
            )}

            <SectionTitle dot="#8e6fd8">{money.amountTitle}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: m(12) }}>
              {a.presets.map((value) => {
                const active = String(value) === a.amount;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => a.setAmount(value)}
                    className="cursor-pointer"
                    style={{
                      height: m(71),
                      borderRadius: m(12),
                      border: `${m(2)} solid ${active ? RED : "rgb(236 37 41 / 0.2)"}`,
                      background: "var(--member-surface, #fff)",
                      color: active ? RED : "#565656",
                      fontSize: m(24),
                      fontWeight: 700,
                    }}
                  >
                    {value.toLocaleString("en-US")}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center" style={{ marginTop: m(20), height: m(70), borderRadius: m(12), border: `${m(2)} solid var(--member-line, #e4e4e4)` }}>
              <span style={{ padding: `0 ${m(20)}`, fontSize: m(26), fontWeight: 700, color: "#1c1c1c" }}>৳</span>
              <input
                value={a.amount}
                onChange={(e) => a.setAmount(e.target.value)}
                inputMode="decimal"
                placeholder={`${fmt(a.min)} - ${fmt(a.max)}`}
                style={{ flex: 1, height: "100%", border: "none", outline: "none", background: "transparent", fontSize: m(28), color: "var(--member-title, #333)" }}
              />
            </div>

            {a.preview.bonus > 0 && (
              <div style={{ marginTop: m(14), fontSize: m(24), color: "var(--member-success, #3fbf6e)", lineHeight: 1.5 }}>
                {p.bonus}: +৳ {fmt(a.preview.bonus)} · {p.credited}: ৳ {fmt(a.preview.credited)}
                {a.preview.target > 0 && ` · ${p.turnover}: ৳ ${fmt(a.preview.target)}`}
              </div>
            )}
          </>
        )}
      </div>

      <div className="fixed right-0 bottom-0 left-0 flex" style={{ height: m(110), zIndex: 5 }}>
        <button
          type="button"
          disabled={a.busy || a.loading}
          onClick={a.pay}
          className="flex-1 cursor-pointer"
          style={{ background: a.amount && !a.busy ? RED : "#cdcdcd", color: "#fff", fontSize: m(32) }}
        >
          {p.pay}
        </button>
      </div>
    </MemberShell>
  );
};

const DepositSection = () => {
  const isDesktop = useIsDesktop();
  return (
    <PaymentModeGate
      kind="deposit"
      render={(mode, onChange) => {
        if (mode === "auto") return isDesktop ? <AutoDesktop onChangeMode={onChange} /> : <AutoMobile />;
        return isDesktop ? <Desktop onChangeMode={onChange} /> : <Mobile />;
      }}
    />
  );
};

export default DepositSection;
