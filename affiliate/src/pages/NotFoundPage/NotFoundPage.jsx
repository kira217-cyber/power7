import React from "react";
import { Link } from "react-router";

import { useLanguage } from "../../Context/LanguageProvider";
import { useHideBootLoader } from "../../hook/useHideBootLoader";

const NotFoundPage = () => {
  const { t } = useLanguage();

  // errorElement হিসেবেও বসে, তাই RootLayout ছাড়াই দেখা যায়
  useHideBootLoader(true);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--neutral1000)] px-6 text-center">
      <img
        src={`${import.meta.env.BASE_URL}assets/brand/logo.png`}
        alt="POWER7"
        className="h-9 w-auto object-contain"
        draggable="false"
      />

      <p className="text-[48px] font-extrabold leading-none text-[var(--primary500)]">
        404
      </p>

      <p className="tb-lead">{t("notFoundText")}</p>

      <Link to="/" className="tb-btn tb-btn--primary">
        {t("backToHome")}
      </Link>
    </div>
  );
};

export default NotFoundPage;
