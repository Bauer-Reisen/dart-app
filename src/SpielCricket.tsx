// Cricket: Spielbildschirm mit Strich-Tafel.
import { NUMMERN, cricketStand, cricketVorschlag, mpr, nutzDerAufnahme, striche, zeichen, zielVon } from './cricket';
import { EingabeView, useEingabe } from './Eingabe';
import { dartsVon, neueId, type Aufnahme, type Dart, type Match } from './speicher';

interface Props {
  match: Match;
  setMatch: (m: Match | null) => void;
  aufnahmen: Aufnahme[];
  hinzufuegen: (a: Aufnahme) => void;
  letzteEntfernen: (pruef: (a: Aufnahme) => boolean) => Aufnahme | null;
  onMenu: () => void;
}

const hits = (d: Dart[]) => d.map((x) => x.hit);

function standVon(match: Match, legId: string, starter: number, aufnahmen: Aufnahme[]) {
  const legAuf = aufnahmen.filter((a) => a.legId === legId);
  const liste = legAuf.map((a) => ({ hits: hits(a.darts) }));
  return { legAuf, liste, stand: cricketStand(match.spieler.length, starter, liste, match.variante ?? 'bekommen') };
}

export function CricketSpiel({ match, setMatch, aufnahmen, hinzufuegen, letzteEntfernen, onMenu }: Props) {
  const n = match.spieler.length;
  const leg = match.legs[match.legs.length - 1];
  const { legAuf, liste, stand } = standVon(match, leg.id, leg.starter, aufnahmen);
  const s = stand.amZug;

  const siege = match.spieler.map((_, i) =>
    match.legs.filter((l) => standVon(match, l.id, l.starter, aufnahmen).stand.gewinner === i).length,
  );

  /** Stand inklusive der gerade getippten Darts. */
  const variante = match.variante ?? 'bekommen';
  const mitDarts = (d: Dart[]) => cricketStand(n, leg.starter, [...liste, { hits: hits(d) }], variante);

  const e = useEingabe({
    merken: { name: 'cricket', id: match.id },
    zielAnzeige: 'keine',
    zielUnbekannt: () => true, // man wechselt im selben Wurf das Ziel – unbekannt, also nicht ins Trefferbild
    zielFuer: (d) => zielVon(cricketVorschlag(mitDarts(d), s)[0]),
    fertigNach: (d) => d.length >= 3 || mitDarts(d).gewinner !== null,
    onFertig: (d) => {
      const h = hits(d);
      hinzufuegen({
        darts: d,
        start: d[0].t,
        ende: Math.max(...d.map((x) => x.t)),
        modus: 'cricket',
        spieler: match.spieler[s],
        legId: leg.id,
        wert: nutzDerAufnahme(n, leg.starter, liste, h, variante),
        check: cricketStand(n, leg.starter, [...liste, { hits: h }], variante).gewinner === s,
      });
    },
    onZurueckLeer: () => (legAuf.length ? letzteEntfernen((a) => a.legId === leg.id)?.darts ?? null : null),
    zielBleibt: false,
    alternativen: (_v, d) => cricketVorschlag(mitDarts(d), s).slice(1, 3).map(zielVon),
  });

  // Anzeige mit den schon getippten Darts dieser Aufnahme
  const jetzt = e.darts.length ? mitDarts(e.darts) : stand;
  const offenAlle = NUMMERN.map((_, i) => jetzt.marks.some((m) => m[i] < 3));
  const neueStriche = e.darts.reduce((sum, d) => sum + (striche(d.hit)?.n ?? 0), 0);

  const letzte = legAuf[legAuf.length - 1];
  let snack: React.ReactNode = undefined;
  if (letzte && e.zuletzt) {
    snack = letzte.check
      ? <><b>Gewonnen!</b> 🎯</>
      : <>{letzte.spieler}: <b>{letzte.wert ?? 0}</b> {letzte.wert === 1 ? 'Strich' : 'Striche'}</>;
  }

  const am = (i: number) => i === s && jetzt.gewinner === null;
  // Quer: Namen oben, Zahlen untereinander (schmale Spalte rechts). Hochkant: Spieler als Zeilen.
  const gedreht = (
    <table className="ctafel gedreht">
      <thead>
        <tr>
          <th />
          {match.spieler.map((name, i) => (
            <th key={i} className={'cname' + (am(i) ? ' amzug' : '')}>
              {(match.legs.length > 1 || siege.some(Boolean)) && <span className="legs-oben">{siege[i]}</span>}
              {name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {NUMMERN.map((z, j) => (
          <tr key={z}>
            <th className={'cnr' + (offenAlle[j] ? '' : ' zu')}>{z === 25 ? 'B' : z}</th>
            {match.spieler.map((_, i) => (
              <td key={i} className={'cmark m' + jetzt.marks[i][j] + (offenAlle[j] ? '' : ' zu') + (am(i) ? ' amzug' : '')}>{zeichen(jetzt.marks[i][j])}</td>
            ))}
          </tr>
        ))}
        {n > 1 && (
          <tr>
            <th className="cnr">{variante === 'vergeben' ? 'Minus' : 'Pkt'}</th>
            {match.spieler.map((_, i) => (
              <td key={i} className={'cpkt' + (am(i) ? ' amzug' : '')}>{jetzt.punkte[i]}</td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );

  const oben = <>{gedreht}
    <table className="ctafel normal">
      <thead>
        <tr>
          <th />
          {NUMMERN.map((z, i) => (
            <th key={z} className={offenAlle[i] ? '' : 'zu'}>{z === 25 ? 'B' : z}</th>
          ))}
          {n > 1 && <th className="pkt-kopf">{variante === 'vergeben' ? 'Minus' : 'Pkt'}</th>}
        </tr>
      </thead>
      <tbody>
        {match.spieler.map((name, i) => (
          <tr key={i} className={i === s && jetzt.gewinner === null ? 'amzug' : ''}>
            <td className="cname">{name}{match.legs.length > 1 || siege[i] ? <span className="legs"> · {siege[i]}</span> : null}</td>
            {NUMMERN.map((z, j) => (
              <td key={z} className={'cmark m' + jetzt.marks[i][j] + (offenAlle[j] ? '' : ' zu')}>{zeichen(jetzt.marks[i][j])}</td>
            ))}
            {n > 1 && <td className="cpkt">{jetzt.punkte[i]}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  </>;

  const g = stand.gewinner;
  const mprG = g !== null ? mpr(stand.nutz[g], stand.darts[g]) : null;
  const overlay = g !== null && (
    <div className="wahl mitte">
      <div className="wahl-box ende">
        <h3>🎯 {match.spieler[g]} gewinnt!</h3>
        <p>{stand.darts[g]} Darts · {mprG?.toFixed(2)} Striche pro Runde</p>
        {n > 1 && <p className="info">Stand: {match.spieler.map((nm, i) => `${nm} ${siege[i]}`).join(' : ')}</p>}
        <div className="ende-knoepfe">
          <button
            className="btn gross an"
            onClick={() => {
              e.zuruecksetzen();
              setMatch({ ...match, legs: [...match.legs, { id: neueId(), starter: (leg.starter + 1) % n, gewinner: null }] });
            }}
          >
            Nächstes Spiel
          </button>
          <button className="btn gross" onClick={e.rueckgaengig}>↶ Letzten Dart zurück</button>
          <button className="btn gross" onClick={() => { setMatch(null); onMenu(); }}>Beenden</button>
        </div>
      </div>
    </div>
  );

  const m = mpr(jetzt.nutz[s], jetzt.darts[s]);

  return (
    <EingabeView
      e={e}
      tipp={{ art: 'cricket', darts: dartsVon(aufnahmen, match.spieler[s]) }}
      onMenu={onMenu}
      oben={oben}
      snackText={snack}
      overlay={overlay || undefined}
      kopfInfo={
        <>
          <span className="klein">{match.spieler[s]}{n > 1 ? ` · ${jetzt.punkte[s]} ${variante === 'vergeben' ? 'Minuspunkte' : 'Pkt'}` : ''}</span>
          <strong>{e.darts.length ? `+${neueStriche}` : m !== null ? m.toFixed(1) : '–'}</strong>
          <span className="weg">{e.darts.length ? 'Striche' : 'Striche/Runde'}</span>
        </>
      }
    />
  );
}
