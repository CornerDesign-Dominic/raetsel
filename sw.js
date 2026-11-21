// Increase this version when the precached app files change.
const cachePrefix = 'inveni-shell-';
const cacheName = cachePrefix + 'v1';
const scope = self.registration.scope;
const shell = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
].map((path) => new URL(path, scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => {
    return cache.addAll(shell.map((url) => new Request(url, { cache: 'reload' })));
  }));
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
