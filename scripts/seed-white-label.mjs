/**
 * Seeds White-label's TB catalog with what the live power7.live shows today:
 * categories (with their desktop/mobile/title icons), providers per category
 * (with the site's wide logos) and the site's games matched to Oracle by their
 * English name — carrying the Bangla name along. HOT games follow the site's
 * hot list order.
 *
 * Everything goes through the White-label admin API, so it is safe to run
 * again: existing categories/providers/games are skipped, not duplicated.
 *
 *   WL_API=http://localhost:5005 WL_TOKEN=<master admin JWT> node scripts/seed-white-label.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ASSETS = path.join(ROOT, "client/public/assets");
const API = `${process.env.WL_API || "http://localhost:5005"}/api/master`;
const TOKEN = process.env.WL_TOKEN;

if (!TOKEN) {
  console.error("WL_TOKEN (master admin JWT) is required.");
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/catalog.json"), "utf8"));
const vendorIcons = Object.fromEntries(
  Object.entries(catalog.lanes).map(([lane, cards]) => [lane, cards.map((c) => c.vassalage)]),
);

/* ------------------------------------------------------------------
   Categories, in the order the site needs them. `lane` is the main
   site's gameType; `crash` collects the Crash-classified games.
------------------------------------------------------------------ */
const CATEGORIES = [
  { key: "hot", bn: "গরম খেলা", en: "Hot Games", type: "hot", desk: "icons/menu/hot", mob: "icons/menu/hot", title: "icons/title/hot", desktop: false, mobile: false, home: true },
  { key: "favorite", bn: "আমার প্রিয়", en: "Favorites", type: "favorite", desk: "icons/menu/fav", mob: "mobile/cat/fav", title: "icons/title/fav", desktop: true, mobile: true, home: false },
  { key: "jili", bn: "JILI", en: "JILI", type: "provider", providerCode: "JL", desk: "", mob: "mobile/cat/jl", title: "", desktop: false, mobile: true, home: false, homeMobile: true },
  { key: "slot", bn: "স্লট", en: "Slots", type: "games", lane: "RNG", desk: "icons/menu/rng", mob: "mobile/cat/rng", title: "icons/title/rng", desktop: true, mobile: true, home: true },
  { key: "fishing", bn: "ফিশিং", en: "Fish", type: "games", lane: "FISH", desk: "icons/menu/fish", mob: "mobile/cat/fish", title: "icons/title/fish", desktop: false, mobile: true, home: true },
  { key: "live", bn: "লাইভ", en: "Live", type: "games", lane: "LIVE", desk: "icons/menu/live", mob: "mobile/cat/live", title: "icons/title/live", desktop: true, mobile: true, home: true },
  { key: "crash", bn: "ক্র্যাশ গেমস", en: "Crash Games", type: "games", lane: "CRASH", desk: "icons/menu/mxwin", mob: "mobile/cat/mxwin", title: "icons/title/mxwin", desktop: true, mobile: true, home: true, showProviders: false },
  { key: "poker", bn: "পোকার", en: "Poker", type: "games", lane: "PVP", desk: "icons/menu/pvp", mob: "mobile/cat/pvp", title: "icons/title/pvp", desktop: true, mobile: true, home: true },
  { key: "sports", bn: "স্পোর্টস", en: "Sports", type: "sports", lane: "SPORTS", desk: "icons/menu/sports", mob: "mobile/cat/sports", title: "icons/title/sports", desktop: true, mobile: true, home: false, homeMobile: true, showProviders: false },
];

// Desktop tab icon sizes on the main site (`.menu-icon` background-size).
const DESK_ICON_SIZE = {
  hot: [57, 65], favorite: [52, 44], slot: [61, 41], fishing: [60, 60],
  live: [60, 60], poker: [60, 60], crash: [47, 49], sports: [60, 60],
};

// Desktop tab bar AND desktop home sections (mobile uses the CATEGORIES order)
const DESK_ORDER = ["hot", "favorite", "slot", "fishing", "live", "poker", "sports", "crash", "jili"];

/* Main-site vendor code → Oracle code candidates. The seed picks, per
   category, the candidate whose games match the most English names. */
