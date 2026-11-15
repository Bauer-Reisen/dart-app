// nuLiga: Liga-Daten über den Liga-Vermittler (Cloudflare Worker, Ordner worker/) holen
// und in die eigenen Liga-Daten übernehmen.
import type { LigaDaten, LigaSpiel, Spieltag } from './liga';

export const LIGA_DIENST = 'https://dart-app-liga.film-app.workers.dev';

export interface NuLigaAntwort {
  mannschaft: string;
  ich: { name: string; average: number | null; bilanz: string | null; abende: number | null } | null;
  spielplan: { datum: string; zeit: string; heim: boolean; gegner: string; bericht: string | null; ergebnis: string | null }[];
  staerken: Record<string, { von: number; bis: number; mittel: number; spieler: number }>;
  abende: {
    bericht: string;
    datum: string;
    average: number | null;
    spiele: { art: 'einzel' | 'doppel'; gegner: string; legsIch: number; legsGegner: number }[];
  }[];
}

export async function nuLigaHolen<T = any>(pfad: string, params: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${LIGA_DIENST}/${pfad}?${new URLSearchParams(params)}`);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.fehler || 'Liga-Daten nicht erreichbar');
  return j as T;
}

const norm = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');
/** "Muster, Max" passt zu "Max Muster", "muster" usw. */
function gleicherName(a: string, b: string): boolean {
  const ta = norm(a).split(/[ ,&]+/).filter(Boolean);
  const tb = norm(b).split(/[ ,&]+/).filter(Boolean);
  return ta.length > 0 && tb.length > 0 && (ta.every((t) => tb.includes(t)) || tb.every((t) => ta.includes(t)));
}

/**
 * Spieltage anlegen/aktualisieren, Gegner-Averages setzen, eigene Spiele und Average je Abend eintragen.
 * Eigene Notizen bleiben erhalten; von Hand eingetragene Spiele gegen denselben Gegner werden
 * durch die nuLiga-Spiele ersetzt (ihre Notiz wird übernommen).
 */
export function nuLigaUebernehmen(d: LigaDaten, a: NuLigaAntwort, jetzt = Date.now()): LigaDaten {
  const liste = [...d.spieltage];
  for (const p of a.spielplan) {
    const id = `nu-${p.datum}-${norm(p.gegner).replace(/[^a-z0-9äöüß]+/g, '-')}`;
    let i = liste.findIndex((s) => s.id === id);
    if (i < 0) i = liste.findIndex((s) => !s.id.startsWith('nu-') && s.datum === p.datum);
    const alt: Spieltag | undefined = i >= 0 ? liste[i] : undefined;
    const st = a.staerken[p.gegner];
    const abend = p.bericht ? a.abende.find((x) => x.bericht === p.bericht) : undefined;

    let spiele: LigaSpiel[] = alt?.spiele ?? [];
    if (abend && abend.spiele.length) {
      const vorher = spiele;
      const neu: LigaSpiel[] = abend.spiele.map((s, k) => {
        const nid = `nu-${abend.bericht}-${k}`;
        const v = vorher.find((x) => x.id === nid) ?? vorher.find((x) => !x.id.startsWith('nu-') && gleicherName(x.gegner, s.gegner));
        return { id: nid, art: s.art, gegner: s.gegner, legsIch: s.legsIch, legsGegner: s.legsGegner, average: v?.average, notiz: v?.notiz };
      });
      const uebrig = vorher.filter((x) => !x.id.startsWith('nu-') && !neu.some((n) => gleicherName(n.gegner, x.gegner)));
      spiele = [...neu, ...uebrig];
    }

    const tag: Spieltag = {
      ...(alt ?? {}),
      id,
      datum: p.datum,
      zeit: p.zeit,
      gegner: p.gegner,
      heim: p.heim,
      avgVon: st ? Math.floor(st.von) : alt?.avgVon,
      avgBis: st ? Math.ceil(st.bis) : alt?.avgBis,
      spiele,
      ergebnis: p.ergebnis ?? undefined,
      average: abend?.average ?? alt?.average,
    };
    if (i >= 0) liste[i] = tag;
    else liste.push(tag);
  }
  return { ...d, spieltage: liste, nuliga: d.nuliga ? { ...d.nuliga, stand: jetzt } : d.nuliga };
}
