import { describe, expect, it } from 'vitest';
import { zielLabel } from './board';
import { klasse } from './klassen';

describe('Bull und Bullseye als Ziel', () => {
  const bull = { seg: 25, ring: 'B' as const };
  const bullseye = { seg: 25, ring: 'D' as const };

  it('Namen', () => {
    expect(zielLabel(bull)).toBe('Bull');
    expect(zielLabel(bullseye)).toBe('Bullseye');
  });

  it('Bull: 25 und 50 sind Treffer', () => {
    expect(klasse(bull, { seg: 25, ring: 'DB' })).toBe('treffer');
    expect(klasse(bull, { seg: 25, ring: 'SB' })).toBe('treffer');
  });

  it('Bullseye: nur 50 ist Treffer, 25 knapp daneben', () => {
    expect(klasse(bullseye, { seg: 25, ring: 'DB' })).toBe('treffer');
    expect(klasse(bullseye, { seg: 25, ring: 'SB' })).toBe('aussen');
    expect(klasse(bullseye, { seg: 20, ring: 'SI' })).toBe('weit');
  });
});
