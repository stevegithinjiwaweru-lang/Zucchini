import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": "/src",
    },
  },

  server: {
    port: 5173,
    open: false,

    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        // IMPORTANT: do NOT rewrite the path
      },

      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
      },

      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});