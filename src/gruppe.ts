// Allein oder in der Gruppe geworfen? Gruppe = Spiel (Leg) mit mindestens zwei echten Spielern.
// Training und Spiele gegen den Computer zählen als allein. Gilt auch für alte Würfe.
import type { Aufnahme } from './speicher';

export type Bereich = 'alle' | 'allein' | 'gruppe';

/** Legs, in denen mindestens zwei verschiedene echte Spieler geworfen haben. */
export function gruppenLegs(aufnahmen: Aufnahme[]): Set<string> {
  const wer = new Map<string, Set<string>>();
  for (const a of aufnahmen) {
    if (a.bot || !a.legId) continue;
    let s = wer.get(a.legId);
    if (!s) { s = new Set(); wer.set(a.legId, s); }
    s.add(a.spieler ?? 'Ich');
  }
  return new Set([...wer].filter(([, s]) => s.size >= 2).map(([id]) => id));
}

export function inGruppe(a: Aufnahme, legs: Set<string>): boolean {
  return !!a.gruppe || (!!a.legId && legs.has(a.legId));
}

export function nachBereich(liste: Aufnahme[], b: Bereich, legs: Set<string>): Aufnahme[] {
  if (b === 'alle') return liste;
  return liste.filter((a) => inGruppe(a, legs) === (b === 'gruppe'));
}
