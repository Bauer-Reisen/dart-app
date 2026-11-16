import { describe, expect, it } from 'vitest';
import { punkteText, requireText, stimmWert } from './ansage';

describe('Ansage', () => {
  it('sagt Punkte, 180, No score und Game shot', () => {
    expect(punkteText(60, false, false, 'en')).toBe('60');
    expect(punkteText(180, false, false, 'en')).toBe('One hundred and eighty!');
    expect(punkteText(0, true, false, 'en')).toBe('No score');
    expect(punkteText(40, false, true, 'en')).toBe('Game shot!');
    expect(punkteText(0, true, false, 'de')).toBe('Überworfen');
  });

  it('„you require" nur im Finish-Bereich', () => {
    expect(requireText('Alex', 32, true, 'en')).toBe('Alex, you require 32');
    expect(requireText('Alex', 170, true, 'en')).toBe('Alex, you require 170');
    expect(requireText('Alex', 171, true, 'en')).toBeNull();
    expect(requireText('Alex', 169, true, 'en')).toBeNull(); // mit 3 Darts nicht auszumachen
    expect(requireText('Alex', 1, true, 'en')).toBeNull();
    expect(requireText('Alex', 40, true, 'de')).toBe('Alex, du brauchst 40');
  });
});

describe('Stimmenwahl', () => {
  const v = (name: string, lang: string, voiceURI = 'x') => ({ name, lang, voiceURI });
  it('nimmt nie Spaß- oder Echostimmen, bevorzugt Premium', () => {
    const l = 'en-GB';
    expect(stimmWert(v('Trinoids', 'en-US'), l)).toBeLessThan(-40);
    expect(stimmWert(v('Cellos', 'en-US'), l)).toBeLessThan(-40);
    expect(stimmWert(v('Grandpa (English (UK))', 'en-GB'), l)).toBeLessThan(stimmWert(v('Daniel', 'en-GB'), l));
    expect(stimmWert(v('Daniel (Premium)', 'en-GB'), l)).toBeGreaterThan(stimmWert(v('Daniel', 'en-GB'), l));
    expect(stimmWert(v('Anna', 'de-DE'), l)).toBe(-100);
  });
});
