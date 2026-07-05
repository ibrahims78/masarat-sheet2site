import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Build explicit allowedHosts list: Replit preview domain + localhost variants.
// Never use `true` (allow-all) on an internet-reachable dev host — it opens
// DNS-rebinding attacks.
const allowedHosts: string[] = ["localhost", "127.0.0.1"];
if (process.env.REPLIT_DEV_DOMAIN) allowedHosts.push(process.env.REPLIT_DEV_DOMAIN);
if (process.env.REPLIT_DOMAINS) {
  process.env.REPLIT_DOMAINS.split(",").forEach((d) => allowedHosts.push(d.trim()));
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  root: "./client",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts,
    headers: {
      "X-Frame-Options": "ALLOWALL",
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
