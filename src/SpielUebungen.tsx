// Around the Clock, Bob's 27 und Doppeltraining: Spielbildschirme.
import type { ReactNode } from 'react';
import { zielLabel, type Ziel } from './board';
import { naechsterDart, wegText } from './checkout';
import { EingabeView, useEingabe } from './Eingabe';
import { uhrInfo } from './UhrKnopf';
import { dartsVon, aufnahmenVon, neueId, type Aufnahme, type Dart, type Match } from './speicher';
import {
  ATC_FOLGE, BOB_FOLGE, DOPPEL_RUNDEN, atcStand, atcZiel, bobStand, bobTrifft, bobWert, bobZiel,
  doppelStand, doppelTrifft, doppelZiel, zufallsReste, type AtcVariante,
} from './uebungen';
import { aufnahmeFertig, auswerten } from './x01';

export interface SpielProps {
  match: Match;
  setMatch: (m: Match | null) => void;
  aufnahmen: Aufnahme[];
  hinzufuegen: (a: Aufnahme) => void;
  letzteEntfernen: (pruef: (a: Aufnahme) => boolean) => Aufnahme | null;
  onMenu: () => void;
}

const hits = (d: Dart[]) => d.map((x) => x.hit);
const zeitVon = (d: Dart[]) => ({ start: d[0].t, ende: Math.max(...d.map((x) => x.t)) });
const nummerName = (nr: number) => (nr === 25 ? 'Bull' : String(nr));

/** Gemeinsames: aktuelles Leg, seine Aufnahmen, neues Spiel, Ende-Fenster. */
function useLeg(p: SpielProps) {
  const n = p.match.spieler.length;
  const leg = p.match.legs[p.match.legs.length - 1];
  const legAuf = p.aufnahmen.filter((a) => a.legId === leg.id);
  const liste = legAuf.map((a) => ({ hits: hits(a.darts) }));
  const auf = (l: { id: string }) => p.aufnahmen.filter((a) => a.legId === l.id).map((a) => ({ hits: hits(a.darts) }));
  return {
    n, leg, legAuf, liste, auf,
    zurueck: () => (legAuf.length ? p.letzteEntfernen((a) => a.legId === leg.id)?.darts ?? null : null),
    nochmal: () =>
      p.setMatch({
        ...p.match,
        legs: [...p.match.legs, {
          id: neueId(), starter: (leg.starter + 1) % n, gewinner: null,
          reste: p.match.option === 'finish' ? zufallsReste() : undefined,
        }],
      }),
  };
}

function Ende({ titel, children, onNochmal, onZurueck, onBeenden }: {
  titel: ReactNode; children?: ReactNode; onNochmal: () => void; onZurueck: () => void; onBeenden: () => void;
}) {
  return (
    <div className="wahl mitte">
      <div className="wahl-box ende">
        <h3>{titel}</h3>
        {children}
        <div className="ende-knoepfe">
          <button className="btn gross an" onClick={onNochmal}>Nochmal</button>
          <button className="btn gross" onClick={onZurueck}>↶ Letzten Dart zurück</button>
          <button className="btn gross" onClick={onBeenden}>Beenden</button>
        </div>
      </div>
    </div>
  );
}

function Tafel({ namen, amZug, zeilen }: { namen: string[]; amZug: number | null; zeilen: { gross: ReactNode; klein: ReactNode; aus?: boolean }[] }) {
  return (
    <div className={'tafel n' + namen.length}>
      {namen.map((name, i) => (
        <div key={i} className={'spieler' + (i === amZug ? ' amzug' : '') + (zeilen[i].aus ? ' raus' : '')}>
          <div className="sp-name">{name}</div>
          <div className="sp-rest">{zeilen[i].gross}</div>
          <div className="sp-av">{zeilen[i].klein}</div>
        </div>
      ))}
    </div>
  );
}

const quote = (t: number, d: number) => (d ? `${Math.round((t / d) * 100)} %` : '–');

// ===================== Around the Clock =====================

