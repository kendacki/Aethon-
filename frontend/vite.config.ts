import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const API_TARGET = process.env.VITE_DEV_API_TARGET ?? "http://localhost:3001";

export default defineConfig({
  plugins: [react()],
  envDir: ".",
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          ethers: ["ethers"],
          motion: ["framer-motion"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": { target: API_TARGET, changeOrigin: true },
      "/ws": { target: API_TARGET.replace(/^http/, "ws"), ws: true },
      "/docs": { target: API_TARGET, changeOrigin: true },
    },
  },
});
