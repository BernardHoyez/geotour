const VERSION = 'geotour-v8';
const SCOPE   = '/geotour/';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  // Supprimer TOUS les caches sans exception (brise-caches)
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Share Target POST
  if (event.request.method === 'POST' && url.pathname === SCOPE + 'share-target') {
    event.respondWith((async () => {
      const fd = await event.request.formData();
      const file = fd.get('file');
      if (file) {
        const cache = await caches.open(VERSION + '-share');
        await cache.put('/_shared_file_name', new Response(file.name));
        await cache.put('/_shared_file', new Response(file));
      }
      return Response.redirect(SCOPE, 303);
    })());
    return;
  }

  if (event.request.method !== 'GET') return;

  const externe = ['tile.openstreetmap.org','data.geopf.fr','unpkg.com',
                   'cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];
  if (externe.some(h => url.hostname.includes(h))) return;

  // index.html, sw.js, manifest : toujours depuis le réseau (jamais en cache)
  if ([SCOPE, SCOPE+'index.html', SCOPE+'manifest.json', SCOPE+'sw.js']
      .includes(url.pathname)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Autres ressources (icônes…) : network-first avec cache
  event.respondWith((async () => {
    try {
      const res = await fetch(event.request);
      if (res.ok) (await caches.open(VERSION)).put(event.request, res.clone());
      return res;
    } catch {
      return (await caches.match(event.request)) ||
        new Response('Hors ligne', { status: 503 });
    }
  })());
});
