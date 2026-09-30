import React from "react";

import Verification from "./Verification";

/**
 * অ্যাফিলিয়েটের পরিচয় যাচাই।
 *
 * কাজটা খেলোয়াড়ের পাতার মতোই, তাই একই কম্পোনেন্ট — শুধু `kind` বলে
 * দেওয়া। দুটো আলাদা পাতা রাখা হলো কারণ দুই দলের আবেদন একসাথে
 * মেশালে খুঁজে বের করা কঠিন হতো, আর সুইচও দুই দলের আলাদা।
 */
const AffiliateVerification = () => <Verification kind="affiliates" />;

export default AffiliateVerification;
