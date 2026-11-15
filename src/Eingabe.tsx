// Die Eingabe mit der Scheibe – derselbe Baustein für Training und alle Spiele.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Scheibe } from './Scheibe';
import { ZielWahl } from './ZielWahl';
import { useTipp, type TippQuelle } from './TippFenster';
import { echtePosition, hitLabel, hitLabelLang, points, sameZiel, zielLabel, type Hit, type Ziel } from './board';
import type { Dart } from './speicher';

const HINWEIS_MS = 2500;

export interface EingabeOpts {
  /** Vorgeschlagenes Ziel für den nächsten Dart. */
  zielFuer: (darts: Dart[]) => Ziel;
  /** Ist die Aufnahme mit diesen Darts zu Ende? */
  fertigNach: (darts: Dart[]) => boolean;
  /** Aufnahme ist fertig → speichern. */
  onFertig: (darts: Dart[]) => void;
  /** "Zurück" ohne offene Darts: letzte gespeicherte Aufnahme wieder öffnen (oder null). */
  onZurueckLeer: () => Dart[] | null;
  /** Training: gewähltes Ziel gilt weiter. Spiel: gilt nur für den nächsten Dart. */
  zielBleibt: boolean;
  /** Spiel: Ausweich-Ziele zum Vorschlag. */
  alternativen?: (vorschlag: Ziel, darts: Dart[]) => Ziel[];
  startChips?: Ziel[];
  /** Angefangene Aufnahme (und im Training die Ziele) auf dem Gerät merken, z. B. beim Verlassen übers Menü.
   *  name = Speicherplatz, id = laufendes Spiel (andere id → nichts übernehmen). */
  merken?: { name: string; id?: string };
}

interface Gemerkt { id?: string; darts: Dart[]; ziel: Ziel | null; chips?: Ziel[] }

function gemerktLaden(m: EingabeOpts['merken']): Gemerkt | null {
  if (!m) return null;
  try {
    const g = JSON.parse(localStorage.getItem('dart-offen-' + m.name) ?? 'null') as Gemerkt | null;
    return g && g.id === m.id && Array.isArray(g.darts) ? g : null;
  } catch { return null; }
}

function rueckmeldung() {
  try { navigator.vibrate?.(12); } catch { /* iPhone: keine Vibration im Browser */ }
}

export function summe(d: Dart[]) {
  return d.reduce((s, x) => s + points(x.hit), 0);
}

export function useEingabe(o: EingabeOpts) {
  const [gemerkt] = useState(() => gemerktLaden(o.merken));
  const [darts, setDarts] = useState<Dart[]>(gemerkt?.darts ?? []);
  const [zuletzt, setZuletzt] = useState<Dart[] | null>(null);
  const [override, setOverride] = useState<Ziel | null>(o.zielBleibt ? gemerkt?.ziel ?? null : null);
  const [ersetzen, setErsetzen] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ hit: Hit; key: number; punkt?: [number, number] } | null>(null);
  const [zoom, setZoom] = useState(false);
  const [wahlOffen, setWahlOffen] = useState(false);
  const [trainingChips, setTrainingChips] = useState<Ziel[]>(gemerkt?.chips?.length ? gemerkt.chips : o.startChips ?? []);
  const timer = useRef<number | undefined>(undefined);

  const merkName = o.merken?.name;
  const merkId = o.merken?.id;
  useEffect(() => {
    if (!merkName) return;
    try {
      const g: Gemerkt = { id: merkId, darts, ziel: o.zielBleibt ? override : null, chips: o.zielBleibt ? trainingChips : undefined };
      localStorage.setItem('dart-offen-' + merkName, JSON.stringify(g));
    } catch { /* Speicher voll oder gesperrt */ }
  }, [merkName, merkId, darts, override, trainingChips, o.zielBleibt]);

  const vorschlag = o.zielFuer(darts);
  const ziel = override ?? vorschlag;

  const chips: Ziel[] = o.zielBleibt
    ? trainingChips
    : [vorschlag, ...(o.alternativen?.(vorschlag, darts) ?? [])]
        .filter((z, i, l) => l.findIndex((x) => sameZiel(x, z)) === i)
        .slice(0, 3);

  function zeigeZuletzt(d: Dart[]) {
    setZuletzt(d);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setZuletzt(null), HINWEIS_MS);
  }

  function abschliessen(liste: Dart[]) {
    setDarts([]);
    setErsetzen(null);
    o.onFertig(liste);
    zeigeZuletzt(liste);
  }

  /** Prüft, ob die Aufnahme (evtl. schon früher) zu Ende ist. */
  function pruefen(liste: Dart[]) {
    for (let k = 1; k <= liste.length; k++) {
      if (o.fertigNach(liste.slice(0, k))) {
        abschliessen(liste.slice(0, k));
        return;
      }
    }
    setDarts(liste);
  }

  function treffer(hit: Hit, punkt?: [number, number]) {
    rueckmeldung();
    setFlash({ hit, key: Date.now(), punkt });
    setZuletzt(null);
    const p = punkt ? echtePosition(punkt[0], punkt[1]) : undefined;
    if (ersetzen !== null) {
      const liste = darts.map((d, i) => (i === ersetzen ? { ...d, hit, p } : d));
      setErsetzen(null);
      pruefen(liste);
      return;
    }
    const liste: Dart[] = [...darts, { hit, ziel, t: Date.now(), ...(p ? { p } : {}) }];
    if (!o.zielBleibt) setOverride(null);
    pruefen(liste);
  }

  function abpraller() {
    treffer({ seg: 0, ring: 'BOUNCE' });
  }

  function dreiGleich() {
    if (darts.length === 0 || darts.length >= 3) return;
    rueckmeldung();
    const letzter = darts[darts.length - 1];
    const liste = [...darts];
    while (liste.length < 3) liste.push({ hit: letzter.hit, ziel: letzter.ziel, t: Date.now() }); // ohne Stelle: nicht wirklich getippt
    pruefen(liste);
  }

  function rueckgaengig() {
    setErsetzen(null);
    setZuletzt(null);
    if (darts.length) {
      setDarts(darts.slice(0, -1));
      return;
    }
    const zurueck = o.onZurueckLeer();
    if (zurueck) setDarts(zurueck.slice(0, -1));
  }

  function feldAntippen(i: number) {
    if (zuletzt && !darts.length) {
      const zurueck = o.onZurueckLeer();
      setZuletzt(null);
      if (zurueck) {
        setDarts(zurueck);
        setErsetzen(i < zurueck.length ? i : null);
      }
      return;
    }
    if (i < darts.length) setErsetzen(ersetzen === i ? null : i);
  }

  function zielSetzen(z: Ziel) {
    setOverride(o.zielBleibt || !sameZiel(z, vorschlag) ? z : null);
    if (o.zielBleibt) setTrainingChips((c) => [z, ...c.filter((x) => !sameZiel(x, z))].slice(0, 3));
    setWahlOffen(false);
  }

  return {
    darts, zuletzt, ziel, vorschlag, chips, ersetzen, flash, zoom, wahlOffen,
    treffer, abpraller, dreiGleich, rueckgaengig, feldAntippen,
    chipWaehlen: (z: Ziel) => setOverride(o.zielBleibt || !sameZiel(z, vorschlag) ? z : null),
    zielSetzen,
    setZoom, setWahlOffen,
    /** Offene Darts verwerfen (z. B. beim Verlassen). */
    zuruecksetzen: () => { setDarts([]); setZuletzt(null); setErsetzen(null); setOverride(null); },
  };
}

