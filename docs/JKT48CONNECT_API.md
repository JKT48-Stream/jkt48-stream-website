# Integrasi JKT48Connect API (versi terbaru)

Dokumentasi resmi: <https://api.jkt48connect.app/docs>

## Setup (wajib sebelum deploy)

1. Buat API key di <https://api.jkt48connect.app/dashboard/keys>. Format: `jkc_` + 40 karakter hex.
   Key lama (`jk48c_...`) **tidak dipakai lagi** — edge function akan menolaknya dengan pesan yang jelas.
2. Simpan sebagai secret Supabase (bukan variabel `VITE_*`, karena itu ikut ter-bundle ke browser):
   ```sh
   supabase secrets set JKT48CONNECT_API_KEY=jkc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Deploy ulang function yang berubah (folder `_shared` ikut ter-bundle otomatis):
   ```sh
   supabase functions deploy live
   supabase functions deploy theater
   ```
   `hls-proxy` tidak berubah (itu proxy untuk CDN IDN/Showroom, bukan untuk api.jkt48connect.app).

## Perubahan dari API lama

| | Lama | Baru |
|---|---|---|
| Base URL | `https://jkt48connect.com` | `https://api.jkt48connect.app` |
| Live | `/api/v1/live` | `/api/now_live?group=jkt48` |
| Jadwal theater | `/api/v1/theater` | `/api/theater?page=&perpage=` |
| Detail theater | `/api/v1/theater/{reference_code}` | `/api/theater/{id}` → `{ shows: [...] }` |
| Auth | header `x-api-key: jk48c_…` | header `X-API-Key: jkc_…` |
| Envelope | `{ ok, data, cached_at, tier }` | tidak ada (bentuk mengikuti endpoint) |
| Error | `{ ok:false, error, code }` | 401/429 → `{ status, message, limit, used, resets_at, … }` |
| Kuota | per tier | per key per bulan (Free 1.000 · Starter 25.000 · Pro 150.000 · Fanbase 50.000) |

Field yang **tidak lagi ada** di API: harga, kuota kursi, periode/tier penjualan tiket, jam selesai.
UI menggantinya dengan tombol "Info & tiket resmi" (`link` dari API). Field baru yang dipakai: setlist, graduation,
rekaman YouTube, foto lineup dari API, nama member birthday langsung di daftar jadwal.

## Alur data

```
Browser ──► Edge Function `live` / `theater` ──► api.jkt48connect.app   (X-API-Key dari secret)
              • validasi format key              • retry 5xx/jaringan (maks 2×, backoff)
              • cache + gabung request bersamaan • 401/429 dipetakan ke kode untuk ApiStatusBanner
              • normalisasi respons (_shared/jkt48connect.ts)
```

Sumber stream:
- **Showroom**: `now_live` membawa `streaming_url_list` (hanya `hls`, https, diurutkan kualitas tertinggi dulu).
- **IDN**: `now_live` umumnya tidak membawa HLS. Saat user menekan "Tonton", URL diambil lewat
  `live?action=watch` → `GET /api/watch/:url_key/idn`. Route `/api/watch/*` **tidak ada di panduan publik**; dipakai
  berdasarkan kode aplikasi resmi JKT48Connect. Bila tidak tersedia, UI membuka idn.app seperti sebelumnya.
- Semua URL stream tetap dibungkus `hls-proxy` (lihat `src/lib/hls.ts`).

## Hemat kuota

- Daftar live di-cache 30 dtk, jadwal 15 mnt, detail show 30 mnt (per isolate), request bersamaan digabung,
  dan data lama tetap disajikan saat upstream gagal.
- Halaman jadwal tidak lagi meminta detail per birthday show (nama sudah ada di daftar).
- React Query tidak me-retry error kuota / key / 404.
- Daftar jadwal diambil per halaman (20 show/halaman, maks 5 halaman) : halaman 1 tampil dulu, sisanya paralel di latar. Setiap halaman di-cache 15 menit di server (data lama dipakai sampai 24 jam sambil diperbarui) dan hasil terakhir disimpan di browser.
- Lihat kecepatan API sebenarnya di Supabase → Edge Functions → theater → Logs (baris `[theater] page N upstream …ms`).
- Banner status menampilkan "Kuota JKT48Connect API habis" bila 429.

## Menguji dengan key asli

```sh
curl -H "X-API-Key: $JKT48CONNECT_API_KEY" "https://api.jkt48connect.app/api/now_live?group=jkt48"
curl -H "X-API-Key: $JKT48CONNECT_API_KEY" "https://api.jkt48connect.app/api/theater?page=1&perpage=5"
```

Bila bentuk respons berubah, yang perlu disesuaikan hanya normalizer di
`supabase/functions/_shared/jkt48connect.ts` (`shapeLive`, `shapeWatch`, `shapeTheaterPage`, `shapeTheaterDetail`);
tes-nya ada di `src/test/jkt48connect-shared.test.ts`.
