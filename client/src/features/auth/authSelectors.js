export const selectUser = (state) => state.auth.user;
export const selectIsLoggedIn = (state) => Boolean(state.auth.user && state.auth.token);
export const selectAuthRefreshing = (state) => state.auth.refreshing;
