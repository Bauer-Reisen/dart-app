// Reiter „Tipps": Themen zum Aufklappen und Checkout-Tabelle.
import { useMemo, useState } from 'react';
import { checkout, wegText } from './checkout';
import { THEMEN } from './tipps';

export function Tipps() {
  const [offen, setOffen] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const tabelle = useMemo(() => {
    const zeilen: { rest: number; weg: string | null }[] = [];
    for (let r = 170; r >= 2; r--) {
      const w = checkout(r, 3, true);
      zeilen.push({ rest: r, weg: w ? wegText(w) : null });
    }
    return zeilen;
  }, []);
  const gefiltert = filter ? tabelle.filter((z) => String(z.rest).startsWith(filter)) : tabelle;

  const umschalten = (t: string) => setOffen(offen === t ? null : t);

  return (
    <div className="seite tipps">
      <h1>Tipps</h1>

      {THEMEN.map((t) => (
        <div key={t.titel} className={'thema' + (offen === t.titel ? ' offen' : '')}>
          <button className="thema-kopf" onClick={() => umschalten(t.titel)} aria-expanded={offen === t.titel}>
            <span><b>{t.titel}</b><small>{t.kurz}</small></span>
            <span className="pfeil">›</span>
          </button>
          {offen === t.titel && (
            <ul className="thema-text">
              {t.punkte.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
        </div>
      ))}

      <div className={'thema' + (offen === 'checkout' ? ' offen' : '')}>
        <button className="thema-kopf" onClick={() => umschalten('checkout')} aria-expanded={offen === 'checkout'}>
          <span><b>Checkout-Tabelle</b><small>Wege von 170 bis 2, mit Doppel ausmachen</small></span>
          <span className="pfeil">›</span>
        </button>
        {offen === 'checkout' && (
          <div className="thema-text">
            <input
              className="suche"
              inputMode="numeric"
              placeholder="Rest suchen, z. B. 81"
              value={filter}
              onChange={(e) => setFilter(e.target.value.replace(/\D/g, '').slice(0, 3))}
            />
            <table className="checkout">
              <tbody>
                {gefiltert.map((z) => (
                  <tr key={z.rest} className={z.weg ? '' : 'kein'}>
                    <td>{z.rest}</td>
                    <td>{z.weg ?? 'nicht in 3 Darts'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="info klein">
              Bevorzugt werden D20 und D16 als Doppel und T20 zum Aufbauen. Im Spiel zeigt die App den Weg automatisch an.
            </p>
          </div>
        )}
      </div>

      <p className="info klein">
        Die Tipps sind Anstöße nach gängigen Trainingsgrundlagen und ersetzen keinen Trainer.
        Passende Tipps zu deinem eigenen Wurfbild findest du in der Statistik und im Training unter 💡.
      </p>
    </div>
  );
}
