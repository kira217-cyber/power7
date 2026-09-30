import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * পাসওয়ার্ড বা গোপন key এর ঘর — পাশে দেখা/লুকানোর চোখ।
 *
 * `.ad-input` এর সাথে মাপে মেলে, তাই যেখানে সাধারণ ইনপুট ছিল সেখানে
 * সরাসরি বসিয়ে দেওয়া যায়। চোখটা শুধু লেখা থাকলে দেখা যায় — ফাঁকা
 * ঘরে লুকানোর মতো কিছু নেই, বোতামটা তখন শুধু বিভ্রান্ত করত।
 */
const SecretInput = ({ value, className = "", ...props }) => {
  const [show, setShow] = useState(false);

  return (
    <div className={`ad-input flex items-center gap-2 ${className}`}>
      <input
        {...props}
        value={value}
        type={show ? "text" : "password"}
        className="h-full w-full bg-transparent text-inherit outline-none placeholder:text-[var(--text-disabled)]"
      />

      {value ? (
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? "Hide" : "Show"}
          className="shrink-0 cursor-pointer text-[var(--text-secondary)] transition hover:text-white"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      ) : null}
    </div>
  );
};

export default SecretInput;
