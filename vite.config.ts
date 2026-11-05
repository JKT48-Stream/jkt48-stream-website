import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Semua HP/browser yang relevan sudah mendukung ES2020 -> kode lebih kecil, tanpa polyfill berlebih.
    target: "es2020",
    cssTarget: "chrome87",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Pisahkan library besar yang jarang berubah. Dengan cache panjang, deploy berikutnya tidak
        // perlu mengunduh ulang React/Supabase/dll., hanya kode aplikasi yang berubah.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)) return "vendor-react";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "vendor-motion";
          if (id.includes("@radix-ui")) return "vendor-radix";
          return undefined;
        },
      },
    },
  },
}));
