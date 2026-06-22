# CLAUDE.md — Panduan Pengembangan untuk AI

Dokumen ini adalah referensi teknis bagi Claude (atau AI lain) yang membantu mengembangkan proyek **JKT48 Stream**. Baca seluruh dokumen ini sebelum membuat perubahan kode apapun.

---

## 🏗️ Gambaran Arsitektur

```
Browser (React SPA)
    │
    ├── React Router v6 — client-side routing
    ├── TanStack Query — data fetching & caching
    ├── ThemeContext — dark/light/system theme
    ├── PWAContext — install prompt PWA
    └── localStorage — semua persistensi pengguna
            │
            ▼
    Supabase Edge Functions (Deno)
    ├── /youtube         — proxy YouTube Data API v3
    ├── /check-idn-live  — cek & ambil stream IDN Live
    ├── /check-showroom-live — cek & ambil stream Showroom
    └── /get-idn-stream  — stream URL IDN untuk hls.js
            │
            ▼
    External APIs
    ├── YouTube Data API v3
    ├── IDN Live (JKT48Connect API + HTML scraping)
    └── Showroom Live API
```

---

## 📦 Perintah Penting

```bash
# Development
pnpm dev              # Jalankan dev server (port 5173)
pnpm build            # Build production
pnpm preview          # Preview build hasil

# Testing
pnpm test             # Jalankan test (Vitest, sekali jalan)
pnpm test:watch       # Jalankan test watch mode

# Linting
pnpm lint             # ESLint check

# Supabase
supabase functions deploy youtube
supabase functions deploy check-idn-live
supabase functions deploy check-showroom-live
supabase functions deploy get-idn-stream
```

---

## 🗂️ Konvensi & Pola Kode

### Import Path

Gunakan alias `@/` untuk semua import dari `src/`:

```typescript
import { fetchChannel } from "@/lib/youtube";
import { VideoCard } from "@/components/VideoCard";
import { MEMBERS } from "@/data/members";
```

Jangan gunakan path relatif seperti `../../lib/youtube`.

### Komponen React

- Semua komponen menggunakan **functional component** dengan TypeScript
- Gunakan **named export** untuk komponen kecil/utility, **default export** untuk halaman
- Props selalu didefinisikan sebagai interface TypeScript di atas komponen
- Gunakan `cn()` dari `@/lib/utils` untuk conditional class names (Tailwind)

```typescript
import { cn } from "@/lib/utils";

interface ButtonProps {
  active: boolean;
  children: React.ReactNode;
}

export function Button({ active, children }: ButtonProps) {
  return (
    <button className={cn("base-class", active && "active-class")}>
      {children}
    </button>
  );
}
```

### Styling

- **Tailwind CSS** untuk semua styling — tidak ada CSS inline kecuali untuk nilai dinamis (warna HSL, animasi kustom)
- Gunakan CSS variables yang sudah didefinisikan di `src/index.css` (`--header-h`, dll.)
- Komponen dari `src/components/ui/` adalah shadcn/ui — jangan dimodifikasi tanpa alasan kuat
- Animasi kompleks menggunakan **Framer Motion** (`motion.div`, `AnimatePresence`)
- Animasi sederhana menggunakan class Tailwind (`animate-fade-in-down`, `animate-scale-in`, dll. yang didefinisikan di `index.css`)

### State Management

Tidak ada global state manager (Redux, Zustand, dll.). State dikelola dengan:

1. **`useState` / `useReducer`** — state lokal komponen
2. **`useContext`** — theme dan PWA (lihat `src/contexts/`)
3. **TanStack Query** — data fetching async (belum banyak digunakan, siap diperluas)
4. **localStorage** via `src/lib/storage.ts` — semua data persisten pengguna
5. **Custom events** (`window.dispatchEvent`) — komunikasi antar komponen yang tidak terhubung (contoh: `jkt48-storage`, `api-status`)

### Data Fetching

Semua call ke YouTube API **harus** melalui `src/lib/youtube.ts`:

```typescript
import { fetchChannel, searchVideos, fetchVideoById } from "@/lib/youtube";

// Benar
const { videos, nextPageToken } = await fetchChannel("JKT48", "date");

// Salah — jangan panggil Supabase langsung untuk YouTube
const { data } = await supabase.functions.invoke("youtube?action=channel...");
```

