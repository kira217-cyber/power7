/**
 * POWER7 — ডেস্কটপ মেম্বার মডালের ট্যাবগুলোর লেখা।
 *
 * মোবাইলের পেজগুলোর সাথে অনেক শব্দ মিললেও কলামের নাম, ট্যাবের নাম ও
 * খালি বার্তা আলাদা, তাই আলাদা ফাইল। সব লেখা মূল সাইটে লগইন করে
 * প্রতিটা ট্যাব খুলে তোলা।
 */

export const memberDeskLocale = {
  bn: {
    noMatch: "কোন মিলিয়ে সংমিশ্রণ ডেটা পাওয়া যায়নি",
    total: "মোট",
    other: "অন্যান্য",
    decimal: "ডেসিমাল পয়েন্ট",
    vendorLabel: "বিক্রেতা:",

    betRecord: {
      tabs: ["স্লট", "ফিশিং", "লাইভ", "পোকার", "খেলা"],
      action: "বর্জিত টার্নওভার তালিকা",
      vendorSelect: true,
      gear: true,
      columns: [
        "প্রোভাইডার",
        "বেট পরিমাণ",
        "বৈধ বেট",
        "পুরস্কার",
        "লাভ ও হার",
        "খেলার নাম",
        "খেলার সংখ্যা",
      ],
    },

    accountRecord: {
      tabs: ["সব", "জমা", "উত্তোলন", "রিবেট", "প্রমোশন"],
      // মূল সাইটের কলাম: অর্ডার নম্বর, লেনদেনের সময়, পরিমাণ, বর্তমান ব্যালেন্স, বিবরণ
      columns: ["অর্ডার নম্বর", "লেনদেনের সময়", "লেনদেনের পরিমান", "বর্তমান ব্যালেন্স", "কন্টেন্ট"],
      zero: "0",
    },

    profitLoss: {
      tabs: ["সব", "স্লট", "ফিশিং", "লাইভ", "পোকার", "খেলা"],
      columns: [
        "তারিখ",
        "জমা",
        "উত্তোলন",
        "ব্যয়",
        "আয়",
        "রিবেট",
        "প্রমোশন",
        "লাভ ও হার",
      ],
      zero: "0",
      // মূল সাইটে GMT; এখানে দিন গোনা হয় খেলোয়াড়ের নিজের সময় অঞ্চলে
      note: "মন্তব্য: উপরের তথ্য আপনার ডিভাইসের সময় অনুযায়ী",
    },

    reward: {
      tabs: ["প্রাপ্তি কেন্দ্র", "টিকিটের রেকর্ড"],
      usernameLabel: "ব্যবহারকারীর নাম:",
      balanceLabel: "প্রাপ্ত হিসাব",
      view: "দেখুন",
      coupon: "কুপন",
      remaining: "বাকি",
      days: "দিন",
      endLabel: "শেষ তারিখ:",
      claim: "দাবি করুন",
      prizeLabel: "পুরস্কার:",
      tasks: [
        { title: "টেমু টিকিট", desc: "দেখুন" },
        { title: "সাইন-ইন কাজ", desc: "একটি কাজ চলমান" },
      ],
      items: {
        daily: "প্রতিদিন লগইন ইনাম",
        dailyCoupon: "রিবেট",
        big: "বিশাল পুরস্কার",
        bigCoupon: "টেমু টিকিট",
        newbie: "নতুন সদস্য রহস্য বোনাস",
        newbieCoupon: "বোনাস",
      },
    },

    referral: {
      tabs: ["সারসংক্ষেপ", "পুরস্কার", "আয়", "রেকর্ড", "আমন্ত্রিতদের তালিকা"],
      commission: "বাজি কমিশন",
      winnersTitle: "যারা পুরস্কার পেয়েছেন",
      received: "প্রাপ্ত",
      rewardTitle: "এখন পর্যন্ত প্রাপ্ত পুরস্কার",
      claimed: "দাবিত",
      rewards: {
        invite: "আমন্ত্রণ পুরস্কার",
        achieve: "সাফল্য পুরস্কার",
        deposit: "ডিপোজিট রিবেট",
        bet: "বেটিং রিবেট",
      },
      stats: {
        today: "আজকের আয়",
        yesterday: "গতকালের আয়",
        members: "সূচিপত্রধারী",
        qualified: "যোগ্য পরিচায়করা",
      },
      agentLink: "এজেন্ট ৪ সুপার কমিশন",
      shareTitle: "বন্ধুদের শেয়ার করুন",
      saveCode: "কোড সংরক্ষণ",
    },

    rebate: {
      tabs: ["ম্যানুয়াল রিবেট", "রিবেট ইতিহাস"],
      dateLabel: "নিবেশতারিখ:",
      totalLabel: "মোট:",
      refresh: "রিফ্রেশ",
      claim: "দাবি করুন",
    },

    inbox: {
      inbox: "ইনবক্স",
      selectAll: "সব নির্বাচন করুন",
      sortBy: "সময় অনুযায়ী সাজান",
    },
  },

  en: {
    noMatch: "No matching data found",
    total: "Total",
    other: "Other",
    decimal: "Decimal point",
    vendorLabel: "Vendor:",

    betRecord: {
      tabs: ["Slots", "Fish", "Live", "Poker", "Sports"],
      action: "Excluded turnover list",
      vendorSelect: true,
      gear: true,
      columns: [
        "Provider",
        "Bet amount",
        "Valid bet",
        "Payout",
        "Profit & loss",
        "Game name",
        "Rounds",
      ],
    },

    accountRecord: {
      tabs: ["All", "Deposit", "Withdrawal", "Rebate", "Promotion"],
      columns: ["Order no.", "Time", "Amount", "Balance", "Content"],
      zero: "0",
    },

    profitLoss: {
      tabs: ["All", "Slots", "Fish", "Live", "Poker", "Sports"],
      columns: [
        "Date",
        "Deposit",
        "Withdrawal",
        "Expense",
        "Income",
        "Rebate",
        "Promotion",
        "Profit & loss",
      ],
      zero: "0",
      note: "Note: the data above follows your device time",
    },

    reward: {
      tabs: ["Reward Center", "Ticket Record"],
      usernameLabel: "Username:",
      balanceLabel: "Available balance",
      view: "View",
      coupon: "Coupon",
      remaining: "Left",
      days: "d",
      endLabel: "Ends:",
      claim: "Claim",
      prizeLabel: "Prize:",
      tasks: [
        { title: "Temu Ticket", desc: "View" },
        { title: "Sign-in task", desc: "One task running" },
      ],
      items: {
        daily: "Daily login reward",
        dailyCoupon: "Rebate",
        big: "Big reward",
        bigCoupon: "Temu Ticket",
        newbie: "Newbie mystery bonus",
        newbieCoupon: "Bonus",
      },
    },

    referral: {
      tabs: ["Overview", "Rewards", "Income", "Records", "Invited list"],
      commission: "Bet commission",
      winnersTitle: "Who received rewards",
      received: "Received",
      rewardTitle: "Rewards received so far",
      claimed: "claimed",
      rewards: {
        invite: "Invitation reward",
        achieve: "Achievement reward",
        deposit: "Deposit rebate",
        bet: "Betting rebate",
      },
      stats: {
        today: "Today's income",
        yesterday: "Yesterday's income",
        members: "Referred members",
        qualified: "Qualified referrals",
      },
      agentLink: "Agent 4 Super Commission",
      shareTitle: "Share with friends",
      saveCode: "Save code",
    },

    rebate: {
      tabs: ["Manual Rebate", "Rebate History"],
      dateLabel: "Bet date:",
      totalLabel: "Total:",
      refresh: "Refresh",
      claim: "Claim",
    },

    inbox: {
      inbox: "Inbox",
      selectAll: "Select all",
      sortBy: "Sort by time",
    },
  },
};

export default memberDeskLocale;
