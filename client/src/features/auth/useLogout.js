import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { logout } from "./authSlice";

/**
 * সাইন আউট — আগে হ্যাঁ/না জিজ্ঞেস করে, তারপর হোমে।
 *
 * হেডার, সাইডবার, সদস্য কেন্দ্র, নিরাপত্তা — সব জায়গা এটাই ডাকে, তাই
 * সবখানে একই আচরণ। `before` দিলে সাইন আউটের আগে সেটা চলে (যেমন
 * ড্রয়ার বন্ধ করা)।
 */
export const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useLanguage();

  return useCallback(
    async (before) => {
      const ok = await notify.confirm({
        title: t.notify.logoutTitle,
        text: t.notify.logoutText,
        confirmText: t.notify.yes,
        cancelText: t.notify.cancel,
      });
      if (!ok) return;
      before?.();
      dispatch(logout());
      navigate("/");
      notify.success(t.notify.logoutOk);
    },
    [dispatch, navigate, t],
  );
};

export default useLogout;
