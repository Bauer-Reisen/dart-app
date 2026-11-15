import { describe, expect, it } from 'vitest';
import { LEER, bilanz, type LigaDaten } from './liga';
import { nuLigaUebernehmen, type NuLigaAntwort } from './nuligaImport';

const antwort: NuLigaAntwort = {
  mannschaft: 'Team A',
  ich: { name: 'Muster, Max', average: 48, bilanz: '3:2', abende: 2 },
  spielplan: [
    { datum: '2026-11-06', zeit: '20:00', heim: true, gegner: 'Team B', bericht: '11', ergebnis: '8:8' },
    { datum: '2026-11-28', zeit: '19:00', heim: false, gegner: 'Team C', bericht: null, ergebnis: null },
  ],
  staerken: { 'Team B': { von: 45.4, bis: 52.9, mittel: 48, spieler: 9 }, 'Team C': { von: 34.6, bis: 48.7, mittel: 42.4, spieler: 12 } },
  abende: [
    {
      bericht: '11', datum: '2026-11-06', average: 44.12,
      spiele: [
        { art: 'einzel', gegner: 'Seybold, Rolf', legsIch: 3, legsGegner: 1 },
        { art: 'doppel', gegner: 'Kauppert, Michael & Landeck, Markus', legsIch: 3, legsGegner: 2 },
        { art: 'einzel', gegner: 'Reichert, Robin', legsIch: 2, legsGegner: 3 },
      ],
    },
  ],
};

describe('nuLiga übernehmen', () => {
  it('legt Spieltage mit Gegner-Stärke, Ergebnis und eigenen Spielen an', () => {
    const d = nuLigaUebernehmen(LEER, antwort, 5);
    expect(d.spieltage).toHaveLength(2);
    const [a, b] = d.spieltage;
    expect(a).toMatchObject({ datum: '2026-11-06', gegner: 'Team B', heim: true, avgVon: 45, avgBis: 53, ergebnis: '8:8', average: 44.12 });
    expect(a.spiele.map((s) => `${s.art} ${s.legsIch}:${s.legsGegner}`)).toEqual(['einzel 3:1', 'doppel 3:2', 'einzel 2:3']);
    expect(b).toMatchObject({ gegner: 'Team C', heim: false, avgVon: 34, avgBis: 49, spiele: [] });
    expect(bilanz(d.spieltage)).toMatchObject({ einzelSiege: 1, einzel: 2, doppelSiege: 1, average: 44.12 });
  });

  it('behält Notizen und ersetzt von Hand eingetragene Spiele gegen denselben Gegner', () => {
    const vorher: LigaDaten = {
      ...LEER,
      spieltage: [{
        id: 'hand1', datum: '2026-11-06', gegner: 'Team B', heim: true, notiz: 'Board hing tief',
        spiele: [
          { id: 'x', art: 'einzel', gegner: 'Rolf Seybold', legsIch: 3, legsGegner: 1, notiz: 'wirft schnell' },
          { id: 'y', art: 'einzel', gegner: 'Unbekannt', legsIch: 0, legsGegner: 3 },
        ],
      }],
    };
    const d1 = nuLigaUebernehmen(vorher, antwort);
    const a = d1.spieltage.find((s) => s.datum === '2026-11-06')!;
    expect(d1.spieltage.filter((s) => s.datum === '2026-11-06')).toHaveLength(1);
    expect(a.notiz).toBe('Board hing tief');
    expect(a.spiele.find((s) => s.gegner === 'Seybold, Rolf')?.notiz).toBe('wirft schnell');
    expect(a.spiele.some((s) => s.id === 'x')).toBe(false);
    expect(a.spiele.some((s) => s.id === 'y')).toBe(true);

    // Zweimal übernehmen ändert nichts mehr
    const d2 = nuLigaUebernehmen(d1, antwort);
    expect(d2.spieltage).toEqual(d1.spieltage);
  });
});
