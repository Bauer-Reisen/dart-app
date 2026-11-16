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

// Apple liefert Spaß- und Effektstimmen mit (Echo, Orgel, Roboter …) – die nie automatisch nehmen.
const SPASS = ['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'deranged', 'good news', 'hysterical',
  'jester', 'organ', 'pipe organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'junior', 'ralph', 'kathy', 'fred', 'princess', 'echo'];
// Ältere, eher blecherne Apple-Stimmen (Eloquence) – nur, wenn nichts anderes da ist
const BLECH = ['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'];
// Natürlich klingende Stimmen
const GUT = ['daniel', 'arthur', 'malcolm', 'serena', 'kate', 'oliver', 'martha', 'stephanie', 'jamie',
  'anna', 'helena', 'martin', 'petra', 'markus', 'yannick', 'viktor', 'google', 'microsoft', 'natural', 'neural', 'katja', 'conrad'];

const sprache = (art: AnsageArt) => (art === 'en' ? 'en-GB' : 'de-DE');

/** Punkte für eine Stimme: höher = natürlicher. */
export function stimmWert(v: { name: string; lang: string; voiceURI: string }, lang: string): number {
  const name = v.name.toLowerCase();
  const vn = name.replace(/\s*\(.*$/, '').trim();
  const uri = v.voiceURI.toLowerCase();
  const l = v.lang.replace('_', '-').toLowerCase();
  if (!l.startsWith(lang.slice(0, 2).toLowerCase())) return -100;
  if (SPASS.includes(vn) || /novelty/.test(uri)) return -50;
  let w = 0;
  if (l === lang.toLowerCase()) w += 2;
  if (/premium|enhanced|erweitert|verbessert|natural|neural/.test(name + ' ' + uri)) w += 6;
  if (GUT.some((g) => name.includes(g))) w += 3;
  if (BLECH.includes(vn) || /eloquence/.test(uri)) w -= 5;
  return w;
}

/** Alle brauchbaren Stimmen dieser Sprache, beste zuerst. */
export function stimmen(art: AnsageArt): SpeechSynthesisVoice[] {
  if (!ansageMoeglich() || art === 'aus') return [];
  const lang = sprache(art);
  return window.speechSynthesis.getVoices()
    .map((v) => ({ v, w: stimmWert(v, lang) }))
    .filter((x) => x.w > -50)
    .sort((x, y) => y.w - x.w || x.v.name.localeCompare(y.v.name))
    .map((x) => x.v);
}

const STIMM_KEY = (art: AnsageArt) => `dart-ansage-stimme-${art}`;
export function stimmeLaden(art: AnsageArt): string {
  try { return localStorage.getItem(STIMM_KEY(art)) || ''; } catch { return ''; }
}
export function stimmeSpeichern(art: AnsageArt, uri: string) {
  try { if (uri) localStorage.setItem(STIMM_KEY(art), uri); else localStorage.removeItem(STIMM_KEY(art)); } catch { /* egal */ }
}

function stimme(art: AnsageArt): SpeechSynthesisVoice | undefined {
  const liste = stimmen(art);
  const gewaehlt = stimmeLaden(art);
  return (gewaehlt && liste.find((v) => v.voiceURI === gewaehlt)) || liste[0];
}

export function sprich(texte: string[], art: AnsageArt) {
  if (art === 'aus' || !ansageMoeglich()) return;
  const v = stimme(art);
  for (const t of texte) {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = v?.lang || sprache(art);
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
