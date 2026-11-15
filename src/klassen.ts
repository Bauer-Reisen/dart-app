// Fehlerklassen: Wohin ging der Dart im Vergleich zum Ziel?
import { ORDER, type Hit, type Ring, type Ziel } from './board';

export type Klasse =
  | 'treffer'
  | 'innen'        // zu weit zur Scheibenmitte
  | 'aussen'       // zu weit zum Rand
  | 'nachbarUhr'   // Nachbarzahl im Uhrzeigersinn (bei der 20: die 1)
  | 'nachbarGegen' // Nachbarzahl gegen den Uhrzeigersinn (bei der 20: die 5)
  | 'weit'         // weiter weg
  | 'abpraller';

const ORD: Record<Ring, number> = { DB: 0, SB: 1, SI: 2, T: 3, SO: 4, D: 5, MISS: 6, BOUNCE: -1 };

export function nachbarn(seg: number): { uhr: number; gegen: number } {
  const i = ORDER.indexOf(seg);
  return { uhr: ORDER[(i + 1) % 20], gegen: ORDER[(i + 19) % 20] };
}

export function klasse(z: Ziel, h: Hit): Klasse {
  if (h.ring === 'BOUNCE') return 'abpraller';
  if (z.ring === 'B') return h.ring === 'DB' || h.ring === 'SB' ? 'treffer' : 'weit';
  if (h.seg === 25) return 'innen';

  if (h.seg === z.seg) {
    if (z.ring === 'S') return h.ring === 'MISS' ? 'aussen' : 'treffer';
    const zo = z.ring === 'T' ? ORD.T : ORD.D;
    const ho = ORD[h.ring];
    if (ho === zo) return 'treffer';
    return ho < zo ? 'innen' : 'aussen';
  }

  const n = nachbarn(z.seg);
  if (h.seg === n.uhr) return 'nachbarUhr';
  if (h.seg === n.gegen) return 'nachbarGegen';
  return 'weit';
}

/**
 * Ehrliche Aussage zu einem Paar (z. B. innen gegen außen).
 * Regeln aus VORSCHLAG.md: unter 20 keine Aussage, 20–49 "Tendenz" ab 70 %, ab 50 "deutlich" ab 65 %.
 */
export function aussage(a: number, b: number, nameA: string, nameB: string): string {
  const n = a + b;
  if (n < 20) return `noch zu wenig Fehlwürfe (${n} von 20)`;
  const [mehr, name] = a >= b ? [a, nameA] : [b, nameB];
  const anteil = mehr / n;
  const pz = Math.round(anteil * 100);
  if (n >= 50 && anteil >= 0.65) return `deutlich: ${pz} % ${name}`;
  if (anteil >= 0.7) return `Tendenz: ${pz} % ${name}`;
  return 'kein klares Muster';
}
