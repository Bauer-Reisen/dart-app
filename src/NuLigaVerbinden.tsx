// Einmalig auswählen: Bezirk → Liga → Mannschaft → eigener Name (Daten live von nuLiga über den Liga-Vermittler).
import { useEffect, useState } from 'react';
import type { NuLigaVerbindung } from './liga';
import { nuLigaHolen } from './nuligaImport';

interface Wahl { id: string; name: string }
type Schritt = 'region' | 'staffel' | 'team' | 'person';

const TITEL: Record<Schritt, string> = { region: 'Dein Bezirk', staffel: 'Deine Liga', team: 'Deine Mannschaft', person: 'Wer bist du?' };

export function NuLigaVerbinden({ onFertig, onAbbruch }: { onFertig: (v: NuLigaVerbindung) => void; onAbbruch: () => void }) {
  const [region, setRegion] = useState<Wahl | null>(null);
  const [staffel, setStaffel] = useState<Wahl | null>(null);
  const [team, setTeam] = useState<Wahl | null>(null);
  const [liste, setListe] = useState<Wahl[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const schritt: Schritt = !region ? 'region' : !staffel ? 'staffel' : !team ? 'team' : 'person';

  useEffect(() => {
    let aktiv = true;
    setListe(null);
    setFehler(null);
    const laden = async (): Promise<Wahl[]> => {
      if (schritt === 'region') return (await nuLigaHolen<{ regionen: Wahl[] }>('regionen')).regionen;
      if (schritt === 'staffel') return (await nuLigaHolen<{ staffeln: Wahl[] }>('staffeln', { region: region!.id })).staffeln;
      if (schritt === 'team') {
        return (await nuLigaHolen<{ mannschaften: Wahl[] }>('mannschaften', { region: region!.id, staffel: staffel!.id })).mannschaften;
      }
      const sp = (await nuLigaHolen<{ spieler: { person: string; name: string }[] }>('spieler', { region: region!.id, staffel: staffel!.id, team: team!.id })).spieler;
      return sp.map((x) => ({ id: x.person, name: x.name }));
    };
    laden()
      .then((l) => { if (aktiv) setListe(l); })
      .catch((e) => { if (aktiv) setFehler(navigator.onLine ? (e as Error).message : 'Kein Internet. Bitte später noch einmal versuchen.'); });
    return () => { aktiv = false; };
  }, [schritt, region, staffel, team]);

  function zurueck() {
    if (team) setTeam(null);
    else if (staffel) setStaffel(null);
    else if (region) setRegion(null);
    else onAbbruch();
  }

  function waehlen(w: Wahl) {
    if (schritt === 'region') setRegion(w);
    else if (schritt === 'staffel') setStaffel(w);
    else if (schritt === 'team') setTeam(w);
    else onFertig({ region: region!.id, staffel: staffel!.id, staffelName: staffel!.name, team: team!.id, teamName: team!.name, person: w.id, name: w.name });
  }

  return (
    <div className="seite liga">
      <div className="stats-kopf">
        <button className="btn" onClick={zurueck}>‹ Zurück</button>
        <h2>Mit Liga verbinden</h2>
      </div>
      <p className="info klein">{[region?.name, staffel?.name, team?.name].filter(Boolean).join(' › ') || 'Bayerischer Dart-Verband (nuLiga)'}</p>
      <h3>{TITEL[schritt]}</h3>
      {schritt === 'person' && (
        <p className="info klein">
          Tippe auf deinen Namen. Die App holt dann deine Ergebnisse aus den öffentlichen Spielberichten. Gespeichert wird nur auf diesem Gerät.
        </p>
      )}
      {fehler && <p className="info">⚠️ {fehler}</p>}
      {!liste && !fehler && <p className="info">Lädt …</p>}
      {liste && !liste.length && (
        <p className="info">
          {schritt === 'person'
            ? 'Noch keine Spieler mit Einzel-Ergebnissen in dieser Mannschaft. Das klappt nach dem ersten Spieltag.'
            : 'Hier ist nichts zu finden.'}
        </p>
      )}
      <div className="wahlliste">
        {liste?.map((w) => (
          <button key={w.id} className="zeile-spieltag" onClick={() => waehlen(w)}>
            <span className="wer">{w.name}</span>
            <span className="erg">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
