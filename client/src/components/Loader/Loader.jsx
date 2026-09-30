import React from "react";

import { useLanguage } from "../../Context/LanguageProvider";

/**
 * মূল সাইটের লোডার — `.br_loader_root` ও `.br_spinner` এর হুবহু নকল।
 *
 * CSS থেকে মাপা:
 *   ঢাকনা `position: fixed; inset: 0; z-index: 1000`, bg rgba(0,0,0,.8)
 *   স্পিনার ৬০ × ৬০, ঠিক মাঝখানে (`margin -30`)
 *   তিনটে রেখা — `border-left: 2.4px solid #ffd800`, `rotateX(66deg)`,
 *   ১s linear infinite; শুরুর কোণ ১২০° / ২৪০° / ৩৬০°
 *
 * মূল সাইটে একই স্পিনার দুই জায়গায় বসে:
 *   `.br_loader_root` — পুরো পর্দা (সাইট লোড হওয়ার সময়)
 *   `.br_loader_child` — কোনো অংশের ভিতরে (সেকশনের ডেটা আসার সময়)
 * তাই একটাই কম্পোনেন্ট, `scope` দিয়ে ঠিক করা হয় কোনটা।
 */
export const Spinner = ({ size = 60 }) => (
  <span className="tb-spinner" style={{ width: size, height: size }}>
    <span className="tb-spinner__inner">
      <span className="tb-spinner__line" />
      <span className="tb-spinner__line" />
      <span className="tb-spinner__line" />
    </span>
  </span>
);

const Loader = ({ scope = "site" }) => (
  <div
    className="flex items-center justify-center"
    style={
      scope === "site"
        ? {
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgb(0 0 0 / 0.8)",
          }
        : {
            position: "absolute",
            inset: 0,
            zIndex: 5,
            background: "rgb(0 0 0 / 0.8)",
          }
    }
  >
    <Spinner />
  </div>
);

/** সেকশনে ডেটা না থাকলে — মূল সাইটের `.no-data` */
export const NoData = () => {
  const { t } = useLanguage();
  return <div className="tb-no-data">{t.noData}</div>;
};

export default Loader;
