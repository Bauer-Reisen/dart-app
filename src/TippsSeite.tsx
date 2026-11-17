// Reiter „Tipps": Themen zum Aufklappen und Checkout-Tabelle.
import { useEffect, useMemo, useState } from 'react';
import { checkout, wegText } from './checkout';
import { THEMEN } from './tipps';

const APP_URL = 'https://bauer-reisen.github.io/dart-app/';

async function teilen() {
  try {
    if (navigator.share) { await navigator.share({ title: 'Dart-Training', text: 'Dart-Training: Würfe eintippen, Statistik, Tipps', url: APP_URL }); return; }
    await navigator.clipboard.writeText(APP_URL);
    alert('Link kopiert.');
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') alert('Link: ' + APP_URL);
  }
}

export function Tipps({ onRundgang }: { onRundgang: () => void }) {
  const [offen, setOffen] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  // Aufgeklapptes Thema nach oben holen, damit man seinen Anfang sieht
  useEffect(() => {
    if (offen) document.getElementById('thema-' + offen)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [offen]);

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
        <div key={t.titel} id={'thema-' + t.titel} className={'thema' + (offen === t.titel ? ' offen' : '')}>
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

      <div id="thema-checkout" className={'thema' + (offen === 'checkout' ? ' offen' : '')}>
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
      <button className="btn breit" onClick={onRundgang}>Rundgang durch die App ansehen</button>

      <div className="karte weitergeben">
        <h3>App weitergeben</h3>
        <img className="qr" src="img/qr.svg" alt="QR-Code zur App" width={200} height={200} />
        <p className="info klein"><a href={APP_URL}>{APP_URL.replace('https://', '')}</a></p>
        <button className="btn an" onClick={teilen}>Link teilen</button>
        <p className="info klein">Mit der Handy-Kamera scannen – fertig.</p>
      </div>
    </div>
  );
}
