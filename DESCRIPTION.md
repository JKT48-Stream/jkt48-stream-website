# 🎌 JKT48 Stream

> Platform streaming video & live JKT48 — nonton music video, hiburan, arsip live, dan pantau siaran langsung member JKT48 dalam satu aplikasi.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Edge%20Functions-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

---

## 📖 Tentang Proyek

**JKT48 Stream** adalah aplikasi web progresif (PWA) yang menyediakan akses terpusat ke seluruh konten video JKT48 dari YouTube (JKT48 Official, JKT48 TV, JKT48 LIVE), sekaligus memungkinkan pengguna memantau dan menonton siaran langsung member di platform **IDN Live** dan **Showroom** secara real-time.

Dibangun dengan antarmuka yang terinspirasi dari YouTube, aplikasi ini mendukung tema gelap/terang, manajemen playlist pribadi, riwayat tonton, dan dapat diinstal sebagai aplikasi di perangkat mobile maupun desktop.

---

## ✨ Fitur Utama

### 🎬 Streaming YouTube JKT48
- Menampilkan video terbaru dari 3 channel YouTube JKT48:
  - **JKT48 Official** — music video & pengumuman resmi
  - **JKT48 TV** — hiburan & aktivitas member
  - **JKT48 LIVE** — siaran langsung & arsip live
- Filter konten per channel dengan chip navigasi interaktif
- Infinite scroll — muat video lebih banyak secara otomatis saat scroll ke bawah
- Grid video responsif (1–4 kolom sesuai ukuran layar)
- Skeleton loading selama data diambil

### 📺 Video Player (Watch Page)
- Pemutaran video YouTube via YouTube IFrame API
- **Mini Player** — video tetap berjalan di sudut layar saat browsing halaman lain
- **Picture-in-Picture (PiP)** — video mengambang di atas aplikasi lain
- Layar penuh (fullscreen)
- **Resume otomatis** — simpan dan lanjutkan posisi tonton terakhir
- Panel video berikutnya: playlist YouTube, playlist pengguna, atau playlist channel
- Tombol Simpan (bookmark) langsung dari video player
- Tambah video ke playlist pribadi dari halaman watch
- Info channel lengkap: subscriber, jumlah video, deskripsi
- Video terkait dari channel yang sama

### 📡 Member Live (IDN Live & Showroom)
- Daftar seluruh member JKT48 dari 4 tim: **Team Love, Team Dream, Team Passion, Trainee**
- Deteksi status live secara real-time untuk setiap member di:
  - **IDN Live** — via JKT48Connect API + scraping HTML
  - **Showroom Live** — via Showroom API resmi
- Indikator visual: badge LIVE merah berkedip, sinyal animasi, glow border merah
- Filter member berdasarkan **Tim** dan **Status Live** (Sedang Live / Offline / Semua)
- Pencarian member berdasarkan nama
- Refresh manual status semua member sekaligus
- Foto profil resmi per member (portrait 3:4)

### 🎥 Streaming Player (IDN & Showroom)
- Pemutaran stream HLS (m3u8) langsung di browser via **hls.js**
- Kontrol player lengkap:
  - Play/pause, mute/unmute, volume
  - Pilih kualitas stream (HD / SD / Low) untuk IDN Live
  - Pilih kualitas untuk Showroom (High / Low)
  - Layar penuh & orientasi landscape/portrait
  - **Picture-in-Picture**
- Live stats bar: penanda LIVE berkedip, timer durasi siaran, badge tim member
- Tombol share URL stream
- Refresh stream jika koneksi terputus
- Fallback: tombol buka profil langsung di IDN / Showroom jika offline

### 🔍 Pencarian
- Cari video dari semua channel JKT48 di YouTube
- Autocomplete/saran pencarian real-time saat mengetik
- Infinite scroll hasil pencarian
- State empty (tidak ada hasil) yang informatif

### 📋 Playlist Pribadi
- **Buat playlist** baru dengan judul, deskripsi, dan visibilitas (Public/Private/Unlisted)
- **Edit & hapus** playlist yang sudah dibuat
- **Tambah video** ke playlist dari halaman watch atau card video (via modal)
- **Hapus video** dari playlist
- **Urutan video** tersimpan (berdasarkan waktu ditambahkan)
- **Simpan playlist channel YouTube** sebagai referensi (read-only snapshot)
- Thumbnail otomatis dari video pertama di playlist
- Halaman detail playlist dengan daftar video lengkap

