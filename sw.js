/* ============================================================
   e-Persatuan — Service Worker (PWA offline shell)
   ============================================================ */
const VERSION = 'e-persatuan-v2.0.5';
const CORE = [
  './',
  './index.html',
  './app.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/css/base.css',
  './assets/css/landing.css',
  './assets/css/app.css',
  './assets/js/db.js',
  './assets/js/seed.js',
  './assets/js/app.js',
  './assets/img/favicon.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/maskable-512.png',
  './assets/img/apple-touch-icon.png',
  './404.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(VERSION);
      await Promise.all(CORE.map(async (url) => {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch (err) {
          console.warn('[SW] Gagal cache', url, err);
        }
      }));
    } catch (err) {
      console.warn('[SW] Cache awal gagal:', err);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept') &&
      request.headers.get('accept').includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigasi: rangkaian dahulu, fallback cache / offline
  if (isNavigation(req)) {
    const fallback = () =>
      caches.match(req).then((cached) =>
        cached ||
        (url.pathname.endsWith('app.html') ? caches.match('./app.html') : caches.match('./index.html')) ||
        caches.match('./offline.html')
      );
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!res || !res.ok) return fallback();
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(fallback)
    );
    return;
  }

  // Aset tempatan: stale-while-revalidate (papar segera, kemas kini di latar)
  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // CDN (fon, ikon): stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
