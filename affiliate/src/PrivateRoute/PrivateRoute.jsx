import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useSelector } from "react-redux";

import { selectIsAuth, selectUser } from "../features/auth/authSelectors";

/**
 * লগইন ছাড়া ড্যাশবোর্ডে ঢোকা যায় না।
 *
 * ভূমিকাও দেখা হয় — খেলোয়াড়ের টোকেন ব্রাউজারে থেকে গেলে (একই
 * localStorage কী) সে যেন অ্যাফিলিয়েটের পাতায় ঢুকে না পড়ে। সার্ভারও
 * আলাদা করে আটকায়, কিন্তু তখন খালি পাতা দেখাত।
 */
const PrivateRoute = ({ children }) => {
  const isAuth = useSelector(selectIsAuth);
  const user = useSelector(selectUser);
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.role && user.role !== "aff-user") {
    return <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
};

export default PrivateRoute;