export type Eingabe = ReturnType<typeof useEingabe>;

interface ViewProps {
  e: Eingabe;
  onMenu: () => void;
  kopfInfo: ReactNode;
  oben?: ReactNode;
  snackText?: ReactNode;
  overlay?: ReactNode;
  /** 💡-Knopf: Tipps zur Übung und zum eigenen Wurfbild. */
  tipp?: TippQuelle;
}

export function EingabeView({ e, onMenu, kopfInfo, oben, snackText, overlay, tipp }: ViewProps) {
  const sichtbar = e.darts.length ? e.darts : e.zuletzt ?? [];
  const t = useTipp(tipp, e.ziel);
  return (
    <div className="app">
      {oben && <div className="oben">{oben}</div>}
      <header className="kopf">
        <button className="icon" onClick={onMenu} aria-label="Menü">☰</button>
        <div className="kopf-info">{kopfInfo}</div>
        <div className="chips">
          {e.chips.map((c) => (
            <button
              key={zielLabel(c)}
              className={'chip' + (sameZiel(c, e.ziel) ? ' an' : '')}
              onClick={() => e.chipWaehlen(c)}
            >
              {zielLabel(c)}
            </button>
          ))}
          <button className="chip plus" onClick={() => e.setWahlOffen(true)} aria-label="Anderes Ziel">＋</button>
        </div>
      </header>

      <div className="leiste">
        {[0, 1, 2].map((i) => {
          const d = sichtbar[i];
          return (
            <button
              key={i}
              className={'feld' + (e.ersetzen === i ? ' ersetzen' : '') + (d ? '' : ' leer') + (!e.zuletzt && i === e.darts.length ? ' naechster' : '')}
              onClick={() => e.feldAntippen(i)}
              aria-label={`${i + 1}. Dart`}
            >
              <span className="nr">{i + 1}.</span>
              {d ? hitLabel(d.hit) : '–'}
            </button>
          );
        })}
        <button
          className={'icon zoom' + (e.zoom ? ' an' : '')}
          onClick={() => e.setZoom(!e.zoom)}
          disabled={e.ziel.seg === 25}
          aria-label="Zoom auf das Ziel"
        >
          🔍
        </button>
        {t.knopf}
      </div>

      <main className="flaeche">
        <Scheibe ziel={e.ziel} zoom={e.zoom} flash={e.flash} onHit={e.treffer} />
        {e.flash && <div key={e.flash.key} className="ansage">{hitLabelLang(e.flash.hit)}</div>}
        {e.ersetzen !== null && <div className="hinweis-oben">Tippe das richtige Feld für Dart {e.ersetzen + 1}</div>}
      </main>

      {e.zuletzt && !e.darts.length && (
        <div className="snackbar" onClick={e.rueckgaengig}>
          <span>{snackText ?? <>Aufnahme <b>{summe(e.zuletzt)}</b> · {e.zuletzt.map((d) => hitLabel(d.hit)).join(' ')}</>}</span>
          <span className="snack-btn">Rückgängig</span>
        </div>
      )}

      <footer className="fuss">
        <button className="btn gross" onClick={e.abpraller}>Abpraller</button>
        <button className="btn gross" onClick={e.dreiGleich} disabled={e.darts.length === 0 || e.darts.length >= 3}>3× gleich</button>
        <button className="btn gross" onClick={e.rueckgaengig}>↶ Zurück</button>
      </footer>

      {e.wahlOffen && <ZielWahl aktuell={e.ziel} onWahl={e.zielSetzen} onAbbruch={() => e.setWahlOffen(false)} />}
      {overlay}
      {t.fenster}
    </div>
  );
}
