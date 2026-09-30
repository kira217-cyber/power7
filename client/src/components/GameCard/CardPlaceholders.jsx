import React from "react";

import { m } from "../../hook/useUnits";

/**
 * গেম আসার আগে কার্ডের জায়গায় ফাঁকা কার্ড — ভিতরে মূল সাইটের লোডিং
 * ছবি (ধূসর বাক্সে ঘুরন্ত বিন্দু)। স্পিনারের কালো ঢাকনা নয়, তাই গেম এলে
 * পাতা লাফায় না: ঠিক সেই জায়গাতেই আসল কার্ড বসে।
 */
const LOADING_GIF = "/assets/site/img-loading.gif";

const CardPlaceholders = ({ count = 6, desktop = false }) =>
  Array.from({ length: count }, (_, i) =>
    desktop ? (
      <div key={i} style={{ width: "var(--card-w)" }} aria-hidden="true">
        <img
          src={LOADING_GIF}
          alt=""
          style={{
            width: "var(--card-img)",
            aspectRatio: "1 / 1",
            borderRadius: "var(--card-radius)",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div style={{ height: 31.7 }} />
      </div>
    ) : (
      <div key={i} aria-hidden="true">
        <img
          src={LOADING_GIF}
          alt=""
          style={{
            width: "100%",
            aspectRatio: "217 / 245",
            borderRadius: m(16),
            objectFit: "cover",
            display: "block",
          }}
        />
        <div style={{ height: m(36) }} />
      </div>
    ),
  );

export default CardPlaceholders;
