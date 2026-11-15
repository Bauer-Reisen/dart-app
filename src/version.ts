// Automatisch neue Version laden (wie in der Film-App): beim Öffnen und immer, wenn die App wieder sichtbar wird,
// version.json vom Server mit der eigenen Nummer vergleichen. Laufende Spiele und angefangene Aufnahmen
// sind gespeichert, ein Neuladen verliert nichts.
declare const __APP_VERSION__: string;
export const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

async function pruefen() {
  if (!import.meta.env.PROD) return;
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { version } = await res.json();
    if (!version || version === VERSION) return;
    const key = 'dart-neu-geladen-fuer';
    if (sessionStorage.getItem(key) === version) return; // nie endlos neu laden
    sessionStorage.setItem(key, version);
    location.replace(`${location.pathname}?v=${version}${location.hash}`);
  } catch { /* offline – egal */ }
}

export function updatesPruefen() {
  pruefen();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pruefen(); });
}
