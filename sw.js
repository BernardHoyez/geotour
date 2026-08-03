// Service worker "brise-cache" — geotour
// Incrémenter CACHE_NAME à chaque livraison touchant un fichier statique.
const CACHE_NAME = 'geotour-cache-v8';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/state.js',
  './js/mode-creer.js',
  './js/mode-randonnee.js',
  './js/visite.js',
  './js/export.js',
  './js/kml.js',
  './js/altimetrie.js',
  './js/map-layers.js',
  './js/exif.js',
  './vendor/jszip.min.js',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first pour les fichiers de l'app (HTML/JS/CSS/manifest)
  const isAppShell =
    request.mode === 'navigate' ||
    PRECACHE_ASSETS.some((asset) => url.pathname.endsWith(asset.replace('./', '/')));

  if (isAppShell) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first pour le reste (tuiles IGN/OSM, bibliothèques vendorisées, mbtiles, etc.)
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
