import React from "react";
import { Navigate, useLocation } from "react-router";
import { useSelector } from "react-redux";

import { selectIsLoggedIn } from "../../features/auth/authSelectors";

/**
 * লগইন লাগে এমন পাতা (সদস্য কেন্দ্র, ডিপোজিট, রেকর্ড…) — লগইন না থাকলে
 * লগইন পেজে, আর লগইনের পর এই পাতাতেই ফেরা (মূল সাইটের মতো)।
 */
const RequireLogin = ({ children }) => {
  const loggedIn = useSelector(selectIsLoggedIn);
  const { pathname, search } = useLocation();

  if (!loggedIn) return <Navigate to="/login" replace state={{ from: `${pathname}${search}` }} />;
  return children;
};

export default RequireLogin;
