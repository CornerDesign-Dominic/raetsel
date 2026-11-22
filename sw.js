// Increase this version when the precached app files change.
const cachePrefix = 'inveni-shell-';
const cacheName = cachePrefix + 'v17';
const scope = self.registration.scope;
const shell = [
  './index.html',
  './styles.css',
  './app-layout.css',
  './app-layout.js',
  './app.js',
  './logic-grid.js',
  './puzzle-hint.js',
  './puzzle-levels.js',
  './number-pattern.js',
  './busfahrt.js',
  './busfahrt.css',
  './einmaleins.js',
  './einmaleins.css',
  './pfeilfolge.js',
  './pfeilfolge.css',
  './wo-wohne-ich.js',
  './wo-wohne-ich.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
].map((path) => new URL(path, scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(shell.map((url) => new Request(url, { cache: 'reload' })));

    // Versions before v4 have no update button to activate a waiting worker.
    const keys = await caches.keys();
    if (keys.some((key) => /^inveni-shell-v[1-3]$/.test(key))) {
      await self.skipWaiting();
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const home = url.origin + url.pathname;
  if (event.request.mode === 'navigate' && (home === scope || home === shell[0])) {
    event.respondWith(caches.open(cacheName).then(async (cache) => {
      return await cache.match(shell[0]) ?? fetch(event.request);
    }));
  } else if (shell.includes(url.href)) {
    event.respondWith(caches.open(cacheName).then(async (cache) => {
      return await cache.match(event.request) ?? fetch(event.request);
    }));
  }
});
