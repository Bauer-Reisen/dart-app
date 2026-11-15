import type { ReactNode } from 'react';
import type { Match, SpielArt } from './speicher';

export type Reiter = 'training' | 'spiele' | 'liga' | 'statistik' | 'tipps';

interface Props {
  reiter: 'training' | 'spiele';
  matches: Record<SpielArt, Match | null>;
  onTraining: () => void;
  onNeu: (art: SpielArt) => void;
  onWeiter: (art: SpielArt) => void;
}

const NAME: Record<SpielArt, (m: Match) => string> = {
  x01: (m) => String(m.start),
  cricket: () => 'Cricket',
  halveit: () => 'Halve-It',
  atc: () => 'Around the Clock',
  bobs: () => "Bob's 27",
  doppel: () => 'Doppeltraining',
};

const GRUPPE: Record<'training' | 'spiele', SpielArt[]> = {
  training: ['doppel', 'atc', 'bobs'],
  spiele: ['x01', 'cricket', 'halveit'],
};

function Kachel({ titel, text, onClick }: { titel: string; text: string; onClick: () => void }) {
  return (
    <button className="kachel" onClick={onClick}>
      <b>{titel}</b>
      <span>{text}</span>
    </button>
  );
}

export function Start({ reiter, matches, onTraining, onNeu, onWeiter }: Props) {
  const laufend = GRUPPE[reiter].filter((a) => matches[a]);
  return (
    <div className="seite start">
      <h1>{reiter === 'training' ? 'Training' : 'Spiele'}</h1>

      {laufend.map((art) => {
        const m = matches[art]!;
        return (
          <button key={art} className="kachel weiter" onClick={() => onWeiter(art)}>
            <b>▶ {NAME[art](m)} fortsetzen</b>
            <span>{m.spieler.join(' · ')} · {art === 'x01' ? 'Leg' : 'Spiel'} {m.legs.length}</span>
          </button>
        );
      })}

      {reiter === 'training' ? (
        <div className="kacheln">
          <Kachel titel="Zieltraining" text="Ein Ziel wählen, werfen, Treffer antippen" onClick={onTraining} />
          <Kachel titel="Doppeltraining" text="Finish 2–40 ausmachen oder immer aufs Lieblingsdoppel" onClick={() => onNeu('doppel')} />
          <Kachel titel="Around the Clock" text="1 bis 20 und Bull der Reihe nach" onClick={() => onNeu('atc')} />
          <Kachel titel="Bob's 27" text="Doppel-Leiter von D1 bis Bull, Start mit 27 Punkten" onClick={() => onNeu('bobs')} />
        </div>
      ) : (
        <div className="kacheln">
          <Kachel titel="501 / 301" text="Allein oder bis zu 4 Spieler, mit Checkout-Vorschlägen" onClick={() => onNeu('x01')} />
          <Kachel titel="Cricket" text="15–20 und Bull schließen und punkten" onClick={() => onNeu('cricket')} />
          <Kachel titel="Halve-It" text="9 Runden mit festem Ziel – kein Treffer halbiert die Punkte" onClick={() => onNeu('halveit')} />
        </div>
      )}

      <p className="info klein">Alle Daten liegen nur auf diesem Gerät.</p>
    </div>
  );
}

const ICON: Record<Reiter, ReactNode> = {
  training: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  spiele: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20 L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 10 l2-6 2 2 2 2 -6 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 20 l-1 1 M6 18 l-2 0 M6 18 l0 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  liga: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  statistik: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20V11M10 20V5M16 20v-6M22 20H2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  tipps: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
};

const TEXT: Record<Reiter, string> = { training: 'Training', spiele: 'Spiele', liga: 'Liga', statistik: 'Statistik', tipps: 'Tipps' };

export function Reiterleiste({ aktiv, onWahl }: { aktiv: Reiter; onWahl: (r: Reiter) => void }) {
  return (
    <nav className="reiter" aria-label="Hauptmenü">
      {(Object.keys(TEXT) as Reiter[]).map((r) => (
        <button key={r} aria-current={r === aktiv ? 'page' : undefined} onClick={() => onWahl(r)}>
          {ICON[r]}
          <span>{TEXT[r]}</span>
        </button>
      ))}
    </nav>
  );
}
