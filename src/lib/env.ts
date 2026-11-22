const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const missing = [
  !rawUrl && "VITE_SUPABASE_URL",
  !rawKey && "VITE_SUPABASE_PUBLISHABLE_KEY",
].filter(Boolean);

if (missing.length > 0) {
  throw new Error(
    `Environment variable belum di-set: ${missing.join(", ")}. ` +
      "Tambahkan di Vercel (Project > Settings > Environment Variables) lalu redeploy, " +
      "atau jalankan `vercel env pull .env.local` untuk development lokal.",
  );
}

export const SUPABASE_URL = (rawUrl as string).replace(/\/+$/, "");
export const SUPABASE_PUBLISHABLE_KEY = rawKey as string;
