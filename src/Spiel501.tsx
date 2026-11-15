// 501 / 301: Einstellungen und Spielbildschirm.
import { useEffect, useState } from 'react';
import type { Ziel } from './board';
import { naechsterDart, wegText } from './checkout';
import { EingabeView, useEingabe } from './Eingabe';
import { computerAufnahme, sigmaFuer } from './gegner';
import { simulationMerken } from './liga';
import { hitLabel } from './board';
import { zufallsReste } from './uebungen';
import { UEBUNGS_TIPPS } from './tipps';
import { ICH, dartsVon, neueId, type Aufnahme, type Dart, type SpielArt, type X01Match } from './speicher';
import { auswerten, aufnahmeFertig, average, legStand, type X01Regeln } from './x01';

const T20: Ziel = { seg: 20, ring: 'T' };
const T19: Ziel = { seg: 19, ring: 'T' };
const KEY_NAMEN = 'dart-x01-namen';
const KEY_EXTRA = 'dart-x01-extra';
export const COMPUTER = 'Computer';

/** Neues 501-Match gegen den Computer (z. B. aus der Liga-Vorbereitung). */
export function computerMatch(avg: number, legsZiel: number, name = ICH): X01Match {
  return {
    id: neueId(), art: 'x01', spieler: [name, COMPUTER], start: 501, doubleOut: true,
    computer: { platz: 1, avg }, legsZiel, legs: [{ id: neueId(), starter: 0, gewinner: null }],
  };
}

// ---------------- Einstellungen ----------------

const TITEL: Record<SpielArt, string> = {
  x01: 'Neues Spiel: 501 / 301',
  cricket: 'Neues Spiel: Cricket',
  halveit: 'Neues Spiel: Halve-It',
  atc: 'Around the Clock',
  bobs: "Bob's 27",
  doppel: 'Doppeltraining',
};
const OPTION_START: Partial<Record<SpielArt, string>> = { atc: 'jedes', doppel: 'finish' };
const DOPPEL_WAHL = ['D20', 'D16', 'D8', 'D10', 'D18', 'D12', 'D4', 'D2', 'Bull'];

