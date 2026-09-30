/**
 * লগইনের টোকেন আর ইউজার কোথায় থাকে।
 *
 * "মনে রাখুন" টিক দিলে localStorage (ব্রাউজার বন্ধ করলেও থাকে), না দিলে
 * sessionStorage (ট্যাব বন্ধ হলেই লগআউট) — মূল সাইটের চেকবক্সের কাজ এটাই।
 *
 * axios আর auth slice দুটোই এখান থেকে পড়ে; আলাদা ফাইল বলে দুটোর
 * মধ্যে ঘুরপাক খাওয়া import হয় না।
 */
const TOKEN_KEY = "power7:token";
const USER_KEY = "power7:user";

const stores = () => [window.localStorage, window.sessionStorage];

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const readToken = () =>
  safe(() => stores().map((s) => s.getItem(TOKEN_KEY)).find(Boolean) || null);

/** টোকেন ছাড়া ইউজার রাখা অর্থহীন (আগের নকল লগইনের অবশিষ্ট) — বাদ */
export const readUser = () =>
  safe(() => {
    const store = stores().find((s) => s.getItem(TOKEN_KEY));
    if (!store) {
      stores().forEach((s) => s.removeItem(USER_KEY));
      return null;
    }
    const raw = store.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

export const saveSession = ({ token, user, remember }) =>
  safe(() => {
    clearSession();
    const store = remember ? window.localStorage : window.sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  });

/** টোকেন যেখানে আছে, ইউজারও সেখানেই হালনাগাদ */
export const saveUser = (user) =>
  safe(() => {
    const store = stores().find((s) => s.getItem(TOKEN_KEY));
    if (store) store.setItem(USER_KEY, JSON.stringify(user));
  });

export const clearSession = () =>
  safe(() =>
    stores().forEach((s) => {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    }),
  );

/** এই লগইন "মনে রাখুন" দিয়ে (localStorage) কিনা — নতুন টোকেন একই জায়গায় রাখতে */
export const isRemembered = () => safe(() => Boolean(window.localStorage.getItem(TOKEN_KEY)), false);
