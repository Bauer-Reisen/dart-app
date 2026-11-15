// Liga-Reiter: nächster Spieltag, Vorbereitungsplan, Computer-Gegner, Ergebnisse, Gegner.
import { useEffect, useState, type ReactNode } from 'react';
import { nuLigaHolen, nuLigaUebernehmen, type NuLigaAntwort } from './nuligaImport';
import { NuLigaVerbinden } from './NuLigaVerbinden';
import {
  bilanz, datumText, doppelQuote, gegnerNamen, gegnerVerlauf, gewonnen, heuteText, letzterSpieltag, ligaLaden,
  ligaSpeichern, naechsterSpieltag, phase, sortiert, spieltagAverage, staerken, tageBis, trainingsAverage,
  type LigaDaten, type LigaSpiel, type Spieltag,
} from './liga';
import { neueId, type Aufnahme, type SpielArt } from './speicher';

interface Props {
  aufnahmen: Aufnahme[];
  onTraining: () => void;
  onNeu: (art: SpielArt) => void;
  onComputer: (avg: number, legsZiel: number) => void;
}

const TAG = 86400000;
const zahl = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const bestOf = (legs: number) => `Best of ${legs * 2 - 1}`;

function countdown(tage: number): string {
  if (tage === 0) return 'Heute!';
  if (tage === 1) return 'Morgen';
  return `noch ${tage} Tage`;
}

