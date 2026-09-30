/**
 * সাইটের রঙের তালিকা — কোন সাইটে কোন পাতা, প্রতি পাতায় কোন রঙ বদলানো যায়।
 *
 * এক জায়গাতেই সব: admin এর থিম স্টুডিও এটা পড়ে ঘর বানায়, server এটা দিয়েই
 * যাচাই করে (তালিকার বাইরের নাম বা ভুল রঙ বাদ), আর সাইট প্রতিটা `key` কে
 * CSS ভ্যারিয়েবল `--key` হিসেবে পায়। নতুন রঙ যোগ করতে এখানে একটা সারি আর
 * কম্পোনেন্টে `var(--key, ডিফল্ট)` — admin পাতা নিজে থেকেই দেখায়।
 *
 * `default` = এখনকার রঙ (মূল সাইট থেকে মাপা) — admin কিছু না বদলালে সাইট
 * হুবহু আগের মতো। প্রতি পাতার নাম আলাদা (`home-…`, `promo-…`), তাই এক পাতা
 * বদলালে অন্য পাতায় লাগে না; শুধু "base" সব পাতার মূল রঙ।
 *
 * `preview` — admin এর লাইভ প্রিভিউ কোন ঠিকানা খুলবে (`mobilePath` = মোবাইলে অন্য ঠিকানা); `open` দিলে ডেস্কটপে
 * সেই মডালও খুলে দেয় (লগইন, সদস্য কেন্দ্র)। `auth: true` = লগইন করা
 * অবস্থায় দেখা যায় এমন পাতা।
 */

const t = (key, label, def) => ({ key, label, default: def });

