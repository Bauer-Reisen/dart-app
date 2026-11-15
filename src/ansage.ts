// Ansage wie ein Caller bei 501: geworfene Punkte nach jeder Aufnahme und im Finish-Bereich „Alex, you require 32".
// Nutzt die Sprachausgabe des Geräts (Web Speech API), funktioniert auch offline, wenn das Gerät eine Stimme hat.
import { naechsterDart } from './checkout';

export type AnsageArt = 'aus' | 'de' | 'en';
const KEY = 'dart-ansage';

export function ansageLaden(): AnsageArt {
  try {
    const a = localStorage.getItem(KEY);
    return a === 'de' || a === 'en' ? a : 'aus';
  } catch { return 'aus'; }
}
export function ansageSpeichern(a: AnsageArt) {
  try { localStorage.setItem(KEY, a); } catch { /* egal */ }
}

export const ansageMoeglich = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Text nach einer Aufnahme. */
export function punkteText(punkte: number, bust: boolean, check: boolean, art: AnsageArt): string {
  if (art === 'en') {
    if (check) return 'Game shot!';
    if (bust || punkte === 0) return 'No score';
    if (punkte === 180) return 'One hundred and eighty!';
    return String(punkte);
  }
  if (check) return 'Game shot!';
  if (bust) return 'Überworfen';
  if (punkte === 0) return 'Keine Punkte';
  if (punkte === 180) return 'Hundertachtzig!';
  return String(punkte);
}

/** „Alex, you require 32" – nur wenn der Rest mit 3 Darts auszumachen ist. */
export function requireText(name: string, rest: number, doubleOut: boolean, art: AnsageArt): string | null {
  if (rest > 170 || rest < 1 || (doubleOut && rest < 2)) return null;
  if (!naechsterDart(rest, 3, doubleOut).weg) return null;
  return art === 'en' ? `${name}, you require ${rest}` : `${name}, du brauchst ${rest}`;
}

function stimme(lang: string): SpeechSynthesisVoice | undefined {
  const alle = window.speechSynthesis.getVoices();
  return alle.find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
    ?? alle.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
}

export function sprich(texte: string[], art: AnsageArt) {
  if (art === 'aus' || !ansageMoeglich()) return;
  const lang = art === 'en' ? 'en-GB' : 'de-DE';
  for (const t of texte) {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang;
    const v = stimme(lang);
    if (v) u.voice = v;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
}

/** iPhone/iPad: Sprache erst nach einem Tippen erlaubt – beim ersten Tippen still „anwerfen". */
let entsperrt = false;
export function entsperren() {
  if (entsperrt || !ansageMoeglich()) return;
  const los = () => {
    if (entsperrt) return;
    entsperrt = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    document.removeEventListener('pointerdown', los, true);
  };
  document.addEventListener('pointerdown', los, true);
}
