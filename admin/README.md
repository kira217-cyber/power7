# POWER7 — Admin Panel

React 19 + Vite 7 + Tailwind v4 + Redux Toolkit। লেআউট BetChokkor এর
অ্যাডমিনের মতোই, কিন্তু **রঙ ও ফন্ট ক্লায়েন্ট সাইট থেকে** — নেভি
`#010928`, সাইডবার `#0F0238`, কার্ড `#241A3E`, বেগুনি `#AD00FF`,
সোনালি `#FBD029`, ফন্ট Asap। চলে `localhost:5175` এ।

## চালানো

```bash
cd admin
npm install
cp .env.example .env.local   # VITE_API_URL এ সার্ভারের ঠিকানা
npm run dev                  # http://localhost:5175
```

সার্ভার (`../server`, পোর্ট 5000) আগে চালু থাকতে হবে।

## পেজ

| পাথ | কী | কে দেখে |
| --- | --- | --- |
| `/login` | লগইন | সবাই |
| `/` | ড্যাশবোর্ড — সংখ্যার কার্ড, চার্ট, ক্যালেন্ডার | সব অ্যাডমিন |
| `/admins` | অ্যাডমিন তৈরি, রোল ও পারমিশন বদল, মুছে ফেলা | শুধু mother |
| `/profile` | নিজের ইমেইল ও পাসওয়ার্ড বদল (হেডারের ডান কোণের আইকন) | সব অ্যাডমিন |
| বাকি ৬০টি | সাইডবারে আছে, কিন্তু **"No API Included"** | পারমিশন অনুযায়ী |

## "No API Included"

সাইডবারের প্রতিটা আইটেমেরই রুট আছে, যাতে পুরো নেভিগেশন এখনই ঘুরে দেখা
যায়। যেগুলোর ব্যাকএন্ড এখনো বানানো হয়নি সেগুলো
`pages/Placeholder/Placeholder.jsx` দেখায়।

API তৈরি হলে `router/router.jsx` এর **`REAL_PAGES`** ম্যাপে ওই পাথটা
যোগ করলেই আসল পেজ বসে যাবে:

```js
const REAL_PAGES = {
  "/": <Dashboard />,
  "/admins": <Admins />,
  // "/users": <Users />,   ← API হলে এভাবে
};
```

রুটগুলো `data/navigation.js` থেকেই তৈরি হয়, তাই মেনুতে কিছু যোগ করলে
আলাদা করে রুট লিখতে হয় না।

## রোল

- **mother** — সব পেজ, সব কাজ
- **sub** — শুধু টিক দেওয়া পেজগুলো
- **viewer** — সব পেজ দেখে, উপরে "View only" ব্যাজ, কোনো লেখা-কাজ নয়

### লগইন পেজে ডেমো অ্যাকাউন্ট দেখানো

`View only` রোল বাছলে ফর্মে **"Show on login page"** টিকবক্স আসে। টিক
দিলে ওই অ্যাকাউন্টের ইমেইল ও পাসওয়ার্ড লগইন পেজে কপি-বোতামসহ দেখায়,
আর তালিকায় ওই সারিতে "shown on login page" লেখা থাকে।

**আগে বানানো অ্যাকাউন্টে টিক দিতে হলে একই সাথে একটা নতুন পাসওয়ার্ডও
টাইপ করতে হবে** — ডেটাবেসে শুধু bcrypt হ্যাশ থাকে, পুরোনো পাসওয়ার্ড
কেউ আর পড়তে পারে না, প্যানেলও না।

`PrivateRoute` শুধু UI আড়াল করে। আসল বাধা সার্ভারের মিডলওয়্যারে — টোকেন
এডিট করে রোল বদলালেও API 403 দেয়।

## ফোল্ডার

```
src/api/axios.js          টোকেন হেডার + ৪০১ এ অটো লগআউট
src/app/store.js          Redux স্টোর
src/features/auth/        authSlice ও সিলেক্টর
src/PrivateRoute/         রুট গার্ড (motherOnly / perm)
src/RootLayout/           সাইডবার + টপবার শেল
src/pages/                Login, Dashboard, Admins, Profile,
                          Placeholder, NotFoundPage
src/data/navigation.js    নেভ আইটেম, পারমিশন তালিকা, রোলের নাম
src/router/router.jsx     navigation.js থেকে রুট তৈরি
```

## রেসপনসিভ

ডেস্কটপে বাঁয়ে স্থায়ী ২৬০px সাইডবার, মোবাইলে হ্যামবার্গার ড্রয়ার।
৩৯০ / ৭৬৮ / ১৩৬৬ / ১৯২০px — সব জায়গায় হরিজন্টাল ওভারফ্লো শূন্য
(`scratchpad/tb/verifyadmin.py` দিয়ে যাচাই করা)।

## টোকেন

JWT `localStorage` এ `admin_token` নামে থাকে। ৪০১ এলে `api/axios.js`
নিজেই সেশন মুছে `/login` এ পাঠায়।
