import React from "react";
import { Link } from "react-router";

const NotFoundPage = () => (
  <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--neutral1000)] px-6 text-center">
    <div className="ad-glow" aria-hidden="true" />

    <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--primary500)]/30 bg-white/10 shadow-[0_0_35px_rgba(249,185,1,0.22)] backdrop-blur">
      <img
        src={`${import.meta.env.BASE_URL}assets/brand/logo.png`}
        alt="POWER7"
        className="h-8 w-auto object-contain"
        draggable="false"
      />
    </span>

    <p className="ad-title relative z-10 text-[56px] leading-none">
      404
    </p>

    <p className="relative z-10 text-[15px] text-[var(--text-muted)]">
      This admin page does not exist.
    </p>

    <Link to="/" className="ad-btn ad-btn--primary relative z-10">
      Back to Dashboard
    </Link>
  </div>
);

export default NotFoundPage;
