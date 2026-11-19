// Der Trainer: liest aus den eigenen Würfen, WAS genau los ist, und gibt dazu passende, begründete Tipps.
// - Lage: eng beieinander, aber versetzt (→ Stand/Zielpunkt, nicht die Technik umbauen) oder weit gestreut (→ Gleichmäßigkeit)
// - Streuform: eher in die Höhe (Loslassen, Griff) oder zur Seite (Armlinie, Stand) – und welche Doppel dazu passen
// - Dartfolge: 1./2./3. Dart, nach Treffer/Fehlwurf · Einheiten: Einwerfen, Ermüdung
// - Zurufe während des Trainings
// Grundlage: gängige Trainer-Ratgeber (siehe tipps.ts). Die App sieht nur, wo der Dart landet, nicht wie geworfen wird.
import { sameZiel, zielLabel, type Ziel } from './board';
import { zielPunkt } from './gegner';
import { klasse } from './klassen';
import type { Aufnahme, Dart } from './speicher';
import { RAT, richtung, wurfbild, wurfbildTipps, type Richtung } from './tipps';
import { bilanz, block, zwischenstand, type Block } from './fortschritt';

export interface CoachTipp {
  id: string;
  /** Befund in einem Satz, z. B. „Eng beieinander, aber 8 mm zu tief“. */
  titel: string;
  /** Woran die App das sieht (Zahlen). */
  warum: string;
  ursache?: string;
  probier: string[];
  uebung?: string;
  /** Kurzer Satz für einen Zuruf im Training. */
  zuruf: string;
  gewicht: number;
  richtung?: Richtung;
  lob?: boolean;
}

export const MIN_LAGE = 15;   // getippte Darts auf ein Ziel
export const ENG = 14;        // mm: halbe Darts innerhalb davon = eng
export const WEIT = 20;       // mm: ab hier „weit gestreut“

const gezielt = (d: Dart) => !d.frei && d.hit.ring !== 'BOUNCE';
const trifft = (d: Dart) => klasse(d.ziel, d.hit) === 'treffer';
const pz = (x: number) => `${Math.round(x * 100)} %`;
const mm = (x: number) => `${Math.round(Math.abs(x))} mm`;

// ===================== Lage auf einem Ziel =====================

export interface Lage {
  n: number;
  dx: number; dy: number;   // mittlerer Treffpunkt relativ zur Zielmitte (x rechts, y unten)
  sx: number; sy: number;   // Streuung zur Seite / in der Höhe (Standardabweichung, mm)
  streu: number;            // halbe Darts innerhalb dieses Abstands um den Treffpunkt
  versetzt: boolean;        // Versatz ist größer als der Zufall erklären würde
}

export function lage(darts: Dart[], z: Ziel): Lage | null {
  if (z.ring === 'S') return null; // beim Single ist die Mitte nicht eindeutig
  const [mx, my] = zielPunkt(z);
  const p = darts.filter((d) => d.p && gezielt(d) && sameZiel(d.ziel, z)).map((d) => [d.p![0] - mx, d.p![1] - my]);
  if (p.length < MIN_LAGE) return null;
  const n = p.length;
  const dx = p.reduce((s, q) => s + q[0], 0) / n;
  const dy = p.reduce((s, q) => s + q[1], 0) / n;
  const sx = Math.sqrt(p.reduce((s, q) => s + (q[0] - dx) ** 2, 0) / n);
  const sy = Math.sqrt(p.reduce((s, q) => s + (q[1] - dy) ** 2, 0) / n);
  const abst = p.map((q) => Math.hypot(q[0] - dx, q[1] - dy)).sort((a, b) => a - b);
  const streu = abst[Math.floor(n / 2)];
  const versatz = Math.hypot(dx, dy);
  // Zufall: mittlerer Treffpunkt schwankt um etwa Streuung / Wurzel(n)
  const zufall = Math.hypot(sx, sy) / Math.sqrt(n);
  return { n, dx, dy, sx, sy, streu, versetzt: versatz >= 5 && versatz >= 2.5 * zufall };
}

const KURZ: Record<Richtung, string> = {
  unten: 'Griff lockern und den Arm nach dem Wurf stehen lassen.',
  oben: 'Ruhiges Handgelenk, den Dart erst vorn aus den Fingern gleiten lassen.',
  links: 'Stand prüfen: vorderer Fuß an deiner Stelle? Schulter, Ellbogen, Finger auf eine Linie.',
  rechts: 'Stand prüfen: vorderer Fuß an deiner Stelle? Schulter, Ellbogen, Finger auf eine Linie.',
};
const WORT: Record<Richtung, string> = { oben: 'zu hoch', unten: 'zu tief', links: 'links daneben', rechts: 'rechts daneben' };