### 📚 Halaman Channel
- Profil lengkap channel JKT48 (banner, avatar, statistik)
- Tab: **Video Terbaru** dan **Playlist** channel
- Tampilkan playlist resmi dari channel
- Navigasi ke detail playlist channel

### 🕐 Riwayat Tonton
- Rekam otomatis setiap video yang ditonton
- Tampilkan progress tonton (persentase / durasi)
- Hapus item riwayat satu per satu atau semua sekaligus
- Maksimal 100 item riwayat tersimpan (FIFO)

### 🔖 Video Tersimpan (Saved)
- Simpan/bookmark video favorit dengan satu klik
- Halaman daftar video yang disimpan
- Unsave video langsung dari daftar

### 📈 Trending & Subscriptions
- Halaman Trending: daftar video populer JKT48
- Halaman Subscriptions: agregasi video dari semua channel yang diikuti

### 🌙 Dark Mode & Tema
- 3 mode tema: **Light**, **Dark**, **System** (ikuti preferensi OS)
- Persistent — pilihan tema disimpan di localStorage
- Transisi tema yang halus

### 📱 Progressive Web App (PWA)
- Dapat diinstal di Android, iOS, Windows, macOS, Linux
- Service Worker dengan strategi **Network First** + fallback cache
- Pre-cache aset statis saat install
- Icon aplikasi & splash screen
- Orientasi portrait default

### 🔔 API Status Banner
- Banner notifikasi otomatis jika YouTube API mengalami masalah:
  - **Quota Exceeded** — dengan estimasi waktu reset
  - **Rate Limited**
  - **Upstream Error / Config Error / Network Error**
- Countdown timer jika ada informasi `resetAt` dari API
- Animasi masuk/keluar banner

### 🖥️ Layout & Navigasi
- **Sidebar** (desktop) — navigasi lengkap dengan semua menu, info channel, dan tema
- **Navbar** (top) — logo, search bar, tombol install PWA, tombol tema
- **Bottom Navigation** (mobile) — akses cepat ke Home, Search, Member Live, Playlists, dan Riwayat
- **Mini Player** tetap tampil saat navigasi antar halaman
- Scroll ke atas otomatis saat berpindah halaman

---

## 🗂️ Struktur Proyek

```
jkt48-stream/
├── public/
│   ├── assets/foto/          # Foto member per tim (love/dream/passion/trainee)
│   ├── logo.jpg
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service Worker
│
├── src/
│   ├── App.tsx               # Root app, routing, providers
│   ├── main.tsx              # Entry point, PWA prompt capture
│   │
│   ├── components/
│   │   ├── AddToPlaylistModal.tsx    # Modal tambah video ke playlist
│   │   ├── ApiStatusBanner.tsx       # Banner status YouTube API
│   │   ├── AppLayout.tsx             # Layout utama (sidebar + navbar + outlet)
│   │   ├── MiniPlayer.tsx            # Video player mengambang
│   │   ├── MobileBottomNav.tsx       # Bottom navigation mobile
│   │   ├── Navbar.tsx                # Top navigation bar
│   │   ├── NavLink.tsx               # Komponen link navigasi
│   │   ├── PlaylistSavedToast.tsx    # Toast notifikasi playlist tersimpan
│   │   ├── ScrollToTop.tsx           # Auto scroll ke atas saat route change
│   │   ├── Sidebar.tsx               # Sidebar desktop
│   │   ├── VideoCard.tsx             # Card video + skeleton
│   │   └── ui/                       # Komponen shadcn/ui (30+ komponen)
│   │
│   ├── contexts/
│   │   ├── PWAContext.tsx     # Context install PWA
│   │   └── ThemeContext.tsx   # Context dark/light/system theme
│   │
│   ├── data/
│   │   └── members.ts         # Data lengkap semua member JKT48 (4 tim)
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx     # Hook deteksi mobile viewport
│   │   └── use-toast.ts       # Hook toast notification
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts      # Supabase client
│   │       └── types.ts       # TypeScript types untuk database
│   │
│   ├── lib/
│   │   ├── miniPlayer.ts      # State management mini player
│   │   ├── storage.ts         # localStorage: history, saved, progress, playlist
│   │   ├── utils.ts           # Utility functions (cn)
│   │   └── youtube.ts         # YouTube API wrapper + format helpers
│   │
│   └── pages/
│       ├── ChannelPage.tsx              # Halaman profil channel
│       ├── ChannelPlaylistDetailPage.tsx # Detail playlist channel
│       ├── HistoryPage.tsx              # Riwayat tonton
│       ├── Home.tsx                     # Beranda
│       ├── MemberLivePage.tsx           # Daftar member + status live
│       ├── NotFound.tsx                 # 404
│       ├── PlaylistDetailPage.tsx       # Detail playlist YouTube
│       ├── PlaylistsPage.tsx            # Manajemen playlist pengguna
│       ├── SavedPage.tsx                # Video tersimpan
│       ├── SearchPage.tsx               # Pencarian
│       ├── StreamingPlayerPage.tsx      # Player IDN/Showroom live
│       ├── SubscriptionsPage.tsx        # Subscriptions
│       ├── TrendingPage.tsx             # Trending
│       ├── UserPlaylistDetailPage.tsx   # Detail playlist pengguna
│       └── WatchPage.tsx                # Video player YouTube
│
└── supabase/
    └── functions/
        ├── check-idn-live/    # Edge Function: cek status live IDN
        ├── check-showroom-live/ # Edge Function: cek status live Showroom
        ├── get-idn-stream/    # Edge Function: ambil stream URL IDN
        └── youtube/           # Edge Function: proxy YouTube Data API v3
```

