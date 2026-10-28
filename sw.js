const CACHE = 'hdp-v9';
const SHELL = ['./', 'index.html', 'css/styles.css', 'js/app.js', 'manifest.json', 'movies-data.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hdp-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // data: network-first so the weekly update shows up; shell: cache-first
  if (u.pathname.endsWith('movies-data.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
      if (r.ok) return caches.open(CACHE).then(c => c.put(e.request, r.clone())).then(() => r, () => r);
      return caches.match(e.request).then(c => c || r); // keep last good dataset on HTTP errors
    }).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
