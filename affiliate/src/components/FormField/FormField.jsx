import React from "react";

/**
 * লেবেল + কন্ট্রোল।
 *
 * **ক্লায়েন্ট সাইটের লগইন পেজের ইনপুট** — গাঢ় ভিতর (#010E22),
 * ১px হালকা নীল বর্ডার (#D6E2F4), গোল কোণা। `.tb-label` ও `.tb-field`
 * index.css এ, যাতে সব ফর্ম এক রকম থাকে।
 */
const FormField = ({ label, children, error }) => (
  <div className="w-full">
    {label && <p className="tb-label">{label}</p>}

    {children}

    {error && (
      <p className="mt-1.5 text-[13px] text-[var(--status-danger)]">{error}</p>
    )}
  </div>
);

export const TextInput = ({ className = "", ...props }) => (
  <div className="tb-field">
    <input {...props} className={className} />
  </div>
);

export default FormField;
