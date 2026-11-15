import { useState } from 'react';
import type { Ziel } from './board';

interface Props {
  aktuell: Ziel;
  onWahl: (z: Ziel) => void;
  onAbbruch: () => void;
}

const ZAHLEN = Array.from({ length: 20 }, (_, i) => i + 1);

/** Bull je Ring: Single = ganzes Bull (25 und 50 zählen), Doppel = nur Bullseye (50), Triple gibt es beim Bull nicht. */
export function ZielWahl({ aktuell, onWahl, onAbbruch }: Props) {
  const [ring, setRing] = useState<'S' | 'D' | 'T'>(aktuell.ring === 'B' ? 'S' : aktuell.ring);
  return (
    <div className="wahl" onClick={onAbbruch}>
      <div className="wahl-box" onClick={(e) => e.stopPropagation()}>
        <h3>Worauf zielst du?</h3>
        <div className="ringwahl">
          {(['S', 'D', 'T'] as const).map((r) => (
            <button key={r} className={'btn' + (ring === r ? ' an' : '')} onClick={() => setRing(r)}>
              {r === 'S' ? 'Single' : r === 'D' ? 'Doppel' : 'Triple'}
            </button>
          ))}
        </div>
        <div className="zahlen">
          {ZAHLEN.map((n) => (
            <button key={n} className="btn" onClick={() => onWahl({ seg: n, ring })}>{ring}{n}</button>
          ))}
          {ring === 'S' && (
            <button className="btn bull" onClick={() => onWahl({ seg: 25, ring: 'B' })}>Bull (25 und 50 zählen)</button>
          )}
          {ring === 'D' && (
            <button className="btn bull" onClick={() => onWahl({ seg: 25, ring: 'D' })}>Bullseye (nur 50 zählt)</button>
          )}
        </div>
      </div>
    </div>
  );
}
