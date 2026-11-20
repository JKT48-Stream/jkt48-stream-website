/**
 * Satu-satunya tempat membaca konfigurasi Supabase dari environment.
 *
 * Nilainya diisi lewat Environment Variables di Vercel (Production / Preview / Development),
 * atau lewat `.env.local` untuk development lokal (`vercel env pull .env.local`).
 * Tidak ada nilai yang di-hardcode atau di-commit ke repository.
 *
 * PENTING: variabel ber-awalan `VITE_` di-inline ke bundle JavaScript saat build, jadi hanya
 * boleh berisi nilai PUBLIK: URL project dan publishable (anon) key. JANGAN PERNAH menaruh
 * service_role / secret key atau API key pihak ketiga (YouTube, JKT48Connect) di sini.
 */

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
