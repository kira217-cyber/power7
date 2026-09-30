import React from "react";
import { useNavigate } from "react-router";

import { SECTION_BY_KEY } from "../../components/Member/sections";
import { useHideBootLoader } from "../../hook/useHideBootLoader";
import NotFoundPage from "../NotFoundPage/NotFoundPage";

/**
 * `/member/<path>` এর খোলস।
 *
 * ডেস্কটপে এই ঠিকানাগুলোয় সরাসরি এলে মূল সাইটের মতো হোমে ফিরিয়ে দিই
 * (সেখানে জিনিসটা মডাল হিসেবে খোলে); মোবাইলে সেকশনটাই পুরো পেজ।
 */
const MemberRoute = ({ sectionKey }) => {
  const navigate = useNavigate();
  const section = SECTION_BY_KEY[sectionKey];

  useHideBootLoader();

  if (!section) return <NotFoundPage />;
  return section.render();
};

export default MemberRoute;
