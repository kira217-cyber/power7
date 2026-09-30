/**
 * POWER7 — ক্যাটাগরি ও ভেন্ডর
 *
 * scripts/build-data.mjs দিয়ে তৈরি, হাতে এডিট কোরো না।
 * server আসার আগ পর্যন্ত সব কনটেন্ট এখান থেকেই আসে।
 */

export const sections = [
  {
    "key": "hot",
    "title": "গরম খেলা",
    "titleIcon": "hot",
    "lane": null
  },
  {
    "key": "RNG",
    "title": "স্লট",
    "titleIcon": "rng",
    "lane": "RNG"
  },
  {
    "key": "FISH",
    "title": "ফিশিং",
    "titleIcon": "fish",
    "lane": "FISH"
  },
  {
    "key": "LIVE",
    "title": "লাইভ",
    "titleIcon": "live",
    "lane": "LIVE"
  },
  {
    "key": "PVP",
    "title": "পোকার",
    "titleIcon": "pvp",
    "lane": "PVP"
  },
  {
    "key": "CRASH",
    "title": "ক্র্যাশ গেমস",
    "titleIcon": "mxwin",
    "lane": null
  }
];

export const vendors = {
  "RNG": [
    {
      "code": "PG",
      "name": "PG",
      "icon": "/assets/vendors/rng_list_vendor/PG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-pg_1692249585882.webp"
    },
    {
      "code": "PP",
      "name": "PP",
      "icon": "/assets/vendors/rng_list_vendor/PP-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-pp_1624345226777.webp"
    },
    {
      "code": "FC",
      "name": "FC",
      "icon": "/assets/vendors/rng_list_vendor/FC-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-fc_1636702031006.webp"
    },
    {
      "code": "JL",
      "name": "JILI",
      "icon": "/assets/vendors/rng_list_vendor/JL-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-jl_1720148908774.webp"
    },
    {
      "code": "BTG",
      "name": "BTG",
      "icon": "/assets/vendors/rng_list_vendor/BTG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-BTG_1686905862316.webp"
    },
    {
      "code": "GM",
      "name": "GM",
      "icon": "/assets/vendors/rng_list_vendor/GM-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-gm_1698217023070.webp"
    },
    {
      "code": "MG",
      "name": "MG",
      "icon": "/assets/vendors/rng_list_vendor/MG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-mg_1681814645266.webp"
    },
    {
      "code": "MAS",
      "name": "MAS",
      "icon": "/assets/vendors/rng_list_vendor/MAS-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-mas_1689225937561.webp"
    },
    {
      "code": "RT",
      "name": "RT",
      "icon": "/assets/vendors/rng_list_vendor/RT-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-RT_1686905877695.webp"
    },
    {
      "code": "NE",
      "name": "NE",
      "icon": "/assets/vendors/rng_list_vendor/NE-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-ne_1683256388877.webp"
    },
    {
      "code": "BOM",
      "name": "BOM",
      "icon": "/assets/vendors/rng_list_vendor/BOM-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-bom_1623399401473.webp"
    },
    {
      "code": "SPB",
      "name": "Crash Games",
      "icon": "/assets/vendors/rng_list_vendor/SPB-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-spb_1692248623677.webp"
    },
    {
      "code": "AE",
      "name": "AE",
      "icon": "/assets/vendors/rng_list_vendor/AE-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-ae_1624345226409.webp"
    },
    {
      "code": "FP",
      "name": "FP",
      "icon": "/assets/vendors/rng_list_vendor/FP-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-fp_1683254132910.webp"
    },
    {
      "code": "SG",
      "name": "SG",
      "icon": "/assets/vendors/rng_list_vendor/SG-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-sg_1639707846241.webp"
    },
    {
      "code": "JDB",
      "name": "JDB",
      "icon": "/assets/vendors/rng_list_vendor/JDB-COLOR.png",
      "art": "/assets/misc/gcs__rng-jdb.webp"
    },
    {
      "code": "MA",
      "name": "MA",
      "icon": "/assets/vendors/rng_list_vendor/MA-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-ma_1719222796722.webp"
    },
    {
      "code": "BNG",
      "name": "BNG",
      "icon": "/assets/vendors/rng_list_vendor/BNG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-bng_1719217006309.webp"
    },
    {
      "code": "KA",
      "name": "KA",
      "icon": "/assets/vendors/rng_list_vendor/KA-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-ka_1679458169162.webp"
    },
    {
      "code": "AMBS",
      "name": "AMBS",
      "icon": "/assets/vendors/rng_list_vendor/AMBS-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-ambs_1692671995588.webp"
    },
    {
      "code": "RLX",
      "name": "RLX",
      "icon": "/assets/vendors/rng_list_vendor/RLX-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-rlx_1701943073518.webp"
    },
    {
      "code": "WD",
      "name": "WD",
      "icon": "/assets/vendors/rng_list_vendor/WD-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-wd_1624345226916.webp"
    },
    {
      "code": "GPI",
      "name": "GPI",
      "icon": "/assets/vendors/rng_list_vendor/GPI-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-gpi.webp"
    },
    {
      "code": "AUX",
      "name": "AUX",
      "icon": "/assets/vendors/rng_list_vendor/AUX-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-aux_1701164841576.webp"
    },
    {
      "code": "NLC",
      "name": "NLC",
      "icon": "/assets/vendors/rng_list_vendor/NLC-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-NLC_1683780848856.webp"
    },
    {
      "code": "FTG",
      "name": "FTG",
      "icon": "/assets/vendors/rng_list_vendor/FTG-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-ftg_1643333842676.webp"
    },
    {
      "code": "PS",
      "name": "PS",
      "icon": "/assets/vendors/rng_list_vendor/PS-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-ps_1678074361456.avif"
    },
    {
      "code": "YB",
      "name": "YB",
      "icon": "/assets/vendors/rng_list_vendor/YB-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-yb_1683254174546.webp"
    },
    {
      "code": "MAHA",
      "name": "MAHA",
      "icon": "/assets/vendors/rng_list_vendor/MAHA-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-maha_1723098291578.webp"
    },
    {
      "code": "AMG",
      "name": "AMG",
      "icon": "/assets/vendors/rng_list_vendor/AMG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-amg_1718793943609.webp"
    },
    {
      "code": "SS",
      "name": "SS",
      "icon": "/assets/vendors/rng_list_vendor/SS-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-ss_1709541978265.webp"
    },
    {
      "code": "JK",
      "name": "Joker",
      "icon": "/assets/vendors/rng_list_vendor/JK-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-jk_1720148942127.webp"
    },
    {
      "code": "PT",
      "name": "PT",
      "icon": "/assets/vendors/rng_list_vendor/PT-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-pt_1718358369020.webp"
    },
    {
      "code": "EP",
      "name": "EP",
      "icon": "/assets/vendors/rng_list_vendor/EP-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-ep_1726124031747.webp"
    },
    {
      "code": "KM",
      "name": "KingMidas",
      "icon": "/assets/vendors/rng_list_vendor/KM-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-km_1706608720510.webp"
    },
    {
      "code": "FS",
      "name": "FS",
      "icon": "/assets/vendors/rng_list_vendor/FS-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-fs_1709692303415.webp"
    },
    {
      "code": "AVT",
      "name": "Aviator",
      "icon": "/assets/vendors/rng_list_vendor/AVT-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-avt_1757988968541.webp"
    },
    {
      "code": "BT",
      "name": "BTGaming",
      "icon": "/assets/vendors/rng_list_vendor/BT-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-bt_1693463640033.webp"
    },
    {
      "code": "IO",
      "name": "InOut",
      "icon": "/assets/vendors/rng_list_vendor/IO-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-io_1762747500720.webp"
    },
    {
      "code": "RP",
      "name": "RP",
      "icon": "/assets/vendors/rng_list_vendor/RP-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-rp_1753242712510.webp"
    },
    {
      "code": "PAS",
      "name": "PAS",
      "icon": "/assets/vendors/rng_list_vendor/PAS-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-pas_1723104267178.webp"
    },
    {
      "code": "VA",
      "name": "VA",
      "icon": "/assets/vendors/rng_list_vendor/VA-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-va_1720411199626.webp"
    },
    {
      "code": "TPG",
      "name": "TPG",
      "icon": "/assets/vendors/rng_list_vendor/TPG-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__rng-tpg_1725263387166.webp"
    },
    {
      "code": "ID",
      "name": "ID",
      "icon": "/assets/vendors/rng_list_vendor/ID-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__rng-id_1758159202722.webp"
    }
  ],
  "FISH": [
    {
      "code": "JL",
      "name": "JILI",
      "icon": "/assets/vendors/fish_list_vendor/JL-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-jl_1636082951202.avif"
    },
    {
      "code": "AMBS",
      "name": "AMBS",
      "icon": "/assets/vendors/fish_list_vendor/AMBS-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-ambs_1692672029641.avif"
    },
    {
      "code": "KA",
      "name": "KA",
      "icon": "/assets/vendors/fish_list_vendor/KA-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-ka_1663915025018.avif"
    },
    {
      "code": "JDB",
      "name": "JDB",
      "icon": "/assets/vendors/fish_list_vendor/JDB-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-jdb.avif"
    },
    {
      "code": "FC",
      "name": "FC",
      "icon": "/assets/vendors/fish_list_vendor/FC-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-fc_1636701965759.avif"
    },
    {
      "code": "FTG",
      "name": "FTG",
      "icon": "/assets/vendors/fish_list_vendor/FTG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-ftg_1643333725888.avif"
    },
    {
      "code": "SG",
      "name": "SG",
      "icon": "/assets/vendors/fish_list_vendor/SG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-sg_1639707773466.avif"
    },
    {
      "code": "MG",
      "name": "MG",
      "icon": "/assets/vendors/fish_list_vendor/MG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-mg_1692245717584.avif"
    },
    {
      "code": "JK",
      "name": "Joker",
      "icon": "/assets/vendors/fish_list_vendor/JK-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-jk_1622191433452.avif"
    },
    {
      "code": "FS",
      "name": "FS",
      "icon": "/assets/vendors/fish_list_vendor/FS-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-fs_1709691886194.avif"
    },
    {
      "code": "BT",
      "name": "BTGaming",
      "icon": "/assets/vendors/fish_list_vendor/BT-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__fish-bt_1693903390254.avif"
    }
  ],
  "LIVE": [
    {
      "code": "EG4",
      "name": "EVO",
      "icon": "/assets/vendors/live_list_vendor/EG4-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__live-eg4_1683254015799.avif"
    },
    {
      "code": "PP",
      "name": "PP",
      "icon": "/assets/vendors/live_list_vendor/PP-COLOR.png",
      "art": "/assets/vendors/smallimage/gcs__live-pp_1624345189729.webp"
    },
    {
      "code": "SEX",
      "name": "SEXY CASINO",
      "icon": "/assets/vendors/live_list_vendor/SEX-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__live-sex.webp"
    },
    {
      "code": "MG",
      "name": "MG",
      "icon": "/assets/vendors/live_list_vendor/MG-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__live-mg_1683253736459.webp"
    },
    {
      "code": "PT",
      "name": "PT",
      "icon": "/assets/vendors/live_list_vendor/PT-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__live-pt_1718357678702.webp"
    },
    {
      "code": "GPI",
      "name": "GPI",
      "icon": "/assets/vendors/live_list_vendor/GPI-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__live-gpi.webp"
    },
    {
      "code": "EZ",
      "name": "EZ",
      "icon": "/assets/vendors/live_list_vendor/EZ-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__live-ez_1683253698803.webp"
    }
  ],
  "PVP": [
    {
      "code": "JL",
      "name": "JILI",
      "icon": "/assets/vendors/pvp_list_vendor/JL-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__pvp-jl_1720148948077.avif"
    },
    {
      "code": "KP",
      "name": "KP",
      "icon": "/assets/vendors/pvp_list_vendor/KP-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__pvp-kp.avif"
    },
    {
      "code": "KM",
      "name": "KingMidas",
      "icon": "/assets/vendors/pvp_list_vendor/KM-COLOR.png",
      "art": "/assets/vendors/bigimage/gcs__pvp-km_1706608967801.avif"
    }
  ],
  "SPORTS": [
    {
      "code": "BTI",
      "name": "BTi",
      "icon": "/assets/vendors/bigimage/gcs__SPORTS-BTI_1739948616233.webp",
      "art": "/assets/vendors/bigimage/gcs__SPORTS-BTI_1739948616233.webp"
    }
  ]
};
