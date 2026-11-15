import { useState } from 'react';
import type { Ziel, ZielRing } from './board';

interface Props {
  aktuell: Ziel;
  onWahl: (z: Ziel) => void;
  onAbbruch: () => void;
}

const ZAHLEN = Array.from({ length: 20 }, (_, i) => i + 1);

export function ZielWahl({ aktuell, onWahl, onAbbruch }: Props) {
  const [ring, setRing] = useState<Exclude<ZielRing, 'B'>>(aktuell.ring === 'B' ? 'T' : aktuell.ring);
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
          <button className="btn bull" onClick={() => onWahl({ seg: 25, ring: 'B' })}>Bull</button>
        </div>
      </div>
    </div>
  );
}
