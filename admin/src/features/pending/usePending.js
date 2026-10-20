import { useEffect, useState, useSyncExternalStore } from "react";

import { api } from "../../api/axios";

/**
 * অপেক্ষমাণ কাজের সংখ্যা — `/api/dashboard/pending` (key = মেনুর key)।
 * সাইডবার আর ড্যাশবোর্ড একই store পড়ে; ৩০ সেকেন্ড পরপর আর ট্যাবে ফিরলে নতুন করে আনে।
 */
let counts = {};
const listeners = new Set();
let timer = null;
let users = 0;

const emit = () => listeners.forEach((fn) => fn());

export const refreshPending = async () => {
  try {
    const { data } = await api.get("/api/dashboard/pending");
    counts = data?.data?.counts || {};
    emit();
  } catch {
    /* লগআউট বা নেটওয়ার্ক — আগেরটাই থাকে */
  }
};

const onVisible = () => document.visibilityState === "visible" && refreshPending();

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const usePending = () => {
  const value = useSyncExternalStore(subscribe, () => counts);
  const [, setOn] = useState(false);
  useEffect(() => {
    users += 1;
    if (!timer) {
      refreshPending();
      timer = setInterval(refreshPending, 30000);
      document.addEventListener("visibilitychange", onVisible);
    }
    setOn(true);
    return () => {
      users -= 1;
      if (users <= 0 && timer) {
        clearInterval(timer);
        timer = null;
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, []);
  return value;
};
