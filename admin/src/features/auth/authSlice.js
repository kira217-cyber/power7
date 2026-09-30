import { createSlice } from "@reduxjs/toolkit";

const getSavedAdmin = () => {
  try {
    const raw = localStorage.getItem("admin_data");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getSavedToken = () => localStorage.getItem("admin_token") || null;

const initialState = {
  admin: getSavedAdmin(),
  token: getSavedToken(),
  isAuth: Boolean(getSavedToken() && getSavedAdmin()),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    rehydrateAuth: (state) => {
      const admin = getSavedAdmin();
      const token = getSavedToken();

      state.admin = admin;
      state.token = token;
      state.isAuth = Boolean(admin && token);
    },

    setCredentials: (state, action) => {
      const { admin, token } = action.payload || {};

      state.admin = admin || null;
      state.token = token || null;
      state.isAuth = Boolean(admin && token);

      if (admin && token) {
        localStorage.setItem("admin_data", JSON.stringify(admin));
        localStorage.setItem("admin_token", token);
      }
    },

    updateAdmin: (state, action) => {
      state.admin = { ...(state.admin || {}), ...(action.payload || {}) };
      localStorage.setItem("admin_data", JSON.stringify(state.admin));
    },

    logout: (state) => {
      state.admin = null;
      state.token = null;
      state.isAuth = false;

      localStorage.removeItem("admin_data");
      localStorage.removeItem("admin_token");
    },
  },
});

export const { rehydrateAuth, setCredentials, updateAdmin, logout } =
  authSlice.actions;

export default authSlice.reducer;