export function AtcSpiel(p: SpielProps) {
  const { match } = p;
  const v = (match.option ?? 'jedes') as AtcVariante;
  const L = useLeg(p);
  const stand = atcStand(L.n, L.leg.starter, L.liste, v);
  const s = stand.amZug;
  const mitDarts = (d: Dart[]) => atcStand(L.n, L.leg.starter, [...L.liste, { hits: hits(d) }], v);
  const nummerVon = (pos: number) => ATC_FOLGE[Math.min(pos, ATC_FOLGE.length - 1)];

  const e = useEingabe({
    merken: { name: 'atc', id: match.id },
    zielAnzeige: 'fest',
    zielFuer: (d) => atcZiel(v, nummerVon(mitDarts(d).pos[s])),
    fertigNach: (d) => d.length >= 3 || mitDarts(d).gewinner !== null,
    onFertig: (d) => {
      const nach = mitDarts(d);
      p.hinzufuegen({
        darts: d, ...zeitVon(d), modus: 'atc', option: v, spieler: match.spieler[s], legId: L.leg.id,
        wert: nach.treffer[s] - stand.treffer[s],
        check: nach.gewinner === s,
      });
    },
    onZurueckLeer: L.zurueck,
    zielBleibt: false,
    alternativen: (z) => (v === 'jedes' && z.ring !== 'B' ? [{ seg: z.seg, ring: 'T' }, { seg: z.seg, ring: 'D' }] : []),
  });

  const jetzt = e.darts.length ? mitDarts(e.darts) : stand;
  const letzte = L.legAuf[L.legAuf.length - 1];
  let snack: ReactNode;
  if (letzte && e.zuletzt) {
    const wer = match.spieler.indexOf(letzte.spieler ?? '');
    snack = letzte.check
      ? <><b>Geschafft!</b> 🎯</>
      : <>{letzte.spieler}: <b>{letzte.wert ?? 0}</b> {letzte.wert === 1 ? 'Treffer' : 'Treffer'} · weiter bei {nummerName(nummerVon(stand.pos[wer >= 0 ? wer : 0]))}</>;
  }

  const g = stand.gewinner;
  return (
    <EingabeView
      e={e}
      uhr={{ auswertung: uhrInfo(dartsVon(p.aufnahmen, match.spieler[s]), false) }}
      tipp={{ art: 'atc', darts: dartsVon(p.aufnahmen, match.spieler[s]), aufnahmen: aufnahmenVon(p.aufnahmen, match.spieler[s]) }}
      onMenu={p.onMenu}
      oben={
        <Tafel
          namen={match.spieler}
          amZug={g === null ? s : null}
          zeilen={match.spieler.map((_, i) => ({
            gross: jetzt.pos[i] >= ATC_FOLGE.length ? '✓' : nummerName(nummerVon(jetzt.pos[i])),
            klein: `${jetzt.darts[i]} Darts · ${quote(jetzt.treffer[i], jetzt.darts[i])}`,
          }))}
        />
      }
      snackText={snack}
      overlay={g !== null ? (
        <Ende
          titel={<>🎯 {L.n > 1 ? `${match.spieler[g]} ist zuerst durch!` : 'Geschafft!'}</>}
          onNochmal={() => { e.zuruecksetzen(); L.nochmal(); }}
          onZurueck={e.rueckgaengig}
          onBeenden={() => { p.setMatch(null); p.onMenu(); }}
        >
          <p><b>{stand.darts[g]}</b> Darts · Trefferquote {quote(stand.treffer[g], stand.darts[g])}</p>
        </Ende>
      ) : undefined}
      kopfInfo={
        <>
          <span className="klein">{match.spieler[s]}</span>
          <strong>{nummerName(nummerVon(jetzt.pos[s]))}</strong>
          <span className="weg">{v === 'jedes' ? 'jedes Feld zählt' : v === 'doppel' ? 'nur Doppel' : 'nur Triple'}</span>
        </>
      }
    />
  );
}

// ===================== Bob's 27 =====================

