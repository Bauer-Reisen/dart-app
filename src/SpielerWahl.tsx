// „Wer wirft?" – Leiste oben im Training und bei den Spielen, Fenster zum Wählen, Anlegen und Umbenennen.
import { useRef, useState } from 'react';
import { nameOk } from './spieler';

export function SpielerLeiste({ aktiv, onOeffnen }: { aktiv: string; onOeffnen: () => void }) {
  return (
    <button className="spieler-leiste" onClick={onOeffnen}>
      <span>Es wirft: <b>{aktiv}</b></span>
      <span className="wechsel">wechseln ›</span>
    </button>
  );
}

interface Props {
  liste: string[];
  aktiv: string;
  onWahl: (name: string) => void;
  onNeu: (name: string) => void;
  onUmbenennen: (alt: string, neu: string) => void;
  onZu: () => void;
}

export function SpielerFenster({ liste, aktiv, onWahl, onNeu, onUmbenennen, onZu }: Props) {
  const [neu, setNeu] = useState('');
  const [bearbeite, setBearbeite] = useState<string | null>(null);
  const [text, setText] = useState('');

  function anlegen() {
    const n = nameOk(neu);
    if (!n) return;
    if (liste.includes(n)) onWahl(n);
    else onNeu(n);
    setNeu('');
  }

  const fertig = useRef<string | null>(null); // verhindert doppeltes Speichern (Verlassen des Feldes + OK)
  function speichern(alt: string) {
    if (fertig.current === alt) return;
    fertig.current = alt;
    setTimeout(() => { fertig.current = null; }, 500);
    const n = nameOk(text);
    setBearbeite(null);
    if (!n || n === alt) return;
    if (liste.includes(n) && !confirm(`„${n}" gibt es schon. Die Würfe von „${alt}" und „${n}" zusammenführen?`)) return;
    onUmbenennen(alt, n);
  }

  // Schließen speichert einen gerade bearbeiteten Namen mit (sonst ginge die Änderung verloren)
  const zu = () => { if (bearbeite) speichern(bearbeite); onZu(); };

  return (
    <div className="wahl mitte" onClick={zu}>
      <div className="wahl-box hilfe-box tipp-box" onClick={(e) => e.stopPropagation()}>
        <h3>Wer wirft?</h3>
        <p className="info klein">Jeder Spieler hat seine eigene Statistik und seine eigenen Tipps.</p>
        <div className="spieler-liste">
          {liste.map((n) => (
            <div key={n} className={'spieler-zeile' + (n === aktiv ? ' an' : '')}>
              {bearbeite === n ? (
                <>
                  <input autoFocus value={text} maxLength={24} onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') speichern(n); }} onBlur={() => speichern(n)} aria-label="Neuer Name" />
                  <button className="btn an" onClick={() => speichern(n)}>OK</button>
                </>
              ) : (
                <>
                  <button className="name" onClick={() => onWahl(n)}>{n === aktiv ? '● ' : ''}{n}</button>
                  <button className="btn" onClick={() => { setBearbeite(n); setText(n); }} aria-label={`${n} umbenennen`}>✎</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="spieler-zeile">
          <input value={neu} maxLength={24} placeholder="Neuer Spieler" onChange={(e) => setNeu(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') anlegen(); }} />
          <button className="btn" onClick={anlegen} disabled={!nameOk(neu)}>＋</button>
        </div>
        <p className="info klein">Mit ✎ änderst du einen Namen – alle bisherigen Würfe gehen mit. Aus „Ich" wird so zum Beispiel dein Name.</p>
        <button className="btn gross" style={{ width: '100%', marginTop: 10 }} onClick={zu}>Schließen</button>
      </div>
    </div>
  );
}
