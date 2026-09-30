import React from "react";
import { Link } from "react-router";

import { useHideBootLoader } from "../../hook/useHideBootLoader";

const NotFoundPage = () => {
  useHideBootLoader();

  return (
  <div
    className="flex flex-col items-center justify-center"
    style={{ minHeight: "60vh", gap: 20, color: "#fff" }}
  >
    <div style={{ fontSize: 48, fontWeight: 700 }}>404</div>
    <p style={{ color: "var(--text-dim)" }}>পেজটি খুঁজে পাওয়া যায়নি</p>
    <Link to="/" style={{ color: "var(--gold)" }}>
      হোমে ফিরুন
    </Link>
  </div>
);
};

export default NotFoundPage;
