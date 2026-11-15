import { useEffect, useState } from 'react';
import { Reiterleiste, Start, type Reiter } from './Start';
import { Statistik } from './Statistik';
import { Tipps } from './TippsSeite';
import { Training } from './Training';
import { SpielNeu, X01Spiel, computerMatch } from './Spiel501';
import { Liga } from './LigaSeite';
import { CricketSpiel } from './SpielCricket';
import { HalveItSpiel } from './SpielHalveIt';
import { AtcSpiel, BobsSpiel, DoppelSpiel } from './SpielUebungen';
import { laden, matchLaden, matchSpeichern, speichern, type Aufnahme, type Match, type SpielArt } from './speicher';

type Ansicht =
  | { seite: 'start' | 'training' }
  | { seite: 'neu' | 'spiel'; art: SpielArt };

export function App() {
  const [aufnahmen, setAufnahmen] = useState<Aufnahme[]>(() => laden());
  const [matches, setMatches] = useState<Record<SpielArt, Match | null>>(() => ({
    x01: matchLaden('x01'),
    cricket: matchLaden('cricket'),
    halveit: matchLaden('halveit'),
    atc: matchLaden('atc'),
    bobs: matchLaden('bobs'),
    doppel: matchLaden('doppel'),
  }));
  const [ansicht, setAnsicht] = useState<Ansicht>({ seite: 'start' });
  const [reiter, setReiter] = useState<Reiter>(() => {
    try {
      const r = localStorage.getItem('dart-reiter');
      return r === 'spiele' || r === 'liga' || r === 'statistik' || r === 'tipps' ? r : 'training';
    } catch { return 'training'; }
  });

  // Bildschirm anlassen, solange die App offen ist
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const holen = async () => {
      try {
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
          lock = await (navigator as any).wakeLock.request('screen');
        }
      } catch { /* nicht unterstützt */ }
    };
    holen();
    document.addEventListener('visibilitychange', holen);
    return () => {
      document.removeEventListener('visibilitychange', holen);
      lock?.release().catch(() => {});
    };
  }, []);

  function alleSetzen(a: Aufnahme[]) {
    setAufnahmen(a);
    speichern(a);
  }

  function hinzufuegen(a: Aufnahme) {
    setAufnahmen((alt) => {
      const neu = [...alt, a];
      speichern(neu);
      return neu;
    });
  }

  /** Letzte Aufnahme entfernen, wenn sie zum aktuellen Spiel gehört. */
  /** mitBot: Würfe des Computer-Gegners davor auch entfernen, bis zur eigenen Aufnahme. */
  function letzteEntfernen(pruef: (a: Aufnahme) => boolean, mitBot = false): Aufnahme | null {
    let liste = aufnahmen;
    while (mitBot && liste.length && liste[liste.length - 1].bot && pruef(liste[liste.length - 1])) liste = liste.slice(0, -1);
    const letzte = liste[liste.length - 1];
    if (!letzte || !pruef(letzte) || letzte.bot) return null;
    alleSetzen(liste.slice(0, -1));
    return letzte;
  }

  function setMatch(art: SpielArt, m: Match | null) {
    setMatches((alt) => ({ ...alt, [art]: m }));
    matchSpeichern(art, m);
  }

  const zumStart = () => setAnsicht({ seite: 'start' });

  function reiterWaehlen(r: Reiter) {
    setReiter(r);
    window.scrollTo(0, 0);
    try { localStorage.setItem('dart-reiter', r); } catch { /* egal */ }
  }
  const gemeinsam = { aufnahmen, hinzufuegen, letzteEntfernen, onMenu: zumStart };

  if (ansicht.seite === 'training') return <Training {...gemeinsam} />;
  if (ansicht.seite === 'neu') {
    const art = ansicht.art;
    return <SpielNeu key={art} art={art} onAbbruch={zumStart} onStart={(m) => { setMatch(art, m); setAnsicht({ seite: 'spiel', art }); }} />;
  }
  if (ansicht.seite === 'spiel') {
    const art = ansicht.art;
    const m = matches[art];
    if (m) {
      const props = { ...gemeinsam, match: m, setMatch: (x: Match | null) => setMatch(art, x) };
      if (art === 'halveit') return <HalveItSpiel key={m.id} {...props} />;
      if (art === 'atc') return <AtcSpiel key={m.id} {...props} />;
      if (art === 'bobs') return <BobsSpiel key={m.id} {...props} />;
      if (art === 'doppel') return <DoppelSpiel key={m.id} {...props} />;
      return art === 'cricket' ? <CricketSpiel key={m.id} {...props} /> : <X01Spiel key={m.id} {...props} />;
    }
  }

  return (
    <div className="hauptseite">
      {reiter === 'statistik' ? (
        <Statistik aufnahmen={aufnahmen} onErsetzen={alleSetzen} />
      ) : reiter === 'tipps' ? (
        <Tipps />
      ) : reiter === 'liga' ? (
        <Liga
          aufnahmen={aufnahmen}
          onTraining={() => setAnsicht({ seite: 'training' })}
          onNeu={(art) => setAnsicht({ seite: 'neu', art })}
          onComputer={(avg, legs) => {
            if (matches.x01 && !confirm('Dein laufendes 501-Spiel wird dabei beendet. Weiter?')) return;
            setMatch('x01', computerMatch(avg, legs));
            setAnsicht({ seite: 'spiel', art: 'x01' });
          }}
        />
      ) : (
        <Start
          reiter={reiter}
          matches={matches}
          onTraining={() => setAnsicht({ seite: 'training' })}
          onNeu={(art) => setAnsicht({ seite: 'neu', art })}
          onWeiter={(art) => setAnsicht({ seite: 'spiel', art })}
        />
      )}
      <Reiterleiste aktiv={reiter} onWahl={reiterWaehlen} />
    </div>
  );
}
