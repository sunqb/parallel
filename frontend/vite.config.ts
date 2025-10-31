import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/hls": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/hls": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
});
