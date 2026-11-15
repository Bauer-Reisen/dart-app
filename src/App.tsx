import { useEffect, useState } from 'react';
import { Reiterleiste, Start, type Reiter } from './Start';
import { Statistik } from './Statistik';
import { Tipps } from './TippsSeite';
import { Rundgang, StartHilfe } from './Hilfe';
import { Training } from './Training';
import { SpielNeu, X01Spiel, computerMatch } from './Spiel501';
import { Liga } from './LigaSeite';
import { CricketSpiel } from './SpielCricket';
import { HalveItSpiel } from './SpielHalveIt';
import { AtcSpiel, BobsSpiel, DoppelSpiel } from './SpielUebungen';
import { laden, matchLaden, matchSpeichern, speichern, type Aufnahme, type Match, type SpielArt } from './speicher';
import { alleSpieler, matchUmbenennen, spielerLaden, spielerSpeichern, umbenennen, type SpielerStand } from './spieler';
import { SpielerFenster } from './SpielerWahl';
import { fuehrungLaden, fuehrungSpeichern, type Fuehrung } from './fuehrung';

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
  const [rundgang, setRundgang] = useState(false);
  const [spieler, setSpielerStand] = useState<SpielerStand>(spielerLaden);
  const [spielerOffen, setSpielerOffen] = useState(false);
  const [fuehrung, setFuehrungState] = useState<Fuehrung | null>(fuehrungLaden);
  const ich = spieler.aktiv;
  const bekannte = alleSpieler(spieler, aufnahmen);

  function spielerSetzen(s: SpielerStand) { setSpielerStand(s); spielerSpeichern(s); }
  function fuehrungSetzen(f: Fuehrung | null) { setFuehrungState(f); fuehrungSpeichern(f); }
  function spielerUmbenennen(alt: string, neu: string) {
    const r = umbenennen(alt, neu, aufnahmen, spieler);
    alleSetzen(r.aufnahmen);
    spielerSetzen(r.stand);
    (Object.keys(matches) as SpielArt[]).forEach((art) => {
      const m = matchUmbenennen(matches[art], alt, neu);
      if (m !== matches[art]) setMatch(art, m);
    });
    try {
      const n = JSON.parse(localStorage.getItem('dart-x01-namen') ?? 'null');
      if (Array.isArray(n)) localStorage.setItem('dart-x01-namen', JSON.stringify([...new Set(n.map((x: string) => (x === alt ? neu : x)))]));
    } catch { /* egal */ }
    if (fuehrung?.spieler === alt) fuehrungSetzen({ ...fuehrung, spieler: neu });
  }
  /** Neue Spieler aus einem Spiel in die Liste übernehmen. */
  function spielerMerken(namen: string[]) {
    const neu = namen.filter((n) => n !== 'Computer' && !spieler.liste.includes(n));
    if (neu.length) spielerSetzen({ ...spieler, liste: [...spieler.liste, ...neu] });
  }
  const [reiter, setReiter] = useState<Reiter>(() => {
    try {
      const r = localStorage.getItem('dart-reiter');
      return r === 'spiele' || r === 'liga' || r === 'statistik' || r === 'tipps' ? r : 'training';
    } catch { return 'training'; }
  });

  // Jede neue Seite beginnt oben (sonst bleibt die Scroll-Position der vorigen Seite stehen)
  useEffect(() => { window.scrollTo(0, 0); }, [ansicht]);

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
  const spielerFenster = spielerOffen && (
    <SpielerFenster
      liste={bekannte}
      aktiv={ich}
      onWahl={(n) => { spielerSetzen({ ...spieler, aktiv: n }); setSpielerOffen(false); }}
      onNeu={(n) => { spielerSetzen({ liste: [...spieler.liste, n], aktiv: n }); setSpielerOffen(false); }}
      onUmbenennen={spielerUmbenennen}
      onZu={() => setSpielerOffen(false)}
    />
  );

  if (ansicht.seite === 'training') {
    const f = fuehrung?.spieler === ich ? fuehrung : null;
    return <Training {...gemeinsam} spieler={ich} fuehrung={f} onFuehrung={fuehrungSetzen} />;
  }
  if (ansicht.seite === 'neu') {
    const art = ansicht.art;
    return <SpielNeu key={art} art={art} ich={ich} bekannte={bekannte} onAbbruch={zumStart} onStart={(m) => { spielerMerken(m.spieler); setMatch(art, m); setAnsicht({ seite: 'spiel', art }); }} />;
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
        <Statistik key={ich} aufnahmen={aufnahmen} ich={ich} onErsetzen={alleSetzen} />
      ) : reiter === 'tipps' ? (
        <Tipps onRundgang={() => setRundgang(true)} />
      ) : reiter === 'liga' ? (
        <Liga
          aufnahmen={aufnahmen}
          ich={ich}
          onTraining={() => setAnsicht({ seite: 'training' })}
          onNeu={(art) => setAnsicht({ seite: 'neu', art })}
          onComputer={(avg, legs) => {
            if (matches.x01 && !confirm('Dein laufendes 501-Spiel wird dabei beendet. Weiter?')) return;
            setMatch('x01', computerMatch(avg, legs, ich));
            setAnsicht({ seite: 'spiel', art: 'x01' });
          }}
          laufend={matches.x01?.computer ? { avg: matches.x01.computer.avg, onWeiter: () => setAnsicht({ seite: 'spiel', art: 'x01' }) } : undefined}
        />
      ) : (
        <Start
          reiter={reiter}
          matches={matches}
          aufnahmen={aufnahmen}
          ich={ich}
          onSpieler={() => setSpielerOffen(true)}
          fuehrung={fuehrung?.spieler === ich ? fuehrung : null}
          onFuehrung={(f) => { fuehrungSetzen(f); setAnsicht({ seite: 'training' }); }}
          onTraining={() => setAnsicht({ seite: 'training' })}
          onNeu={(art) => setAnsicht({ seite: 'neu', art })}
          onWeiter={(art) => setAnsicht({ seite: 'spiel', art })}
        />
      )}
      <Reiterleiste aktiv={reiter} onWahl={reiterWaehlen} />
      <StartHilfe />
      {rundgang && <Rundgang onFertig={() => setRundgang(false)} />}
      {spielerFenster}
    </div>
  );
}
