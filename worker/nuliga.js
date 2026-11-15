// Liest öffentliche Seiten von nuLiga (Bayerischer Dart-Verband) und macht daraus kleine Datenpakete.
// Nichts wird gespeichert; Namen fremder Spieler gibt es nur dort, wo die App sie braucht
// (Auswahl des eigenen Namens, eigene Gegner). Die Stärke anderer Mannschaften wird nur als
// Spannbreite der Averages weitergegeben, ohne Namen.

export const HOST = 'https://bdv-dart.liga.nu';
export const BASIS = HOST + '/cgi-bin/WebObjects/nuLigaDARTDE.woa/wa/';

/** Bezirke des BDV mit ihrem Kürzel bei nuLiga. */
export const REGIONEN = [
  ['BY', 'Bayern (Landesligen)'],
  ['UFr', 'Unterfranken'],
  ['MFr', 'Mittelfranken'],
  ['OFr', 'Oberfranken'],
  ['OPf', 'Oberpfalz'],
  ['OBay', 'Oberbayern'],
  ['NBay', 'Niederbayern'],
  ['Schw', 'Schwaben'],
];

/** Saison wie bei nuLiga, z. B. "2026/27" (Wechsel im Juli). */
export function saisonVon(jetzt = new Date()) {
  const j = jetzt.getMonth() >= 6 ? jetzt.getFullYear() : jetzt.getFullYear() - 1;
  return `${j}/${String((j + 1) % 100).padStart(2, '0')}`;
}

export function championship(region, saison) {
  return encodeURIComponent(`${region} ${saison}`).replace(/%20/g, '+');
}

// ---------------- HTML-Helfer ----------------

