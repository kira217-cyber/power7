import React, { useEffect, useState } from "react";

import { rasterIcons } from "../../data/rasterIcons";

/**
 * মূল সাইটের সব আইকন একটা SVG স্প্রাইটে (`<symbol id="icon-deposit">` …)।
 * স্প্রাইটটা `public/assets/icons/sprite.svg` এ আছে — লাইভ সাইটের রেন্ডার
 * করা DOM থেকে `scripts/extract-sprite.mjs` দিয়ে তোলা।
 *
 * মূল সাইট এটা JS দিয়ে DOM এ ঢোকায়; আমরাও একবার fetch করে `<body>` এর
 * শুরুতে বসিয়ে দিই, তাহলে `<use href="#icon-...">` কাজ করে।
 */

let spritePromise = null;

const loadSprite = () => {
  if (spritePromise) return spritePromise;

  spritePromise = fetch("/assets/icons/sprite.svg")
    .then((res) => res.text())
    .then((text) => {
      if (document.getElementById("power7-sprite")) return;

      const holder = document.createElement("div");
      holder.id = "power7-sprite";
      holder.style.display = "none";
      holder.innerHTML = text;
      document.body.insertBefore(holder, document.body.firstChild);
    })
    .catch(() => {
      // স্প্রাইট না এলে সাইট চলবে, শুধু আইকন ফাঁকা থাকবে
    });

  return spritePromise;
};

export const SpriteLoader = () => {
  useEffect(() => {
    loadSprite();
  }, []);

  return null;
};

/**
 * `<Icon name="deposit" size={40} />` → `#icon-deposit`
 *
 * মূল সাইটের কিছু আইকন ভেক্টর নয় — symbol এর ভিতরে `<pattern>` দিয়ে
 * বসানো base64 PNG। Chrome ওগুলো `<use>` এর ভিতরে আঁকে না (ফাঁকা দেখায়),
 * তাই সেগুলো আলাদা PNG করে `<img>` দিয়ে দেখাই। তালিকাটা
 * `scripts/extract-sprite.mjs` বানায়।
 */
const Icon = ({ name, size = 24, className = "", style }) => {
  const [, setReady] = useState(false);

  const rasterSrc = rasterIcons[name];

  // স্প্রাইট আসার পর একবার রি-রেন্ডার করাই, নইলে প্রথম পেইন্টে ফাঁকা থাকে
  useEffect(() => {
    let alive = true;
    loadSprite().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  if (rasterSrc) {
    return (
      <img
        src={rasterSrc}
        alt=""
        aria-hidden="true"
        className={className}
        style={{ width: size, height: size, objectFit: "contain", ...style }}
      />
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, ...style }}
    >
      <use href={`#icon-${name}`} />
    </svg>
  );
};

export default Icon;