function hauptRichtung(l: Lage): Richtung {
  return Math.abs(l.dy) >= Math.abs(l.dx) ? (l.dy > 0 ? 'unten' : 'oben') : (l.dx > 0 ? 'rechts' : 'links');
}

function versatzText(l: Lage): string {
  const t: string[] = [];
  if (Math.abs(l.dy) >= 3) t.push(`${mm(l.dy)} ${l.dy > 0 ? 'zu tief' : 'zu hoch'}`);
  if (Math.abs(l.dx) >= 3) t.push(`${mm(l.dx)} ${l.dx > 0 ? 'rechts' : 'links'}`);
  return t.join(' und ');
}

/** Tipps aus der genauen Lage der Darts auf einem Ziel. */
export function lageTipps(darts: Dart[], z: Ziel): CoachTipp[] {
  const l = lage(darts, z);
  if (!l) return [];
  const name = zielLabel(z);
  const aus: CoachTipp[] = [];
  const r = hauptRichtung(l);
  const basis = `${l.n} getippte Darts auf ${name}`;

  if (l.versetzt && l.streu < ENG) {
    const seitlich = r === 'links' || r === 'rechts';
    aus.push({
      id: `${name}:eng-versetzt:${r}`, richtung: r, gewicht: 3,
      titel: `Eng beieinander, aber im Schnitt ${versatzText(l)}`,
      warum: `${basis}: Die Hälfte liegt innerhalb von ${mm(l.streu)} – dein Wurf ist also gleichmäßig. Nur der ganze Haufen sitzt versetzt.`,
      ursache: seitlich
        ? 'Bei gleichmäßigem Versatz zur Seite liegt es meist am Stand oder an der Blicklinie, nicht am Arm. Den Wurf selbst musst du nicht umbauen.'
        : r === 'unten'
          ? 'Ein gleichmäßiger Versatz nach unten kommt oft von einem etwas zu festen Griff oder vom Gewicht auf dem hinteren Fuß. Den Wurf selbst musst du nicht umbauen.'
          : 'Ein gleichmäßiger Versatz nach oben kommt oft von einem etwas zu lockeren Griff oder einem Handgelenk, das nachschnippt. Den Wurf selbst musst du nicht umbauen.',
      probier: seitlich
        ? ['Den vorderen Fuß ein kleines Stück zur Seite setzen oder den Stand leicht drehen – nicht anders zielen.', 'Immer nur eine Sache ändern und mindestens 10 Aufnahmen dabei bleiben.', 'Blick prüfen: mit beiden Augen offen auf das Ziel schauen, dann ein Auge schließen – mit welchem Auge springt das Ziel nicht? Das ist dein Zielauge.']
        : r === 'unten'
          ? ['Griff eine Spur lockerer.', 'Gewicht etwas mehr nach vorn.', 'Immer nur eine Sache ändern und mindestens 10 Aufnahmen dabei bleiben.']
          : ['Griff eine Spur fester.', 'Handgelenk ruhig halten, den Dart vorn gleiten lassen.', 'Immer nur eine Sache ändern und mindestens 10 Aufnahmen dabei bleiben.'],
      uebung: 'Gleiches Ziel, eine kleine Änderung, 10 Aufnahmen – danach in der Statistik schauen, ob der Haufen in die Mitte rückt.',
      zuruf: seitlich ? 'Deine Darts liegen eng, nur versetzt: Stand ein kleines Stück verschieben, nicht anders zielen.' : KURZ[r],
    });
  } else if (l.versetzt) {
    aus.push({
      id: `${name}:versetzt:${r}`, richtung: r, gewicht: 2.5,
      titel: `Im Schnitt ${versatzText(l)}`,
      warum: `${basis}: Der mittlere Treffpunkt liegt deutlich ${WORT[r]} – mehr, als Zufall erklären würde.`,
      ...ratFuer(r),
      zuruf: KURZ[r],
    });
  } else if (l.streu >= WEIT) {
    aus.push({
      id: `${name}:weit`, gewicht: 2,
      titel: 'Gut ausgerichtet, aber weit gestreut',
      warum: `${basis}: Im Schnitt triffst du die Mitte, aber nur die Hälfte liegt innerhalb von ${mm(l.streu)}. Dein Ablauf ändert sich also von Wurf zu Wurf.`,
      ursache: 'Weit verteilte Darts kommen meist von Griff, Rhythmus oder Stand, die sich zwischen den Würfen ändern – nicht von falschem Zielen.',
      probier: [
        'Jedes Mal derselbe Ablauf: Füße hinstellen, greifen, Arm heben, kurz halten, ausholen, werfen, stehen lassen.',
        'Langsamer werden – Hektik macht jeden Wurf anders.',
        'Griff jedes Mal gleich: Dart an derselben Stelle fassen.',
      ],
      uebung: 'Halbe Distanz: aus etwa 1,2 m locker auf die Mitte werfen. Werden die Darts dort viel enger, liegt es am Loslassen; bleiben sie verstreut, eher an Griff oder Ellbogen. Außerdem: 5 Minuten nur auf die große Single 20, Punkte egal – nur darauf achten, wie eng die Darts beieinander landen.',
      zuruf: 'Gleicher Ablauf bei jedem Dart: hinstellen, greifen, kurz halten, werfen, stehen lassen.',
    });
  } else if (l.streu < ENG) {
    aus.push({
      id: `${name}:gut`, gewicht: 0, lob: true,
      titel: 'Mittig und eng – sehr gut',
      warum: `${basis}: Treffpunkt fast in der Mitte, die Hälfte innerhalb von ${mm(l.streu)}.`,
      probier: ['Nichts ändern. Genau diesen Ablauf weiter wiederholen.'],
      zuruf: 'Läuft – genau so weiter, nichts ändern.',
    });
  }

  // Streuform: deutlich mehr in eine Richtung
  if (l.sy >= 6 && l.sy >= 1.4 * l.sx) {
    aus.push({
      id: `${name}:form-hoehe`, gewicht: 1.5,
      titel: 'Du streust mehr in der Höhe als zur Seite',
      warum: `${basis}: in der Höhe etwa ±${mm(l.sy)}, zur Seite nur ±${mm(l.sx)}. Deine Richtung stimmt, die Höhe schwankt.`,
      ursache: 'Schwankende Höhe kommt meist vom Zeitpunkt des Loslassens (früh = hoch, spät = tief) oder von wechselndem Griffdruck.',
      probier: ['Bei jedem Wurf gleich fest greifen – eher locker.', 'Den Arm nach jedem Wurf gleich weit ausstrecken und stehen lassen.'],
      uebung: 'Einfrier-Test: nach jedem Wurf 2 Sekunden stehen bleiben und prüfen, ob der Zeigefinger jedes Mal gleich hoch zeigt.',
      zuruf: 'Gleich fest greifen und den Arm jedes Mal gleich weit ausstrecken.',
    });
  } else if (l.sx >= 6 && l.sx >= 1.4 * l.sy) {
    aus.push({
      id: `${name}:form-seite`, gewicht: 1.5,
      titel: 'Du streust mehr zur Seite als in der Höhe',
      warum: `${basis}: zur Seite etwa ±${mm(l.sx)}, in der Höhe nur ±${mm(l.sy)}. Deine Höhe stimmt, die Richtung schwankt.`,
      ursache: 'Schwankende Richtung kommt meist von der Armlinie: Schulter dreht mit, Ellbogen wandert, oder der Stand ist nicht jedes Mal gleich.',
      probier: ['Schulter, Ellbogen und Fingerspitzen auf einer Linie zum Ziel halten.', 'Oberkörper ruhig – nur der Unterarm bewegt sich.', 'Vorderer Fuß jedes Mal an derselben Stelle.'],
      uebung: 'Augen-zu-Test: in Wurfhaltung 5 Sekunden die Augen schließen. Schwankst du, ist der Stand nicht stabil genug.',
      zuruf: 'Schulter, Ellbogen, Finger auf eine Linie – Oberkörper ruhig.',
    });
  }
  return aus;
}

