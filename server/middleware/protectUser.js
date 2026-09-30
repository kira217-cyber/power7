import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { errorResponse } from "../utils/response.js";

/**
 * সাইটের ব্যবহারকারীর টোকেন যাচাই করে `req.user` বসায়।
 *
 * অ্যাডমিনের টোকেন থেকে আলাদা — পে-লোডে `kind: "user"` থাকে, তাই
 * একটার টোকেন দিয়ে অন্যটার রুটে ঢোকা যায় না।
 */
export const protectUser = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) return errorResponse(res, "Not authorized - no token", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.kind !== "user") {
      return errorResponse(res, "Not authorized - wrong token", 401);
    }

    const user = await User.findById(decoded.id);

    if (!user) return errorResponse(res, "Not authorized - user not found", 401);

    // পাসওয়ার্ড বদলানোর আগের টোকেন — অন্য কোথাও খোলা থাকা লগইন বন্ধ
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
      return errorResponse(res, "Password was changed — please log in again", 401, "sessionExpired");
    }

    if (!user.isActive) {
      // কোড দেখে সাইট সাথে সাথে লগআউট করায় — admin বন্ধ করলে খোলা
      // ট্যাবেও আর লগইন অবস্থা থাকে না
      return errorResponse(res, "This account is disabled", 403, "accountDisabled");
    }

    /*
     * অনুমোদন তুলে নিলে চালু টোকেনও কাজ করা বন্ধ করে।
     *
     * শুধু লগইনে দেখলে, অনুমোদিত অ্যাফিলিয়েটকে পরে বাতিল করার পরেও
     * তাঁর হাতের টোকেনটা মেয়াদ শেষ না হওয়া পর্যন্ত চলত।
     */
    if (user.role === "aff-user" && user.affiliateStatus !== "approved") {
      return errorResponse(
        res,
        user.affiliateStatus === "rejected"
          ? "Your application was not accepted"
          : "Your application is still under review",
        403,
        user.affiliateStatus === "rejected" ? "affiliateRejected" : "affiliatePending",
      );
    }

    req.user = user;
    return next();
  } catch {
    // মেয়াদ শেষ আর নষ্ট টোকেন — একই উত্তর
    return errorResponse(res, "Not authorized - invalid token", 401);
  }
};

/** অ্যাফিলিয়েট ছাড়া ঢোকা যাবে না */
export const requireAffiliate = (req, res, next) => {
  if (req.user?.role !== "aff-user") {
    return errorResponse(res, "Affiliate account required", 403);
  }

  return next();
};

export default protectUser;
