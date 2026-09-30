import { useEffect, useState } from "react";

/**
 * মূল সাইটে ডেস্কটপ আর মোবাইল দুটো আলাদা লেআউট — সাইডবার বনাম বটম নেভ,
 * ফিক্সড px বনাম rem স্কেল। ভাঙার সীমা ৭৬৮px।
 */
export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 768,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e) => setIsDesktop(e.matches);

    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
};

export default useIsDesktop;
