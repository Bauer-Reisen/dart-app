// 💡: Tipps zur Übung und Hinweise des Trainers aus dem eigenen Wurfbild.
import { useState, type ReactNode } from 'react';
import { zielLabel, type Ziel } from './board';
import { MIN_LAGE, allgemeineTipps, zielTipps, type CoachTipp } from './coach';
import type { Aufnahme, Dart } from './speicher';
import { MIN_FEHL, UEBUNGS_TIPPS, wurfbild, type TippArt } from './tipps';

export interface TippQuelle {
  art: TippArt;
  /** Alle bisherigen Darts des Spielers am Zug. */
  darts: Dart[];
  /** Aufnahmen des Spielers – für Hinweise, die nicht an einem Ziel hängen (3. Dart, Ermüdung, Doppel). */
  aufnahmen?: Aufnahme[];
  /** Kurze Erklärung der Seite, oben im Fenster („So geht's"). */
  soGehts?: ReactNode;
  /** Zusätzlich unten im Fenster (z. B. Schalter für Zurufe). */
  extra?: ReactNode;
}

export function TrainerHinweis({ t }: { t: CoachTipp }) {
  return (
    <div className={'hinweis' + (t.lob ? ' lob' : '')}>
      <div><b>{t.titel}</b></div>
      <div className="warum">Woran ich das sehe: {t.warum}</div>
      {t.ursache && <div>{t.ursache}</div>}
      <ul>{t.probier.map((p) => <li key={p}>{p}</li>)}</ul>
      {t.uebung && <div className="uebung">Übung: {t.uebung}</div>}
    </div>
  );
}

/** Knopf + Fenster. Der Knopf leuchtet, wenn es einen neuen Hinweis gibt. */
export function useTipp(q: TippQuelle | undefined, ziel: Ziel) {
  const [offen, setOffen] = useState(false);
  const [gesehen, setGesehen] = useState<string[]>([]);
  if (!q) return { knopf: null, fenster: null };

  const hinweise = zielTipps(q.darts, ziel);
  const allgemein = q.aufnahmen ? allgemeineTipps(q.aufnahmen) : [];
  const schluessel = [...hinweise, ...allgemein].filter((t) => !t.lob).map((t) => t.id);
  const neu = schluessel.some((k) => !gesehen.includes(k));
  const w = wurfbild(q.darts, ziel);
  const getippt = q.darts.filter((d) => d.p && !d.frei && d.ziel.seg === ziel.seg && d.ziel.ring === ziel.ring).length;

  const knopf = (
    <button
      className={'icon tipp' + (neu ? ' neu' : '')}
      onClick={() => { setOffen(true); setGesehen((g) => [...new Set([...g, ...schluessel])]); }}
      aria-label="Tipps"
    >
      💡
    </button>
  );

  const fenster = offen && (
    <div className="wahl mitte" onClick={() => setOffen(false)}>
      <div className="wahl-box tipp-box" onClick={(ev) => ev.stopPropagation()}>
        <h3>💡 Tipps</h3>
        {q.soGehts && (<><h4>So geht's</h4>{q.soGehts}</>)}

        <h4>Dein Wurfbild auf {zielLabel(ziel)}</h4>
        {hinweise.length > 0 ? (
          hinweise.map((t) => <TrainerHinweis key={t.id} t={t} />)
        ) : w.fehl < MIN_FEHL && getippt < MIN_LAGE ? (
          <p className="info klein">
            Sobald genug Würfe auf dieses Ziel da sind ({MIN_LAGE} genau getippte Darts oder {MIN_FEHL} Fehlwürfe), sage ich dir,
            was bei dir los ist und was helfen kann (bisher {getippt} getippt, {w.fehl} Fehlwürfe).
          </p>
        ) : (
          <p className="info klein">Kein klares Muster – deine Fehlwürfe verteilen sich. Dann hilft vor allem ein gleichbleibender Ablauf.</p>
        )}

        {allgemein.length > 0 && (<><h4>Was mir sonst auffällt</h4>{allgemein.map((t) => <TrainerHinweis key={t.id} t={t} />)}</>)}

        <h4>Zu dieser Übung</h4>
        <ul>{UEBUNGS_TIPPS[q.art].map((p) => <li key={p}>{p}</li>)}</ul>
        {q.extra}

        <p className="info klein">Die App sieht nur, wo deine Darts landen – nicht, wie du wirfst. Die Tipps sind Anstöße nach gängigen Trainer-Ratgebern. Probier immer nur eine Sache auf einmal.</p>
        <button className="btn gross" style={{ width: '100%', marginTop: 14 }} onClick={() => setOffen(false)}>Schließen</button>
      </div>
    </div>
  );

  return { knopf, fenster };
}