function ratFuer(r: Richtung): Pick<CoachTipp, 'ursache' | 'probier' | 'uebung'> {
  return { ursache: RAT[r].ursache, probier: RAT[r].probier, uebung: RAT[r].uebung };
}

// ===================== Tipps je Ziel =====================

/** Alle Tipps für ein Ziel, wichtigster zuerst: genaue Lage, wenn genug getippte Darts da sind, sonst die Fehlwurf-Richtungen. */
export function zielTipps(darts: Dart[], z: Ziel): CoachTipp[] {
  const l = lageTipps(darts, z);
  if (l.length) return l.sort((a, b) => b.gewicht - a.gewicht);
  const name = zielLabel(z);
  return wurfbildTipps(wurfbild(darts, z)).map((t) => ({
    id: `${name}:${t.richtung}`, richtung: t.richtung, gewicht: t.staerke === 'deutlich' ? 2.5 : 2,
    titel: `Meist ${WORT[t.richtung]}`,
    warum: t.muster,
    ursache: t.ursache, probier: t.probier, uebung: t.uebung,
    zuruf: KURZ[t.richtung],
  }));
}

// ===================== Welche Doppel passen zu dir? =====================

export interface Streuform { n: number; sx: number; sy: number }

/** Streuung über alle Ziele mit getippter Stelle (Triple, Doppel, Bull) – Versatz je Ziel herausgerechnet. */
export function streuform(darts: Dart[]): Streuform | null {
  const gruppen = new Map<string, [number, number][]>();
  for (const d of darts) {
    if (!d.p || !gezielt(d) || d.ziel.ring === 'S') continue;
    const k = zielLabel(d.ziel);
    const [mx, my] = zielPunkt(d.ziel);
    const g = gruppen.get(k) ?? [];
    g.push([d.p[0] - mx, d.p[1] - my]);
    gruppen.set(k, g);
  }
  let n = 0; let qx = 0; let qy = 0;
  for (const g of gruppen.values()) {
    if (g.length < 10) continue;
    const ax = g.reduce((s, q) => s + q[0], 0) / g.length;
    const ay = g.reduce((s, q) => s + q[1], 0) / g.length;
    for (const q of g) { qx += (q[0] - ax) ** 2; qy += (q[1] - ay) ** 2; n++; }
  }
  if (n < 30) return null;
  return { n, sx: Math.sqrt(qx / n), sy: Math.sqrt(qy / n) };
}

