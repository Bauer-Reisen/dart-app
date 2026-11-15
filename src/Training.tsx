// Zieltraining: freies Werfen auf ein selbst gewähltes Ziel.
import { useState } from 'react';
import type { Ziel } from './board';
import { EingabeView, summe, useEingabe } from './Eingabe';
import { Erklaerung, einmalGesehen, einmalMerken } from './Hilfe';
import { MIN_FEHL } from './tipps';
import { ICH, dartsVon, type Aufnahme } from './speicher';

const START_CHIPS: Ziel[] = [
  { seg: 20, ring: 'T' },
  { seg: 19, ring: 'T' },
  { seg: 18, ring: 'T' },
];

/** Erklärung beim ersten Öffnen und im 💡-Fenster. */
const SO_GEHTS = (
  <ul>
    <li><b>Oben</b> wählst du dein Ziel (gelb = aktuell). Mit <b>＋</b> holst du ein anderes dazu, z. B. D16 oder Bull.</li>
    <li>Nach jedem Wurf tippst du auf der Scheibe an, <b>wo der Dart steckt</b>. Nach 3 Darts ist die Aufnahme gespeichert.</li>
    <li>Die App merkt sich zu jedem Ziel, wie oft du triffst und <b>wohin du danebenwirfst</b>. Das siehst du in der <b>Statistik</b> unter „Trefferbild je Ziel".</li>
    <li>Ab {MIN_FEHL} Fehlwürfen auf ein Ziel erkennt die App ein Muster (z. B. „meist zu tief"). Dann <b>leuchtet die 💡</b> mit einem Tipp und einer passenden Übung.</li>
  </ul>
);

interface Props {
  aufnahmen: Aufnahme[];
  hinzufuegen: (a: Aufnahme) => void;
  letzteEntfernen: (pruef: (a: Aufnahme) => boolean) => Aufnahme | null;
  onMenu: () => void;
}

export function Training({ aufnahmen, hinzufuegen, letzteEntfernen, onMenu }: Props) {
  const [erklaeren, setErklaeren] = useState(() => !einmalGesehen('zieltraining'));
  const istTraining = (a: Aufnahme) => (a.modus ?? 'training') === 'training';
  const e = useEingabe({
    merken: { name: 'training' },
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
      tipp={{ art: 'training', darts: dartsVon(aufnahmen, ICH), soGehts: SO_GEHTS }}
      onMenu={onMenu}
      kopfInfo={
        <>
          <span className="klein">Training · Aufnahme {anzahl + (e.darts.length ? 1 : 0) || 1}</span>
          <strong>{summe(sichtbar)}</strong>
        </>
      }
      overlay={erklaeren && (
        <Erklaerung titel="So geht das Zieltraining" onZu={() => { einmalMerken('zieltraining'); setErklaeren(false); }}>
          {SO_GEHTS}
          <p className="info klein">Diese Erklärung findest du jederzeit wieder unter 💡.</p>
        </Erklaerung>
      )}
    />
  );
}
