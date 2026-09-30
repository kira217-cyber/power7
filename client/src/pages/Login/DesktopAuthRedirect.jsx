import React from "react";
import { Navigate, useLocation } from "react-router";

import { useIsDesktop } from "../../hook/useIsDesktop";

/**
 * `/login`, `/register`, `/forget` মোবাইলের আলাদা পাতা। ডেস্কটপে কেউ
 * সরাসরি এই লিংকে এলে (যেমন অ্যাফিলিয়েটের `…/register?ref=CODE`) হোমে
 * পাঠিয়ে মডালটা খোলা হয় — `?auth=register` (RootLayout দেখে খোলে),
 * `ref`/`referralCode` সহ বাকি সব যেমন আছে।
 */
const DesktopAuthRedirect = ({ tab, children }) => {
  const isDesktop = useIsDesktop();
  const { search } = useLocation();
  if (!isDesktop) return children;
  const params = new URLSearchParams(search);
  params.set("auth", tab);
  return <Navigate to={`/?${params.toString()}`} replace />;
};

export default DesktopAuthRedirect;