export function doppelTipp(darts: Dart[]): CoachTipp | null {
  const f = streuform(darts);
  if (!f) return null;
  const basis = `${f.n} getippte Darts: in der Höhe ±${mm(f.sy)}, zur Seite ±${mm(f.sx)}.`;
  const ring = 'Der Doppelring ist nur 8 mm schmal, aber rund 5 cm lang.';
  if (f.sy >= 1.3 * f.sx) {
    return {
      id: 'doppel:seite', gewicht: 1.2,
      titel: 'Deine Doppel: eher die seitlichen',
      warum: `${basis} Du streust mehr in der Höhe.`,
      ursache: `${ring} An den Seiten der Scheibe steht er hochkant – dort schadet Höhen-Streuung kaum.`,
      probier: ['D6 (rechts) und D11 (links) liegen dir am besten, fast genauso D10, D13, D8 und D14.', 'Im Doppeltraining einmal D6 oder D11 als Lieblingsdoppel ausprobieren.'],
      zuruf: 'Tipp für die Doppel: seitliche Doppel wie D6 oder D11 passen zu deiner Streuung.',
    };
  }
  if (f.sx >= 1.3 * f.sy) {
    return {
      id: 'doppel:obenunten', gewicht: 1.2,
      titel: 'Deine Doppel: eher oben und unten',
      warum: `${basis} Du streust mehr zur Seite.`,
      ursache: `${ring} Oben und unten liegt er waagerecht – dort schadet Streuung zur Seite kaum.`,
      probier: ['D20 (oben) und D3 (unten) liegen dir am besten, fast genauso D1, D5, D17 und D19.', 'Klassischer Weg: auf 40 (D20) stellen; fällt der Dart innen, bleibt oft D10 bzw. D5.'],
      zuruf: 'Tipp für die Doppel: D20 oder D3 passen zu deiner Streuung.',
    };
  }
  return null;
}

// ===================== 1., 2., 3. Dart und nach Treffer/Fehlwurf =====================

interface Q { t: number; n: number }
const q = (x: Q) => (x.n ? x.t / x.n : 0);

