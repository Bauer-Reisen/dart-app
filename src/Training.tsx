// Zieltraining: freies Werfen auf ein selbst gewähltes Ziel – frei oder geführt (Vorschlag aus dem Trefferbild).
import { useEffect, useRef, useState } from 'react';
import { FOKUS_DAUER, zuruf, zurufeAn, zurufeSetzen, type Zuruf } from './coach';
import { sameZiel, zielLabel, type Ziel } from './board';
import { EingabeView, summe, useEingabe } from './Eingabe';
import { uhrInfo } from './UhrKnopf';
import { Erklaerung, einmalGesehen, einmalMerken } from './Hilfe';
import { RUNDE, auswerten, type Fuehrung } from './fuehrung';
import { MIN_FEHL } from './tipps';
import { ICH, dartsVon, aufnahmenVon, type Aufnahme } from './speicher';

const START_CHIPS: Ziel[] = [
  { seg: 20, ring: 'T' },
  { seg: 19, ring: 'T' },
  { seg: 18, ring: 'T' },
];

/** Erklärung beim ersten Öffnen und im 💡-Fenster. */
const SO_GEHTS = (
  <ul>
    <li><b>Oben</b> wählst du dein Ziel (gelb = aktuell). Mit <b>＋</b> holst du ein anderes dazu, z. B. D16 oder Bull.</li>
    <li>Nach jedem Wurf tippst du auf der Scheibe an, <b>wo der Dart steckt</b> – <b>in der Reihenfolge, wie du geworfen hast</b> (Felder 1., 2., 3.). Nur so sieht die App, wie sicher dein 1., 2. und 3. Dart ist. Tippe möglichst <b>genau an die Stelle</b>, wo er steckt – dann zeigt die Statistik auch, wie weit du im Schnitt neben der Zielmitte liegst. Nach 3 Darts ist die Aufnahme gespeichert.</li>
    <li>Die App merkt sich zu jedem Ziel, wie oft du triffst und <b>wohin du danebenwirfst</b>. Das siehst du in der <b>Statistik</b> unter „Trefferbild je Ziel".</li>
    <li>Ab {MIN_FEHL} Fehlwürfen auf ein Ziel erkennt die App ein Muster (z. B. „meist zu tief"). Dann <b>leuchtet die 💡</b> mit einem Tipp und einer passenden Übung.</li>
    <li>Während du wirfst, <b>ruft dir der Trainer ab und zu etwas zu</b> – z. B. wenn die letzten Aufnahmen alle tief gehen, oder einen Punkt, auf den du ein paar Aufnahmen lang achtest. Danach sagt er dir, ob es damit besser lief. Abschalten kannst du das hier unter 💡.</li>
    <li>Im Reiter Training steht dann ein <b>Trainingsvorschlag</b>: {RUNDE} Aufnahmen auf dein Sorgen-Ziel mit einem Punkt, auf den du achtest – danach siehst du, ob es besser wird.</li>
  </ul>
);

interface Props {
  aufnahmen: Aufnahme[];
  hinzufuegen: (a: Aufnahme) => void;
  letzteEntfernen: (pruef: (a: Aufnahme) => boolean) => Aufnahme | null;
  onMenu: () => void;
  spieler?: string;
  fuehrung?: Fuehrung | null;
  onFuehrung?: (f: Fuehrung | null) => void;
}

const pz = (t: number, n: number) => (n ? `${Math.round((t / n) * 100)} %` : '–');

export function Training({ aufnahmen, hinzufuegen, letzteEntfernen, onMenu, spieler = ICH, fuehrung, onFuehrung }: Props) {
  const [erklaeren, setErklaeren] = useState(() => !einmalGesehen('zieltraining'));
  const istTraining = (a: Aufnahme) => (a.modus ?? 'training') === 'training' && (a.spieler ?? ICH) === spieler;
  const e = useEingabe({
    merken: { name: 'training', id: spieler === ICH ? undefined : spieler },
    zielFuer: () => fuehrung?.ziel ?? START_CHIPS[0],
    fertigNach: (d) => d.length >= 3,
    onFertig: (darts) =>
      hinzufuegen({
        darts,
        start: darts[0].t,
        ende: Math.max(...darts.map((d) => d.t)),
        modus: 'training',
        spieler,
      }),
    onZurueckLeer: () => letzteEntfernen(istTraining)?.darts ?? null,
    zielBleibt: true,
    startChips: START_CHIPS,
  });

  // Geführt: Ziel der Runde einstellen
  useEffect(() => {
    if (fuehrung && !sameZiel(e.ziel, fuehrung.ziel)) e.zielSetzen(fuehrung.ziel);
    // nur beim Start einer Runde
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuehrung?.seit]);

  const anzahl = aufnahmen.filter(istTraining).length;

  // Trainer-Zurufe: nur für dieses Training (seit dem Öffnen)
  const [seit] = useState(() => Date.now());
  const [zurufe, setZurufe] = useState(zurufeAn);
  const [zr, setZr] = useState<Zuruf | null>(null);
  const verlauf = useRef<Zuruf[]>([]);
  const sitzung = aufnahmen.filter((a) => istTraining(a) && a.start >= seit).sort((a, b) => a.start - b.start);
  useEffect(() => {
    if (!zurufe || !sitzung.length) return;
    const z = zuruf(sitzung, dartsVon(aufnahmen, spieler), verlauf.current, !fuehrung);
    if (z) { verlauf.current = [...verlauf.current, z]; setZr(z); }
    // nur nach jeder neuen Aufnahme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitzung.length]);
  const zSichtbar = zurufe && zr && (sitzung.length - zr.bei < 2 || (zr.art === 'fokus' && sitzung.length < zr.bei + FOKUS_DAUER)) ? zr : null;
  const zurufSchalter = (
    <label className="schalter-zeile">
      <input type="checkbox" checked={zurufe} onChange={(ev) => { setZurufe(ev.target.checked); zurufeSetzen(ev.target.checked); if (!ev.target.checked) setZr(null); }} />
      Trainer-Zurufe während des Trainings
    </label>
  );
  const sichtbar = e.darts.length ? e.darts : e.zuletzt ?? [];

  const inRunde = fuehrung ? aufnahmen.filter((a) => istTraining(a) && a.start >= fuehrung.seit).length : 0;
  const rundeFertig = !!fuehrung && inRunde >= RUNDE && !e.darts.length;
  const aw = rundeFertig && fuehrung ? auswerten(aufnahmen, fuehrung) : null;
  const richtungText = fuehrung?.richtung ? { oben: 'nach oben', unten: 'nach unten', links: 'nach links', rechts: 'nach rechts' }[fuehrung.richtung] : '';

  return (
    <EingabeView
      e={e}
      uhr={{ auswertung: uhrInfo(dartsVon(aufnahmen, spieler), true), neuesZiel: () => e.setWahlOffen(true) }}
      tipp={{ art: 'training', darts: dartsVon(aufnahmen, spieler), aufnahmen: aufnahmenVon(aufnahmen, spieler), soGehts: SO_GEHTS, extra: zurufSchalter }}
      onMenu={onMenu}
      oben={(fuehrung || zSichtbar) && (
        <>
          {fuehrung && (
            <div className="fokus-leiste">
              <span>Achte auf: <b>{fuehrung.fokus}</b></span>
              <span>{Math.min(inRunde + (e.darts.length ? 1 : 0), RUNDE)}/{RUNDE}</span>
            </div>
          )}
          {zSichtbar && (
            <div className={'zuruf ' + zSichtbar.art} role="status">
              <span><b>Trainer:</b> {zSichtbar.text}{zSichtbar.art === 'fokus' && <> <small>(Aufnahme {Math.min(sitzung.length - zSichtbar.bei + 1, FOKUS_DAUER)} von {FOKUS_DAUER})</small></>}</span>
              <button onClick={() => setZr(null)} aria-label="Zuruf schließen">✕</button>
            </div>
          )}
        </>
      )}
      kopfInfo={
        <>
          <span className="klein">{spieler} · {fuehrung ? `Geführt · ${zielLabel(fuehrung.ziel)}` : `Aufnahme ${anzahl + (e.darts.length ? 1 : 0) || 1}`}</span>
          <strong>{summe(sichtbar)}</strong>
        </>
      }
      overlay={
        aw && fuehrung ? (
          <Erklaerung titel={`Runde geschafft: ${zielLabel(fuehrung.ziel)}`} onZu={() => onFuehrung?.(null)} knopf="Fertig">
            <table className="auswertung">
              <tbody>
                <tr><td></td><td>bisher</td><td>diese Runde</td></tr>
                <tr><td>Treffer</td><td>{pz(aw.vorher.treffer, aw.vorher.n)}</td><td><b>{pz(aw.jetzt.treffer, aw.jetzt.n)}</b></td></tr>
                {fuehrung.richtung && (
                  <tr><td>Fehlwürfe {richtungText}</td>
                    <td>{aw.richtungVorher !== null ? `${Math.round(aw.richtungVorher * 100)} %` : '–'}</td>
                    <td><b>{aw.richtungJetzt !== null ? `${Math.round(aw.richtungJetzt * 100)} %` : '–'}</b></td></tr>
                )}
              </tbody>
            </table>
            <p>{aw.satz}</p>
            <button className="btn gross" style={{ width: '100%', marginTop: 6 }} onClick={() => onFuehrung?.({ ...fuehrung, seit: Date.now() })}>
              Noch eine Runde
            </button>
          </Erklaerung>
        ) : erklaeren ? (
          <Erklaerung titel="So geht das Zieltraining" onZu={() => { einmalMerken('zieltraining'); setErklaeren(false); }}>
            {SO_GEHTS}
            <p className="info klein">Diese Erklärung findest du jederzeit wieder unter 💡.</p>
          </Erklaerung>
        ) : null
      }
    />
  );
}
