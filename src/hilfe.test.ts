// Wächter für Rundgang und „Was ist neu?“ – läuft vor jedem Hochladen (pre-push).
// Schlägt fehl, wenn eine größere Neuerung nicht im Rundgang erklärt ist.
import { describe, expect, it } from 'vitest';
import { KARTEN, NEUES } from './Hilfe';
import { VERSION } from './version';

const zahl = (v: string) => v.split('.').map(Number);
const mindestens = (a: string, b: string) => {
  const x = zahl(a); const y = zahl(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return true;
};
const version = VERSION; // aus package.json (vite.config.ts)

describe('Rundgang ist aktuell', () => {
  it('jede Neuerung zeigt auf eine Karte, die seitdem überarbeitet wurde', () => {
    const fehlt: string[] = [];
    for (const n of NEUES) {
      if (n.rundgang === 'klein') continue;
      for (const id of n.rundgang) {
        const k = KARTEN.find((x) => x.id === id);
        if (!k) fehlt.push(`${n.v} „${n.titel}“: Karte ${id} gibt es nicht`);
        else if (!mindestens(k.stand, n.v)) fehlt.push(`${n.v} „${n.titel}“: Karte „${k.titel}“ ist noch Stand ${k.stand} – Text ergänzen und stand auf ${n.v} setzen`);
      }
    }
    expect(fehlt).toEqual([]);
  });

  it('größere Version (x.Y.0) hat einen „Was ist neu?“-Eintrag', () => {
    const [, , patch] = zahl(version);
    if (patch === 0) expect(NEUES.some((n) => n.v === version)).toBe(true);
  });

  it('kein Eintrag ist neuer als die App-Version', () => {
    expect(mindestens(version, NEUES[0].v)).toBe(true);
  });

  it('Karten-Kennungen sind eindeutig', () => {
    expect(new Set(KARTEN.map((k) => k.id)).size).toBe(KARTEN.length);
  });
});
