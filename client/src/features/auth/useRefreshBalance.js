import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { refreshMe } from "./authSlice";
import { selectAuthRefreshing } from "./authSelectors";

/**
 * ব্যালেন্সের পাশের ঘুরন্ত আইকন — server থেকে নতুন ব্যালেন্স আনে।
 * ঘোরা চলাকালীন আবার চাপলে দ্বিতীয় রিকোয়েস্ট যায় না।
 */
export const useRefreshBalance = () => {
  const dispatch = useDispatch();
  const refreshing = useSelector(selectAuthRefreshing);

  const refresh = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (!refreshing) dispatch(refreshMe());
    },
    [dispatch, refreshing],
  );

  return { refresh, refreshing };
};

export default useRefreshBalance;
