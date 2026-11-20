import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

/**
 * Development lokal HANYA boleh memakai `.env.local` (hasil `vercel env pull .env.local`).
 * File env lain ikut dimuat otomatis oleh Vite dan bisa diam-diam menimpa/mencampur nilai,
 * jadi di mode dev kita menolaknya supaya tidak ada kunci "nyasar" yang tersimpan di repo.
 */
function assertOnlyEnvLocal(root: string) {
  const forbidden = [".env", ".env.development", ".env.development.local", ".env.production", ".env.production.local"];
  const found = forbidden.filter((f) => fs.existsSync(path.resolve(root, f)));
  if (found.length > 0) {
    throw new Error(
      `File env tidak diizinkan untuk development lokal: ${found.join(", ")}. ` +
        "Pindahkan isinya ke .env.local (atau jalankan `vercel env pull .env.local`) lalu hapus file tersebut.",
    );
  }
  if (!fs.existsSync(path.resolve(root, ".env.local"))) {
    console.warn("[env] .env.local tidak ditemukan. Jalankan `vercel env pull .env.local` atau salin dari .env.example.");
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  if (command === "serve") assertOnlyEnvLocal(__dirname);
  return {
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
};
});