export function SpielNeu({ art, onStart, onAbbruch }: { art: SpielArt; onStart: (m: X01Match) => void; onAbbruch: () => void }) {
  const [namen, setNamen] = useState<string[]>(() => {
    try {
      const n = JSON.parse(localStorage.getItem(KEY_NAMEN) ?? 'null');
      if (Array.isArray(n) && n.length) return n;
    } catch { /* egal */ }
    return [ICH];
  });
  const [start, setStart] = useState(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [variante, setVariante] = useState<'bekommen' | 'vergeben'>(() => {
    try { return localStorage.getItem('dart-cricket-variante') === 'vergeben' ? 'vergeben' : 'bekommen'; } catch { return 'bekommen'; }
  });

  const [extra, setExtra] = useState<{ computer: boolean; avg: number; legsZiel: number }>(() => {
    try {
      const x = JSON.parse(localStorage.getItem(KEY_EXTRA) ?? 'null');
      if (x && typeof x.avg === 'number') return x;
    } catch { /* egal */ }
    return { computer: false, avg: 45, legsZiel: 0 };
  });
  const mitComputer = art === 'x01' && extra.computer;
  const maxSpieler = mitComputer ? 3 : 4;

  const [option, setOption] = useState<string | undefined>(() => {
    try { return localStorage.getItem(`dart-${art}-option`) ?? OPTION_START[art]; } catch { return OPTION_START[art]; }
  });

  function los() {
    const spieler = namen.slice(0, maxSpieler).map((n, i) => n.trim() || `Spieler ${i + 1}`);
    try { localStorage.setItem(KEY_NAMEN, JSON.stringify(spieler)); } catch { /* egal */ }
    if (art === 'x01') {
      try { localStorage.setItem(KEY_EXTRA, JSON.stringify(extra)); } catch { /* egal */ }
      if (mitComputer) {
        onStart({
          id: neueId(), art, spieler: [...spieler, COMPUTER], start, doubleOut,
          computer: { platz: spieler.length, avg: extra.avg }, legsZiel: extra.legsZiel || undefined,
          legs: [{ id: neueId(), starter: 0, gewinner: null }],
        });
        return;
      }
    }
    try { if (art === 'cricket') localStorage.setItem('dart-cricket-variante', variante); } catch { /* egal */ }
    try { if (option) localStorage.setItem(`dart-${art}-option`, option); } catch { /* egal */ }
    const reste = art === 'doppel' && option === 'finish' ? zufallsReste() : undefined;
    onStart({ id: neueId(), art, spieler, start, doubleOut, variante, option, legsZiel: art === 'x01' ? extra.legsZiel || undefined : undefined, legs: [{ id: neueId(), starter: 0, gewinner: null, reste }] });
  }

  return (
    <div className="seite">
      <div className="stats-kopf">
        <button className="btn" onClick={onAbbruch}>‹ Menü</button>
        <h2>{TITEL[art]}</h2>
      </div>

      {art === 'cricket' && <>
        <p className="info">
          Zahlen 15–20 und Bull je dreimal treffen (Triple = 3, Doppel = 2 Striche). Allein: alles in möglichst wenig Darts schließen.
        </p>
        <h3>Punkte</h3>
        <div className="ringwahl">
          <button className={'btn' + (variante === 'bekommen' ? ' an' : '')} onClick={() => setVariante('bekommen')}>Punkte bekommen</button>
          <button className={'btn' + (variante === 'vergeben' ? ' an' : '')} onClick={() => setVariante('vergeben')}>Punkte vergeben</button>
        </div>
        <p className="info klein">
          {variante === 'bekommen'
            ? 'Triffst du eine Zahl, die du schon zu hast und ein Gegner noch offen hat, bekommst du die Punkte. Gewinner: alles zu und die meisten Punkte.'
            : 'Triffst du eine Zahl, die du schon zu hast, bekommen alle Gegner, die sie noch offen haben, die Punkte aufgeschrieben. Gewinner: alles zu und die wenigsten Punkte.'}
        </p>
      </>}

      {art === 'atc' && <>
        <p className="info">Die Zahlen 1 bis 20 der Reihe nach treffen, zum Schluss Bull. Ziel: möglichst wenig Darts.</p>
        <h3>Was zählt</h3>
        <div className="ringwahl">
          {([['jedes', 'jedes Feld'], ['doppel', 'nur Doppel'], ['triple', 'nur Triple']] as const).map(([k, t]) => (
            <button key={k} className={'btn' + (option === k ? ' an' : '')} onClick={() => setOption(k)}>{t}</button>
          ))}
        </div>
      </>}

      {art === 'bobs' && <>
        <p className="info">
          Du startest mit <b>27 Punkten</b>. Runde für Runde je 3 Darts auf D1, D2 … D20 und zum Schluss Bull.
        </p>
        <p className="info">
          Jeder Treffer bringt den Wert des Doppels (D5 = +10). Triffst du gar nicht, wird der Wert abgezogen.
          Fällt dein Stand auf 0 oder darunter, bist du raus.
        </p>
        <p className="info klein">Gut für die Doppel-Sicherheit. Ganz durchkommen ist schon ein Erfolg.</p>
      </>}

      {art === 'doppel' && <>
        <p className="info">10 Runden zu je 3 Darts.</p>
        <h3>Übung</h3>
        <div className="ringwahl">
          <button className={'btn' + (option === 'finish' ? ' an' : '')} onClick={() => setOption('finish')}>Finish 2–40</button>
          <button className={'btn' + (option !== 'finish' ? ' an' : '')} onClick={() => setOption(option !== 'finish' ? option : 'D16')}>Ein Doppel</button>
        </div>
        {option === 'finish' ? (
          <p className="info klein">
            Jede Runde ein zufälliger Rest zwischen 2 und 40 – wie am Ende eines Legs. Ausmachen mit Doppel,
            Überwerfen beendet die Runde. Die App zeigt, wohin du nach einem Fehlwurf weiterwirfst.
          </p>
        ) : (
          <>
            <div className="doppelwahl">
              {DOPPEL_WAHL.map((d) => (
                <button key={d} className={'btn' + (option === d ? ' an' : '')} onClick={() => setOption(d)}>{d}</button>
              ))}
            </div>
            <p className="info klein">Immer auf dasselbe Doppel – für dein Lieblingsdoppel.</p>
          </>
        )}
      </>}

      {art === 'halveit' && <>
        <p className="info">
          9 Runden, jede mit festem Ziel: <b>15 · 16 · beliebiges Doppel · 17 · 18 · beliebiges Triple · 19 · 20 · Bull</b>.
          Pro Runde 3 Darts, nur Treffer aufs Rundenziel zählen.
        </p>
        <p className="info">Triffst du in einer Runde gar nicht, wird dein Punktestand <b>halbiert</b>. Am Ende gewinnen die meisten Punkte.</p>
        <p className="info klein">
          Doppel- und Triple-Runde: Tippe vor dem Wurf dein Ziel an (z. B. D16), dann zählt der Dart auch fürs Trefferbild.
        </p>
      </>}

      {art === 'x01' && <>
      <h3>Punkte</h3>
      <div className="ringwahl">
        {[501, 301].map((s) => (
          <button key={s} className={'btn' + (start === s ? ' an' : '')} onClick={() => setStart(s)}>{s}</button>
        ))}
      </div>

      <h3>Ausmachen</h3>
      <div className="ringwahl">
        <button className={'btn' + (doubleOut ? ' an' : '')} onClick={() => setDoubleOut(true)}>mit Doppel</button>
        <button className={'btn' + (!doubleOut ? ' an' : '')} onClick={() => setDoubleOut(false)}>beliebig</button>
      </div>

      <h3>Länge</h3>
      <div className="ringwahl">
        {[[0, 'offen'], [2, 'Best of 3'], [3, 'Best of 5'], [4, 'Best of 7']].map(([k, t]) => (
          <button key={k} className={'btn' + (extra.legsZiel === k ? ' an' : '')} onClick={() => setExtra({ ...extra, legsZiel: k as number })}>{t}</button>
        ))}
      </div>
      {extra.legsZiel > 0 && <p className="info klein">Wer zuerst {extra.legsZiel} Legs gewinnt, gewinnt das Spiel.</p>}

      <h3>Computer-Gegner</h3>
      <div className="ringwahl">
        <button className={'btn' + (!extra.computer ? ' an' : '')} onClick={() => setExtra({ ...extra, computer: false })}>ohne</button>
        <button className={'btn' + (extra.computer ? ' an' : '')} onClick={() => setExtra({ ...extra, computer: true })}>mit Computer</button>
      </div>
      {extra.computer && (
        <div className="avgwahl">
          <button className="btn" onClick={() => setExtra({ ...extra, avg: Math.max(25, extra.avg - 1) })} aria-label="schwächer">−</button>
          <input type="range" min={25} max={95} value={extra.avg} onChange={(ev) => setExtra({ ...extra, avg: Number(ev.target.value) })} aria-label="Stärke des Computers" />
          <button className="btn" onClick={() => setExtra({ ...extra, avg: Math.min(95, extra.avg + 1) })} aria-label="stärker">＋</button>
          <b>Ø {extra.avg}</b>
        </div>
      )}
      {extra.computer && <p className="info klein">Der Computer wirft im Schnitt etwa diesen Average (3-Dart-Durchschnitt). Seine Würfe zählen nicht in deine Statistik.</p>}
      </>}

      <div className="hinweis">
        <b>💡 Tipps</b>
        <ul>{UEBUNGS_TIPPS[art].map((p) => <li key={p}>{p}</li>)}</ul>
        <div className="uebung">Während des Spiels jederzeit über 💡 – dort auch Hinweise zu deinem Wurfbild.</div>
      </div>

      <h3>Spieler (Reihenfolge = wer anfängt)</h3>
      {namen.slice(0, maxSpieler).map((n, i) => (
        <div className="spielerzeile" key={i}>
          <input
            value={n}
            maxLength={16}
            placeholder={`Spieler ${i + 1}`}
            onChange={(ev) => setNamen(namen.map((x, j) => (j === i ? ev.target.value : x)))}
          />
          {namen.length > 1 && (
            <button className="btn" onClick={() => setNamen(namen.filter((_, j) => j !== i))} aria-label="Spieler entfernen">✕</button>
          )}
        </div>
      ))}
      {namen.length < maxSpieler && (
        <button className="btn" onClick={() => setNamen([...namen, ''])}>＋ Spieler</button>
      )}

      <button className="btn gross los" onClick={los}>Spiel starten</button>
    </div>
  );
}

// ---------------- Spiel ----------------

interface Props {
  match: X01Match;
  setMatch: (m: X01Match | null) => void;
  aufnahmen: Aufnahme[];
  hinzufuegen: (a: Aufnahme) => void;
  letzteEntfernen: (pruef: (a: Aufnahme) => boolean, mitBot?: boolean) => Aufnahme | null;
  onMenu: () => void;
}

const hits = (d: Dart[]) => d.map((x) => x.hit);
const BOT_MS = 650;

function standVon(match: X01Match, legId: string, starter: number, aufnahmen: Aufnahme[]) {
  const regeln: X01Regeln = { start: match.start, doubleOut: match.doubleOut };
  const legAuf = aufnahmen.filter((a) => a.legId === legId);
  return { legAuf, stand: legStand(match.spieler.length, starter, regeln, legAuf.map((a) => ({ hits: hits(a.darts) }))) };
}

export function X01Spiel({ match, setMatch, aufnahmen, hinzufuegen, letzteEntfernen, onMenu }: Props) {
  const n = match.spieler.length;
  const leg = match.legs[match.legs.length - 1];
  const { legAuf, stand } = standVon(match, leg.id, leg.starter, aufnahmen);
  const s = stand.amZug;
  const rest = stand.rest[s];
  const dOut = match.doubleOut;
  const bot = match.computer;

  const legStaende = match.legs.map((l) => standVon(match, l.id, l.starter, aufnahmen).stand);
  const legsGewonnen = match.spieler.map((_, i) => legStaende.filter((st) => st.gewinner === i).length);
  const matchSieger = match.legsZiel ? legsGewonnen.findIndex((x) => x >= match.legsZiel!) : -1;
  const botAmZug = !!bot && s === bot.platz && stand.gewinner === null;
  const ich = bot ? (bot.platz === 0 ? 1 : 0) : 0;
  const nameVon = (i: number) => (bot?.platz === i ? 'Computer' : match.spieler[i]);

  const e = useEingabe({
    merken: { name: 'x01', id: match.id },
    zielFuer: (d) => {
      const a = auswerten(rest, hits(d), dOut);
      if (a.endetNach !== null) return T20;
      return naechsterDart(a.restNachher, 3 - d.length, dOut).wurf.ziel;
    },
    fertigNach: (d) => aufnahmeFertig(rest, hits(d), dOut),
    onFertig: (d) => {
      const a = auswerten(rest, hits(d), dOut);
      hinzufuegen({
        darts: d,
        start: d[0].t,
        ende: Math.max(...d.map((x) => x.t)),
        modus: 'x01',
        spieler: match.spieler[s],
        legId: leg.id,
        restVorher: rest,
        doubleOut: dOut,
        bust: a.bust,
        check: a.check,
      });
    },
    onZurueckLeer: () => (legAuf.length ? letzteEntfernen((a) => a.legId === leg.id, !!bot)?.darts ?? null : null),
    zielBleibt: false,
    alternativen: () => [T20, T19],
  });

  // Computer am Zug: Darts nacheinander zeigen, dann speichern
  const [botDarts, setBotDarts] = useState<Dart[] | null>(null);
  const [botZeig, setBotZeig] = useState(0);
  useEffect(() => {
    if (!botAmZug || !bot) return;
    const t0 = Date.now();
    const geplant: Dart[] = computerAufnahme(rest, dOut, sigmaFuer(bot.avg)).map((x, i) => ({ hit: x.hit, ziel: x.ziel, t: t0 + (i + 1) * BOT_MS }));
    setBotDarts(geplant);
    setBotZeig(0);
    const timer = geplant.map((_, i) => window.setTimeout(() => setBotZeig(i + 1), (i + 1) * BOT_MS));
    timer.push(window.setTimeout(() => {
      const a = auswerten(rest, hits(geplant), dOut);
      hinzufuegen({
        darts: geplant, start: geplant[0].t, ende: geplant[geplant.length - 1].t, modus: 'x01',
        spieler: match.spieler[s], legId: leg.id, restVorher: rest, doubleOut: dOut, bust: a.bust, check: a.check, bot: true,
      });
      setBotDarts(null);
    }, (geplant.length + 1.6) * BOT_MS));
    return () => timer.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botAmZug, leg.id, legAuf.length]);

  // Anzeige für den Spieler am Zug, mit den schon getippten Darts
  const jetzt = auswerten(rest, hits(e.darts), dOut);
  const weg = jetzt.bust ? null : naechsterDart(jetzt.restNachher, 3 - e.darts.length, dOut).weg;

  // Text nach der Aufnahme
  const letzte = legAuf[legAuf.length - 1];
  let snack: React.ReactNode = undefined;
  if (letzte && e.zuletzt) {
    const a = auswerten(letzte.restVorher ?? 0, hits(letzte.darts), letzte.doubleOut ?? true);
    snack = a.bust
      ? <><b>Überworfen!</b> {letzte.spieler} bleibt auf {letzte.restVorher}</>
      : a.check
        ? <><b>Ausgemacht!</b> 🎯</>
        : <>{letzte.spieler}: <b>{a.punkte}</b> · Rest {a.restNachher}</>;
  }

  const oben = (
    <div className={'tafel n' + n}>
      {match.spieler.map((name, i) => {
        const av = average(stand.punkte[i], stand.darts[i]);
        return (
          <div key={i} className={'spieler' + (i === s && stand.gewinner === null ? ' amzug' : '')}>
            <div className="sp-name">
              {bot?.platz === i ? `🤖 Ø ${bot.avg}` : name}
              {match.legs.length > 1 || legsGewonnen[i] || match.legsZiel ? <span className="legs"> · {legsGewonnen[i]}</span> : null}
            </div>
            <div className="sp-rest">{stand.rest[i]}</div>
            <div className="sp-av">{av !== null ? `Ø ${av.toFixed(1)}` : ' '}</div>
          </div>
        );
      })}
    </div>
  );

  // Average eines Spielers über alle Legs dieses Matches
  const matchAvg = (i: number) =>
    average(legStaende.reduce((x, st) => x + st.punkte[i], 0), legStaende.reduce((x, st) => x + st.darts[i], 0));

  function neuesMatch() {
    e.zuruecksetzen();
    setMatch({ ...match, id: neueId(), legs: [{ id: neueId(), starter: (match.legs[0].starter + 1) % n, gewinner: null }] });
  }
  function merken() {
    if (!bot || matchSieger < 0) return;
    simulationMerken({ zeit: Date.now(), gegnerAvg: bot.avg, legsIch: legsGewonnen[ich], legsComputer: legsGewonnen[bot.platz], average: matchAvg(ich) });
  }

  const g = stand.gewinner;
  let overlay: React.ReactNode = undefined;
  if (botDarts && g === null) {
    const gezeigt = botDarts.slice(0, botZeig);
    const a = auswerten(rest, hits(gezeigt), dOut);
    overlay = (
      <div className="wahl mitte">
        <div className="wahl-box bot-box">
          <h3>🤖 Computer wirft …</h3>
          <div className="bot-darts">
            {[0, 1, 2].map((i) => (
              <span key={i} className={'feld' + (gezeigt[i] ? '' : ' leer')}>{gezeigt[i] ? hitLabel(gezeigt[i].hit) : '–'}</span>
            ))}
          </div>
          <p>{a.bust ? <b className="bust">Überworfen!</b> : a.check ? <b>Ausgemacht!</b> : <>{a.punkte} Punkte · Rest <b>{a.restNachher}</b></>}</p>
        </div>
      </div>
    );
  } else if (g !== null && matchSieger >= 0) {
    overlay = (
      <div className="wahl mitte">
        <div className="wahl-box ende">
          <h3>🏆 {nameVon(matchSieger)} gewinnt {legsGewonnen[matchSieger]} : {Math.max(...legsGewonnen.filter((_, i) => i !== matchSieger))}</h3>
          {match.spieler.map((_, i) => (
            <p key={i}>{bot?.platz === i ? `Computer (eingestellt Ø ${bot.avg})` : match.spieler[i]}: Ø <b>{matchAvg(i)?.toFixed(1) ?? '–'}</b></p>
          ))}
          <div className="ende-knoepfe">
            <button className="btn gross an" onClick={() => { merken(); neuesMatch(); }}>Neues Spiel</button>
            <button className="btn gross" onClick={e.rueckgaengig}>↶ Letzten Dart zurück</button>
            <button className="btn gross" onClick={() => { merken(); setMatch(null); onMenu(); }}>Beenden</button>
          </div>
        </div>
      </div>
    );
  } else if (g !== null) {
    overlay = (
      <div className="wahl mitte">
        <div className="wahl-box ende">
          <h3>🎯 {nameVon(g)} gewinnt das Leg!</h3>
          <p>
            {stand.darts[g]} Darts · Ø {average(stand.punkte[g], stand.darts[g])?.toFixed(1)}
          </p>
          {n > 1 && <p className="info">Stand: {match.spieler.map((_, i) => `${nameVon(i)} ${legsGewonnen[i]}`).join(' : ')}</p>}
          <div className="ende-knoepfe">
            <button
              className="btn gross an"
              onClick={() => {
                e.zuruecksetzen();
                setMatch({ ...match, legs: [...match.legs, { id: neueId(), starter: (leg.starter + 1) % n, gewinner: null }] });
              }}
            >
              Nächstes Leg
            </button>
            <button className="btn gross" onClick={e.rueckgaengig}>↶ Letzten Dart zurück</button>
            <button className="btn gross" onClick={() => { setMatch(null); onMenu(); }}>Spiel beenden</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EingabeView
      e={e}
      tipp={{ art: 'x01', darts: dartsVon(aufnahmen.filter((a) => !a.bot), match.spieler[botAmZug ? ich : s]) }}
      onMenu={onMenu}
      oben={oben}
      snackText={snack}
      overlay={overlay}
      kopfInfo={
        botAmZug ? (
          <>
            <span className="klein">Computer · noch</span>
            <strong>{rest}</strong>
          </>
        ) : (
          <>
            <span className="klein">{match.spieler[s]} · noch</span>
            <strong className={jetzt.bust ? 'bust' : ''}>{jetzt.bust ? 'Bust' : jetzt.restNachher}</strong>
            {weg && <span className="weg">{wegText(weg)}</span>}
          </>
        )
      }
    />
  );
}
