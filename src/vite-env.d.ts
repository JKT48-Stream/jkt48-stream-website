/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** https://<project-ref>.supabase.co  (diisi dari Vercel) */
  readonly VITE_SUPABASE_URL: string;
  /** Publishable / anon key Supabase, aman di browser (diisi dari Vercel) */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