Fungsi di `youtube.ts` sudah menangani:
- Error handling & error codes
- `emitApiStatus()` — memicu banner API status otomatis
- Tipe TypeScript yang lengkap

### Storage (localStorage)

Semua interaksi localStorage **harus** melalui `src/lib/storage.ts`:

```typescript
import {
  addHistory, getHistory,
  toggleSaved, useSaved,
  setProgress, getProgress,
  createPlaylist, getPlaylists, usePlaylists,
  addVideoToPlaylist, removeVideoFromPlaylist,
} from "@/lib/storage";
```

Fungsi yang diawali `use` (seperti `useSaved`, `usePlaylists`) adalah React hooks yang me-subscribe ke event `jkt48-storage` dan re-render saat data berubah.

### Routing

Definisi routes ada di `src/App.tsx`. Semua routes dibungkus `AppLayout`:

```
/                    → Home
/channel/:handle     → ChannelPage
/search              → SearchPage
/watch?v=ID          → WatchPage
/watch?v=ID&list=ID  → WatchPage (dengan playlist YouTube)
/watch?v=ID&userlist=ID → WatchPage (dengan playlist pengguna)
/history             → HistoryPage
/saved               → SavedPage
/trending            → TrendingPage
/subscriptions       → SubscriptionsPage
/playlist?list=ID    → PlaylistDetailPage (YouTube playlist)
/playlists           → PlaylistsPage (manajemen playlist pengguna)
/playlists/:id       → UserPlaylistDetailPage
/playlists/channel/:id → ChannelPlaylistDetailPage
/member-live         → MemberLivePage
/stream?...          → StreamingPlayerPage (IDN/Showroom)
```

Parameter StreamingPlayerPage (via `useSearchParams`):
- `memberId` — ID member dari `src/data/members.ts`
- `platform` — `"idn"` atau `"showroom"`
- `streamUrl` — HLS stream URL
- `liveUrl` — URL halaman live di platform
- `quality` — daftar kualitas (JSON stringified `UrlQuality[]`)

---

## 🧩 Komponen Utama

### `VideoCard`
`src/components/VideoCard.tsx`

Kartu video utama yang digunakan di seluruh aplikasi. Props:
- `video: YTVideo` — data video dari YouTube API
- `animationDelay?: number` — delay animasi masuk (ms)
- `playlistId?: string`, `userPlaylistId?: string`, `channelPlaylistId?: string` — jika dalam konteks playlist
- `index?: number` — index dalam playlist

Fitur: thumbnail lazy load, badge durasi, info channel, waktu relatif, context menu (simpan, tambah ke playlist, open tab baru).

### `MiniPlayer`
`src/components/MiniPlayer.tsx`

Player video kecil yang muncul di pojok kanan bawah. State dikelola via `src/lib/miniPlayer.ts` menggunakan custom event `mini-player-change`.

API miniPlayer:
```typescript
import { showMiniPlayer, hideMiniPlayer, getMiniPlayerState } from "@/lib/miniPlayer";

showMiniPlayer({ videoId, title, channelTitle, thumb, startAt });
hideMiniPlayer();
const state = getMiniPlayerState(); // { visible, videoId, ... }
```

### `ApiStatusBanner`
`src/components/ApiStatusBanner.tsx`

Banner otomatis yang muncul saat YouTube API error. Mendengarkan event `api-status` dari `window`. Tidak perlu dipanggil manual — sudah terpasang di `App.tsx`.

### `AddToPlaylistModal`
`src/components/AddToPlaylistModal.tsx`

Modal untuk menambahkan video ke playlist pengguna. Props:
- `video: YTVideo`
- `open: boolean`
- `onClose: () => void`

### `Sidebar` & `Navbar`
Kedua komponen ini mengelola tampilan navigasi. Sidebar ditampilkan di layar ≥ `lg`, Navbar selalu tampil di atas. MobileBottomNav tampil di layar < `lg`.

---

## 📡 Supabase Edge Functions

### Cara Memanggil dari Frontend

```typescript
import { supabase } from "@/integrations/supabase/client";

// Untuk YouTube (via youtube.ts — gunakan helper, jangan langsung invoke)
const { data, error } = await supabase.functions.invoke(
  `youtube?action=channel&handle=JKT48&order=date`,
  { method: "GET" }
);

// Untuk IDN Live
const { data, error } = await supabase.functions.invoke("check-idn-live", {
  body: { username: "jkt48_alya" }
});

// Untuk Showroom
const { data, error } = await supabase.functions.invoke("check-showroom-live", {
  body: { room_url_key: "JKT48_Alya" }
});
```

