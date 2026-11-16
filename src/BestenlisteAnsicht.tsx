// 🏆 Bestenliste: Top 10 je Spiel über alle Spieler auf diesem Gerät.
import { useState } from 'react';
import { bestenlisten, TOP } from './bestenliste';
import type { Aufnahme } from './speicher';

const datum = (t: number) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const SPIELE = ['501', '301', 'Cricket', 'Halve-It'];

export function BestenlisteAnsicht({ aufnahmen, ich }: { aufnahmen: Aufnahme[]; ich: string }) {
  const listen = bestenlisten(aufnahmen);
  const vorhanden = SPIELE.filter((s) => listen.some((l) => l.spiel === s && l.eintraege.length));
  const [spiel, setSpiel] = useState(() => vorhanden[0] ?? '501');
  const gezeigt = listen.filter((l) => l.spiel === spiel);

  return (
    <>
      <div className="ringwahl bereich-wahl">
        {SPIELE.map((s) => (
          <button key={s} className={'btn' + (spiel === s ? ' an' : '')} onClick={() => setSpiel(s)}>{s}</button>
        ))}
      </div>
      {gezeigt.map((l) => (
        <div className="karte" key={l.id}>
          <div className="karte-kopf"><strong>{l.titel}</strong><span>Top {TOP}</span></div>
          {l.eintraege.length ? (
            <table className="bestenliste">
              <tbody>
                {l.eintraege.map((e, i) => (
                  <tr key={i} className={e.name === ich ? 'ich' : ''}>
                    <td className="platz">{i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`}</td>
                    <td>{e.name}{e.info && <small>{e.info}</small>}</td>
                    <td className="wert">{e.text}</td>
                    <td className="datum">{datum(e.zeit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="info klein">Noch keine Einträge.</p>
          )}
          <p className="info klein">{l.erklaerung}</p>
        </div>
      ))}
      <p className="info klein">Alle Spieler auf diesem Gerät, ohne Computer-Gegner. Deine Zeilen sind hervorgehoben.</p>
    </>
  );
}
