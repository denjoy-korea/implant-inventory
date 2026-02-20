const STATIC_CACHE = 'implant-static-v3';
const APP_SHELL_CACHE = 'implant-app-shell-v3';
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/logo.png',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== APP_SHELL_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigation should stay fresh to avoid stale chunk manifests.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await fetch(request);
        const cache = await caches.open(APP_SHELL_CACHE);
        cache.put('/index.html', network.clone());
        return network;
      } catch {
        const cached = await caches.match('/index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    /\.(?:js|css|png|jpe?g|svg|webp|woff2?|mp4)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => null);

      return cached || networkPromise || Response.error();
    })());
  }
});
