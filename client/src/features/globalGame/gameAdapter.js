/**
 * server এর গেম ডেটা (White-label এর TB ক্যাটালগ) → হোমের কম্পোনেন্টগুলো
 * যে শেপ চেনে, সেই শেপ।
 *
 * কম্পোনেন্টগুলো আগে স্ট্যাটিক `data/` দিয়ে বানানো — তাই এখানে সেই
 * একই ফিল্ড নাম বানিয়ে দিই (`sections`, `vendors`, `gamesByType`), যাতে
 * ডিজাইনের কোনো কোড বদলাতে না হয়। বাড়তি যা API থেকে আসে (আইকনের URL,
 * দুই ভাষার নাম, মোট সংখ্যা) সেগুলো নতুন ফিল্ডে যায়।
 */

/** একটা গেম — কার্ড যা দেখায় */
export const adaptGame = (game) => ({
  id: game.id,
  gameUId: game.gameUId,
  // বাংলায় বাংলা নাম (না থাকলে ইংরেজি), ইংরেজিতে ইংরেজি — কার্ড `lang` দেখে বাছে
  name: game.nameBn || game.name,
  nameBn: game.nameBn || "",
  nameEn: game.name,
  vendor: game.providerCode,
  vendorName: game.providerName,
  icon: game.image,
  isHot: game.isHot,
  isLatest: game.isLatest,
});

const adaptVendor = (provider) => ({
  code: provider.code,
  name: provider.name,
  icon: provider.icon,
});

const adaptTab = (category) => ({
  key: category.key,
  type: category.type,
  name: category.name,
  deskIcon: category.deskIcon,
  deskIconSize: category.deskIconSize,
  mobIcon: category.mobIcon,
});

export const adaptGameData = (data) => {
  const categories = data?.categories || [];

  // হোমের সেকশন — ডেস্কটপ আর মোবাইলে আলাদা (মূল সাইটে মোবাইলে JILI আর
  // স্পোর্টস সেকশন আছে, ক্রমও আলাদা)। "আমার প্রিয়" হোমে সেকশন হয় না।
  const byDesk = (a, b) => (a.deskOrder || 999) - (b.deskOrder || 999);
  const usable = (c) => c.type !== "favorite" && c.total > 0;

  const toSection = (c) => ({
    key: c.key,
    type: c.type,
    name: c.name,
    title: c.name?.bn,
    titleIconUrl: c.titleIcon,
    // ভেন্ডর তালিকা সেকশনের নিজের key তে রাখা; "প্রোভাইডার দেখাও" বন্ধ
    // থাকলে (মূল সাইটের ক্র্যাশ গেমস) চিপ নেই, সব গেম একসাথে
    lane: c.type === "games" && c.showProviders !== false ? c.key : null,
    total: c.total,
  });

  const sections = categories.filter((c) => c.showOnHome && usable(c)).sort(byDesk).map(toSection);
  const mobileSections = categories
    .filter((c) => c.showOnHomeMobile !== false && usable(c))
    .map(toSection);

  const vendors = {};
  const gamesByType = {};
  const totals = {};

  categories.forEach((c) => {
    if (c.type === "games" || c.type === "sports") vendors[c.key] = (c.providers || []).map(adaptVendor);
    gamesByType[c.key] = (c.games || []).map(adaptGame);
    totals[c.key] = c.total || 0;
  });

  const hot = categories.find((c) => c.type === "hot");

  return {
    source: "api",
    // খেলার কেন্দ্রের জন্য পুরো তালিকা — দুই ডিজাইনের আইকন, প্রোভাইডার, মোট
    categories: categories.map((c) => ({
      ...adaptTab(c),
      showOnDesktop: c.showOnDesktop,
      showOnMobile: c.showOnMobile,
      showProviders: c.showProviders !== false,
      providerCode: c.providerCode,
      providers: (c.providers || []).map(adaptVendor),
      total: c.total || 0,
      // চিপ দেখানো হবে কিনা — ক্র্যাশের মতো মেশানো ক্যাটাগরিতে নয়
      lane: (c.type === "games" || c.type === "sports") && c.showProviders !== false ? c.key : null,
    })),
    sections,
    mobileSections,
    vendors,
    gamesByType,
    hotGames: hot ? gamesByType[hot.key] : [],
    totals,
    tabs: {
      // ডেস্কটপের ট্যাব বারের নিজের ক্রম (মূল সাইটে স্পোর্টস আগে, ক্র্যাশ শেষে)
      desktop: categories
        .filter((c) => c.showOnDesktop)
        .sort((a, b) => (a.deskOrder || 999) - (b.deskOrder || 999))
        .map(adaptTab),
      mobile: categories.filter((c) => c.showOnMobile).map(adaptTab),
    },
  };
};
