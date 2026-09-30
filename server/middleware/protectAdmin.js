import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";
import { errorResponse } from "../utils/response.js";

/**
 * টোকেন যাচাই করে req.admin বসায়।
 *
 * টোকেন বা হেডার কখনো লগ করা হয় না — লগে টোকেন গেলে সেটাই
 * কার্যত পাসওয়ার্ড ফাঁস হওয়ার সমান।
 */
export const protectAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      return errorResponse(res, "Not authorized - no token", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return errorResponse(res, "Not authorized - admin not found", 401);
    }

    if (!admin.isActive) {
      return errorResponse(res, "This admin account is disabled", 403);
    }

    req.admin = admin;

    return next();
  } catch {
    // মেয়াদ শেষ আর নষ্ট টোকেন — দুটোরই একই উত্তর, যাতে কোনটা কী
    // সেটা বাইরে থেকে বোঝা না যায়
    return errorResponse(res, "Not authorized - invalid token", 401);
  }
};

/** শুধু mother অ্যাডমিন */
export const requireMother = (req, res, next) => {
  if (req.admin?.role !== "mother") {
    return errorResponse(res, "Only mother admin allowed", 403);
  }

  return next();
};

/**
 * viewer সব পেজ দেখতে পারে কিন্তু কিছু বদলাতে পারে না —
 * নিজের প্রোফাইলও না। তাই লেখার প্রতিটি রুটে এটা বসে।
 */
export const requireWrite = (req, res, next) => {
  if (req.admin?.role === "viewer") {
    return errorResponse(res, "View only admin cannot change anything", 403);
  }

  return next();
};

/**
 * sub অ্যাডমিনের নির্দিষ্ট পেজের অনুমতি আছে কিনা।
 * mother ও viewer সব পেজেই ঢুকতে পারে।
 */
export const requirePermission = (key) => (req, res, next) => {
  const role = req.admin?.role;

  if (role === "mother" || role === "viewer") {
    return next();
  }

  if (Array.isArray(req.admin?.permissions) && req.admin.permissions.includes(key)) {
    return next();
  }

  return errorResponse(res, "You do not have permission for this page", 403);
};
