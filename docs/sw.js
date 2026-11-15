// Offline-Speicher der App-Dateien.
// Immer zuerst das Netz fragen (damit Updates sofort ankommen); nur ohne Netz,
// bei einem Fehler des Servers oder wenn es zu lange dauert, die gespeicherte Kopie nehmen.
// Liga-Abfragen (anderer Server) werden NICHT gespeichert.
//
// Version 2 (0.6.1): Die Startseite wird immer unter EINEM Schlüssel gespeichert (ohne ?v=…),
// und eine Antwort „nicht gefunden" vom Server gilt nicht mehr als Erfolg. Vorher konnte nach einem
// Update bei langsamem Netz die alte Startseite mit einer nicht mehr vorhandenen Programmdatei
// zusammenkommen → weißer Bildschirm.

const CACHE = 'dart-app-2';
const START = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];

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
  if (url.pathname.endsWith('/version.json')) return; // Versionsprüfung immer direkt beim Server

  const seite = req.mode === 'navigate';
  const schluessel = seite ? new URL('./', self.registration.scope).href : req;

  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const netz = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(schluessel, res.clone());
      return res;
    });
    // Startseite: länger aufs Netz warten (sie entscheidet, welche Programmdatei geladen wird)
    const zeit = new Promise((resolve) => setTimeout(resolve, seite ? 8000 : 4000, null));
    try {
      const res = await Promise.race([netz, zeit]);
      if (res && res.ok) return res;
    } catch { /* offline */ }
    const kopie = await cache.match(schluessel);
    if (kopie) return kopie;
    return netz;
  })());
});