---

## 🚀 Cara Menjalankan

### Prasyarat
- **Node.js** v18+ atau **Bun**
- **pnpm** (direkomendasikan) atau npm/yarn
- Akun **Supabase** (untuk Edge Functions & YouTube API key)
- **YouTube Data API v3 key**

### Instalasi

```bash
# Clone repositori
git clone <url-repo>
cd jkt48-stream

# Install dependencies
pnpm install
```

### Konfigurasi Environment

Salin `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Isi variabel berikut:

```env
VITE_SUPABASE_PROJECT_ID="your-supabase-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
```

### Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Tambahkan YouTube Data API v3 key sebagai Supabase secret:
   ```bash
   supabase secrets set YOUTUBE_API_KEY=your-youtube-api-key
   ```
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy youtube
   supabase functions deploy check-idn-live
   supabase functions deploy check-showroom-live
   supabase functions deploy get-idn-stream
   ```

### Menjalankan Development Server

```bash
pnpm dev
```

Buka [http://localhost:5173](http://localhost:5173)

### Build untuk Production

```bash
pnpm build
pnpm preview    # preview hasil build
```

### Testing

```bash
pnpm test         # jalankan test sekali
pnpm test:watch   # jalankan test dengan watch mode
```

---

## 🌐 Deploy

### Vercel (Direkomendasikan)

Proyek sudah dikonfigurasi untuk Vercel (`vercel.json`):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan environment variables di Vercel dashboard
4. Deploy otomatis setiap push ke `main`

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Animasi | Framer Motion |
| Routing | React Router v6 |
| State/Fetching | TanStack Query v5 |
| Video HLS | hls.js |
| Backend | Supabase Edge Functions (Deno) |
| Storage | localStorage |
| PWA | Service Worker + Web App Manifest |
| Deployment | Vercel |

---

## 📡 Supabase Edge Functions

### `youtube`
Proxy ke YouTube Data API v3. Mendukung action:
- `channel` — video dari channel tertentu
- `search` — pencarian video
- `suggest` — autocomplete pencarian
- `videos` — detail video by ID
- `related` — video terkait
- `playlists` — daftar playlist channel
- `playlistItems` — video dalam playlist
- `playlistInfo` — info playlist
- `channelInfo` — info channel (banner, statistik)

### `check-idn-live`
Mengecek apakah member sedang live di IDN Live. Menggunakan JKT48Connect API sebagai sumber utama dengan fallback scraping HTML IDN Live.

### `check-showroom-live`
Mengecek status live dan mendapatkan stream URL dari Showroom Live via Showroom API resmi.

### `get-idn-stream`
Mengambil stream URL HLS langsung dari IDN Live untuk pemutaran via hls.js.

---

## 💾 Penyimpanan Lokal

Semua data pengguna disimpan di **localStorage** dengan key:

| Key | Konten |
|---|---|
| `jkt48-watch-history` | Riwayat tonton (maks. 100 item) |
| `jkt48-saved-videos` | Video yang di-bookmark |
| `jkt48-watch-progress` | Progress tonton per video ID |
| `jkt48-user-playlists` | Playlist yang dibuat pengguna |
| `jkt48-saved-channel-playlists` | Playlist channel yang disimpan |
| `jkt48-theme` | Preferensi tema (light/dark/system) |

---

## 🤝 Kontribusi

1. Fork repositori ini
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m 'feat: tambah fitur X'`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

Proyek ini bersifat privat. Seluruh konten JKT48 adalah milik PT. JKT48 Project.