export function Liga({ aufnahmen, onTraining, onNeu, onComputer }: Props) {
  const [daten, setDaten] = useState<LigaDaten>(() => ligaLaden());
  const [bearbeiten, setBearbeiten] = useState<Spieltag | null>(null);
  const [verbinden, setVerbinden] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);

  function setzen(d: LigaDaten) {
    setDaten(d);
    ligaSpeichern(d);
  }

  /** Neueste Daten von nuLiga holen und übernehmen. */
  async function aktualisieren(basis: LigaDaten) {
    const v = basis.nuliga;
    if (!v) return;
    setLaedt(true);
    setMeldung(null);
    try {
      const a = await nuLigaHolen<NuLigaAntwort>('daten', { region: v.region, staffel: v.staffel, team: v.team, person: v.person });
      const d = nuLigaUebernehmen({ ...ligaLaden(), nuliga: v }, a); // frisch laden, falls inzwischen etwas eingetragen wurde
      setzen(d);
    } catch (e) {
      setMeldung(navigator.onLine ? `Liga-Daten gerade nicht erreichbar (${(e as Error).message}).` : 'Kein Internet – Liga-Daten werden beim nächsten Mal geholt.');
    } finally {
      setLaedt(false);
    }
  }

  // Beim Öffnen automatisch aktualisieren, wenn die letzten Daten älter als 3 Stunden sind
  useEffect(() => {
    const v = daten.nuliga;
    if (v && (!v.stand || Date.now() - v.stand > 3 * 3600000)) aktualisieren(daten);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (verbinden) {
    return (
      <NuLigaVerbinden
        onAbbruch={() => setVerbinden(false)}
        onFertig={(v) => {
          const d = { ...daten, nuliga: v };
          setzen(d);
          setVerbinden(false);
          aktualisieren(d);
        }}
      />
    );
  }

  if (bearbeiten) {
    return (
      <SpieltagSeite
        st={bearbeiten}
        daten={daten}
        neu={!daten.spieltage.some((s) => s.id === bearbeiten.id)}
        onFertig={(st) => {
          if (st) setzen({ ...daten, spieltage: [...daten.spieltage.filter((s) => s.id !== st.id), st] });
          setBearbeiten(null);
          window.scrollTo(0, 0);
        }}
        onLoeschen={() => {
          setzen({ ...daten, spieltage: daten.spieltage.filter((s) => s.id !== bearbeiten.id) });
          setBearbeiten(null);
        }}
      />
    );
  }

  const jetzt = new Date();
  const naechster = naechsterSpieltag(daten.spieltage, jetzt);
  const letzter = letzterSpieltag(daten.spieltage, jetzt);
  const tage = naechster ? tageBis(naechster.datum, jetzt) : null;
  const tr = trainingsAverage(aufnahmen, Date.now() - 30 * TAG);
  const st = staerken(naechster, tr.avg);
  const legs = daten.legsZiel;
  const neuerSpieltag = () => setBearbeiten({ id: neueId(), datum: heuteText(new Date(Date.now() + 7 * TAG)), zeit: '19:00', gegner: '', heim: true, spiele: [] });

  const computerKnoepfe = (
    <div className="ringwahl staerke">
      {([['schwach', st.schwach], ['mittel', st.mittel], ['stark', st.stark]] as const).map(([t, avg]) => (
        <button key={t} className="btn" onClick={() => onComputer(avg, legs)}>
          <small>{t}</small>
          <b>Ø {avg}</b>
        </button>
      ))}
    </div>
  );

  return (
    <div className="seite liga">
      <h1>Liga</h1>

      {daten.nuliga && (
        <div className="nuliga-zeile">
          <span>
            📡 {daten.nuliga.teamName} · {daten.nuliga.name}
            <br />
            <small>
              {laedt
                ? 'wird aktualisiert …'
                : daten.nuliga.stand
                  ? `Stand: ${new Date(daten.nuliga.stand).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr`
                  : 'noch nicht geladen'}
            </small>
          </span>
          <button className="btn" disabled={laedt} onClick={() => aktualisieren(daten)} aria-label="Aktualisieren">↻</button>
        </div>
      )}
      {meldung && <p className="info klein">{meldung}</p>}

      {!daten.spieltage.length && !daten.nuliga && (
        <div className="karte">
          <p>Du spielst in einer Liga? Dann plant die App deine Vorbereitung bis zum nächsten Spieltag und stellt den Computer-Gegner auf die Stärke der Gegner ein.</p>
          <button className="btn gross los an" onClick={() => setVerbinden(true)}>Mit meiner Liga verbinden</button>
          <p className="info klein">Für Ligen des Bayerischen Dart-Verbands (nuLiga): Spielplan, Gegner-Stärke und deine Ergebnisse kommen dann von selbst.</p>
          <button className="btn breit" onClick={neuerSpieltag}>＋ Spieltag von Hand eintragen</button>
        </div>
      )}

      {naechster && tage !== null && (
        <button className="kachel weiter spieltag" onClick={() => setBearbeiten(naechster)}>
          <span>Nächster Spieltag · {datumText(naechster.datum)}{naechster.zeit ? `, ${naechster.zeit} Uhr` : ''}</span>
          <b>{naechster.heim ? `gegen ${naechster.gegner}` : `bei ${naechster.gegner}`}</b>
          <strong className="countdown">{countdown(tage)}</strong>
          <span>
            {naechster.avgVon && naechster.avgBis
              ? `Gegner spielen zwischen Ø ${naechster.avgVon} und Ø ${naechster.avgBis}`
              : 'Tipp: Averages der Gegner eintragen (stehen im Spielbericht deiner Liga)'}
          </span>
        </button>
      )}

      {letzter && !letzter.spiele.length && !letzter.ergebnis && (
        <button className="kachel nachtragen" onClick={() => setBearbeiten(letzter)}>
          <b>Wie lief es {letzter.heim ? 'gegen' : 'bei'} {letzter.gegner}?</b>
          <span>{datumText(letzter.datum)} · Ergebnisse und Notizen eintragen</span>
        </button>
      )}

      {daten.spieltage.length > 0 && (
        <Plan
          tage={tage}
          aufnahmen={aufnahmen}
          letzter={letzter}
          daten={daten}
          trainingAvg={tr.avg}
          computerKnoepfe={computerKnoepfe}
          onTraining={onTraining}
          onNeu={onNeu}
          onComputer={(avg) => onComputer(avg, 1)}
          mittel={st.mittel}
        />
      )}

      <h3>Gegen den Computer üben ({bestOf(legs)}, 501 Doppel-Aus)</h3>
      {computerKnoepfe}
      <p className="info klein">
        {st.geschaetzt
          ? 'Geschätzt aus deinem Training. Trag beim Spieltag die Averages der Gegner ein, dann passt der Computer genau.'
          : `Eingestellt auf die Gegner von ${naechster?.gegner}.`}
      </p>

      <Saison daten={daten} trainingAvg={tr.avg} />

      <h3>Spieltage</h3>
      {sortiert(daten.spieltage).map((s) => {
        const t = tageBis(s.datum, jetzt);
        const ein = s.spiele.filter((x) => x.art === 'einzel');
        const av = spieltagAverage(s);
        return (
          <button key={s.id} className={'zeile-spieltag' + (t < 0 ? ' vorbei' : '')} onClick={() => setBearbeiten(s)}>
            <span className="datum">{datumText(s.datum)}</span>
            <span className="wer">{s.heim ? 'gegen' : 'bei'} {s.gegner}</span>
            <span className="erg">
              {s.spiele.length
                ? `${ein.filter(gewonnen).length} von ${ein.length} ✓${av ? ` · Ø ${av.toFixed(1).replace('.', ',')}` : ''}`
                : s.ergebnis ? `Team ${s.ergebnis}` : t < 0 ? 'nachtragen' : ''}
            </span>
          </button>
        );
      })}
      <button className="btn breit" onClick={neuerSpieltag}>＋ Spieltag</button>

      <Gegner daten={daten} />

      <h3>Einstellungen</h3>
      {daten.nuliga ? (
        <div className="ringwahl">
          <button className="btn" onClick={() => setVerbinden(true)}>Liga/Namen ändern</button>
          <button
            className="btn"
            onClick={() => { if (confirm('Verbindung zur Liga trennen? Deine Spieltage bleiben.')) setzen({ ...daten, nuliga: undefined }); }}
          >
            Trennen
          </button>
        </div>
      ) : (
        <button className="btn breit" onClick={() => setVerbinden(true)}>📡 Mit meiner Liga verbinden (nuLiga)</button>
      )}
      <p className="info klein">Länge eines Spiels in deiner Liga</p>
      <div className="ringwahl">
        {[2, 3, 4].map((k) => (
          <button key={k} className={'btn' + (legs === k ? ' an' : '')} onClick={() => setzen({ ...daten, legsZiel: k })}>{bestOf(k)}</button>
        ))}
      </div>
      <p className="info klein">Seite deiner Liga (z. B. bei nuLiga), zum schnellen Nachschauen</p>
      <div className="spielerzeile">
        <input
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={daten.link ?? ''}
          onChange={(e) => setzen({ ...daten, link: e.target.value.trim() || undefined })}
        />
        {daten.link?.startsWith('http') && <a className="btn" href={daten.link} target="_blank" rel="noreferrer">Öffnen ↗</a>}
      </div>
      <p className="info klein">Alle Liga-Daten liegen nur auf diesem Gerät und werden mit „Als Datei sichern" (Statistik) mitgesichert.</p>
    </div>
  );
}

// ---------------- Vorbereitungsplan ----------------

function Aufgabe({ titel, text, knopf, onClick }: { titel: string; text?: ReactNode; knopf?: string; onClick?: () => void }) {
  return (
    <li className="aufgabe">
      <div>
        <b>{titel}</b>
        {text && <span>{text}</span>}
      </div>
      {knopf && <button className="btn" onClick={onClick}>{knopf}</button>}
    </li>
  );
}

function Plan(p: {
  tage: number | null;
  aufnahmen: Aufnahme[];
  letzter: Spieltag | null;
  daten: LigaDaten;
  trainingAvg: number | null;
  computerKnoepfe: ReactNode;
  mittel: number;
  onTraining: () => void;
  onNeu: (art: SpielArt) => void;
  onComputer: (avg: number) => void;
}) {
  const ph = p.tage === null ? 'schwaechen' : phase(p.tage);
  const seitLetztem = p.letzter ? new Date(p.letzter.datum).getTime() + TAG : Date.now() - 21 * TAG;
  const sims = p.daten.simulationen.filter((s) => s.zeit >= seitLetztem);
  const simSiege = sims.filter((s) => s.legsIch > s.legsComputer).length;
  const dq = doppelQuote(p.aufnahmen, Date.now() - 30 * TAG);
  const notizen = p.letzter
    ? [p.letzter.notiz, ...p.letzter.spiele.map((s) => s.notiz)].filter((x): x is string => !!x?.trim())
    : [];

  let titel = '';
  let text = '';
  let liste: ReactNode = null;

  if (ph === 'schwaechen') {
    titel = p.tage === null ? 'An deinen Schwächen arbeiten' : `Noch ${p.tage} Tage: Zeit für deine Schwächen`;
    text = 'Jetzt ist Zeit für gezielte Übungen. Lieber 3–4 kurze Einheiten pro Woche als eine lange.';
    liste = (
      <>
        {notizen.length > 0 && <Aufgabe titel="Vom letzten Spieltag" text={notizen.join(' · ')} />}
        <Aufgabe
          titel="Doppel sicherer machen"
          text={dq.quote !== null ? `Deine Doppelquote (30 Tage): ${Math.round(dq.quote * 100)} %` : 'Ligaspiele werden oft auf dem Doppel entschieden.'}
          knopf="Doppeltraining"
          onClick={() => p.onNeu('doppel')}
        />
        <Aufgabe
          titel="Scoring: T20 und T19"
          text={p.trainingAvg !== null ? `Dein 501-Average im Training: ${p.trainingAvg.toFixed(1).replace('.', ',')}` : 'Gleichmäßig punkten bringt dich schneller ins Finish.'}
          knopf="Zieltraining"
          onClick={p.onTraining}
        />
        <Aufgabe titel="Doppel unter Druck" text="Jeder Fehlwurf kostet Punkte – wie im Spiel." knopf="Bob's 27" onClick={() => p.onNeu('bobs')} />
      </>
    );
  } else if (ph === 'simulation') {
    titel = `Noch ${p.tage} Tage: Spieltag nachspielen`;
    text = 'Spiel jetzt so, wie es am Spieltag zählt: ganze Spiele gegen den Computer in Liga-Stärke.';
    liste = (
      <>
        <Aufgabe
          titel="2–3 Spiele gegen den Computer"
          text={sims.length ? `Seit dem letzten Spieltag: ${sims.length} gespielt, ${simSiege} gewonnen` : 'Am besten gegen „mittel" und „stark".'}
        />
        <li className="aufgabe voll">{p.computerKnoepfe}</li>
        <Aufgabe titel="Finish üben" text="Reste 2–40 auf Doppel ausmachen." knopf="Doppeltraining" onClick={() => p.onNeu('doppel')} />
      </>
    );
  } else if (ph === 'locker') {
    titel = p.tage === 1 ? 'Morgen ist Spieltag: locker bleiben' : 'Übermorgen ist Spieltag: locker bleiben';
    text = 'Kein hartes Training mehr. Kurz werfen hält das Gefühl, zu viel macht müde.';
    liste = (
      <>
        <Aufgabe titel="Höchstens 20–30 Minuten werfen" text="Lieblingsdoppel und T20, ohne Druck." knopf="Zieltraining" onClick={p.onTraining} />
        <Aufgabe titel="Aufwärm-Routine einmal durchgehen" text="Damit sie am Spieltag sitzt (siehe unten am Spieltag)." />
        <Aufgabe titel="Ein lockeres Leg gegen den Computer" knopf={`Ø ${p.mittel}`} onClick={() => p.onComputer(p.mittel)} />
        <Aufgabe titel="Gut schlafen" text="Ausgeruht wirft man ruhiger als mit einer Extra-Stunde Training." />
      </>
    );
  } else {
    titel = 'Heute ist Spieltag! 🎯';
    text = 'Aufwärm-Routine, 10–15 Minuten, auch am Übungsboard vor Ort:';
    liste = (
      <>
        <Aufgabe titel="1. Locker einwerfen" text="15–20 Darts auf T20, ohne auf Treffer zu achten. Arm und Rhythmus finden." knopf="Zieltraining" onClick={p.onTraining} />
        <Aufgabe titel="2. Doppel ringsum" text="Jedes Doppel einmal anwerfen, am Ende dein Lieblingsdoppel." knopf="Around the Clock" onClick={() => p.onNeu('atc')} />
        <Aufgabe titel="3. Ein Leg gegen den Computer" text="Ein ganzes Leg mit Checkout – so wie gleich im Spiel." knopf={`Ø ${p.mittel}`} onClick={() => p.onComputer(p.mittel)} />
        <Aufgabe titel="Im Spiel" text="Vor jedem Wurf dieselbe Routine, ausatmen, auf den Punkt schauen. Ein schlechtes Leg abhaken – das nächste beginnt bei 501." />
      </>
    );
  }

  return (
    <div className="karte plan">
      <b className="plan-titel">{titel}</b>
      <p className="info">{text}</p>
      <ul className="aufgaben">{liste}</ul>
    </div>
  );
}

// ---------------- Saison ----------------

function Saison({ daten, trainingAvg }: { daten: LigaDaten; trainingAvg: number | null }) {
  const vorbei = sortiert(daten.spieltage).filter((s) => s.spiele.length);
  if (!vorbei.length) return null;
  const b = bilanz(vorbei);
  const verlauf = vorbei.map((s) => ({ s, av: spieltagAverage(s) })).filter((x) => x.av !== null);
  const max = Math.max(60, ...verlauf.map((x) => x.av!), trainingAvg ?? 0);
  const diff = b.average !== null && trainingAvg !== null ? b.average - trainingAvg : null;

  return (
    <div className="karte">
      <b>Saison</b>
      <table>
        <tbody>
          <tr><td>Einzel gewonnen</td><td className="wert">{b.einzelSiege} von {b.einzel}</td></tr>
          {b.doppel > 0 && <tr><td>Doppel gewonnen</td><td className="wert">{b.doppelSiege} von {b.doppel}</td></tr>}
          {b.average !== null && <tr><td>Ø im Ligaspiel</td><td className="wert">{b.average.toFixed(1).replace('.', ',')}</td></tr>}
          {trainingAvg !== null && <tr><td>Ø im Training (30 Tage)</td><td className="wert">{trainingAvg.toFixed(1).replace('.', ',')}</td></tr>}
        </tbody>
      </table>
      {diff !== null && (
        <p className="info klein">
          {diff < -3
            ? `Im Ligaspiel liegst du ${(-diff).toFixed(1).replace('.', ',')} unter deinem Training. Das ist typisch (Nervosität, fremdes Board) – üb öfter ganze Spiele gegen den Computer, dann wird der Druck vertrauter.`
            : diff > 3
              ? 'Im Ligaspiel bist du sogar besser als im Training – du spielst gern unter Druck!'
              : 'Liga und Training liegen nah beieinander – du bringst deine Leistung auf die Platte.'}
        </p>
      )}
      {verlauf.length > 1 && (
        <div className="formkurve" aria-label="Average je Spieltag">
          {verlauf.map(({ s, av }) => (
            <div key={s.id} className="balken">
              <span className="zahl">{av!.toFixed(0)}</span>
              <span className="saeule" style={{ height: `${(av! / max) * 100}%` }} />
              <span className="tag">{s.datum.slice(8, 10)}.{s.datum.slice(5, 7)}.</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Gegner ----------------

function Gegner({ daten }: { daten: LigaDaten }) {
  const namen = gegnerNamen(daten.spieltage);
  const [offen, setOffen] = useState(false);
  if (!namen.length) return null;
  return (
    <div className={'thema' + (offen ? ' offen' : '')}>
      <button className="thema-kopf" onClick={() => setOffen(!offen)}>
        <div><b>Deine Gegner</b><small>{namen.length} Spieler · Bilanz und Notizen</small></div>
        <span className="pfeil">›</span>
      </button>
      {offen && (
        <div className="thema-text">
          {namen.map((n) => {
            const v = gegnerVerlauf(daten.spieltage, n);
            const siege = v.filter((x) => gewonnen(x.s)).length;
            const notiz = v.find((x) => x.s.notiz?.trim())?.s.notiz;
            return (
              <div key={n} className="gegner-zeile">
                <b>{n}</b> <span className="klein">{siege}:{v.length - siege} · zuletzt {v[0].s.legsIch}:{v[0].s.legsGegner} ({datumText(v[0].st.datum)})</span>
                {notiz && <div className="klein">📝 {notiz}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Spieltag bearbeiten / Ergebnisse ----------------

function SpieltagSeite({ st, daten, neu, onFertig, onLoeschen }: {
  st: Spieltag;
  daten: LigaDaten;
  neu: boolean;
  onFertig: (st: Spieltag | null) => void;
  onLoeschen: () => void;
}) {
  const [s, setS] = useState<Spieltag>(st);
  const [von, setVon] = useState(st.avgVon ? String(st.avgVon).replace('.', ',') : '');
  const [bis, setBis] = useState(st.avgBis ? String(st.avgBis).replace('.', ',') : '');
  const [formOffen, setFormOffen] = useState(false);
  const vorbei = tageBis(s.datum) <= 0;
  const legs = daten.legsZiel;

  function speichern() {
    if (!s.gegner.trim()) {
      alert('Bitte die gegnerische Mannschaft eintragen.');
      return;
    }
    onFertig({ ...s, gegner: s.gegner.trim(), avgVon: zahl(von), avgBis: zahl(bis) });
  }

  return (
    <div className="seite liga">
      <div className="stats-kopf">
        <button className="btn" onClick={() => onFertig(null)}>‹ Zurück</button>
        <h2>{neu ? 'Neuer Spieltag' : 'Spieltag'}</h2>
      </div>

      <h3>Gegnerische Mannschaft</h3>
      <div className="spielerzeile">
        <input value={s.gegner} maxLength={40} placeholder="z. B. DC Musterstadt" onChange={(e) => setS({ ...s, gegner: e.target.value })} />
      </div>
      <div className="ringwahl">
        <button className={'btn' + (s.heim ? ' an' : '')} onClick={() => setS({ ...s, heim: true })}>daheim</button>
        <button className={'btn' + (!s.heim ? ' an' : '')} onClick={() => setS({ ...s, heim: false })}>auswärts</button>
      </div>

      <h3>Wann</h3>
      <div className="spielerzeile">
        <input type="date" value={s.datum} onChange={(e) => e.target.value && setS({ ...s, datum: e.target.value })} />
        <input type="time" value={s.zeit ?? ''} onChange={(e) => setS({ ...s, zeit: e.target.value || undefined })} />
      </div>

      <h3>Wie stark spielen die Gegner?</h3>
      <div className="spielerzeile avg-von-bis">
        <span>Ø von</span>
        <input inputMode="decimal" value={von} placeholder="z. B. 38" onChange={(e) => setVon(e.target.value)} />
        <span>bis</span>
        <input inputMode="decimal" value={bis} placeholder="z. B. 50" onChange={(e) => setBis(e.target.value)} />
      </div>
      <p className="info klein">
        Steht im Spielbericht oder in der Spieler-Rangliste deiner Liga. Danach richtet sich die Stärke des Computer-Gegners.
        {daten.link?.startsWith('http') && <> <a href={daten.link} target="_blank" rel="noreferrer">Liga-Seite öffnen ↗</a></>}
      </p>

      {(vorbei || s.spiele.length > 0) && <>
        <h3>Deine Spiele an diesem Abend</h3>
        {s.spiele.map((sp) => (
          <div key={sp.id} className={'liga-spiel' + (gewonnen(sp) ? ' sieg' : '')}>
            <div>
              <b>{sp.legsIch}:{sp.legsGegner}</b> {sp.art === 'doppel' ? 'Doppel ' : ''}gegen {sp.gegner || '?'}
              {sp.average ? <span className="klein"> · Ø {sp.average.toFixed(2).replace('.', ',')}</span> : null}
              {sp.notiz && <div className="klein">📝 {sp.notiz}</div>}
            </div>
            <button className="btn" aria-label="Spiel löschen" onClick={() => setS({ ...s, spiele: s.spiele.filter((x) => x.id !== sp.id) })}>✕</button>
          </div>
        ))}
        {formOffen ? (
          <SpielFormular
            legs={legs}
            daten={daten}
            onAbbruch={() => setFormOffen(false)}
            onFertig={(sp) => { setS({ ...s, spiele: [...s.spiele, sp] }); setFormOffen(false); }}
          />
        ) : (
          <button className="btn breit" onClick={() => setFormOffen(true)}>＋ Spiel eintragen</button>
        )}

        <h3>Notiz zum Abend</h3>
        <textarea
          className="notiz"
          rows={3}
          maxLength={500}
          value={s.notiz ?? ''}
          placeholder="z. B. Board hing tiefer, Licht blendet, war nervös am Anfang"
          onChange={(e) => setS({ ...s, notiz: e.target.value || undefined })}
        />
      </>}

      <button className="btn gross los an" onClick={speichern}>Speichern</button>
      {!neu && (
        <button className="btn warn breit" onClick={() => { if (confirm('Diesen Spieltag mit allen Ergebnissen löschen?')) onLoeschen(); }}>
          Spieltag löschen
        </button>
      )}
    </div>
  );
}

function SpielFormular({ legs, daten, onFertig, onAbbruch }: {
  legs: number;
  daten: LigaDaten;
  onFertig: (s: LigaSpiel) => void;
  onAbbruch: () => void;
}) {
  const [art, setArt] = useState<'einzel' | 'doppel'>('einzel');
  const [gegner, setGegner] = useState('');
  const [ich, setIch] = useState<number | null>(null);
  const [er, setEr] = useState<number | null>(null);
  const [avg, setAvg] = useState('');
  const [notiz, setNotiz] = useState('');
  const frueher = gegnerVerlauf(daten.spieltage, gegner).slice(0, 3);
  const zahlen = Array.from({ length: legs + 1 }, (_, i) => i);

  function fertig() {
    if (ich === null || er === null || (ich !== legs && er !== legs)) {
      alert(`Bitte das Ergebnis eintragen (einer muss ${legs} Legs haben).`);
      return;
    }
    onFertig({ id: neueId(), art, gegner: gegner.trim(), legsIch: ich, legsGegner: er, average: zahl(avg), notiz: notiz.trim() || undefined });
  }

  return (
    <div className="karte formular">
      <div className="ringwahl">
        <button className={'btn' + (art === 'einzel' ? ' an' : '')} onClick={() => setArt('einzel')}>Einzel</button>
        <button className={'btn' + (art === 'doppel' ? ' an' : '')} onClick={() => setArt('doppel')}>Doppel</button>
      </div>
      <p className="info klein">Gegner</p>
      <div className="spielerzeile">
        <input list="gegner-namen" value={gegner} maxLength={40} placeholder="Name" onChange={(e) => setGegner(e.target.value)} />
        <datalist id="gegner-namen">{gegnerNamen(daten.spieltage).map((n) => <option key={n} value={n} />)}</datalist>
      </div>
      {frueher.length > 0 && (
        <div className="hinweis">
          <b>Schon mal gespielt:</b>
          <ul>
            {frueher.map(({ st, s }) => (
              <li key={s.id}>{datumText(st.datum)}: {s.legsIch}:{s.legsGegner}{s.notiz ? ` · ${s.notiz}` : ''}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="info klein">Legs ich</p>
      <div className="ringwahl">
        {zahlen.map((k) => <button key={k} className={'btn' + (ich === k ? ' an' : '')} onClick={() => setIch(k)}>{k}</button>)}
      </div>
      <p className="info klein">Legs Gegner</p>
      <div className="ringwahl">
        {zahlen.map((k) => <button key={k} className={'btn' + (er === k ? ' an' : '')} onClick={() => setEr(k)}>{k}</button>)}
      </div>
      {art === 'einzel' && <>
        <p className="info klein">Mein Average laut Spielbericht (wenn bekannt)</p>
        <div className="spielerzeile">
          <input inputMode="decimal" value={avg} placeholder="z. B. 47,5" onChange={(e) => setAvg(e.target.value)} />
        </div>
      </>}
      <p className="info klein">Notiz (z. B. „wirft schnell", „Doppel nicht getroffen")</p>
      <div className="spielerzeile">
        <input value={notiz} maxLength={200} onChange={(e) => setNotiz(e.target.value)} />
      </div>
      <div className="ringwahl">
        <button className="btn" onClick={onAbbruch}>Abbrechen</button>
        <button className="btn an" onClick={fertig}>Übernehmen</button>
      </div>
    </div>
  );
}
