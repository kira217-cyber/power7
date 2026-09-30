import React from "react";
import { X } from "lucide-react";

import { useLanguage } from "../../Context/LanguageProvider";

/**
 * কারেন্সি ও ভাষা প্যানেল — হেডারের পতাকায় ক্লিক করলে খোলে।
 *
 * মূল সাইট থেকে মাপা: প্যানেল ৩৭৫×২৫৬, bg neutral900, radius --radius-10,
 * হেডারের নিচে ডান কোণে। টাইটেল বার ৫০px (প্যাডিং ০ ১৬px, লেখা fs ১৪),
 * ক্লোজ বাটন ৩৬×৩৬ (bg neutral800, radius ১০)। কনটেন্ট প্যাডিং ১৬px।
 * ব্যাকড্রপ rgba(0,0,0,.5) + blur(3px)।
 */
const LanguageMenu = ({ open, onClose }) => {
  const { language, changeLanguage, t } = useLanguage();

  const option = (value, label) => {
    const isActive = language === value;

    return (
      <button
        key={value}
        type="button"
        onClick={() => {
          changeLanguage(value);
          onClose();
        }}
        className="w-full cursor-pointer font-medium transition-colors"
        style={{
          height: "calc(var(--u) * 9.067)",
          borderRadius: "var(--radius-10)",
          fontSize: "var(--fs-larger)",
          background: isActive ? "var(--primary500)" : "var(--neutral700)",
          color: isActive ? "var(--neutral600)" : "var(--text-primary)",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[70] transition-opacity duration-200"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(3px)",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          pointerEvents: open ? "auto" : "none",
        }}
      />

      <div
        className="lang-menu fixed z-[71] overflow-hidden bg-[var(--neutral900)] transition-opacity duration-200"
        style={{
          borderRadius: "var(--radius-10)",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            height: "calc(var(--u) * 13.333)",
            paddingInline: "calc(var(--u) * 4.267)",
          }}
        >
          <p
            className="text-[var(--text-primary)]"
            style={{ fontSize: "var(--fs-larger)" }}
          >
            {t("currencyAndLanguage")}
          </p>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex shrink-0 cursor-pointer items-center justify-center bg-[var(--neutral800)] text-[var(--text-primary)] transition-colors hover:bg-[var(--neutral700)]"
            style={{
              height: "calc(var(--u) * 9.6)",
              width: "calc(var(--u) * 9.6)",
              borderRadius: "var(--radius-10)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "calc(var(--u) * 4.267)" }}>
          <div
            className="flex flex-col items-center bg-[var(--neutral800)]"
            style={{
              gap: "calc(var(--u) * 2.133)",
              padding: "calc(var(--u) * 4.267)",
              borderRadius: "var(--radius-10)",
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}assets/flag/BD.svg`}
              alt=""
              className="rounded-full object-cover"
              style={{
                height: "calc(var(--u) * 8)",
                width: "calc(var(--u) * 8)",
              }}
              draggable="false"
            />

            <p
              className="text-[var(--text-primary)]"
              style={{
                fontSize: "var(--fs-larger)",
                marginBottom: "calc(var(--u) * 1.067)",
              }}
            >
              ৳ BDT
            </p>

            {option("Bangla", t("bangla"))}
            {option("English", t("english"))}
          </div>
        </div>
      </div>

      <style>{`
        .lang-menu {
          top: var(--header-height);
          left: calc(var(--u) * 4.267);
          right: calc(var(--u) * 4.267);
        }

        @media (min-width: 1024px) {
          .lang-menu {
            top: var(--desktop-header-height);
            left: auto;
            right: 0;
            width: 375px;
          }
        }
      `}</style>
    </>
  );
};

export default LanguageMenu;