export const THEME_REGISTRY = {
  client: {
    label: "Client site",
    pages: [
      {
        key: "base",
        label: "Base colours (every page)",
        hint: "Header, sidebar, bottom bar and the colours every page falls back to.",
        preview: { path: "/" },
        groups: [
          {
            label: "Backgrounds",
            tokens: [
              t("bg", "Page & sidebar background", "#010928"),
              t("header-bg", "Header", "#0f0238"),
              t("surface", "Cards, notice bar, footer", "#241a3e"),
            ],
          },
          {
            label: "Brand",
            tokens: [
              t("accent", "Accent (menu, borders, login button)", "#ad00ff"),
              t("accent-bright", "Accent bright (badges, buttons)", "#bc43f4"),
              t("gold", "Gold (button text, highlights)", "#fbd029"),
            ],
          },
          {
            label: "Text",
            tokens: [
              t("text", "Main text", "#ffffff"),
              t("text-muted", "Muted text (sidebar group titles)", "#97a5c9"),
              t("text-dim", "Dim text (vendor chips)", "#98a0ac"),
            ],
          },
          {
            label: "Bottom bar (mobile)",
            tokens: [
              t("bnav-share", "Middle button", "#bc43f4"),
              t("bnav-text", "Labels", "#ffffff"),
            ],
          },
        ],
      },
      {
        key: "home",
        label: "Home",
        preview: { path: "/" },
        groups: [
          {
            label: "Banner & notice",
            tokens: [
              t("home-banner-dot", "Banner active dot (desktop)", "#da394f"),
              t("home-notice-bg", "Notice bar background", "#241a3e"),
              t("home-notice-icon", "Notice bar icon", "#bc43f4"),
              t("home-notice-text", "Notice bar text", "#ffffff"),
            ],
          },
          {
            label: "Categories",
            tokens: [
              t("home-cat-active", "Active category line", "#bc43f4"),
              t("home-cat-text", "Category text", "#ffffff"),
            ],
          },
          {
            label: "Games",
            tokens: [
              t("home-title", "Section title", "#ffffff"),
              t("home-card-name", "Game name (mobile)", "#ffffff"),
              t("home-badge", "Vendor badge", "#bc43f4"),
              t("home-hot", "Hot tag", "#fbd029"),
              t("home-hot-text", "Hot tag text", "#7c2d12"),
              t("home-play", "Play button (hover)", "#da394f"),
              t("home-trial", "Trial button (hover)", "#1678ff"),
            ],
          },
        ],
      },
      {
        key: "promo",
        label: "Promotions",
        preview: { path: "/promotions" },
        groups: [
          {
            label: "Promotions page",
            tokens: [
              t("promo-tab-active", "Active tab", "#f3e6cd"),
              t("promo-tab-active-text", "Active tab text", "#1d212d"),
              t("promo-btn-bg", "Button", "#c0392f"),
              t("promo-muted", "Empty text", "#8c8fa3"),
            ],
          },
          {
            label: "Promotion details",
            tokens: [
              t("promo-modal-bg", "Details popup (desktop)", "#12112b"),
              t("promo-card-bg", "Details box (mobile)", "#1b1a3d"),
              t("promo-text", "Details text", "#dcdcea"),
            ],
          },
        ],
      },
      {
        key: "games",
        label: "Game center",
        preview: { path: "/games/slots" },
        groups: [
          {
            label: "Game center",
            tokens: [
              t("games-panel-bg", "Panel background (mobile)", "#181f2b"),
              t("games-tab-bg", "Tabs & search box", "#222a38"),
              t("games-tab-text", "Tab text", "#5c677a"),
              t("games-active", "Active tab", "#da394f"),
              t("games-text", "Text", "#ffffff"),
            ],
          },
        ],
      },
      {
        key: "auth",
        label: "Login & register",
        preview: { path: "/", mobilePath: "/login", open: "auth:login" },
        groups: [
          {
            label: "Form",
            tokens: [
              t("auth-submit", "Submit button", "#bc43f4"),
              t("auth-field", "Input background (mobile)", "#010e22"),
              t("auth-line", "Input border & labels (mobile)", "#d6e2f4"),
              t("auth-link", "Links (mobile)", "#7bc242"),
              t("auth-alt", "Forgot password (mobile)", "#ff6db3"),
            ],
          },
          {
            label: "Desktop popup",
            tokens: [
              t("auth-modal-bg", "Popup background", "#181f2b"),
              t("auth-modal-panel", "Inputs", "#212937"),
              t("auth-modal-text", "Text", "#ffffff"),
            ],
          },
        ],
      },
      {
        key: "member",
        label: "Member area",
        hint: "Deposit, withdraw, records, account — desktop popup and mobile pages.",
        preview: { path: "/", mobilePath: "/member/deposit", open: "member:deposit", auth: true },
        groups: [
          {
            label: "Accent",
            tokens: [
              t("member-accent", "Accent (buttons, active tab, amounts)", "#ec2529"),
              t("member-link", "Blue chips & links", "#1e9bf0"),
              t("member-success", "Success / win", "#16a34a"),
            ],
          },
          {
            label: "Surfaces",
            tokens: [
              t("member-header-bg", "Mobile page header", "#180836"),
              t("member-page-bg", "Page background", "#f5f5f9"),
              t("member-surface", "Cards & panels", "#ffffff"),
              t("member-line", "Borders", "#eeeeee"),
            ],
          },
          {
            label: "Text",
            tokens: [
              t("member-title", "Titles", "#333333"),
              t("member-text", "Body text", "#666666"),
              t("member-muted", "Hints", "#999999"),
            ],
          },
          {
            label: "Desktop popup menu",
            tokens: [
              t("member-nav-bg", "Menu background", "#2b3248"),
              t("member-nav-active", "Active / hover item", "#da394f"),
              t("member-nav-text", "Menu text", "#ffffff"),
            ],
          },
        ],
      },
      {
        key: "popup",
        label: "Notice popup",
        preview: { path: "/", open: "notice" },
        groups: [
          {
            label: "Notice popup (desktop)",
            tokens: [
              t("popup-bg", "Background", "#1b2132"),
              t("popup-list-bg", "List background", "#21233a"),
              t("popup-title", "Title / active item", "#f5df4b"),
              t("popup-text", "List text", "#a6a6a6"),
            ],
          },
        ],
      },
      {
        key: "footer",
        label: "Footer",
        preview: { path: "/", scroll: "bottom" },
        groups: [
          {
            label: "Footer",
            tokens: [
              t("footer-bg", "Background", "#241a3e"),
              t("footer-heading", "Headings", "#ffffff"),
              t("footer-line", "Heading underline", "#fbd029"),
              t("footer-text", "About text & help links", "#d9d9d9"),
              t("footer-link", "Game list text", "#ffffff"),
              t("footer-bullet", "Game list dots", "#ffffff"),
              t("footer-copy", "Copyright", "#98a0ac"),
            ],
          },
        ],
      },
    ],
  },

  affiliate: {
    label: "Affiliate site",
    pages: [
      {
        key: "site",
        label: "Base colours (every page)",
        hint: "Landing page, header, footer and the colours the panel falls back to.",
        preview: { path: "/" },
        groups: [
          {
            label: "Backgrounds",
            tokens: [
              t("neutral1000", "Page background", "#010928"),
              t("neutral900", "Cards / surface", "#241a3e"),
              t("neutral800", "Inner boxes & inputs", "#2e2250"),
              t("header-bg", "Header", "#0f0238"),
            ],
          },
          {
            label: "Brand",
            tokens: [
              t("accent", "Accent (purple)", "#ad00ff"),
              t("accent-bright", "Accent bright", "#bc43f4"),
              t("primary500", "Gold highlight", "#fbd029"),
            ],
          },
          {
            label: "Text",
            tokens: [
              t("neutral200", "Main text", "#eaeaf4"),
              t("neutral300", "Secondary text", "#c7cbe0"),
              t("neutral400", "Muted text", "#97a5c9"),
            ],
          },
        ],
      },
      {
        key: "auth",
        label: "Login & register",
        preview: { path: "/login" },
        groups: [
          {
            label: "Form",
            tokens: [
              t("aff-auth-card", "Card background", "#241a3e"),
              t("aff-auth-field", "Input background", "#010e22"),
              t("aff-auth-line", "Input border & label", "#d6e2f4"),
              t("aff-auth-submit", "Submit button", "#bc43f4"),
              t("aff-auth-link", "Links", "#7bc242"),
            ],
          },
        ],
      },
      {
        key: "panel",
        label: "Panel layout",
        hint: "Sidebar, header and background after login.",
        preview: { path: "/dashboard", auth: true },
        groups: [
          {
            label: "Panel",
            tokens: [
              t("aff-panel-bg", "Page background", "#241a3e"),
              t("aff-panel-sidebar", "Sidebar", "#241a3e"),
              t("aff-panel-header", "Header", "#241a3e"),
              t("aff-panel-card", "Cards", "#241a3e"),
            ],
          },
        ],
      },
      ...[
        ["dashboard", "Dashboard", "/dashboard", "#fbd029", "#241a3e", "Banner background"],
        ["users", "My players", "/dashboard/my-users", "#22d3ee", "#241a3e", "Banner background"],
        ["commission", "Commission", "/dashboard/commission", "#a78bfa", "#241a3e", "Banner background"],
        ["withdraw", "Withdraw", "/dashboard/withdraw", "#fbbf24", "#1a0f3d", "Balance card background"],
        ["history", "Withdraw history", "/dashboard/withdraw-history", "#60a5fa", "#241a3e", "Banner background"],
        ["verify", "Verification", "/dashboard/verification", "#34d399", "#241a3e", "Banner background"],
        ["profile", "Profile", "/dashboard/profile", "#f472b6", "#1b0d3f", "Cover background"],
      ].map(([key, label, path, tone, hero, heroLabel]) => ({
        key: `p-${key}`,
        label,
        preview: { path, auth: true },
        groups: [
          {
            label: "Page colour",
            tokens: [
              t(`aff-${key}-tone`, "Page colour (banner, badges, buttons)", tone),
              t(`aff-${key}-hero`, heroLabel, hero),
            ],
          },
          ...(key === "commission"
            ? [
                {
                  label: "Commission parts (also on the dashboard)",
                  tokens: [
                    t("aff-part-refer", "Refer", "#22d3ee"),
                    t("aff-part-deposit", "Deposit", "#fbd029"),
                    t("aff-part-loss", "Player loses", "#34d399"),
                    t("aff-part-win", "Player wins", "#ff777c"),
                  ],
                },
              ]
            : []),
        ],
      })),
    ],
  },
};

export const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** এক সাইটের সব রঙের নাম → পাতা */
export const tokenIndex = (site) => {
  const index = new Map();
  (THEME_REGISTRY[site]?.pages || []).forEach((page) =>
    page.groups.forEach((group) => group.tokens.forEach((token) => index.set(token.key, page.key))),
  );
  return index;
};

/** একটা পাতার বৈধ রঙগুলোই রাখা */
export const cleanColors = (site, pageKey, input = {}) => {
  const page = (THEME_REGISTRY[site]?.pages || []).find((p) => p.key === pageKey);
  if (!page) return null;
  const allowed = new Set(page.groups.flatMap((g) => g.tokens.map((tk) => tk.key)));
  const out = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    const v = String(value ?? "").trim();
    if (allowed.has(key) && HEX.test(v)) out[key] = v.toLowerCase();
  });
  return out;
};