export function folgeTipps(aufnahmen: Aufnahme[]): CoachTipp[] {
  const pos: Q[] = [{ t: 0, n: 0 }, { t: 0, n: 0 }, { t: 0, n: 0 }];
  const nachT: Q = { t: 0, n: 0 }; const nachF: Q = { t: 0, n: 0 };
  for (const a of aufnahmen) {
    if ((a.modus ?? 'training') !== 'training') continue;
    let vorher: boolean | null = null;
    a.darts.slice(0, 3).forEach((d, i) => {
      if (!gezielt(d)) { vorher = null; return; }
      const t = trifft(d);
      pos[i].n++; if (t) pos[i].t++;
      if (vorher !== null && sameZiel(d.ziel, a.darts[i - 1].ziel)) {
        const x = vorher ? nachT : nachF; x.n++; if (t) x.t++;
      }
      vorher = t;
    });
  }
  const aus: CoachTipp[] = [];
  const MIN = 30;
  if (pos.every((p) => p.n >= MIN)) {
    const [p1, p2, p3] = pos.map(q);
    const zahlen = `1. Dart ${pz(p1)}, 2. Dart ${pz(p2)}, 3. Dart ${pz(p3)} Treffer.`;
    if (p3 <= p1 - 0.1 && p3 <= p2 - 0.05) {
      aus.push({
        id: 'folge:dritter', gewicht: 1.8,
        titel: 'Dein 3. Dart ist der schwächste',
        warum: zahlen,
        ursache: 'Oft greift die Hand schon nach dem nächsten Dart, bevor der Wurf fertig ist, oder der Stand verschiebt sich während der Aufnahme. Manchen fehlt beim letzten Dart auch der Halt, weil die freie Hand leer ist.',
        probier: ['Jeden Wurf ganz zu Ende bringen – Arm stehen lassen – erst dann den nächsten Dart greifen.', 'Vor dem 3. Dart kurz ausatmen und den Stand prüfen.', 'Einen vierten Dart in die freie Hand nehmen, damit sie beim letzten Wurf nicht leer ist.'],
        uebung: 'Ein paar Aufnahmen bewusst langsam: nach jedem Dart einmal durchatmen.',
        zuruf: 'Achte auf den 3. Dart: erst den Wurf ganz fertig machen, dann den nächsten greifen.',
      });
    } else if (p1 <= Math.min(p2, p3) - 0.1) {
      aus.push({
        id: 'folge:erster', gewicht: 1.6,
        titel: 'Dein 1. Dart ist der schwächste',
        warum: zahlen,
        ursache: 'Der 1. Dart hat noch keinen Dart als Orientierung. Wer ohne festen Ablauf startet, braucht oft einen Wurf, um anzukommen.',
        probier: ['Vor dem 1. Dart jeder Aufnahme bewusst den ganzen Ablauf: Füße, Griff, Blick aufs Ziel, ausatmen.', 'Nicht sofort werfen, wenn du an der Linie stehst – kurz ankommen.'],
        zuruf: 'Erster Dart: in Ruhe ankommen, voller Ablauf, erst dann werfen.',
      });
    } else if (p2 <= Math.min(p1, p3) - 0.1) {
      aus.push({
        id: 'folge:zweiter', gewicht: 1.4,
        titel: 'Dein 2. Dart fällt ab',
        warum: zahlen,
        ursache: 'Häufig wird der 2. Dart hastig hinterhergeworfen – besonders, wenn der erste nicht saß.',
        probier: ['Beim 2. Dart dasselbe Tempo wie beim ersten.', 'Nicht wegen eines einzelnen Fehlwurfs den Zielpunkt ändern.'],
        zuruf: 'Zweiter Dart: gleiches Tempo wie beim ersten, nicht hinterherhetzen.',
      });
    }
  }
  if (nachT.n >= MIN && nachF.n >= MIN) {
    const d = q(nachF) - q(nachT);
    const zahlen = `Nach einem Treffer ${pz(q(nachT))}, nach einem Fehlwurf ${pz(q(nachF))} Treffer beim nächsten Dart.`;
    if (d <= -0.12) {
      aus.push({
        id: 'folge:nachfehl', gewicht: 1.5,
        titel: 'Nach einem Fehlwurf wird es schwerer',
        warum: zahlen,
        ursache: 'Nach einem Fehlwurf will man oft korrigieren oder wird hastig. So wird aus einem schlechten Dart eine schlechte Aufnahme.',
        probier: ['Jeder Dart ist neu: Einen Ausreißer nicht „wiedergutmachen“ wollen.', 'Nach einem Fehlwurf einmal ruhig ausatmen, dann derselbe Ablauf.', 'Zielpunkt nur ändern, wenn viele Darts in dieselbe Richtung gehen – nie wegen eines einzelnen.'],
        zuruf: 'Fehlwurf abhaken: ausatmen, gleicher Ablauf, nicht nachkorrigieren.',
      });
    } else if (d >= 0.12) {
      aus.push({
        id: 'folge:nachtreffer', gewicht: 1.3,
        titel: 'Nach einem Treffer triffst du seltener',
        warum: zahlen,
        ursache: 'Oft steckt der erste Dart im Weg und lenkt den nächsten ab. Oder man wird nach einem Treffer übermütig.',
        probier: ['Steckt ein Dart im Ziel, auf die freie Stelle daneben zielen.', 'Nach einem Treffer nichts ändern – gleicher Ablauf.'],
        zuruf: 'Steckt schon einer drin? Auf die freie Stelle daneben zielen.',
      });
    }
  }
  return aus;
}

