// Halve-It: 9 Runden mit festem Ziel. Kein Treffer in der Runde → Punkte halbiert.
import { sameZiel } from './board';
import { EingabeView, useEingabe } from './Eingabe';
import { RUNDEN, halveStand, rundenKurz, rundenName, rundenPunkte, rundenZiele, zielFrei } from './halveit';
import { dartsVon, aufnahmenVon, neueId, type Aufnahme, type Dart, type Match } from './speicher';

interface Props {
  match: Match;
  setMatch: (m: Match | null) => void;
  aufnahmen: Aufnahme[];
  hinzufuegen: (a: Aufnahme) => void;
  letzteEntfernen: (pruef: (a: Aufnahme) => boolean) => Aufnahme | null;
  onMenu: () => void;
}

const hits = (d: Dart[]) => d.map((x) => x.hit);

function standVon(n: number, legId: string, starter: number, aufnahmen: Aufnahme[]) {
  const legAuf = aufnahmen.filter((a) => a.legId === legId);
  return { legAuf, stand: halveStand(n, starter, legAuf.map((a) => ({ hits: hits(a.darts) }))) };
}

export function HalveItSpiel({ match, setMatch, aufnahmen, hinzufuegen, letzteEntfernen, onMenu }: Props) {
  const n = match.spieler.length;
  const leg = match.legs[match.legs.length - 1];
  const { legAuf, stand } = standVon(n, leg.id, leg.starter, aufnahmen);
  const s = stand.amZug;
  const runde = RUNDEN[stand.runde];
  const ziele = rundenZiele(runde);

  const siege = match.spieler.map((_, i) =>
    match.legs.filter((l) => standVon(n, l.id, l.starter, aufnahmen).stand.gewinner.includes(i)).length,
  );

  const e = useEingabe({
    merken: { name: 'halveit', id: match.id },
    zielAnzeige: zielFrei(runde) ? 'keine' : 'fest',
    zielUnbekannt: () => zielFrei(runde),
    zielFuer: () => ziele[0],
    fertigNach: (d) => d.length >= 3,
    onFertig: (d) => {
      // Bei "beliebiges Doppel/Triple" ohne eigene Zielwahl ist das Ziel unbekannt
      const darts = zielFrei(runde) ? d.map((x) => (sameZiel(x.ziel, ziele[0]) ? { ...x, frei: true } : x)) : d;
      const h = hits(d);
      const nachher = halveStand(n, leg.starter, [...legAuf.map((a) => ({ hits: hits(a.darts) })), { hits: h }]);
      hinzufuegen({
        darts,
        start: d[0].t,
        ende: Math.max(...d.map((x) => x.t)),
        modus: 'halveit',
        spieler: match.spieler[s],
        legId: leg.id,
        runde: stand.runde,
        wert: rundenPunkte(runde, h),
        check: nachher.fertig && nachher.gewinner.includes(s),
      });
    },
    onZurueckLeer: () => (legAuf.length ? letzteEntfernen((a) => a.legId === leg.id)?.darts ?? null : null),
    zielBleibt: false,
    alternativen: () => ziele.slice(1),
  });

  const plus = rundenPunkte(runde, hits(e.darts));

  // Text nach der Aufnahme
  const letzte = legAuf[legAuf.length - 1];
  let snack: React.ReactNode = undefined;
  if (letzte && e.zuletzt) {
    const wer = (leg.starter + legAuf.length - 1) % n;
    snack = (letzte.wert ?? 0) > 0
      ? <>{letzte.spieler}: <b>+{letzte.wert}</b> · {stand.punkte[wer]} Punkte</>
      : <><b>Kein Treffer!</b> {letzte.spieler} halbiert auf {stand.punkte[wer]}</>;
  }

  const oben = (
    <table className="ctafel htafel">
      <thead>
        <tr>
          <th />
          {RUNDEN.map((r, i) => (
            <th key={i} className={i === stand.runde && !stand.fertig ? 'jetzt' : ''}>{rundenKurz(r)}</th>
          ))}
          <th>Pkt</th>
        </tr>
      </thead>
      <tbody>
        {match.spieler.map((name, i) => (
          <tr key={i} className={i === s && !stand.fertig ? 'amzug' : ''}>
            <td className="cname">{name}{match.legs.length > 1 || siege[i] ? <span className="legs"> · {siege[i]}</span> : null}</td>
            {RUNDEN.map((_, j) => {
              const v = stand.verlauf[i][j];
              return (
                <td key={j} className={'hwert' + (v === 0 ? ' halb' : '')}>
                  {v === undefined ? '' : v === 0 ? '½' : v}
                </td>
              );
            })}
            <td className="cpkt">{stand.punkte[i]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const overlay = stand.fertig && (() => {
    const rang = match.spieler.map((nm, i) => ({ nm, p: stand.punkte[i], h: stand.halbiert[i] })).sort((a, b) => b.p - a.p);
    return (
      <div className="wahl mitte">
        <div className="wahl-box ende">
          <h3>🎯 {n === 1 ? `${stand.punkte[0]} Punkte` : `${stand.gewinner.map((g) => match.spieler[g]).join(' & ')} gewinnt!`}</h3>
          {rang.map((r) => (
            <p key={r.nm}>{n > 1 && <>{r.nm}: </>}<b>{r.p}</b> Punkte · {r.h}× halbiert</p>
          ))}
          {n > 1 && match.legs.length > 1 && <p className="info">Siege: {match.spieler.map((nm, i) => `${nm} ${siege[i]}`).join(' : ')}</p>}
          <div className="ende-knoepfe">
            <button
              className="btn gross an"
              onClick={() => {
                e.zuruecksetzen();
                setMatch({ ...match, legs: [...match.legs, { id: neueId(), starter: (leg.starter + 1) % n, gewinner: null }] });
              }}
            >
              Nochmal
            </button>
            <button className="btn gross" onClick={e.rueckgaengig}>↶ Letzten Dart zurück</button>
            <button className="btn gross" onClick={() => { setMatch(null); onMenu(); }}>Beenden</button>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <EingabeView
      e={e}
      tipp={{ art: 'halveit', darts: dartsVon(aufnahmen, match.spieler[s]), aufnahmen: aufnahmenVon(aufnahmen, match.spieler[s]) }}
      onMenu={onMenu}
      oben={oben}
      snackText={snack}
      overlay={overlay || undefined}
      kopfInfo={
        <>
          <span className="klein">{match.spieler[s]}</span>
          <strong>{rundenName(runde)}</strong>
          <span className="weg">{e.darts.length ? (plus ? `+${plus}` : 'noch nichts') : `Runde ${stand.runde + 1}/9`}</span>
        </>
      }
    />
  );
}
