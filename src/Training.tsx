// Zieltraining: freies Werfen auf ein selbst gewähltes Ziel.
import type { Ziel } from './board';
import { EingabeView, summe, useEingabe } from './Eingabe';
import { ICH, dartsVon, type Aufnahme } from './speicher';

const START_CHIPS: Ziel[] = [
  { seg: 20, ring: 'T' },
  { seg: 19, ring: 'T' },
  { seg: 18, ring: 'T' },
];

interface Props {
  aufnahmen: Aufnahme[];
  hinzufuegen: (a: Aufnahme) => void;
  letzteEntfernen: (pruef: (a: Aufnahme) => boolean) => Aufnahme | null;
  onMenu: () => void;
}

export function Training({ aufnahmen, hinzufuegen, letzteEntfernen, onMenu }: Props) {
  const istTraining = (a: Aufnahme) => (a.modus ?? 'training') === 'training';
  const e = useEingabe({
    zielFuer: () => START_CHIPS[0],
    fertigNach: (d) => d.length >= 3,
    onFertig: (darts) =>
      hinzufuegen({
        darts,
        start: darts[0].t,
        ende: Math.max(...darts.map((d) => d.t)),
        modus: 'training',
        spieler: ICH,
      }),
    onZurueckLeer: () => letzteEntfernen(istTraining)?.darts ?? null,
    zielBleibt: true,
    startChips: START_CHIPS,
  });

  const anzahl = aufnahmen.filter(istTraining).length;
  const sichtbar = e.darts.length ? e.darts : e.zuletzt ?? [];

  return (
    <EingabeView
      e={e}
      tipp={{ art: 'training', darts: dartsVon(aufnahmen, ICH) }}
      onMenu={onMenu}
      kopfInfo={
        <>
          <span className="klein">Training · Aufnahme {anzahl + (e.darts.length ? 1 : 0) || 1}</span>
          <strong>{summe(sichtbar)}</strong>
        </>
      }
    />
  );
}