// ===================== Einheiten: Einwerfen und Ermüdung =====================

const PAUSE = 30 * 60 * 1000; // so lange Pause = neue Einheit
const RAND = 5;               // Aufnahmen am Anfang/Ende

export function einheiten(aufnahmen: Aufnahme[]): Aufnahme[][] {
  const tr = aufnahmen.filter((a) => (a.modus ?? 'training') === 'training').sort((a, b) => a.start - b.start);
  const aus: Aufnahme[][] = [];
  for (const a of tr) {
    const letzte = aus[aus.length - 1];
    if (letzte && a.start - letzte[letzte.length - 1].ende < PAUSE) letzte.push(a); else aus.push([a]);
  }
  return aus;
}

function quoteVon(as: Aufnahme[]): Q {
  const r = { t: 0, n: 0 };
  for (const a of as) for (const d of a.darts) if (gezielt(d)) { r.n++; if (trifft(d)) r.t++; }
  return r;
}

export function einheitTipps(aufnahmen: Aufnahme[]): CoachTipp[] {
  const lange = einheiten(aufnahmen).filter((e) => e.length >= 20);
  if (lange.length < 3) return [];
  let anf = 0; let ende = 0;
  for (const e of lange) {
    const mitte = q(quoteVon(e.slice(RAND, -RAND)));
    anf += q(quoteVon(e.slice(0, RAND))) - mitte;
    ende += q(quoteVon(e.slice(-RAND))) - mitte;
  }
  anf /= lange.length; ende /= lange.length;
  const basis = `In ${lange.length} längeren Trainings`;
  const aus: CoachTipp[] = [];
  if (anf <= -0.08) {
    aus.push({
      id: 'einheit:anfang', gewicht: 1.4,
      titel: 'Am Anfang brauchst du eine Weile',
      warum: `${basis} triffst du in den ersten ${RAND} Aufnahmen im Schnitt ${Math.round(-anf * 100)} Prozentpunkte seltener als danach.`,
      ursache: 'Arm und Schulter sind am Anfang noch nicht locker. Erst wenn sie warm sind, rücken die Darts zusammen.',
      probier: ['5–10 Minuten einwerfen, bevor es zählt: locker auf die Mitte, dann auf die 20 – nur auf Durchstrecken und Stehenlassen achten.', 'Wenn es sich auch danach falsch anfühlt: 10 Minuten Pause, dann neu anfangen.'],
      zuruf: 'Noch nicht warm? Die ersten Aufnahmen locker einwerfen, Arm durchstrecken.',
    });
  }
  if (ende <= -0.08) {
    aus.push({
      id: 'einheit:ende', gewicht: 1.4,
      titel: 'Gegen Ende lässt du nach',
      warum: `${basis} triffst du in den letzten ${RAND} Aufnahmen im Schnitt ${Math.round(-ende * 100)} Prozentpunkte seltener als in der Mitte.`,
      ursache: 'Müde Muskeln oder nachlassende Konzentration – Üben im müden Zustand prägt eher Fehler ein.',
      probier: ['Kürzere Einheiten: lieber zweimal 15 Aufnahmen als einmal 40.', 'Nach etwa 15 Aufnahmen kurz Pause, Arm ausschütteln, etwas trinken.', 'Aufhören, solange es noch gut läuft.'],
      zuruf: 'Schon eine Weile dabei – kurze Pause, Arm ausschütteln?',
    });
  }
  return aus;
}

/** Tipps, die nicht an einem Ziel hängen – für Statistik und 💡. */
export function allgemeineTipps(aufnahmen: Aufnahme[]): CoachTipp[] {
  const darts = aufnahmen.flatMap((a) => a.darts);
  const d = doppelTipp(darts);
  return [...folgeTipps(aufnahmen), ...einheitTipps(aufnahmen), ...(d ? [d] : [])].sort((a, b) => b.gewicht - a.gewicht);
}

// ===================== Zurufe während des Trainings =====================

export interface Zuruf {
  text: string; art: 'serie' | 'pause' | 'lob' | 'fokus' | 'bilanz'; bei: number;
  /** Fokus: welcher Tipp (id) und welcher Ansatz davon; Richtung für die Auswertung. */
  tipp?: string; variante?: number; richtung?: Richtung;
  /** Bilanz: hat der Fokus erkennbar geholfen? */
  geholfen?: boolean;
}

