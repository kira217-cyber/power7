import jwt from "jsonwebtoken";

/**
 * JWT তৈরি। JWT_SECRET না থাকলে সার্ভার চালুর সময়েই ধরা পড়ে
 * (index.js দেখুন), তাই এখানে আলাদা করে চেক করা হয়নি।
 */
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRE || "7d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

export default generateToken;