const ORACLE = {
  PG: ["PG"], PP: ["PP", "PPLIVE"], FC: ["FACHAI"], JL: ["JL"], MG: ["MG"],
  RT: ["EVOREDTIGERROW", "RTASIA"], NE: ["EVOENTNETROW", "NETENTASIA"], BOM: ["BOOMINGGAMES"],
  SPB: ["SPRIBE"], JDB: ["JDB"], BNG: ["BNG"], KA: ["KA"], NLC: ["NLCASIA"], YB: ["YELLOWBAT"],
  SS: ["SMARTSOFT"], PT: ["PLAYTECHEU", "PTASIA"], EP: ["EVOPLAYEU"], KM: ["KM"], FS: ["FASTSPIN"],
  AVT: ["AVIATOR"], IO: ["INOUT"], VA: ["VA"], ID: ["IDEAL"], EG4: ["EVOLIVEROW"], EZ: ["EZUGI"],
  BTI: ["BTI"],
};

// Single-game providers whose one game has a different name on Oracle.
const TAKE_ALL = new Set(["BTI", "AVIATOR"]);

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const hasBangla = (s) => /[ঀ-৿]/.test(s || "");

/* ---------------------------- http ---------------------------- */

const call = async (method, url, body) => {
  const isForm = body instanceof FormData;
  const res = await fetch(API + url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(`${method} ${url} → ${res.status} ${data.message || ""}`);
  }
  return data.data;
};

const fileBlob = (rel) => {
  const full = path.join(ASSETS, `${rel}.png`);
  if (!rel || !fs.existsSync(full)) return null;
  return new Blob([fs.readFileSync(full)], { type: "image/png" });
};

const oracleCache = new Map();
const oracleGames = async (providerDbId) => {
  if (!oracleCache.has(providerDbId)) {
    const data = await call("GET", `/tb-games/oracle/${providerDbId}`);
    oracleCache.set(providerDbId, data.games || []);
  }
  return oracleCache.get(providerDbId);
};

/* ---------------------------- data ---------------------------- */

// The site's games of one category, grouped by main-site vendor code.
const siteGames = (lane) => {
  const games =
    lane === "CRASH"
      ? catalog.games.filter(
          (g) => g._classify === "Crash" || g.vassalage === "SPB" || g.vassalage === "AVT",
        )
      : catalog.games.filter((g) => g._gameType === lane && g._classify !== "Crash");

  const byVendor = new Map();
  games.forEach((g) => {
    if (!byVendor.has(g.vassalage)) byVendor.set(g.vassalage, []);
    byVendor.get(g.vassalage).push(g);
  });
  return byVendor;
};

// Vendor order: the site's lane order, crash keeps JL first.
const vendorOrder = (lane, byVendor) => {
  if (lane === "CRASH") return ["JL", "SPB", "AVT"].filter((v) => byVendor.has(v));
  return (vendorIcons[lane] || []).filter((v) => byVendor.has(v));
};

const logoFile = (lane, code) => {
  const laneDir = lane === "CRASH" ? "rng" : lane.toLowerCase();
  for (const variant of ["COLOR", "GRAY"]) {
    const rel = `vendors/${laneDir}_list_vendor/${code}-${variant}`;
    if (fs.existsSync(path.join(ASSETS, `${rel}.png`))) return rel;
  }
  return "";
};

const siteVendorName = (code) => {
  for (const cards of Object.values(catalog.lanes)) {
    const card = cards.find((c) => c.vassalage === code);
    if (card) return card.displayName;
  }
  return code === "AVT" ? "Aviator" : code === "SPB" ? "Crash Games" : code;
};

/* ---------------------------- steps ---------------------------- */

