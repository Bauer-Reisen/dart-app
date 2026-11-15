import { describe, expect, it } from 'vitest';
import { gruppenLegs, nachBereich } from './gruppe';
import type { Aufnahme } from './speicher';

const auf = (spieler: string, legId?: string, bot = false): Aufnahme =>
  ({ darts: [], start: 0, ende: 0, modus: legId ? 'x01' : 'training', spieler, legId, bot });

describe('Allein oder Gruppe', () => {
  const liste = [
    auf('Alex'),                    // Training
    auf('Alex', 'solo'),            // 501 allein
    auf('Alex', 'bot'), auf('Computer', 'bot', true), // gegen Computer
    auf('Alex', 'grp'), auf('Ben', 'grp'),             // zu zweit
  ];
  const legs = gruppenLegs(liste);

  it('erkennt Spiele mit mehreren echten Spielern', () => {
    expect([...legs]).toEqual(['grp']);
  });

  it('teilt die Würfe richtig auf', () => {
    const alex = liste.filter((a) => a.spieler === 'Alex');
    expect(nachBereich(alex, 'allein', legs)).toHaveLength(3);
    expect(nachBereich(alex, 'gruppe', legs)).toHaveLength(1);
    expect(nachBereich(alex, 'alle', legs)).toHaveLength(4);
  });
});