### Edge Function: `check-idn-live`

Input: `{ username: string }`

Output:
```typescript
{
  is_live: boolean;
  live_url: string | null;    // URL halaman live
  stream_url: string | null;  // HLS .m3u8 URL
  slug: string | null;        // slug live (bagian URL setelah /live/)
}
```

Strategi: JKT48Connect API → scraping HTML IDN Live → fallback

### Edge Function: `check-showroom-live`

Input: `{ room_url_key: string }`

Output:
```typescript
{
  is_live: boolean;
  stream_url: string | null;      // kualitas tinggi
  stream_url_low: string | null;  // kualitas rendah
}
```

### Edge Function: `youtube`

Query params: `action` + parameter spesifik per action.

| Action | Params tambahan | Return |
|---|---|---|
| `channel` | `handle`, `order`, `pageToken?` | `{ videos, nextPageToken }` |
| `search` | `q`, `pageToken?` | `{ videos, nextPageToken }` |
| `suggest` | `q` | `{ suggestions: string[] }` |
| `videos` | `ids` (comma-separated) | `{ videos }` |
| `related` | `videoId` | `{ videos }` |
| `playlists` | `handle`, `pageToken?` | `{ playlists, nextPageToken, totalResults }` |
| `playlistItems` | `playlistId`, `pageToken?` | `{ videos, nextPageToken, totalResults }` |
| `playlistInfo` | `playlistId` | `YTPlaylist` |
| `channelInfo` | `handle` | `YTChannelInfo` |

Error codes yang mungkin dikembalikan:
- `QUOTA_EXCEEDED` — YouTube API quota habis
- `RATE_LIMITED` — terlalu banyak request
- `UPSTREAM_ERROR` — YouTube API bermasalah
- `CONFIG_ERROR` — API key tidak dikonfigurasi
- `NETWORK` — koneksi bermasalah
- `UNKNOWN` — error tidak diketahui

---

## 👥 Data Member JKT48

File: `src/data/members.ts`

```typescript
export interface Member {
  id: string;              // snake_case unik, contoh: "alya_amanda"
  name: string;            // Nama lengkap
  photoFile: string;       // Nama file foto (tanpa ekstensi)
  team: Team;              // "Team Love" | "Team Dream" | "Team Passion" | "Trainee"
  teamFolder: string;      // "love" | "dream" | "passion" | "trainee"
  idnUsername: string | null;    // Username IDN Live, null jika tidak ada
  showroomKey: string | null;    // room_url_key Showroom, null jika tidak ada
  showroomRoomId: number | null; // room_id Showroom, null jika tidak ada
}
```

Foto member disimpan di `public/assets/foto/{teamFolder}/{photoFile}.jpg`

Helper:
```typescript
import { getMemberPhotoUrl, TEAM_BADGE_COLORS } from "@/data/members";

const url = getMemberPhotoUrl(member); // URL lengkap foto
const badgeClass = TEAM_BADGE_COLORS[member.team]; // Tailwind classes untuk badge tim
```

### Menambah Member Baru

1. Tambahkan foto ke `public/assets/foto/{teamFolder}/{nama_member}.jpg`
2. Tambahkan entry baru di array `MEMBERS` di `src/data/members.ts`:

```typescript
{
  id: "nama_member",          // unik, snake_case
  name: "Nama Lengkap",
  photoFile: "nama_member",   // sama dengan nama file foto
  team: "Team Love",
  teamFolder: "love",
  idnUsername: "jkt48_xxx",   // atau null
  showroomKey: "JKT48_Xxx",   // atau null
  showroomRoomId: 123456,     // atau null
}
```

---

## 🎨 Sistem Tema & CSS

Variabel CSS utama (didefinisikan di `src/index.css`):

```css
--header-h: 56px;       /* tinggi navbar atas */
--sidebar-w: 240px;     /* lebar sidebar desktop */
--primary: /* HSL warna utama (merah JKT48) */
--primary-glow: /* HSL warna glow/aksen */
```

