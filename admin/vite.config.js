import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// POWER7 এ নিজের subdomain এ (admin.power7.live) — তাই সবসময় root (/)
export default defineConfig(() => ({
  base: "/",
  plugins: [react(), tailwindcss()],
  server: { port: 5175, strictPort: true },
}));
