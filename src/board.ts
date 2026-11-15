// Geometrie der (absichtlich verzerrten) Dartscheibe.
// Koordinaten: Mitte = 0/0, x nach rechts, y nach unten (wie in SVG).
// Winkel: 0° = oben (die 20), im Uhrzeigersinn steigend.

export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Ringe von innen nach außen. MISS = Daneben-Ring, BOUNCE = Abpraller (keine Position). */
export type Ring = 'DB' | 'SB' | 'SI' | 'T' | 'SO' | 'D' | 'MISS' | 'BOUNCE';

/** Außenradius jedes Rings (verzerrt: Triple und Doppel sind dick). */
// Breiten: Single innen 50, Triple 30, Single außen 30, Doppel 30, Daneben 22.
export const RADIUS = { DB: 15, SB: 30, SI: 78, T: 104, SO: 144, D: 170, MISS: 192 } as const;

export interface Hit {
  seg: number; // 1–20, 25 für Bull, 0 für Abpraller
  ring: Ring;
}

export type ZielRing = 'S' | 'D' | 'T' | 'B';
export interface Ziel {
  seg: number; // bei B: 25
  ring: ZielRing;
}

export function ringAt(r: number): Ring {
  if (r < RADIUS.DB) return 'DB';
  if (r < RADIUS.SB) return 'SB';
  if (r < RADIUS.SI) return 'SI';
  if (r < RADIUS.T) return 'T';
  if (r < RADIUS.SO) return 'SO';
  if (r < RADIUS.D) return 'D';
  return 'MISS'; // alles außerhalb zählt als "daneben bei Zahl X"
}

export function angleOf(x: number, y: number): number {
  const a = (Math.atan2(x, -y) * 180) / Math.PI;
  return (a + 360) % 360;
}

export function segAt(x: number, y: number): number {
  const i = Math.floor(((angleOf(x, y) + 9) % 360) / 18);
  return ORDER[i];
}

export function hitAt(x: number, y: number): Hit {
  const ring = ringAt(Math.hypot(x, y));
  if (ring === 'DB' || ring === 'SB') return { seg: 25, ring };
  return { seg: segAt(x, y), ring };
}

/** Mittelwinkel eines Segments. */
export function segAngle(seg: number): number {
  return ORDER.indexOf(seg) * 18;
}

export function points(h: Hit): number {
  switch (h.ring) {
    case 'DB': return 50;
    case 'SB': return 25;
    case 'SI':
    case 'SO': return h.seg;
    case 'T': return 3 * h.seg;
    case 'D': return 2 * h.seg;
    default: return 0;
  }
}

export function hitLabel(h: Hit): string {
  switch (h.ring) {
    case 'DB': return 'Bull';
    case 'SB': return '25';
    case 'SI':
    case 'SO': return 'S' + h.seg;
    case 'T': return 'T' + h.seg;
    case 'D': return 'D' + h.seg;
    case 'MISS': return '✕' + h.seg;
    case 'BOUNCE': return 'Abpr.';
  }
}

export function hitLabelLang(h: Hit): string {
  if (h.ring === 'MISS') return 'daneben bei ' + h.seg;
  if (h.ring === 'BOUNCE') return 'Abpraller';
  return hitLabel(h);
}

export function zielLabel(z: Ziel): string {
  if (z.seg === 25) return z.ring === 'D' ? 'Bullseye' : 'Bull';
  return z.ring + z.seg;
}

export function sameZiel(a: Ziel, b: Ziel): boolean {
  return a.seg === b.seg && a.ring === b.ring;
}

/** Punkt auf der Scheibe zu Radius und Winkel. */
export function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

/** SVG-Pfad für ein Ringstück. */
export function sector(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  const f = (n: number) => n.toFixed(2);
  return `M${f(x0)} ${f(y0)} A${r1} ${r1} 0 0 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r0} ${r0} 0 0 0 ${f(x3)} ${f(y3)} Z`;
}

const INNER: Record<string, number> = { SI: RADIUS.SB, T: RADIUS.SI, SO: RADIUS.T, D: RADIUS.SO, MISS: RADIUS.D };

/** Umriss eines getroffenen Feldes (für das Aufleuchten). */
export function hitPath(h: Hit): string | null {
  if (h.ring === 'BOUNCE') return null;
  if (h.ring === 'DB') return circle(RADIUS.DB);
  if (h.ring === 'SB') return circle(RADIUS.SB) + ' ' + circle(RADIUS.DB);
  const a = segAngle(h.seg);
  return sector(INNER[h.ring], RADIUS[h.ring], a - 9, a + 9);
}

/** Umriss des Zielfeldes. */
export function zielPath(z: Ziel): string {
  if (z.seg === 25) return z.ring === 'D' ? circle(RADIUS.DB) : circle(RADIUS.SB);
  const a = segAngle(z.seg);
  if (z.ring === 'T') return sector(RADIUS.SI, RADIUS.T, a - 9, a + 9);
  if (z.ring === 'D') return sector(RADIUS.SO, RADIUS.D, a - 9, a + 9);
  return sector(RADIUS.SB, RADIUS.D, a - 9, a + 9);
}

function circle(r: number): string {
  return `M${-r} 0 A${r} ${r} 0 1 0 ${r} 0 A${r} ${r} 0 1 0 ${-r} 0 Z`;
}

/** Echte Maße einer Steeldart-Scheibe (Außenradius je Ring in mm). */
export const ECHT_MM = { DB: 6.35, SB: 15.9, SI: 99, T: 107, SO: 162, D: 170, MISS: 200 } as const;

/**
 * Getippte Stelle auf der (verzerrten) Bildschirm-Scheibe → Stelle auf einer echten Scheibe in mm.
 * Der Winkel bleibt, der Abstand zur Mitte wird ringweise umgerechnet (Triple und Doppel sind auf dem Bildschirm dicker).
 */
export function echtePosition(x: number, y: number): [number, number] {
  const r = Math.hypot(x, y);
  if (r === 0) return [0, 0];
  const stufen: [number, number][] = [
    [0, 0], [RADIUS.DB, ECHT_MM.DB], [RADIUS.SB, ECHT_MM.SB], [RADIUS.SI, ECHT_MM.SI], [RADIUS.T, ECHT_MM.T],
    [RADIUS.SO, ECHT_MM.SO], [RADIUS.D, ECHT_MM.D], [RADIUS.MISS, ECHT_MM.MISS],
  ];
  let echt = ECHT_MM.MISS + (r - RADIUS.MISS);
  for (let i = 1; i < stufen.length; i++) {
    const [r0, e0] = stufen[i - 1];
    const [r1, e1] = stufen[i];
    if (r <= r1) { echt = e0 + ((r - r0) / (r1 - r0)) * (e1 - e0); break; }
  }
  const f = echt / r;
  return [Math.round(x * f * 10) / 10, Math.round(y * f * 10) / 10];
}
