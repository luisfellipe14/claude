// SIGRE-AT · Service Worker (cache-first para assets estáticos)
const CACHE = 'sigre-at-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './app.css',
  './bridge.js',
  './shell.jsx',
  './app.jsx',
  './ativos/styles.css',
  './ativos/data.js',
  './ativos/pages1.jsx',
  './ativos/pages2.jsx',
  './ativos/pages3.jsx',
  // Iframe do Planner — garante offline cacheando o entrypoint
  '../planner-src/index.html',
  '../planner-src/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(STATIC_ASSETS.map((a) => cache.add(a).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
