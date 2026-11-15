// Offline-Speicher der App-Dateien.
// Immer zuerst das Netz fragen (damit Updates sofort ankommen); nur ohne Netz
// oder wenn es zu lange dauert, die gespeicherte Kopie nehmen.
// Liga-Abfragen (anderer Server) werden NICHT gespeichert.

const CACHE = 'dart-app-1';
const START = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(START)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dart-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fremde Dienste nicht anfassen

  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const netz = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    });
    const zeit = new Promise((resolve) => setTimeout(resolve, 4000, null));
    try {
      const res = await Promise.race([netz, zeit]);
      if (res) return res;
    } catch { /* offline */ }
    const kopie = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (kopie) return kopie;
    return netz;
  })());
});
