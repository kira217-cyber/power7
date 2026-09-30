import { createBrowserRouter } from "react-router";

import RootLayout from "../RootLayout/RootLayout";
import AffiliateLayout from "../AffiliateLayout/AffiliateLayout";
import PrivateRoute from "../PrivateRoute/PrivateRoute";

import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import ForgotPassword from "../pages/ForgotPassword/ForgotPassword";
import NotFoundPage from "../pages/NotFoundPage/NotFoundPage";

import Dashboard from "../pages/Dashboard/Dashboard";
import MyUsers from "../pages/MyUsers/MyUsers";
import CommissionStatus from "../pages/CommissionStatus/CommissionStatus";
import Withdraw from "../pages/Withdraw/Withdraw";
import WithdrawHistory from "../pages/WithdrawHistory/WithdrawHistory";
import Profile from "../pages/Profile/Profile";
import Verification from "../pages/Verification/Verification";

export const routes = createBrowserRouter([
  // ── খোলা অংশ: বিজ্ঞাপনের পাতা ও লগইন-রেজিস্টার ──
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgot-password", element: <ForgotPassword /> },
    ],
  },

  // ── লগইন করা অ্যাফিলিয়েটের অংশ ──
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <AffiliateLayout />
      </PrivateRoute>
    ),
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "my-users", element: <MyUsers /> },
      { path: "commission", element: <CommissionStatus /> },
      { path: "withdraw", element: <Withdraw /> },
      { path: "withdraw-history", element: <WithdrawHistory /> },
      { path: "verification", element: <Verification /> },
      { path: "profile", element: <Profile /> },
    ],
  },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" });

export default routes;
