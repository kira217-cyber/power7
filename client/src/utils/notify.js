import Swal from "sweetalert2";

/**
 * সাইটের সব বার্তা — SweetAlert2 দিয়ে।
 *
 *   notify.success / error / warning / info (লেখা, [বিস্তারিত])  → উপরে টোস্ট
 *   notify.pending(লেখা)  → ঘুরন্ত টোস্ট; ফেরত দেয় বন্ধ করার ফাংশন
 *   notify.confirm({...}) → মাঝখানে হ্যাঁ/না; Promise<boolean>
 *
 * রঙ POWER7 এর: কার্ড #181F2B, বোতাম বেগুনি (#BC43F4)। মাপ-ফন্ট
 * `index.css` এর `.tb-swal-*` ক্লাসে (ডেস্কটপ px, মোবাইল একটু বড়)।
 *
 * একসাথে একটাই টোস্ট থাকে — নতুনটা আগেরটার জায়গা নেয়, স্তূপ জমে না।
 */

const COLORS = {
  success: "#52c41a",
  error: "#f56c6c",
  warning: "#faad14",
  info: "#1678ff",
};

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: "#181f2b",
  color: "#fff",
  customClass: { popup: "tb-swal-toast", title: "tb-swal-toast-title" },
  didOpen: (el) => {
    // টোস্টের উপর মাউস রাখলে সময় থামে — লম্বা লেখা পড়ার সুযোগ
    el.addEventListener("mouseenter", Swal.stopTimer);
    el.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

/*
 * কোন টোস্টটা এখন পর্দায় — প্রতিটার নিজের নম্বর। SweetAlert2 একই popup
 * আবার ব্যবহার করে, তাই "এই popup টা কি আমার?" দেখে বোঝা যায় না;
 * নম্বর মিলিয়ে দেখা হয়, যাতে ঘুরন্ত টোস্ট বন্ধ করতে গিয়ে পরের
 * "সফল" টোস্টটা বন্ধ না হয়।
 */
let current = 0;

/** `notify.success(মূল লেখা, [নিচে ছোট করে বিস্তারিত])` */
const show = (icon) => (message, detail) => {
  if (!message) return;
  current += 1;
  Toast.fire({
    icon,
    iconColor: COLORS[icon],
    title: message,
    text: detail || undefined,
    // ভুলের লেখা পড়তে একটু বেশি সময়
    timer: icon === "error" || icon === "warning" ? 4000 : 3000,
  });
};

/** কাজ চলাকালীন — `const done = notify.pending("..."); ...; done()` */
const pending = (text) => {
  current += 1;
  const mine = current;
  Toast.fire({
    title: text,
    timer: undefined,
    timerProgressBar: false,
    didOpen: () => Swal.showLoading(),
  });
  // এর মধ্যে অন্য টোস্ট এসে গেলে সেটাকে বন্ধ করা নয়
  return () => {
    if (current === mine) Swal.close();
  };
};

/** হ্যাঁ/না — যেমন সাইন আউটের আগে */
const confirm = async ({ title, text, confirmText, cancelText, icon = "question" } = {}) => {
  current += 1;
  const result = await Swal.fire({
    icon,
    iconColor: icon === "warning" ? COLORS.warning : "#bc43f4",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    background: "#181f2b",
    color: "#fff",
    buttonsStyling: false,
    customClass: {
      popup: "tb-swal-popup",
      title: "tb-swal-title",
      htmlContainer: "tb-swal-text",
      actions: "tb-swal-actions",
      confirmButton: "tb-swal-btn tb-swal-btn-primary",
      cancelButton: "tb-swal-btn tb-swal-btn-ghost",
    },
  });
  return result.isConfirmed;
};

/** পাসওয়ার্ড চাওয়া (যেমন ওয়ালেট মোছার আগে লেনদেন পাসওয়ার্ড) — বাতিল করলে null */
const askPassword = async ({ title, placeholder, confirmText, cancelText } = {}) => {
  current += 1;
  const result = await Swal.fire({
    title,
    input: "password",
    inputPlaceholder: placeholder,
    inputAttributes: { autocomplete: "off", maxlength: "20" },
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    background: "#181f2b",
    color: "#fff",
    buttonsStyling: false,
    customClass: {
      popup: "tb-swal-popup",
      title: "tb-swal-title",
      input: "tb-swal-input",
      actions: "tb-swal-actions",
      confirmButton: "tb-swal-btn tb-swal-btn-primary",
      cancelButton: "tb-swal-btn tb-swal-btn-ghost",
    },
  });
  return result.isConfirmed ? String(result.value || "") : null;
};

export const notify = {
  success: show("success"),
  error: show("error"),
  warning: show("warning"),
  info: show("info"),
  pending,
  confirm,
  askPassword,
};

export default notify;
