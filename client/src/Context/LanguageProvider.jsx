import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { locale, LANGUAGES } from "../data/locale";

/**
 * সাইটের ভাষা — বাংলা ও ইংরেজি, মূল সাইটের মতোই সাইডবার থেকে বদলায়।
 *
 * বাছাইটা `localStorage` এ রাখা হয় যাতে রিফ্রেশ করলেও থাকে, আর
 * `<html lang>` ও বদলে দেওয়া হয়।
 */
const STORAGE_KEY = "power7:lang";

const LanguageContext = createContext({
  lang: "bn",
  setLang: () => {},
  t: locale.bn,
  languages: LANGUAGES,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && locale[saved]) return saved;
    } catch {
      // প্রাইভেট মোডে localStorage পড়া যায় না — তখন ডিফল্টই থাকবে
    }
    return "bn";
  });

  const setLang = useCallback((next) => {
    if (!locale[next]) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // সেভ না হলেও ভাষা এই সেশনে বদলাবে
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t: locale[lang], languages: LANGUAGES }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LanguageProvider;
