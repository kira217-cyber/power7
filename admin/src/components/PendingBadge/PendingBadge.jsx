import React from "react";

/** লাল জ্বলা-নেভা ব্যাজ — অপেক্ষমাণ কিছু থাকলে (০ হলে কিছুই না) */
const PendingBadge = ({ count, className = "" }) =>
  count > 0 ? (
    <span className={`ad-pending-badge ${className}`} title={`${count} pending`}>
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

export default PendingBadge;
