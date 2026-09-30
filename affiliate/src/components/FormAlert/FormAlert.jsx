import { useEffect } from "react";

import { notify } from "../../utils/notify";

/**
 * ফর্মের ভুল/সফলতার বার্তা — এখন SweetAlert2 টোস্টে (`utils/notify`)।
 *
 * আগে ফর্মের উপরে লাল বাক্স ছিল; পাতাগুলো যেভাবে ডাকত (`<FormAlert>
 * {error}</FormAlert>`) সেভাবেই থাকে, শুধু লেখা বদলালে একবার টোস্ট
 * ওঠে। একই লেখা আবার এলে (একই ভুল দ্বিতীয়বার) পাতা আগে সেটা খালি
 * করে দেয়, তাই টোস্টও আবার ওঠে।
 */
const FormAlert = ({ children, tone = "danger" }) => {
  useEffect(() => {
    if (!children) return;
    const text = typeof children === "string" ? children : String(children);
    if (tone === "success") notify.success(text);
    else if (tone === "warning") notify.warning(text);
    else notify.error(text);
  }, [children, tone]);

  return null;
};

export default FormAlert;