Class animasi kustom yang tersedia (defined di `index.css`):
- `animate-fade-in-down` — fade + geser dari atas
- `animate-fade-in-up` — fade + geser dari bawah
- `animate-fade-in-left` — fade + geser dari kiri
- `animate-scale-in` — scale dari 0 ke 1
- `animate-scale-in-bounce` — scale dengan bounce
- `page-enter` — animasi masuk halaman
- `yt-chip` — styling chip filter (sudah include semua state)

---

## ⚠️ Hal yang Harus Diperhatikan

### Jangan Modifikasi
- File di `src/components/ui/` — ini adalah komponen shadcn/ui yang di-generate. Update melalui CLI shadcn.
- `public/sw.js` — Service Worker harus dites dengan cermat setelah perubahan. Naikkan `CACHE_VERSION` setiap perubahan.

### Infinite Scroll
Pattern yang digunakan untuk infinite scroll di Home, SearchPage, dll:

```typescript
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const el = sentinelRef.current;
  if (!el) return;
  const obs = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting) loadMore(); },
    { rootMargin: "400px" }
  );
  obs.observe(el);
  return () => obs.disconnect();
}, [pageTokens, loading]);

// Di JSX — taruh di akhir list
<div ref={sentinelRef} className="h-10" />
```

### HLS Streaming
Untuk memutar stream IDN/Showroom, gunakan hls.js:

```typescript
import Hls from "hls.js";

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(streamUrl);
  hls.attachMedia(videoElement);
} else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
  // Safari native HLS support
  videoElement.src = streamUrl;
}
```

StreamingPlayerPage sudah menangani ini lengkap termasuk quality switching.

### YouTube IFrame API
Watch page menggunakan YouTube IFrame API (bukan `<iframe>` biasa) untuk kontrol penuh playback. Pastikan untuk menggunakan `loadYouTubeAPI()` sebelum membuat `YT.Player`.

### Mencegah Race Condition di useEffect

Gunakan flag `cancelled` untuk mencegah setState setelah komponen unmount:

```typescript
useEffect(() => {
  let cancelled = false;
  fetchData().then((result) => {
    if (!cancelled) setData(result);
  });
  return () => { cancelled = true; };
}, [deps]);
```

### LocalStorage & Custom Events

Setelah mengubah data di localStorage, panggil `dispatch()` agar semua hook yang subscribe ikut update:

```typescript
// Di dalam storage.ts
function dispatch() {
  window.dispatchEvent(new Event("jkt48-storage"));
}
```

Hook `usePlaylists`, `useSaved`, dll. sudah subscribe ke event ini secara otomatis.

---

## 🧪 Testing

Framework: **Vitest** + **@testing-library/react**

Setup: `src/test/setup.ts`

Lokasi test: `src/test/` atau `*.test.ts` di samping file yang ditest.

Contoh test:
```typescript
import { describe, it, expect } from "vitest";
import { formatDuration, timeAgo } from "@/lib/youtube";

describe("formatDuration", () => {
  it("should format seconds correctly", () => {
    expect(formatDuration("PT3M45S")).toBe("3:45");
    expect(formatDuration("PT1H2M3S")).toBe("1:02:03");
  });
});
```

---

## 🔑 Environment Variables

| Variable | Deskripsi | Digunakan di |
|---|---|---|
| `VITE_SUPABASE_PROJECT_ID` | ID project Supabase | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_URL` | URL project Supabase | `src/integrations/supabase/client.ts` |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | Supabase Edge Function `youtube` |
| `JKT48CONNECT_API_KEY` | API key JKT48Connect | Edge Function `check-idn-live` (hardcoded sementara) |

> ⚠️ Variabel `VITE_*` bersifat publik (exposed ke browser). Jangan simpan secret di sini.
> YouTube API key harus disimpan sebagai **Supabase Secret**, bukan di `.env` frontend.

---

## 📋 Checklist PR / Sebelum Commit

- [ ] Tidak ada `console.log` yang tertinggal (kecuali `console.error` yang disengaja)
- [ ] Tidak ada TypeScript error (`any` hanya jika benar-benar diperlukan)
- [ ] Import path menggunakan alias `@/`
- [ ] Komponen baru menggunakan `cn()` untuk class names
- [ ] Data member baru sudah ada fotonya di `public/assets/foto/`
- [ ] Edge function baru sudah ditest dengan Supabase CLI
- [ ] Tidak ada perubahan yang merusak localStorage schema yang ada
- [ ] `CACHE_VERSION` di `sw.js` dinaikkan jika ada perubahan aset statis