const ensureCategories = async () => {
  const existing = await call("GET", "/tb-game-categories");
  const byKey = new Map(existing.map((c) => [c.key, c]));

  const iconFields = (cat) => [["deskIcon", cat.desk], ["mobIcon", cat.mob], ["titleIcon", cat.title]];

  for (const cat of CATEGORIES) {
    const found = byKey.get(cat.key);

    // Already there: only fill in icons it is missing.
    if (found) {
      const fd = new FormData();
      let missing = 0;
      iconFields(cat).forEach(([field, rel]) => {
        const blob = !found[field] && fileBlob(rel);
        if (blob) {
          fd.append(field, blob, `${field}.png`);
          missing += 1;
        }
      });
      if (missing) await call("PUT", `/tb-game-categories/${found._id}`, fd);
      console.log(`  = category ${cat.key}${missing ? ` (+${missing} icons)` : ""}`);
      continue;
    }

    const fd = new FormData();
    fd.append("nameBn", cat.bn);
    fd.append("nameEn", cat.en);
    fd.append("key", cat.key);
    fd.append("type", cat.type);
    if (cat.providerCode) fd.append("providerCode", cat.providerCode);
    fd.append("showOnDesktop", String(cat.desktop));
    fd.append("showOnMobile", String(cat.mobile));
    fd.append("showOnHome", String(cat.home));
    fd.append("showOnHomeMobile", String(cat.homeMobile ?? cat.home));
    fd.append("showProviders", String(cat.showProviders !== false));
    if (DESK_ICON_SIZE[cat.key]) {
      fd.append("deskIconW", String(DESK_ICON_SIZE[cat.key][0]));
      fd.append("deskIconH", String(DESK_ICON_SIZE[cat.key][1]));
    }

    iconFields(cat).forEach(([field, rel]) => {
      const blob = fileBlob(rel);
      if (blob) fd.append(field, blob, `${field}.png`);
    });

    const created = await call("POST", "/tb-game-categories", fd);
    byKey.set(cat.key, created);
    console.log(`  + category ${cat.key}`);
  }

  // Keep the site's order even if some already existed. The desktop tab
  // bar has its own order on the main site (…Poker, Sports, Crash Games).
  await call("PATCH", "/tb-game-categories/reorder", {
    ids: CATEGORIES.map((c) => byKey.get(c.key)?._id).filter(Boolean),
  });
  await call("PATCH", "/tb-game-categories/reorder", {
    field: "deskOrder",
    ids: DESK_ORDER.map((key) => byKey.get(key)?._id).filter(Boolean),
  });

  return byKey;
};

const pickOracleCode = async (categoryId, tcg, games, oracleProviders) => {
  const candidates = (ORACLE[tcg] || []).filter((code) =>
    oracleProviders.some((p) => p.providerCode === code),
  );
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  // Several candidates (e.g. PP slots vs PPLIVE): the one whose games match
  // most of this category's English names wins.
  let best = null;
  for (const code of candidates) {
    const names = await oracleNamesByCode(categoryId, code);
    const hit = games.filter((g) => names.has(norm(g.defaultLanguage))).length;
    if (!best || hit > best.hit) best = { code, hit };
  }
  return best.code;
};

// Oracle game names for a code, fetched through a provider row (created on
// demand in this category; unused candidates are removed again afterwards).
const scratchProviders = [];
const oracleNamesByCode = async (categoryId, code) => {
  const list = await call("GET", `/tb-game-providers?categoryId=${categoryId}`);
  let row = list.find((p) => p.providerCode === code);
  if (!row) {
    const created = await call("POST", "/tb-game-providers/bulk", {
      categoryId,
      providers: [{ providerCode: code, providerName: code, icon: "" }],
    });
    row = created.providers[0];
    scratchProviders.push(row._id);
  }
  const games = await oracleGames(row._id);
  return new Set(games.map((g) => norm(g.name)));
};

