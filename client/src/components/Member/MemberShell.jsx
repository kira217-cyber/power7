import React, { useState } from "react";
import Icon from "../Icon/Icon";
import { useLanguage } from "../../Context/LanguageProvider";
import { useHideBootLoader } from "../../hook/useHideBootLoader";
import { m } from "../../hook/useUnits";
import { useNavigate } from "react-router";

/**
 * মোবাইলের সদস্য কেন্দ্রের ভিতরের পেজগুলোর সাধারণ খোলস।
 *
 * ডেস্কটপে এই খোলসটা লাগে না — সেখানে একই কনটেন্ট মডালের
 * ডান পাশে বসে (দেখো `components/Member/sections.jsx`)।
 *
 * মূল সাইট থেকে মাপা (৭৫০-ডিজাইনে):
 *   হেডার ৭৫০ × ১০০ — গাঢ় বেগুনি, বাঁয়ে ফিরে যাওয়ার তীর, মাঝে শিরোনাম;
 *     কোনো কোনো পেজে ডানে নীল পিল বোতাম
 *   পেজের bg #F5F5F9, ভিতরের অংশ সাদা
 *   ফিল্টার সারি — চিপ, সক্রিয়টা নীল (#1E9BF0), বাকিগুলো ধূসর
 *   ডেটা না থাকলে মাঝখানে ২০৮ × ২০৮ নীল ইলাস্ট্রেশন + "কোন ডেটা নেই"
 *
 * সব সাব-পেজ এই খোলসটাই ব্যবহার করে — মূল সাইটেও গঠন এক।
 */

export const EmptyState = () => {
  const { t } = useLanguage();
  return (
    <div
      className="flex flex-col items-center justify-center"
      // মূল সাইটের মাপ — ছবি ~৪০৪ চওড়া, লেখা ৫০
      style={{ padding: `${m(220)} 0 ${m(160)}`, gap: m(10) }}
    >
      <img
        src="/assets/mobile/no-data.svg"
        alt=""
        style={{ width: m(404), height: m(404) }}
      />
      <span style={{ fontSize: m(50), color: "var(--member-link, #1e9bf0)" }}>{t.noData}</span>
    </div>
  );
};

/** ফিল্টারের চিপ সারি — সক্রিয়টা নীল */
export const FilterChips = ({ options, value, onChange }) => (
  <div
    className="hide-scrollbar flex overflow-x-auto"
    style={{ padding: `${m(20)} ${m(24)}`, gap: m(16), background: "var(--member-page-bg, #f5f5f9)" }}
  >
    {options.map((option) => {
      const active = option.key === value;
      return (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange?.(option.key)}
          className="flex shrink-0 cursor-pointer items-center"
          style={{
            height: m(62),
            padding: `0 ${m(20)}`,
            borderRadius: m(14),
            background: active ? "var(--member-link, #1e9bf0)" : "#e9e9ef",
            color: active ? "#fff" : "var(--member-text, #555)",
            fontSize: m(26),
            gap: m(10),
          }}
        >
          {active && <Icon name="achievement-done" size={m(30)} />}
          {option.label}
        </button>
      );
    })}
  </div>
);

const MemberShell = ({ title, action, headerIcon, right, tabs, onTab, children }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(tabs?.[0]?.key);

  useHideBootLoader();

  return (
    <div style={{ minHeight: "100vh", background: "var(--member-surface, #fff)" }}>
      {/* হেডার */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: m(100), background: "var(--member-header-bg, #180836)" }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="back"
          className="absolute flex cursor-pointer items-center"
          style={{ left: m(50), width: m(68), height: m(68), color: "#fff" }}
        >
          <span
            style={{
              width: m(22),
              height: m(38),
              borderInlineStart: `${m(7)} solid #fff`,
              borderBlockStart: `${m(7)} solid #fff`,
              transform: "rotate(-45deg)",
              marginInlineStart: m(10),
            }}
          />
        </button>

        <span style={{ fontSize: m(34), color: "#fff" }}>{title}</span>

        {/* ডানে রেকর্ডের আইকন — ডিপোজিট/উত্তোলন পেজে থাকে
            (মূল সাইটে `.report-icon` ৪৪ × ৪৪, x ৬৪৬) */}
        {headerIcon && (
          <button
            type="button"
            aria-label="records"
            className="absolute flex cursor-pointer items-center justify-center"
            style={{ right: m(60), width: m(44), height: m(44), color: "#fff" }}
          >
            <img
              src={`/assets/mobile/member/${headerIcon}.svg`}
              alt=""
              // আইকনগুলো সোনালি (#D1A24F); গাঢ় হেডারে মূল সাইটের মতো
              // সাদা দেখাতে রঙ তুলে উল্টে দিই
              style={{
                width: "100%",
                height: "100%",
                filter: "brightness(0) invert(1)",
              }}
            />
          </button>
        )}

        {/* পেজের নিজের ডান-কোণের জিনিস (যেমন পুরস্কারের টিকিট-রেকর্ড) */}
        {right && (
          <span className="absolute flex items-center" style={{ right: m(40) }}>
            {right}
          </span>
        )}

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="absolute cursor-pointer"
            // মূল সাইটের মাপ — ২০০ চওড়া, দুই লাইনে ভাঙে
            style={{
              right: m(30),
              width: m(200),
              height: m(70),
              padding: `0 ${m(12)}`,
              borderRadius: m(35),
              background: "var(--member-link, #1e9bf0)",
              color: "#fff",
              fontSize: m(23),
              lineHeight: 1.1,
            }}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* গেমের ধরনের ট্যাব (শুধু কিছু পেজে) */}
      {tabs && (
        <div
          className="hide-scrollbar flex overflow-x-auto"
          style={{ background: "var(--member-surface, #fff)", height: m(96) }}
        >
          {tabs.map((item) => {
            const active = item.key === tab;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  onTab?.(item.key);
                }}
                className="relative shrink-0 cursor-pointer"
                style={{
                  padding: `0 ${m(34)}`,
                  color: active ? "var(--member-link, #1e9bf0)" : "var(--member-title, #333)",
                  fontSize: m(30),
                }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2"
                    style={{
                      width: "70%",
                      height: m(6),
                      borderRadius: m(3),
                      background: "var(--member-link, #1e9bf0)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* মূল সাইটের মতো সাদা অংশ স্ক্রিনের নিচ পর্যন্ত (হেডার ১০০) */}
      <div style={{ background: "var(--member-surface, #fff)", minHeight: "calc(100vh - 1rem)" }}>{children}</div>
    </div>
  );
};

export default MemberShell;
