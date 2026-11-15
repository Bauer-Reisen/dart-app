// 💡: Tipps zur Übung und Hinweise aus dem eigenen Wurfbild.
import { useState, type ReactNode } from 'react';
import { zielLabel, type Hit, type Ziel } from './board';
import { MIN_FEHL, UEBUNGS_TIPPS, wurfbild, wurfbildTipps, type TippArt, type WurfbildTipp } from './tipps';

export interface TippQuelle {
  art: TippArt;
  /** Alle bisherigen Darts des Spielers am Zug. */
  darts: { hit: Hit; ziel: Ziel; frei?: boolean }[];
  /** Kurze Erklärung der Seite, oben im Fenster („So geht's"). */
  soGehts?: ReactNode;
}

export function WurfbildHinweis({ t }: { t: WurfbildTipp }) {
  return (
    <div className="hinweis">
      <div><b>{t.muster}</b></div>
      <div>{t.ursache}</div>
      <ul>{t.probier.map((p) => <li key={p}>{p}</li>)}</ul>
      <div className="uebung">Übung: {t.uebung}</div>
    </div>
  );
}

/** Knopf + Fenster. Der Knopf leuchtet, wenn es einen neuen Hinweis zum Wurfbild gibt. */
export function useTipp(q: TippQuelle | undefined, ziel: Ziel) {
  const [offen, setOffen] = useState(false);
  const [gesehen, setGesehen] = useState<string[]>([]);
  if (!q) return { knopf: null, fenster: null };

  const w = wurfbild(q.darts, ziel);
  const hinweise = wurfbildTipps(w);
  const schluessel = hinweise.map((t) => `${zielLabel(ziel)}:${t.richtung}`);
  const neu = schluessel.some((k) => !gesehen.includes(k));

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
          hinweise.map((t) => <WurfbildHinweis key={t.richtung} t={t} />)
        ) : w.fehl < MIN_FEHL ? (
          <p className="info klein">
            Ab {MIN_FEHL} Fehlwürfen auf dieses Ziel sage ich dir, wohin du meistens danebenwirfst und was helfen kann
            (bisher {w.fehl}).
          </p>
        ) : (
          <p className="info klein">Kein klares Muster – deine Fehlwürfe verteilen sich. Das ist gut: Dann hilft vor allem ein gleichbleibender Ablauf.</p>
        )}

        <h4>Zu dieser Übung</h4>
        <ul>{UEBUNGS_TIPPS[q.art].map((p) => <li key={p}>{p}</li>)}</ul>

        <button className="btn gross" style={{ width: '100%', marginTop: 14 }} onClick={() => setOffen(false)}>Schließen</button>
      </div>
    </div>
  );

  return { knopf, fenster };
}
