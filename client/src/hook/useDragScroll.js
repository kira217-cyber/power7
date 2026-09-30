import { useEffect, useState } from "react";

/**
 * সারিটা মাউস দিয়ে টেনে বাঁয়ে-ডানে সরানো যায় — মূল সাইটের প্রোভাইডার
 * সারি Swiper এর free-mode, তাই সেখানেও টেনে সরাতে হয়। স্ক্রলবার লুকানো
 * থাকে বলে মাউসের চাকাও পাশাপাশি সরায়।
 *
 * টেনে ছাড়ার পর যে চিপের উপর মাউস পড়ে, সেটার click বাতিল হয় — নইলে
 * সরাতে গিয়ে প্রোভাইডার বদলে যেত।
 */
const DRAG_START = 5;

// callback ref — সারিটা পরে (ডেটা এলে) তৈরি হলেও ধরা পড়ে
export const useDragScroll = () => {
  const [el, setEl] = useState(null);

  useEffect(() => {
    if (!el) return undefined;

    let startX = 0;
    let startLeft = 0;
    let down = false;
    let moved = false;

    const onDown = (e) => {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };

    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < DRAG_START) return;
      moved = true;
      el.style.cursor = "grabbing";
      el.scrollLeft = startLeft - dx;
      e.preventDefault();
    };

    const onUp = () => {
      down = false;
      el.style.cursor = "";
    };

    // টেনে ছাড়লে click বাতিল
    const onClick = (e) => {
      if (!moved) return;
      e.stopPropagation();
      e.preventDefault();
      moved = false;
    };

    // চাকা: উপর-নিচ ঘোরালেও সারি পাশাপাশি সরে (শেষে পৌঁছালে পাতা স্ক্রল হয়)
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const atStart = el.scrollLeft <= 0 && delta < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && delta > 0;
      if (atStart || atEnd) return;
      el.scrollLeft += delta;
      e.preventDefault();
    };

    const stopImgDrag = (e) => e.preventDefault();

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dragstart", stopImgDrag);

    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dragstart", stopImgDrag);
    };
  }, [el]);

  return setEl;
};

export default useDragScroll;
