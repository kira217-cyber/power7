import { createBrowserRouter } from "react-router";

import RootLayout from "../RootLayout/RootLayout";
import Home from "../pages/Home/Home";
import Promotions from "../pages/Promotions/Promotions";
import AuthPage from "../pages/Login/AuthPage";
import ForgotPage from "../pages/Login/ForgotPage";
import DesktopAuthRedirect from "../pages/Login/DesktopAuthRedirect";
import MemberCenter from "../pages/Member/MemberCenter";
import MemberRoute from "../pages/Member/MemberRoute";
import RequireLogin from "../components/RequireLogin/RequireLogin";
import { MOBILE_ROUTES } from "../components/Member/sections";
import NotFoundPage from "../pages/NotFoundPage/NotFoundPage";
import GameCenter from "../pages/GameCenter/GameCenter";
import PlayGame from "../pages/PlayGame/PlayGame";

/**
 * মূল সাইটের রাউট ভাগ:
 *   `/` ও `/promotions` — হেডার/সাইডবার/ফুটার সহ (RootLayout)
 *   `/login`, `/register` — মোবাইলের আলাদা পেজ, হেডার-সাইডবার কিছুই নেই
 *   `/member` — মোবাইলের সদস্য কেন্দ্র
 *   `/games/:category` — খেলার কেন্দ্র (ডেস্কটপ ও মোবাইলের আলাদা ডিজাইন)
 *   `/play/:gameUId` — গেম, পুরো পর্দায়
 *   `/member/*` — প্রতিটা ফিচারের নিজের পেজ; তালিকাটা
 *     `components/Member/sections.jsx` এ, ডেস্কটপ মডালও সেটাই পড়ে,
 *     তাই দুই দিকে আলাদা হয়ে যাওয়ার সুযোগ নেই
 */
export const routes = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "promotions", element: <Promotions /> },
      { path: "games/:category", element: <GameCenter /> },
    ],
  },
  // খেলা — পুরো পর্দা, হেডার-সাইডবার ছাড়া (এখন ফ্রি ট্রায়াল)
  { path: "/play/:gameUId", element: <PlayGame />, errorElement: <NotFoundPage /> },
  { path: "/login", element: <DesktopAuthRedirect tab="login"><AuthPage mode="login" /></DesktopAuthRedirect>, errorElement: <NotFoundPage /> },
  { path: "/register", element: <DesktopAuthRedirect tab="register"><AuthPage mode="register" /></DesktopAuthRedirect>, errorElement: <NotFoundPage /> },
  { path: "/forget", element: <DesktopAuthRedirect tab="forgot"><ForgotPage /></DesktopAuthRedirect>, errorElement: <NotFoundPage /> },
  {
    path: "/member",
    element: (
      <RequireLogin>
        <MemberCenter />
      </RequireLogin>
    ),
    errorElement: <NotFoundPage />,
  },
  ...MOBILE_ROUTES.map((section) => ({
    path: `/member/${section.path}`,
    element: (
      <RequireLogin>
        <MemberRoute sectionKey={section.key} />
      </RequireLogin>
    ),
    errorElement: <NotFoundPage />,
  })),
]);

export default routes;
