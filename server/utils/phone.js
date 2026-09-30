/**
 * ফোন নম্বরকে এক চেহারায় আনা।
 *
 * ব্যবহারকারী একই নম্বর নানাভাবে লেখেন — 01755909862, 1755909862,
 * +8801755909862, 880 1755909862। কিছু না করলে এগুলো আলাদা আলাদা
 * স্ট্রিং হিসেবে ডেটাবেসে বসত, ফলে একই নম্বরে একাধিক অ্যাকাউন্ট খোলা
 * যেত আর লগইন/OTP এর সময় খুঁজে পাওয়া যেত না।
 *
 * তাই সব জায়গায় একটাই রূপ রাখা হয়: দেশের কোড ছাড়া, শুরুর শূন্য ছাড়া
 * — 1755909862।
 */

const digits = (value) => String(value ?? "").replace(/\D/g, "");

/**
 * স্থানীয় অংশটা বের করা।
 *
 * দেশের কোড সামনে থাকলে ছেঁটে ফেলা হয় (৮৮০১৭৫৫... → ১৭৫৫...), তারপর
 * শুরুর শূন্যগুলো। বাংলাদেশে নম্বর ১ দিয়ে শুরু হয়, তাই শূন্য ছাঁটাই
 * নিরাপদ।
 */
export const normalizePhone = (phone, countryCode = "+880") => {
  let value = digits(phone);
  const code = digits(countryCode);

  if (code && value.startsWith(code) && value.length > code.length) {
    value = value.slice(code.length);
  }

  return value.replace(/^0+/, "");
};

/** দেশের কোডও এক চেহারায় — সবসময় + সহ */
export const normalizeCountryCode = (countryCode) => {
  const code = digits(countryCode);

  return code ? `+${code}` : "+880";
};

/**
 * SMS গেটওয়ের চাওয়া রূপ — দেশের কোডসহ, + ছাড়া।
 *
 * o-sms বাংলাদেশি নম্বরে ১১ বা ১৩ ডিজিট চায়; দেশের কোড (৮৮০) আর
 * স্থানীয় ১০ ডিজিট মিলে ১৩ হয়।
 */
export const buildSmsPhone = (countryCode = "+880", phone = "") =>
  `${digits(countryCode)}${normalizePhone(phone, countryCode)}`;

/** দেখানোর রূপ — ০১৭৫৫৯০৯৮৬২ */
export const displayPhone = (phone, countryCode = "+880") =>
  `0${normalizePhone(phone, countryCode)}`;
