import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { notify } from "../../utils/notify";
import { selectIsLoggedIn } from "../auth/authSelectors";
import { setInboxUnread } from "./inboxSlice";

/**
 * "অভ্যন্তরীণ বার্তা" — তালিকা, পড়া, মোছা। প্রতিটা কাজের পর server এর
 * না-পড়া সংখ্যা ব্যাজে বসে।
 */
export const useInbox = () => {
  const dispatch = useDispatch();
  const loggedIn = useSelector(selectIsLoggedIn);
  const { t } = useLanguage();
  const [sort, setSort] = useState("desc");
  const [state, setState] = useState({ messages: [], loading: false, loaded: false });

  const load = useCallback(async () => {
    if (!loggedIn) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { data } = await api.get("/api/inbox", { params: { sort, limit: 50 } });
      setState({ messages: data?.data?.messages || [], loading: false, loaded: true });
      dispatch(setInboxUnread(data?.data?.unread));
    } catch {
      setState((s) => ({ ...s, loading: false, loaded: true }));
    }
  }, [loggedIn, sort, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (path, body, { silent = false } = {}) => {
    try {
      const { data } = await api.post(`/api/inbox/${path}`, body);
      dispatch(setInboxUnread(data?.data?.unread));
      return true;
    } catch (e) {
      if (!silent) notify.error(e?.response?.data?.message || t.authErr.generic);
      return false;
    }
  };

  /** একটা খুললেই পড়া — পর্দায় সাথে সাথে, server এ পেছনে */
  const markRead = async (ids) => {
    setState((s) => ({ ...s, messages: s.messages.map((m) => (ids.includes(m._id) ? { ...m, read: true } : m)) }));
    await act("read", { ids }, { silent: true });
  };

  const markAllRead = async () => {
    if (await act("read", { all: true })) {
      setState((s) => ({ ...s, messages: s.messages.map((m) => ({ ...m, read: true })) }));
      notify.success(t.inboxFlow.allRead);
    }
  };

  const remove = async (ids) => {
    if (!ids.length) return false;
    const ok = await notify.confirm({ title: t.inboxFlow.deleteConfirm.replace("{n}", ids.length), confirmText: t.inboxFlow.delete, cancelText: t.inboxFlow.cancel });
    if (!ok) return false;
    if (await act("delete", { ids })) {
      setState((s) => ({ ...s, messages: s.messages.filter((m) => !ids.includes(m._id)) }));
      notify.success(t.inboxFlow.deleted);
      return true;
    }
    return false;
  };

  return { ...state, sort, setSort, load, markRead, markAllRead, remove };
};

export default useInbox;