export function BobsSpiel(p: SpielProps) {
  const { match } = p;
  const L = useLeg(p);
  const stand = bobStand(L.n, L.leg.starter, L.liste);
  const s = stand.amZug;
  const nummer = BOB_FOLGE[stand.runde];
  const w = bobWert(nummer);

  const e = useEingabe({
    merken: { name: 'bobs', id: match.id },
    zielAnzeige: 'fest',
    zielFuer: () => bobZiel(nummer),
    fertigNach: (d) => d.length >= 3,
    onFertig: (d) => {
      const nach = bobStand(L.n, L.leg.starter, [...L.liste, { hits: hits(d) }]);
      p.hinzufuegen({
        darts: d, ...zeitVon(d), modus: 'bobs', spieler: match.spieler[s], legId: L.leg.id,
        runde: stand.runde,
        wert: hits(d).filter((h) => bobTrifft(nummer, h)).length,
        check: nach.fertig && nach.gewinner.includes(s),
      });
    },
    onZurueckLeer: L.zurueck,
    zielBleibt: false,
  });

  const t = hits(e.darts).filter((h) => bobTrifft(nummer, h)).length;
  const letzte = L.legAuf[L.legAuf.length - 1];
  let snack: ReactNode;
  if (letzte && e.zuletzt) {
    const wer = Math.max(0, match.spieler.indexOf(letzte.spieler ?? ''));
    const r = letzte.runde ?? 0;
    snack = (letzte.wert ?? 0) > 0
      ? <>{letzte.spieler}: <b>+{(letzte.wert ?? 0) * bobWert(BOB_FOLGE[r])}</b> · {stand.punkte[wer]} Punkte</>
      : stand.aus[wer]
        ? <><b>Ausgeschieden!</b> {letzte.spieler} hat {stand.punkte[wer]} Punkte</>
        : <><b>Kein Treffer:</b> −{bobWert(BOB_FOLGE[r])} · {stand.punkte[wer]} Punkte</>;
  }

  const rang = match.spieler.map((nm, i) => ({ nm, i })).sort((a, b) =>
    (stand.verlauf[b.i].length - stand.verlauf[a.i].length) || (stand.punkte[b.i] - stand.punkte[a.i]));

  return (
    <EingabeView
      e={e}
      uhr={{ auswertung: uhrInfo(dartsVon(p.aufnahmen, match.spieler[s]), false) }}
      tipp={{ art: 'bobs', darts: dartsVon(p.aufnahmen, match.spieler[s]), aufnahmen: aufnahmenVon(p.aufnahmen, match.spieler[s]) }}
      onMenu={p.onMenu}
      oben={
        <Tafel
          namen={match.spieler}
          amZug={stand.fertig ? null : s}
          zeilen={match.spieler.map((_, i) => ({
            gross: stand.punkte[i],
            klein: stand.aus[i] ? 'ausgeschieden' : `Runde ${Math.min(stand.verlauf[i].length + 1, 21)}/21`,
            aus: stand.aus[i],
          }))}
        />
      }
      snackText={snack}
      overlay={stand.fertig ? (
        <Ende
          titel={<>🎯 {L.n > 1 ? `${stand.gewinner.map((g) => match.spieler[g]).join(' & ')} gewinnt!` : stand.aus[0] ? 'Ausgeschieden' : `${stand.punkte[0]} Punkte!`}</>}
          onNochmal={() => { e.zuruecksetzen(); L.nochmal(); }}
          onZurueck={e.rueckgaengig}
          onBeenden={() => { p.setMatch(null); p.onMenu(); }}
        >
          {rang.map(({ nm, i }) => {
            const tr = stand.verlauf[i].reduce((a, b) => a + b, 0);
            const dd = stand.verlauf[i].length * 3;
            return (
              <p key={nm}>
                {L.n > 1 && <>{nm}: </>}
                {stand.aus[i] ? <>raus bei {nummerName(BOB_FOLGE[stand.verlauf[i].length - 1])}</> : <><b>{stand.punkte[i]}</b> Punkte</>}
                {' '}· Doppel {tr}/{dd} ({quote(tr, dd)})
              </p>
            );
          })}
        </Ende>
      ) : undefined}
      kopfInfo={
        <>
          <span className="klein">{match.spieler[s]} · {stand.punkte[s]} Pkt</span>
          <strong>{nummer === 25 ? 'Bull' : `D${nummer}`}</strong>
          <span className="weg">{e.darts.length ? (t ? `+${t * w}` : `noch −${w}`) : `Runde ${stand.runde + 1}/21`}</span>
        </>
      }
    />
  );
}

// ===================== Doppeltraining =====================

