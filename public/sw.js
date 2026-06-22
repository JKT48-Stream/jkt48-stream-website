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
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
        })
        .catch(() => {
            // Offline fallback: kembalikan dari cache
            return caches.match(event.request).then((cached) => {
                if (cached) return cached;
                // Untuk navigasi, kembalikan halaman utama
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
            });
        })
    );
});