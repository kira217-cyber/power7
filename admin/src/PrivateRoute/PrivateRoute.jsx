import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useSelector } from "react-redux";

import { selectIsAuth, selectRole } from "../features/auth/authSelectors";

/**
 * লগইন ছাড়া কোনো পেজ খোলে না।
 *
 * `motherOnly` দিলে শুধু mother; `perm` দিলে sub অ্যাডমিনের ওই
 * পারমিশন লাগে (mother ও viewer সব পেজেই ঢোকে)।
 *
 * এটা শুধু UI-এর গার্ড — আসল নিয়ন্ত্রণ সার্ভারের middleware এ,
 * তাই ব্রাউজারে কিছু বদলে ফেললেও API আটকে দেবে।
 */
const PrivateRoute = ({ children, motherOnly = false, perm = "" }) => {
  const isAuth = useSelector(selectIsAuth);
  const role = useSelector(selectRole);
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (motherOnly && role !== "mother") {
    return <Navigate to="/" replace />;
  }

  if (perm && role === "sub") {
    const admin = JSON.parse(localStorage.getItem("admin_data") || "{}");
    const permissions = Array.isArray(admin.permissions) ? admin.permissions : [];

    if (!permissions.includes(perm)) {
      return <Navigate to="/" replace />;
    }
  }

  return children || <Outlet />;
};

export default PrivateRoute;