export function DoppelSpiel(p: SpielProps) {
  const { match } = p;
  const o = match.option ?? 'finish';
  const finish = o === 'finish';
  const L = useLeg(p);
  const reste = L.leg.reste ?? [];
  const stand = doppelStand(L.n, L.leg.starter, L.liste, o, reste);
  const s = stand.amZug;
  const rest = reste[stand.runde] ?? 40;
  const festZiel: Ziel = finish ? { seg: 20, ring: 'D' } : doppelZiel(o);

  const e = useEingabe({
    merken: { name: 'doppel', id: match.id },
    zielAnzeige: finish ? 'keine' : 'fest',
    zielUnbekannt: (d) => {
      if (!finish) return false;
      const z = naechsterDart(auswerten(rest, hits(d), true).restNachher, 3 - d.length, true);
      return !(z.weg && z.weg.length === 1 && z.wurf.ziel.ring === 'D');
    },
    zielFuer: (d) => {
      if (!finish) return festZiel;
      const a = auswerten(rest, hits(d), true);
      if (a.endetNach !== null) return festZiel;
      return naechsterDart(a.restNachher, 3 - d.length, true).wurf.ziel;
    },
    fertigNach: (d) => (finish ? aufnahmeFertig(rest, hits(d), true) : d.length >= 3),
    onFertig: (d) => {
      const h = hits(d);
      const a = finish ? auswerten(rest, h, true) : null;
      p.hinzufuegen({
        darts: d, ...zeitVon(d), modus: 'doppel', option: o, spieler: match.spieler[s], legId: L.leg.id,
        runde: stand.runde,
        restVorher: finish ? rest : undefined,
        doubleOut: finish ? true : undefined,
        bust: a?.bust,
        wert: a ? (a.check ? 1 : 0) : h.filter((x) => doppelTrifft(o, x)).length,
        check: a?.check,
      });
    },
    onZurueckLeer: L.zurueck,
    zielBleibt: false,
  });

  const jetzt = finish ? auswerten(rest, hits(e.darts), true) : null;
  const weg = jetzt && !jetzt.bust ? naechsterDart(jetzt.restNachher, 3 - e.darts.length, true).weg : null;

  const letzte = L.legAuf[L.legAuf.length - 1];
  let snack: ReactNode;
  if (letzte && e.zuletzt) {
    if (finish) {
      const a = auswerten(letzte.restVorher ?? 0, hits(letzte.darts), true);
      snack = a.check ? <><b>Ausgemacht!</b> 🎯 ({letzte.restVorher})</>
        : a.bust ? <><b>Überworfen</b> bei Rest {letzte.restVorher}</>
        : <>Nicht ausgemacht · Rest {a.restNachher}</>;
    } else {
      snack = <>{letzte.spieler}: <b>{letzte.wert ?? 0}</b> von {letzte.darts.length} getroffen</>;
    }
  }

  const rang = match.spieler.map((nm, i) => ({ nm, i })).sort((a, b) => stand.erfolge[b.i] - stand.erfolge[a.i]);
  const runden = (i: number) => stand.verlauf[i].length;

  return (
    <EingabeView
      e={e}
      uhr={{ auswertung: uhrInfo(dartsVon(p.aufnahmen, match.spieler[s]), true) }}
      tipp={{ art: 'doppel', darts: dartsVon(p.aufnahmen, match.spieler[s]), aufnahmen: aufnahmenVon(p.aufnahmen, match.spieler[s]) }}
      onMenu={p.onMenu}
      oben={
        <Tafel
          namen={match.spieler}
          amZug={stand.fertig ? null : s}
          zeilen={match.spieler.map((_, i) => ({
            gross: finish ? `${stand.erfolge[i]}/${runden(i)}` : stand.erfolge[i],
            klein: finish ? 'ausgemacht' : `Treffer · ${quote(stand.erfolge[i], stand.darts[i])}`,
          }))}
        />
      }
      snackText={snack}
      overlay={stand.fertig ? (
        <Ende
          titel={<>🎯 {L.n > 1 ? `${stand.gewinner.map((g) => match.spieler[g]).join(' & ')} gewinnt!` : 'Fertig!'}</>}
          onNochmal={() => { e.zuruecksetzen(); L.nochmal(); }}
          onZurueck={e.rueckgaengig}
          onBeenden={() => { p.setMatch(null); p.onMenu(); }}
        >
          {rang.map(({ nm, i }) => (
            <p key={nm}>
              {L.n > 1 && <>{nm}: </>}
              {finish
                ? <><b>{stand.erfolge[i]}</b> von {DOPPEL_RUNDEN} ausgemacht · {stand.darts[i]} Darts</>
                : <><b>{stand.erfolge[i]}</b> von {stand.darts[i]} getroffen ({quote(stand.erfolge[i], stand.darts[i])})</>}
            </p>
          ))}
        </Ende>
      ) : undefined}
      kopfInfo={
        finish ? (
          <>
            <span className="klein">{match.spieler[s]} · Runde {stand.runde + 1}/{DOPPEL_RUNDEN} · Rest</span>
            <strong className={jetzt?.bust ? 'bust' : ''}>{jetzt?.bust ? 'Bust' : jetzt?.check ? '✓' : jetzt?.restNachher}</strong>
            {weg && <span className="weg">{wegText(weg)}</span>}
          </>
        ) : (
          <>
            <span className="klein">{match.spieler[s]}</span>
            <strong>{zielLabel(festZiel)}</strong>
            <span className="weg">Runde {stand.runde + 1}/{DOPPEL_RUNDEN}</span>
          </>
        )
      }
    />
  );
}
