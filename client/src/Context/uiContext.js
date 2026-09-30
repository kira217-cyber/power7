import { createContext, useContext } from "react";

/**
 * সাইটের ওভারলে গুলো এক জায়গা থেকে খোলা/বন্ধ করার জন্য।
 *
 * মূল সাইটে ডেস্কটপে অথ ও মেম্বার সেন্টার দুটোই **মডাল** (URL বদলায় না),
 * আর মোবাইলে অথ আলাদা **পেজ** (`/login`, `/register`)। তাই খোলার
 * অনুরোধটা এক জায়গায় রেখে ভিউপোর্ট অনুযায়ী ঠিক করা হয়।
 */
export const UIContext = createContext({
  openAuth: () => {},
  closeAuth: () => {},
  authTab: null,
  openMember: () => {},
  closeMember: () => {},
  memberTab: null,
  notice: null,
  closeNotice: () => {},
});

export const useUI = () => useContext(UIContext);

export default UIContext;
