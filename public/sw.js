// JKT48 Stream — Service Worker
// Naikkan versi ini setiap deploy yang mengubah strategi cache.
const CACHE_VERSION = 'v2';
const SHELL_CACHE = `jkt48-shell-${CACHE_VERSION}`;   // index.html (navigasi)
const ASSET_CACHE = `jkt48-assets-${CACHE_VERSION}`;  // /assets/* hasil build (nama berhash, tidak pernah berubah)
const MEDIA_CACHE = `jkt48-media-${CACHE_VERSION}`;   // foto member, logo, ikon
const ALL_CACHES = [SHELL_CACHE, ASSET_CACHE, MEDIA_CACHE];
const MEDIA_LIMIT = 120; // batasi jumlah file media agar storage HP tidak membengkak

// Hanya file kecil yang benar-benar ada. (Dulu '/logo.jpg' tidak ada -> addAll gagal -> SW tidak pernah terpasang.)
const PRECACHE_URLS = ['/', '/manifest.json', '/logo.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            // allSettled-style: satu file gagal tidak boleh menggagalkan seluruh install
            .then((cache) => Promise.all(PRECACHE_URLS.map((u) => cache.add(u).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(names.filter((n) => !ALL_CACHES.includes(n)).map((n) => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

async function trim(cacheName, limit) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > limit) await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

// Cache-first: untuk file berhash (isi tidak pernah berubah) -> 0 request jaringan di kunjungan berikutnya.
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(request);
    if (hit) return hit;
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
}

// Stale-while-revalidate: tampil instan dari cache, perbarui diam-diam di belakang.
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(request);
    const refresh = fetch(request)
        .then((res) => {
            if (res.ok) {
                cache.put(request, res.clone()).then(() => trim(cacheName, MEDIA_LIMIT)).catch(() => {});
            }
            return res;
        })
        .catch(() => null);
    if (hit) return hit;
    const res = await refresh;
    return res || Response.error();
}

// Network-first untuk halaman (supaya deploy baru langsung terlihat), fallback ke cache saat offline.
async function networkFirstPage(request) {
    try {
        const res = await fetch(request);
        if (res.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put('/', res.clone()).catch(() => {});
        }
        return res;
    } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/')) || Response.error();
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return; // ekstensi browser, dll.
    if (url.origin !== self.location.origin) return;                    // YouTube, Supabase, dll. -> biarkan browser

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstPage(request));
        return;
    }
    if (url.pathname.startsWith('/assets/') && /\.(js|css|woff2?)$/.test(url.pathname)) {
        event.respondWith(cacheFirst(request, ASSET_CACHE));
        return;
    }
    if (/\.(webp|png|jpe?g|svg|ico)$/.test(url.pathname)) {
        event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE));
    }
});