const seedCategory = async (cat, category, oracleProviders, report) => {
  const byVendor = siteGames(cat.lane);
  const order = vendorOrder(cat.lane, byVendor);
  const chosen = [];

  for (const tcg of order) {
    const code = await pickOracleCode(category._id, tcg, byVendor.get(tcg), oracleProviders);
    if (!code) {
      report.skippedVendors.push(`${cat.key}:${tcg}`);
      continue;
    }
    chosen.push({ tcg, code });
  }

  // Drop the throwaway rows used for scoring; the real ones are added below
  // with Oracle's name and icon.
  while (scratchProviders.length) {
    await call("DELETE", `/tb-game-providers/${scratchProviders.pop()}`);
  }

  // Add the chosen providers (skipped when already there), in site order.
  await call("POST", "/tb-game-providers/bulk", {
    categoryId: category._id,
    providers: chosen.map(({ code }) => {
      const p = oracleProviders.find((o) => o.providerCode === code);
      return { providerCode: code, providerName: p.providerName, icon: p.icon };
    }),
  });

  const rows = await call("GET", `/tb-game-providers?categoryId=${category._id}`);
  const rowByCode = new Map(rows.map((r) => [r.providerCode, r]));

  await call("PATCH", "/tb-game-providers/reorder", {
    categoryId: category._id,
    ids: chosen.map((c) => rowByCode.get(c.code)?._id).filter(Boolean),
  });

  for (const { tcg, code } of chosen) {
    const row = rowByCode.get(code);

    // Wide logo + the badge name the site shows.
    const fd = new FormData();
    fd.append("displayName", siteVendorName(tcg));
    if (!row.logoUrl) {
      const blob = fileBlob(logoFile(cat.lane, tcg));
      if (blob) fd.append("logo", blob, `${tcg}.png`);
    }
    await call("PUT", `/tb-game-providers/${row._id}`, fd);

    // Games: the site's own, matched by English name.
    const oracle = await oracleGames(row._id);
    const oracleByName = new Map(oracle.map((g) => [norm(g.name), g]));
    const mine = byVendor.get(tcg) || [];

    const matched = TAKE_ALL.has(code)
      ? oracle.map((o) => ({ o, site: mine[0] }))
      : mine
          .map((site) => ({ site, o: oracleByName.get(norm(site.defaultLanguage)) }))
          .filter((m) => m.o);

    // None of the site's games exist on Oracle — an empty chip helps no one.
    if (!matched.length) {
      if (!row.gameCount) await call("DELETE", `/tb-game-providers/${row._id}`);
      report.skippedVendors.push(`${cat.key}:${tcg} (0 games)`);
      continue;
    }

    if (matched.length) {
      await call("POST", "/tb-games/bulk", {
        providerDbId: row._id,
        gameUIds: matched.map((m) => m.o.gameUId),
      });
    }

    // Bangla names (only real Bangla, never for single-game shortcuts).
    const list = await call("GET", `/tb-games?providerDbId=${row._id}&limit=500`);
    const idByUid = new Map(list.games.map((g) => [g.gameUId, g._id]));
    const items = TAKE_ALL.has(code)
      ? []
      : matched
          .filter((m) => hasBangla(m.site.gameName))
          .map((m) => ({ id: idByUid.get(m.o.gameUId), nameBn: m.site.gameName }))
          .filter((i) => i.id);
    if (items.length) await call("PATCH", "/tb-games/bangla", { items });

    report.providers.push(
      `${cat.key.padEnd(8)} ${tcg.padEnd(5)}→ ${code.padEnd(15)} ${matched.length}/${mine.length} games, ${items.length} বাংলা`,
    );
  }
};

const seedHot = async (categories, report) => {
  const laneToKey = Object.fromEntries(CATEGORIES.filter((c) => c.lane).map((c) => [c.lane, c.key]));
  const gamesByCode = new Map(catalog.games.map((g) => [g.nodeTypeManageId, g]));
  const idsInOrder = [];

  const listCache = new Map();
  const listOf = async (categoryId) => {
    if (!listCache.has(categoryId)) {
      const data = await call("GET", `/tb-games?categoryId=${categoryId}&limit=500`);
      listCache.set(categoryId, data.games);
    }
    return listCache.get(categoryId);
  };

  for (const hot of catalog.hot) {
    const site = gamesByCode.get(hot.gameCode);
    const key = laneToKey[hot.gameType];
    if (!site || !key) continue;

    const games = await listOf(categories.get(key)._id);
    const hit = games.find((g) => norm(g.name) === norm(site.defaultLanguage));
    if (hit && !idsInOrder.includes(hit._id)) idsInOrder.push(hit._id);
  }

  if (idsInOrder.length) {
    await call("PATCH", "/tb-games/hot", { ids: idsInOrder, isHot: true });
    await call("PATCH", "/tb-games/hot/reorder", { ids: idsInOrder });
  }
  report.hot = `${idsInOrder.length}/${catalog.hot.length}`;
};

/* Games whose Oracle image is missing (Oracle answers 404 for all three
   sizes of some games) get the main site's own picture as custom image. */
