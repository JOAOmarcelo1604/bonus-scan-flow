import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/auth": {
        target: "http://192.168.254.210:8080",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8088",
        changeOrigin: true,
      },
      "/etiqueta-lida": {
        target: "http://localhost:8088",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
