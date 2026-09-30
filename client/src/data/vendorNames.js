import { vendors } from "./gameData";

/**
 * ভেন্ডরের কোড → দেখানোর নাম।
 *
 * গেমের ডেটায় ভেন্ডর কোড থাকে (`JL`, `SPB`), কিন্তু মূল সাইটে কার্ডের
 * ব্যাজে পুরো নামটা দেখায় ("JILI", "Crash Games")। `gameData` এর
 * ভেন্ডর তালিকা থেকেই ম্যাপটা বানিয়ে নিই, যাতে আলাদা করে মেইনটেইন
 * করতে না হয়।
 */
export const vendorNames = Object.values(vendors)
  .flat()
  .reduce((map, vendor) => {
    map[vendor.code] = vendor.name;
    return map;
  }, {});

export const vendorLabel = (code) => vendorNames[code] || code;
