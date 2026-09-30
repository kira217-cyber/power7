/**
 * POWER7 — সদস্য কেন্দ্রের ভিতরের পেজগুলোর লেখা।
 *
 * locale.js বড় হয়ে যাচ্ছিল, তাই এই অংশটা আলাদা ফাইলে; locale.js
 * এটাকে `member.pages` এর নিচে মিশিয়ে নেয়।
 *
 * সব লেখা power7.live এ লগইন করে প্রতিটা পেজ খুলে তোলা।
 */

export const memberPagesLocale = {
  bn: {
    account: {
      title: "আমার অ্যাকাউন্ট",
      usernameLabel: "ব্যবহারকারীর নাম:",
      payee: "অনুগ্রহ করে প্রত্যাহারকারীর নাম",
      payeeWarn:
        "আপনার আপলোড করা শংসাপত্রের সাথে সামঞ্জস্যপূর্ণ নামটি পূরণ করতে ভুলবেন না, অন্যথায় প্রত্যাহার ব্যর্থ হতে পারে।",
      nickname: "অনুগ্রহ করে ডাকনাম",
      google: "অনুগ্রহ করে Google",
      email: "অনুগ্রহ করে ইমেইল",
      phone: "অনুগ্রহ করে ফোন নম্বর",
      privacyTitle: "আমরা আপনার গোপনীয়তা সম্পর্কে চিন্তা করি",
      privacyDesc:
        "সমস্ত ব্যবহারকারী তথ্য এনক্রিপ্ট করা হয় আপনার ব্যক্তিগত গোপনীয়তা রক্ষা করার জন্য।",
      submit: "জমা দিন",
    },
    security: {
      title: "সুরক্ষা কেন্দ্র",
      scoreLabel: "নিরাপত্তা শতাংশ:",
      low: "নিম্ন",
      lastIp: "সর্বশেষ লগইন আইপি:",
      lastTime: "সর্বশেষ লগইন সময়:",
      warn: "আপনার অ্যাকাউন্ট নিরাপত্তা স্তর নিম্ন,  আপনার নিরাপত্তা তথ্য উন্নত করুন",
      rows: {
        profile: { title: "ব্যক্তিগত তথ্য", desc: "ব্যক্তিগত তথ্য সম্পূর্ণ করুন।" },
        wallet: { title: "ই-ওয়ালেট বাঁধুন", desc: "উত্তোলনের জন্য ই-ওয়ালেট বাঁধুন।" },
        loginPassword: {
          title: "লগইন পাসওয়ার্ড পরিবর্তন করুন",
          desc: "প্রস্তাবিত অক্ষর এবং সংখ্যা সংমিশ্রণ",
        },
        payPassword: {
          title: "লেনদেন পাসওয়ার্ড",
          desc: "নিধি লেনদেনের নিরাপত্তা উন্নত করতে একটি নিধি পাসওয়ার্ড সেট করুন",
        },
        logout: { title: "লগআউট", desc: "নিরাপদভাবে লগআউট করুন" },
      },
    },
    referral: {
      title: "বন্ধুদের আমন্ত্রণ জানান",
      tabs: ["সংক্ষিপ্ত বর্ণনা", "পুরস্কার", "আয়", "রেকর্ডস", "আমন্ত্রিতদের তালিকা"],
      shareTitle: "আপনার বন্ধুদের সাথে ভাগ করুন",
      saveCode: "কোড সংরক্ষণ",
      copy: "কপি",
      stats: {
        today: "আজকের আয়",
        yesterday: "গতকালের আয়",
        members: "সূচিপত্রধারী",
        qualified: "যোগ্য পরিচায়করা",
      },
      commission: "বাজি কমিশন",
      rewardTitle: "প্রাপ্ত পুরস্কার",
    },
    rebate: {
      title: "রিবেট",
      tabs: ["ম্যানুয়াল রিবেট", "রিবেট ইতিহাস"],
      date: "তারিখ",
      total: "মোট",
      claim: "দাবি",
    },
    mail: { title: "মেইল", inbox: "ইনবক্স", empty: "কোন মেসেজ নেই" },
    feedback: {
      title: "অভিযোগ / পরামর্শ",
      type: "* দয়া করে সমস্যার ধরণটি নির্বাচন করুন",
      subject: "* কিছু উন্নত করা যাবে কিনা?",
      placeholder: "দয়া করে বিষয়বস্তু লিখুন",
      upload: "আপলোড করুন",
      captcha: "* যাচাইকরণ কোড",
      submit: "জমা দিন",
    },
    reward: {
      title: "পুরস্কার সেন্টার",
      signIn: "সাইন ইন",
      nickname: "ডাকনাম:",
      benefit: "সুবিধা",
      tiles: {
        claim: "দাবি করা",
        signIn: "সাইন ইন",
        invite: "বন্ধুদের আমন্ত্রণ জানান",
        ticket: "টেমু টিকিট",
      },
    },
    profitLoss: { title: "ব্যক্তিগত প্রতিবেদন" },
    help: { title: "সাহায্য কেন্দ্র" },
    note: "অস্বীকরণ: উপরের ডেটা আপনার ডিভাইসের সময় অনুযায়ী",
    recordType: "প্রকার",
    win: "জয়",
    plLabel: "লাভ এবং লস",
    gameTabs: { RNG: "স্লট", FISH: "মাছ", LIVE: "লাইভ", PVP: "পোকার", SPORTS: "খেলাধুলা" },
    days7: "7 দিন",
  },

  en: {
    account: {
      title: "My Account",
      usernameLabel: "Username:",
      payee: "Please enter the payee name",
      payeeWarn:
        "Be sure to fill in the name matching your uploaded certificate, otherwise the withdrawal may fail.",
      nickname: "Please enter a nickname",
      google: "Please enter Google",
      email: "Please enter email",
      phone: "Please enter phone number",
      privacyTitle: "We care about your privacy",
      privacyDesc: "All user information is encrypted to protect your personal privacy.",
      submit: "Submit",
    },
    security: {
      title: "Security Center",
      scoreLabel: "Security level:",
      low: "Low",
      lastIp: "Last login IP:",
      lastTime: "Last login time:",
      warn: "Your account security level is low, please improve your security info",
      rows: {
        profile: { title: "Personal Info", desc: "Complete your personal info." },
        wallet: { title: "Bind E-Wallet", desc: "Bind an e-wallet for withdrawals." },
        loginPassword: {
          title: "Change Login Password",
          desc: "A mix of letters and numbers is recommended",
        },
        payPassword: {
          title: "Transaction Password",
          desc: "Set a fund password to improve transaction security",
        },
        logout: { title: "Logout", desc: "Log out safely" },
      },
    },
    referral: {
      title: "Invite Friends",
      tabs: ["Overview", "Rewards", "Income", "Records", "Invitee list"],
      shareTitle: "Share with your friends",
      saveCode: "Save code",
      copy: "Copy",
      stats: {
        today: "Today's income",
        yesterday: "Yesterday's income",
        members: "Referred members",
        qualified: "Qualified referrals",
      },
      commission: "Bet commission",
      rewardTitle: "Rewards received",
    },
    rebate: {
      title: "Rebate",
      tabs: ["Manual Rebate", "Rebate History"],
      date: "Date",
      total: "Total",
      claim: "Claim",
    },
    mail: { title: "Mail", inbox: "Inbox", empty: "No messages" },
    feedback: {
      title: "Complaint / Feedback",
      type: "* Please select the issue type",
      subject: "* Anything that can be improved?",
      placeholder: "Please write the details",
      upload: "Upload",
      captcha: "* Verification code",
      submit: "Submit",
    },
    reward: {
      title: "Reward Center",
      signIn: "Sign In",
      nickname: "Nickname:",
      benefit: "Benefits",
      tiles: {
        claim: "Claim",
        signIn: "Sign In",
        invite: "Invite Friends",
        ticket: "Temu Ticket",
      },
    },
    profitLoss: { title: "Personal Report" },
    help: { title: "Help Center" },
    note: "Disclaimer: the data above follows your device time",
    recordType: "Type",
    win: "Win",
    plLabel: "Profit & loss",
    gameTabs: { RNG: "Slot", FISH: "Fish", LIVE: "Live", PVP: "Poker", SPORTS: "Sports" },
    days7: "7 days",
  },
};

export default memberPagesLocale;