export const ZURUF_ABSTAND = 4;  // mindestens so viele Aufnahmen zwischen zwei Zurufen
export const FOKUS_ALLE = 8;     // ohne anderen Anlass: alle so viele Aufnahmen ein Fokus-Punkt
export const FOKUS_DAUER = 5;    // Aufnahmen mit Fokus, danach Bilanz

const ALLGEMEIN = [
  'Diese Aufnahmen: Arm nach jedem Wurf 2 Sekunden stehen lassen.',
  'Diese Aufnahmen: jeden Wurf ganz zu Ende bringen, erst dann den nächsten Dart greifen.',
  'Diese Aufnahmen: gleiches Tempo bei allen drei Darts.',
  'Diese Aufnahmen: vor jedem Dart einmal ruhig ausatmen.',
  'Diese Aufnahmen: Griff so locker, dass der Dart gerade noch liegt.',
  'Diese Aufnahmen: Schulter, Ellbogen und Finger auf einer Linie zum Ziel.',
];

export const GLEICH_ABSTAND = 10; // derselbe Anlass frühestens nach so vielen Aufnahmen wieder

/**
 * Nach jeder Aufnahme fragen: Gibt es etwas zu sagen?
 * sitzung = Aufnahmen dieses Trainings (älteste zuerst), alle = alle Darts des Spielers (für den persönlichen Fokus),
 * verlauf = bisherige Zurufe dieses Trainings. Liefert einen neuen Zuruf oder null.
 */
export function zuruf(sitzung: Aufnahme[], alle: Dart[], verlauf: Zuruf[], mitFokus = true): Zuruf | null {
  const i = sitzung.length; // Anzahl Aufnahmen bisher
  if (!i) return null;
  const letzter = verlauf[verlauf.length - 1] ?? null;
  const zuletzt = (art: Zuruf['art']) => [...verlauf].reverse().find((z) => z.art === art);
  const frei = (art: Zuruf['art']) => { const z = zuletzt(art); return !z || i - z.bei >= GLEICH_ABSTAND; };

  // Bilanz nach einer Fokus-Strecke – mit Trefferbild: Abstand, knapp/weit, Richtung, Streuung
  if (letzter?.art === 'fokus' && i === letzter.bei + FOKUS_DAUER) {
    const { mit, ohne } = fokusBloecke(sitzung, letzter);
    const b = bilanz(mit, ohne, letzter.richtung);
    return { text: b.text, art: 'bilanz', bei: i, tipp: letzter.tipp, geholfen: b.geholfen };
  }
  if (letzter && i - letzter.bei < ZURUF_ABSTAND) return null;
  // Während einer Fokus-Strecke nicht dazwischenreden
  if (letzter?.art === 'fokus' && i < letzter.bei + FOKUS_DAUER) return null;

  const drei = sitzung.slice(-3);
  if (drei.length === 3) {
    const darts = drei.flatMap((x) => x.darts).filter(gezielt);
    const treffer = darts.filter(trifft).length;
    const ziel = drei[2].darts[0]?.ziel;
    const gleichesZiel = !!ziel && darts.every((d) => sameZiel(d.ziel, ziel));
    // Serie in eine Richtung
    if (gleichesZiel && ziel && frei('serie')) {
      const zaehl: Partial<Record<Richtung, number>> = {};
      for (const d of darts) { const r = richtung(ziel, d.hit); if (r) zaehl[r] = (zaehl[r] ?? 0) + 1; }
      const [r, n] = (Object.entries(zaehl) as [Richtung, number][]).sort((x, y) => y[1] - x[1])[0] ?? [];
      if (r && n >= 5) return { text: `Die letzten 3 Aufnahmen gehen meist ${WORT[r]}. ${KURZ[r]}`, art: 'serie', bei: i };
    }
    if (darts.length >= 8 && treffer === 0 && ziel?.ring !== 'S' && frei('pause')) {
      return { text: 'Drei Aufnahmen ohne Treffer – kurz weg von der Linie, Arm ausschütteln, durchatmen. Dann mit vollem Ablauf neu.', art: 'pause', bei: i };
    }
    const viel = ziel?.ring === 'D' || ziel?.seg === 25 ? 3 : ziel?.ring === 'T' ? 4 : 7;
    if (treffer >= viel && frei('lob')) {
      return { text: `${treffer} Treffer in 3 Aufnahmen – läuft! Genau so weiter, nichts ändern.`, art: 'lob', bei: i };
    }
  }

  // Fokus-Punkt: persönlich aus dem Wurfbild (dieses Trainings, sonst von früher), sonst reihum allgemein
  const letzterFokus = zuletzt('fokus');
  if (mitFokus && i - (letzterFokus?.bei ?? 0) >= FOKUS_ALLE) {
    const fokusse = verlauf.filter((z) => z.art === 'fokus');
    const nr = fokusse.length;
    const ziel = sitzung[i - 1].darts[0]?.ziel;
    const eigen = ziel && nr % 3 !== 2 ? naechsterTipp(sitzung, alle, ziel, verlauf) : null;
    if (eigen) return { text: `Diese ${FOKUS_DAUER} Aufnahmen: ${eigen.text}`, art: 'fokus', bei: i, tipp: eigen.id, variante: eigen.variante, richtung: eigen.richtung };
    const allg = fokusse.filter((z) => !z.tipp).length;
    return { text: ALLGEMEIN[allg % ALLGEMEIN.length], art: 'fokus', bei: i };
  }
  return null;
}

