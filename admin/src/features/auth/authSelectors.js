export const selectAdmin = (state) => state.auth.admin;
export const selectToken = (state) => state.auth.token;
export const selectIsAuth = (state) => state.auth.isAuth;
export const selectRole = (state) => state.auth.admin?.role || "";

/** viewer সব দেখতে পারে কিন্তু কিছু বদলাতে পারে না */
export const selectCanWrite = (state) => state.auth.admin?.role !== "viewer";

export const selectIsMother = (state) => state.auth.admin?.role === "mother";