const ENT = { '&amp;': '&', '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&acute;': '´' };
export function text(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENT[e] ?? (e.startsWith('&#') ? String.fromCharCode(parseInt(e.slice(2), 10)) : ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Zeilen einer Tabelle als Liste von Zellen (HTML). */
export function zeilen(html) {
  const out = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const zellen = tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [];
    out.push(zellen);
  }
  return out;
}

const zahl = (t) => {
  const m = /(\d+),(\d+)/.exec(t);
  return m ? Number(`${m[1]}.${m[2]}`) : null;
};
const personen = (zelle) => [...zelle.matchAll(/person=(\d+)[^>]*>([^<]+)</g)].map((m) => ({ id: m[1], name: text(m[2]) }));

// ---------------- Seiten ----------------

/** Staffeln (Ligen) eines Bezirks. */
export function parseStaffeln(html) {
  const out = [];
  const gesehen = new Set();
  for (const m of html.matchAll(/groupPage\?championship=[^"&]*&amp;group=(\d+)">([^<]+)</g)) {
    if (gesehen.has(m[1])) continue;
    gesehen.add(m[1]);
    out.push({ id: m[1], name: text(m[2]).replace(/_/g, ' ') });
  }
  return out;
}

/** Mannschaften einer Staffel (aus der Tabelle). */
export function parseMannschaften(html) {
  const out = [];
  const gesehen = new Set();
  for (const m of html.matchAll(/teamPortrait\?teamtable=(\d+)[^"]*">([^<]+)</g)) {
    if (gesehen.has(m[1])) continue;
    gesehen.add(m[1]);
    out.push({ id: m[1], name: text(m[2]) });
  }
  return out;
}

/** Einzel-Rangliste: Spieler mit Mannschaft und Gesamt-Average. */
export function parseRangliste(html) {
  const out = [];
  for (const z of zeilen(html)) {
    const p = z.map((c) => personen(c)).find((x) => x.length);
    const team = z.map((c) => /teamtable=(\d+)[^>]*>([\s\S]*?)<\/a>/.exec(c)).find(Boolean);
    if (!p || !team) continue;
    const letzte = text(z[z.length - 1]);
    const avg = zahl(letzte);
    const spiele = /\((\d+)\)/.exec(letzte);
    const bilanz = z.map((c) => text(c)).find((t) => /^\d+:\d+$/.test(t)) ?? null;
    out.push({ person: p[0].id, name: p[0].name, team: team[1], teamName: text(team[2]), average: avg, abende: spiele ? Number(spiele[1]) : null, bilanz });
  }
  return out;
}

/** Spielplan einer Staffel: alle Begegnungen mit Datum, Heim, Gast, Ergebnis und Bericht-Nummer. */
export function parseSpielplan(html) {
  const out = [];
  let datum = null;
  for (const z of zeilen(html)) {
    const t = z.map((c) => text(c));
    const d = t.find((x) => /^\d{2}\.\d{2}\.\d{4}$/.test(x));
    if (d) datum = d.split('.').reverse().join('-');
    const zeit = t.find((x) => /^\d{1,2}:\d{2}\b/.test(x));
    const nw = z.filter((c) => /<td nowrap="nowrap">/i.test(c)).map((c) => text(c));
    if (!datum || nw.length < 2 || !zeit) continue;
    const bz = z.find((c) => /meeting=\d+/.test(c));
    const bericht = bz ? /meeting=(\d+)/.exec(bz) : null;
    const erg = bz ? (/(\d+:\d+)/.exec(text(bz))?.[1] ?? null) : null;
    out.push({ datum, zeit: zeit.slice(0, 5), heim: nw[0], gast: nw[1], ergebnis: erg, bericht: bericht ? bericht[1] : null });
  }
  return out;
}

/** Spielbericht: Spiele (Einzel/Doppel mit Personen und Legs) und Average je Person. */
export function parseBericht(html) {
  const spiele = [];
  const avgTeil = html.split(/Average der Spieler/i);
  for (const z of zeilen(avgTeil[0])) {
    if (z.length < 4) continue;
    const art = text(z[0]);
    if (!/^(D?\d+)-(D?\d+)$/.test(art)) continue;
    const heim = personen(z[1]);
    const gast = personen(z[2]);
    const legs = /(\d+):(\d+)/.exec(text(z[3]));
    if (!legs || !heim.length || !gast.length) continue;
    spiele.push({ art: art.startsWith('D') ? 'doppel' : 'einzel', heim, gast, legsHeim: Number(legs[1]), legsGast: Number(legs[2]) });
  }
  const average = {};
  if (avgTeil[1]) {
    for (const z of zeilen(avgTeil[1])) {
      const p = z.map((c) => personen(c)).find((x) => x.length);
      const a = z.map((c) => zahl(text(c))).find((x) => x !== null);
      if (p && a !== undefined && a !== null) average[p[0].id] = a;
    }
  }
  return { spiele, average };
}

// ---------------- Auswertung für die App ----------------

/** Spannbreite der Averages je Mannschaft (ohne Namen). */
export function staerken(rang) {
  const m = {};
  for (const r of rang) {
    if (r.average === null) continue;
    (m[r.teamName] ??= []).push(r.average);
  }
  const out = {};
  for (const [team, l] of Object.entries(m)) {
    l.sort((a, b) => a - b);
    out[team] = { von: l[0], bis: l[l.length - 1], mittel: Math.round((l.reduce((a, b) => a + b, 0) / l.length) * 10) / 10, spieler: l.length };
  }
  return out;
}

/** Eigene Spiele und eigener Average an einem Abend. */
export function eigeneSpiele(bericht, person) {
  const spiele = [];
  for (const s of bericht.spiele) {
    const inHeim = s.heim.some((p) => p.id === person);
    const inGast = s.gast.some((p) => p.id === person);
    if (!inHeim && !inGast) continue;
    const gegner = (inHeim ? s.gast : s.heim).map((p) => p.name).join(' & ');
    spiele.push({
      art: s.art,
      gegner,
      legsIch: inHeim ? s.legsHeim : s.legsGast,
      legsGegner: inHeim ? s.legsGast : s.legsHeim,
    });
  }
  return { spiele, average: bericht.average[person] ?? null };
}