/** Aufnahmen mit Fokus und die gleich vielen davor (zum Vergleich). */
export function fokusBloecke(sitzung: Aufnahme[], f: Zuruf): { mit: Block; ohne: Block } {
  return {
    mit: block(sitzung.slice(f.bei, f.bei + FOKUS_DAUER)),
    ohne: block(sitzung.slice(Math.max(0, f.bei - FOKUS_DAUER), f.bei)),
  };
}

/** Zwischenstand während einer Fokus-Strecke (für die Leiste), sonst null. */
export function fokusZwischenstand(sitzung: Aufnahme[], f: Zuruf): string | null {
  if (f.art !== 'fokus' || sitzung.length <= f.bei) return null;
  const { mit, ohne } = fokusBloecke(sitzung, f);
  return zwischenstand(mit, ohne, f.richtung);
}

/**
 * Welcher persönliche Tipp als Nächstes? Ein Tipp, der geholfen hat, ist für dieses Training erledigt.
 * Hat er nicht geholfen, kommt beim nächsten Mal ein anderer Ansatz für dasselbe Problem (nächster „Probier“-Punkt).
 * Noch nicht versuchte Tipps gehen vor.
 */
function naechsterTipp(sitzung: Aufnahme[], alle: Dart[], ziel: Ziel, verlauf: Zuruf[]): { id: string; text: string; variante: number; richtung?: Richtung } | null {
  const hier = sitzung.flatMap((a) => a.darts).filter((d) => sameZiel(d.ziel, ziel));
  const quelle = hier.filter((d) => d.p).length >= MIN_LAGE ? hier : alle;
  const tipps = zielTipps(quelle, ziel).filter((t) => !t.lob);
  const kandidaten: { t: CoachTipp; variante: number; neu: boolean }[] = [];
  for (const t of tipps) {
    const versuche = verlauf.filter((z) => z.art === 'fokus' && z.tipp === t.id);
    const bilanzen = verlauf.filter((z) => z.art === 'bilanz' && z.tipp === t.id);
    if (bilanzen.some((b) => b.geholfen)) continue; // hat geholfen → erledigt
    const ansaetze = ansaetzeVon(t);
    if (versuche.length >= ansaetze.length) continue; // alle Ansätze probiert
    kandidaten.push({ t, variante: versuche.length, neu: versuche.length === 0 });
  }
  const k = kandidaten.find((x) => x.neu) ?? kandidaten[0];
  if (!k) return null;
  return { id: k.t.id, text: ansaetzeVon(k.t)[k.variante], variante: k.variante, richtung: k.t.richtung };
}

/** Der kurze Zuruf und danach die einzelnen „Probier“-Punkte als weitere Ansätze. */
function ansaetzeVon(t: CoachTipp): string[] {
  return [t.zuruf, ...t.probier.filter((p) => !/^Immer nur eine Sache/.test(p))]
    .filter((x, i, l) => l.indexOf(x) === i);
}

// ===================== Zurufe an/aus =====================
const ZKEY = 'dart-zurufe';
export function zurufeAn(): boolean {
  try { return localStorage.getItem(ZKEY) !== 'aus'; } catch { return true; }
}
export function zurufeSetzen(an: boolean) {
  try { if (an) localStorage.removeItem(ZKEY); else localStorage.setItem(ZKEY, 'aus'); } catch { /* egal */ }
}
