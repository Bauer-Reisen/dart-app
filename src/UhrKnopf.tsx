// ⏱ Trainings-Timer: 5, 10 oder 15 Minuten, anhalten, Ton am Ende, kurze Auswertung.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { UHR_MINUTEN, uhrAuswertung, uhrText } from './uhr';
import type { Dart } from './speicher';

type Zustand =
  | { phase: 'aus' }
  | { phase: 'laeuft'; min: number; seit: number; ende: number }
  | { phase: 'pause'; min: number; seit: number; rest: number }
  | { phase: 'fertig'; min: number; seit: number; bis: number };

export interface UhrOpts {
  /** Was in der Zeit geworfen wurde (Text für das Ende-Fenster). */
  auswertung: (seit: number, bis: number) => ReactNode;
  /** Training: Ziel neu wählen (öffnet die Ziel-Auswahl). */
  neuesZiel?: () => void;
}

let ton: AudioContext | null = null;
function tonBereit() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ton && AC) ton = new AC();
    if (ton?.state === 'suspended') void ton.resume();
  } catch { /* kein Ton möglich */ }
}
function piepen() {
  try {
    if (!ton) return;
    const t0 = ton.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = ton.createOscillator(); const g = ton.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ton.destination);
      const a = t0 + i * 0.35;
      g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(0.4, a + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a + 0.25);
      o.start(a); o.stop(a + 0.27);
    }
  } catch { /* egal */ }
  try { navigator.vibrate?.([300, 150, 300]); } catch { /* iPhone: keine Vibration */ }
}

export function useUhr(o: UhrOpts | undefined) {
  const [z, setZ] = useState<Zustand>({ phase: 'aus' });
  const [menue, setMenue] = useState(false);
  const [, tick] = useState(0);
  const zRef = useRef(z); zRef.current = z;

  // jede Sekunde neu zeichnen und prüfen, ob die Zeit um ist (auch nach dem Aufwecken des Geräts)
  useEffect(() => {
    if (z.phase !== 'laeuft') return;
    const pruefen = () => {
      const jetzt = zRef.current;
      if (jetzt.phase !== 'laeuft') return;
      if (Date.now() >= jetzt.ende) { setZ({ phase: 'fertig', min: jetzt.min, seit: jetzt.seit, bis: jetzt.ende }); setMenue(false); piepen(); }
      else tick((n) => n + 1);
    };
    const id = window.setInterval(pruefen, 500);
    document.addEventListener('visibilitychange', pruefen);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', pruefen); };
  }, [z.phase]);

  if (!o) return { knopf: null, fenster: null };

  const starten = (min: number) => { tonBereit(); const t = Date.now(); setZ({ phase: 'laeuft', min, seit: t, ende: t + min * 60000 }); setMenue(false); };
  const anhalten = () => { if (z.phase === 'laeuft') setZ({ phase: 'pause', min: z.min, seit: z.seit, rest: z.ende - Date.now() }); setMenue(false); };
  const weiter = () => { tonBereit(); if (z.phase === 'pause') setZ({ phase: 'laeuft', min: z.min, seit: z.seit, ende: Date.now() + z.rest }); setMenue(false); };
  const beenden = () => { setZ({ phase: 'aus' }); setMenue(false); };

  const rest = z.phase === 'laeuft' ? z.ende - Date.now() : z.phase === 'pause' ? z.rest : 0;
  const knopf = (
    <button
      className={'icon uhr' + (z.phase === 'laeuft' ? ' laeuft' : z.phase === 'pause' ? ' pause' : '')}
      onClick={() => setMenue(true)}
      aria-label={z.phase === 'aus' || z.phase === 'fertig' ? 'Timer stellen' : 'Timer anhalten oder beenden'}
    >
      {z.phase === 'laeuft' ? uhrText(rest) : z.phase === 'pause' ? <>⏸ {uhrText(rest)}</> : '⏱'}
    </button>
  );

  let fenster: ReactNode = null;
  if (menue && (z.phase === 'aus' || z.phase === 'fertig')) {
    fenster = (
      <div className="wahl mitte" onClick={() => setMenue(false)}>
        <div className="wahl-box ende" onClick={(ev) => ev.stopPropagation()}>
          <h3>⏱ Timer</h3>
          <p className="leise">Wie lange willst du auf dieses Ziel werfen?</p>
          <div className="uhr-wahl">
            {UHR_MINUTEN.map((m) => <button key={m} className="btn gross" onClick={() => starten(m)}>{m} Min.</button>)}
          </div>
          <button className="btn gross" style={{ width: '100%', marginTop: 10 }} onClick={() => setMenue(false)}>Ohne Timer</button>
        </div>
      </div>
    );
  } else if (menue && (z.phase === 'laeuft' || z.phase === 'pause')) {
    fenster = (
      <div className="wahl mitte" onClick={() => setMenue(false)}>
        <div className="wahl-box ende" onClick={(ev) => ev.stopPropagation()}>
          <h3>⏱ Noch {uhrText(rest)}</h3>
          <div className="ende-knoepfe">
            {z.phase === 'laeuft'
              ? <button className="btn gross an" onClick={anhalten}>⏸ Anhalten</button>
              : <button className="btn gross an" onClick={weiter}>▶ Weiter</button>}
            <button className="btn gross" onClick={beenden}>Timer beenden</button>
            <button className="btn gross" onClick={() => setMenue(false)}>Schließen</button>
          </div>
        </div>
      </div>
    );
  } else if (z.phase === 'fertig') {
    fenster = (
      <div className="wahl mitte">
        <div className="wahl-box ende">
          <h3>⏱ {z.min} Minuten vorbei!</h3>
          <div className="uhr-auswertung">{o.auswertung(z.seit, z.bis)}</div>
          <div className="ende-knoepfe">
            {o.neuesZiel && (
              <button className="btn gross an" onClick={() => { starten(z.min); o.neuesZiel?.(); }}>Neues Ziel · nochmal {z.min} Min.</button>
            )}
            <button className={'btn gross' + (o.neuesZiel ? '' : ' an')} onClick={() => starten(z.min)}>{o.neuesZiel ? 'Gleiches Ziel · ' : ''}nochmal {z.min} Min.</button>
            <button className="btn gross" onClick={beenden}>Weiter ohne Timer</button>
          </div>
        </div>
      </div>
    );
  }

  return { knopf, fenster };
}

/** Ende-Fenster: Darts in der Zeit, im Training auch Treffer je Ziel. */
export function uhrInfo(darts: Dart[], mitZielen: boolean) {
  return (seit: number, bis: number) => {
    const a = uhrAuswertung(darts, seit, bis);
    return (
      <>
        <p><b>{a.darts}</b> Darts geworfen</p>
        {mitZielen && a.ziele.length > 0 && (
          <table className="auswertung">
            <tbody>
              {a.ziele.map((z) => (
                <tr key={z.ziel}><td>{z.ziel}</td><td>{z.treffer} von {z.n}</td><td><b>{Math.round((z.treffer / z.n) * 100)} %</b></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  };
}
