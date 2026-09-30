import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * ছবি বড় করে দেখা — লাইটবক্স।
 *
 * থাম্বনেইলে ক্লিক করলে পুরো পর্দাজুড়ে ছবি, উপরে close বোতাম।
 * ব্যাকড্রপে ক্লিক বা Esc এ বন্ধ হয়।
 */
const ImageLightbox = ({ src, alt = "", onClose }) => {
  useEffect(() => {
    if (!src) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="close"
        className="absolute right-4 top-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X size={22} />
      </button>

      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] rounded-[10px] object-contain"
        draggable="false"
      />
    </div>
  );
};

export default ImageLightbox;
