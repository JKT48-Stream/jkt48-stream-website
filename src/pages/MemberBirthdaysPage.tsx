import { BirthdayHero } from "@/components/birthday/BirthdayHero";
import { BirthdayMemberTabs } from "@/components/birthday/BirthdayMemberTabs";

/**
 * Tab baru: Member Birthdays Counter.
 *
 * Konten halaman ini diadaptasi 1:1 dari proyek terpisah "jkt48-birthdays"
 * (Hero + daftar/tab member dengan hitung mundur ulang tahun), tetapi TANPA
 * header & footer bawaan proyek tersebut — karena jkt48-stream sudah punya
 * Navbar & Sidebar sendiri lewat AppLayout (lihat src/App.tsx & AppLayout.tsx).
 *
 * Tema light/dark tetap mengikuti ThemeContext milik jkt48-stream karena
 * semua warna di sini memakai token CSS (hsl(var(--...))) yang sama dengan
 * sisa aplikasi — lihat penambahan token di src/index.css & tailwind.config.ts.
 */
export default function MemberBirthdaysPage() {
  return (
    <div className="bg-background text-foreground">
      <BirthdayHero />
      <BirthdayMemberTabs />
    </div>
  );
}