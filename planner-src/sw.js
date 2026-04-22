// Service Worker — Planner AT
// Estratégia: cache-first para assets estáticos, network-first para navegação
const CACHE = 'planner-at-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/style.css',
  './src/01-constants.js',
  './src/02-icons.js',
  './src/03-hooks.js',
  './src/04-kanban.js',
  './src/05-timeline.js',
  './src/06-task-modal.js',
  './src/07-notifications.js',
  './src/08-sync.js',
  './src/09-settings.js',
  './src/10-app.js',
  './src/11-audit.js',
  './vendor/react.development.js',
  './vendor/react-dom.development.js',
  './vendor/babel.min.js',
  './fonts/0eb1a88c.woff2',
  './fonts/1fcb56ef.woff2',
  './fonts/2171f77d.woff2',
  './fonts/2527b98e.woff2',
  './fonts/2556b9df.woff2',
  './fonts/3abfc134.woff2',
  './fonts/7eb9e3b6.woff2',
  './fonts/987904c6.woff2',
  './fonts/a81a2700.woff2',
  './fonts/beb09d09.woff2',
  './fonts/c3affdba.woff2',
  './fonts/f4e33c41.woff2',
  './fonts/fdeb0043.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
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
  // Só intercepta GET
  if (e.request.method !== 'GET') return;
  // Ignora requests cross-origin
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
