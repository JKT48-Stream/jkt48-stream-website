// JKT48 Stream — Service Worker
// Versi cache — naikkan versi ini setiap deploy baru agar cache diperbarui
const CACHE_VERSION = 'v1';
const CACHE_NAME = `jkt48-stream-${CACHE_VERSION}`;

// File-file statis yang di-cache saat install
const PRECACHE_URLS = [
    '/',
    '/manifest.json',
    '/logo.jpg',
];

// Install: cache file statis
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        }).then(() => self.skipWaiting())
    );
});

// Activate: hapus cache lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Lewati request non-GET dan request ke API eksternal (YouTube, Supabase)
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

    // Cache API cuma bisa nyimpen request dengan scheme http/https. Request
    // dari ekstensi browser (scheme "chrome-extension", "moz-extension", dst)
    // kadang ikut lewat sini dan bikin `cache.put()` throw
    // "Request scheme 'chrome-extension' is unsupported" — jadi di-skip saja.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    if (
        url.hostname.includes('youtube') ||
        url.hostname.includes('supabase') ||
        url.hostname.includes('googleapis')
    ) return;

    event.respondWith(
        fetch(event.request)
        .then((response) => {
            // Cache respons segar untuk navigasi & aset statis
            if (response.ok && (
                    event.request.mode === 'navigate' ||
                    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)
                )) {
                const clone = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, clone))
                    .catch((err) => console.warn('[sw] cache.put gagal:', err));
            }
            return response;
        })
        .catch(() => {
            // Offline fallback: kembalikan dari cache. PENTING: respondWith()
            // WAJIB selalu resolve ke sebuah Response — kalau caches.match()
            // tidak menemukan apa pun, dulu di sini fungsinya diam-diam
            // resolve ke `undefined` (tidak ada `return` di baris terakhir),
            // yang bikin browser lempar
            // "Uncaught TypeError: Failed to convert value to 'Response'"
            // (persis error yang muncul di console). Sekarang selalu
            // dipastikan ada Response valid, dengan Response.error() sebagai
            // fallback paling akhir.
            return caches.match(event.request).then((cached) => {
                if (cached) return cached;
                if (event.request.mode === 'navigate') {
                    return caches.match('/').then((home) => home || Response.error());
                }
                return Response.error();
            });
        })
    );
});