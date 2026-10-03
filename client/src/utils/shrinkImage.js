/**
 * ছবি পাঠানোর আগে ছোট করা — ফোনের ছবি ৩-১০ MB, nginx/server এর সীমায়
 * আটকে যেত। সবচেয়ে লম্বা দিক `max` px, JPEG `quality`। ছবিটা পড়া না গেলে
 * (যেমন কোনো ব্রাউজারে HEIC) বা ছোট করে লাভ না হলে আসল ফাইলটাই ফেরত।
 */
export const shrinkImage = async (file, { max = 1600, quality = 0.85 } = {}) => {
  if (!(file instanceof Blob) || !String(file.type || "").startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || (blob.size >= file.size && file.size < 1024 * 1024 && /^image\/(png|jpe?g|webp)$/.test(file.type))) return file;
    const name = `${String(file.name || "image").replace(/\.[^.]+$/, "")}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
};

export default shrinkImage;