const fixMissingImages = async (categories, report) => {
  const { gamesByType, hotGames } = await import("../client/src/data/gameListData.js");
  const localIcon = new Map();
  [...hotGames, ...Object.values(gamesByType).flat()].forEach((g) => localIcon.set(g.code, g.icon));

  const iconByName = new Map();
  catalog.games.forEach((g) => {
    const icon = localIcon.get(g.nodeTypeManageId);
    if (icon && !iconByName.has(norm(g.defaultLanguage))) iconByName.set(norm(g.defaultLanguage), icon);
  });

  const games = [];
  for (const category of categories.values()) {
    const data = await call("GET", `/tb-games?categoryId=${category._id}&limit=500`);
    games.push(...data.games.filter((g) => !g.customImageUrl));
  }

  const broken = [];
  for (let i = 0; i < games.length; i += 10) {
    const batch = games.slice(i, i + 10);
    const status = await Promise.all(
      batch.map((g) =>
        g.imageUrl
          ? fetch(g.imageUrl, { method: "HEAD" }).then((r) => r.ok).catch(() => false)
          : false,
      ),
    );
    batch.forEach((g, index) => !status[index] && broken.push(g));
  }

  let fixed = 0;
  for (const game of broken) {
    const icon = iconByName.get(norm(game.name));
    const full = icon && path.join(ROOT, "client/public", icon);
    if (!full || !fs.existsSync(full)) continue;

    const ext = path.extname(full).slice(1).toLowerCase();
    const fd = new FormData();
    fd.append("image", new Blob([fs.readFileSync(full)], { type: `image/${ext}` }), path.basename(full));
    await call("PUT", `/tb-games/${game._id}`, fd);
    fixed += 1;
  }

  report.images = `${broken.length} missing on Oracle, ${fixed} replaced with the site's image`;
};

/* Sports: the main site only has BTi, but Oracle has more sportsbooks.
   Each is one "game" (the book itself) without an image — the site shows
   the provider's logo for it. */
const SPORTS_EXTRA = ["SBO", "SABA", "CMD", "UG", "BETBY", "LUCKSPORT", "TF", "DP"];

const seedSportsExtra = async (categories, oracleProviders, report) => {
  const sports = categories.get("sports");
  if (!sports) return;

  const wanted = SPORTS_EXTRA.map((code) => oracleProviders.find((p) => p.providerCode === code)).filter(Boolean);
  await call("POST", "/tb-game-providers/bulk", {
    categoryId: sports._id,
    providers: wanted.map((p) => ({ providerCode: p.providerCode, providerName: p.providerName, icon: p.icon })),
  });

  const rows = await call("GET", `/tb-game-providers?categoryId=${sports._id}`);
  for (const row of rows) {
    const games = (await oracleGames(row._id)).filter((g) => /sport/i.test(g.category || ""));
    if (games.length) {
      await call("POST", "/tb-games/bulk", { providerDbId: row._id, gameUIds: games.map((g) => g.gameUId) });
    }
  }
  report.sports = rows.map((row) => row.providerCode).join(", ");
};

/* "আমার প্রিয়" — admin এর বাছাই করা গেম; খালি থাকলে প্রতিটা ক্যাটাগরির
   প্রথম কয়েকটা দিয়ে শুরু (পরে Favorite Games পেজ থেকে বদলানো যায়). */
const FAVORITE_START = { slot: 6, fishing: 3, live: 3, poker: 3, crash: 3 };

const seedFavorites = async (categories, report) => {
  const current = await call("GET", "/tb-games/list/favorite");
  if (current.length) {
    report.favorites = `${current.length} (already set)`;
    return;
  }
  const ids = [];
  for (const [key, count] of Object.entries(FAVORITE_START)) {
    const category = categories.get(key);
    if (!category) continue;
    const data = await call("GET", `/tb-games?categoryId=${category._id}&limit=${count}`);
    data.games.forEach((g) => !ids.includes(g._id) && ids.push(g._id));
  }
  if (ids.length) await call("PATCH", "/tb-games/list/favorite", { ids, on: true });
  report.favorites = String(ids.length);
};

/* ---------------------------- run ---------------------------- */

const report = { providers: [], skippedVendors: [], hot: "", images: "" };

console.log("Categories…");
const categories = await ensureCategories();

console.log("Oracle provider list…");
const oracleProviders = await call("GET", "/tb-game-providers/oracle/list");

for (const cat of CATEGORIES.filter((c) => c.lane)) {
  console.log(`Providers & games: ${cat.key}…`);
  await seedCategory(cat, categories.get(cat.key), oracleProviders, report);
}

console.log("Hot games…");
await seedHot(categories, report);

console.log("Favorites…");
await seedFavorites(categories, report);

console.log("Sports providers…");
await seedSportsExtra(categories, oracleProviders, report);

console.log("Missing images…");
await fixMissingImages(categories, report);

console.log("\n" + report.providers.join("\n"));
console.log(`\nNot on Oracle (skipped): ${report.skippedVendors.join(", ") || "—"}`);
console.log(`Hot: ${report.hot}`);
console.log(`Images: ${report.images}`);
console.log(`Sports: ${report.sports || "—"}`);
console.log(`Favorites: ${report.favorites || "—"}`);
