// Tipps: allgemeine Themen, Tipps je Übung und Hinweise aus dem eigenen Wurfbild.
// Texte in eigenen Worten nach gängigen Trainingsgrundlagen – Anstöße, kein Ersatz für einen Trainer.
import { polar, segAngle, type Hit, type Ziel } from './board';
import { klasse } from './klassen';
import type { SpielArt } from './speicher';

// ===================== Allgemeine Themen (Reiter „Tipps") =====================

export interface Thema { titel: string; kurz: string; punkte: string[] }

export const THEMEN: Thema[] = [
  {
    titel: 'Stand',
    kurz: 'Fester Stand, damit sich nur der Arm bewegt',
    punkte: [
      'Der Fuß auf der Seite deines Wurfarms steht vorn an der Abwurflinie, etwas schräg zur Scheibe gedreht.',
      'Das Gewicht liegt überwiegend auf dem vorderen Fuß. Der hintere Fuß sorgt nur fürs Gleichgewicht.',
      'Oberkörper leicht nach vorn neigen, aber nicht so weit, dass du wackelst.',
      'Stell dich jedes Mal genau gleich hin. Merk dir eine Stelle an der Linie für deinen vorderen Fuß.',
      'Während des Wurfs bleibt der Körper ruhig – Schultern und Hüfte drehen nicht mit.',
    ],
  },
  {
    titel: 'Griff',
    kurz: 'Locker und jedes Mal gleich',
    punkte: [
      'So fest wie nötig, so locker wie möglich: Der Dart darf nicht rutschen, die Finger sollen aber nicht verkrampfen.',
      'Die meisten greifen mit drei Fingern (Daumen, Zeige- und Mittelfinger). Zwei oder vier gehen auch – wichtig ist, dass es immer gleich ist.',
      'Greif ungefähr am Schwerpunkt des Darts oder knapp dahinter.',
      'Die Spitze zeigt beim Ausholen leicht nach oben, nie nach unten.',
      'Wenn du deinen Griff änderst, gib dir ein paar Trainingstage Zeit, bevor du ihn beurteilst.',
    ],
  },
  {
    titel: 'Wurf',
    kurz: 'Ausholen, loslassen, durchschwingen',
    punkte: [
      'Der Oberarm bleibt möglichst ruhig, die Bewegung kommt vor allem aus dem Unterarm.',
      'Hol gerade nach hinten Richtung Gesicht aus und bring den Dart auf derselben Linie wieder nach vorn.',
      'Lass den Dart in der Vorwärtsbewegung los, ohne ihn bewusst zu „schieben" oder zu „werfen".',
      'Durchschwingen: Nach dem Loslassen zeigen Arm und Finger zum Ziel. Wer abbremst, verliert Richtung und Höhe.',
      'Dass der Ellbogen am Ende etwas hochgeht, ist normal.',
      'Ein gleichmäßiger Rhythmus ist wichtiger als eine „perfekte" Technik.',
    ],
  },
  {
    titel: 'Zielen und Kopf',
    kurz: 'Ruhig bleiben, auch nach Fehlwürfen',
    punkte: [
      'Fixiere einen kleinen Punkt im Ziel, nicht das ganze Feld.',
      'Wirf alle drei Darts im gleichen Tempo – nicht hetzen und nicht zögern.',
      'Nach einem Fehlwurf nicht mit dem Körper nachkorrigieren. Lieber kurz ausatmen und dem gewohnten Ablauf vertrauen.',
      'Im Finish genauso schnell werfen wie beim Punkten. Vorsichtiges Werfen macht ungenau.',
      'Steckt ein Dart vor deinem Ziel, ziel einen Hauch daneben, statt den Wurf zu verändern.',
    ],
  },
  {
    titel: 'Trainingsplan',
    kurz: 'Ein sinnvoller Abend mit 30–60 Minuten',
    punkte: [
      '5 Minuten locker einwerfen, z. B. auf die 20.',
      '10–15 Minuten Zieltraining auf deinen Schwachpunkt – die Statistik zeigt dir, welcher das ist.',
      '10 Minuten Doppeltraining (Finish 2–40).',
      '10 Minuten ein Spiel zum Messen, z. B. 501 allein oder Bob\'s 27.',
      'Lieber oft kurz als selten lang. Wenn der Arm müde wird, aufhören – sonst übt man Fehler ein.',
    ],
  },
];

// ===================== Tipps je Übung (💡 im Training) =====================

export type TippArt = SpielArt | 'training';

export const UEBUNGS_TIPPS: Record<TippArt, string[]> = {
  training: [
    'Bleib eine Weile beim selben Ziel (etwa 10 Aufnahmen). So entsteht ein Wurfbild, aus dem die App dir Hinweise geben kann.',
    'Jeder Dart mit demselben Ablauf: hinstellen, zielen, ausatmen, werfen.',
    'Lass den Arm nach dem Wurf kurz stehen und schau, wohin er zeigt.',
  ],
  doppel: [
    'Ziel auf die Mitte des Doppelfelds, nicht auf den Draht.',
    'Gerade Reste, die sich oft halbieren lassen (32, 16, 40), sind am angenehmsten: Triffst du bei D16 die 16, bleibt D8.',
    'Im gleichen Tempo werfen wie beim Punkten – nicht vorsichtiger.',
  ],
  atc: [
    'Ruhig weiterwerfen, auch wenn eine Zahl länger dauert.',
    'Für die Zahlen links und rechts nicht den Stand ändern – nur Blick und Armlinie.',
    '„Nur Doppel" und „Nur Triple" sind deutlich schwerer. Wechsle erst, wenn „jedes Feld" sicher klappt.',
  ],
  bobs: [
    'Ein Treffer gleicht viel aus, aber Fehlrunden am Anfang sind gefährlich – bei D1 bis D5 auf Sicherheit gehen.',
    'Ziel auf die Mitte des Doppels; ein knapper Fehler ins Single ist kein Drama.',
    'Bob\'s 27 eignet sich gut, um über Wochen zu sehen, ob deine Doppel sicherer werden (Statistik).',
  ],
  x01: [
    'Beim Punkten auf T20 bleiben. Läuft es dort schlecht, auf T19 wechseln – die Nachbarn 7 und 3 bringen mehr als 5 und 1.',
    'Im Finish einen geraden Rest stellen, der sich halbieren lässt (32, 40, 16).',
    'Die App zeigt den Checkout-Weg an. Merk dir die Wege, die oft vorkommen.',
  ],
  cricket: [
    'Zuerst die hohen Zahlen schließen (20, 19, 18) – dort gibt es die meisten Punkte.',
    'Liegst du hinten, schließe zuerst die Zahl, auf der dein Gegner punktet.',
    'Bull meistens zum Schluss – es ist das kleinste Ziel.',
  ],
  halveit: [
    'Sicherheit vor Höchstwert: Ein Treffer pro Runde reicht, um das Halbieren zu verhindern.',
    'In der Doppel- und Triple-Runde dein bestes Doppel bzw. Triple wählen, nicht automatisch die 20.',
    'Bei Bull zählt auch die 25 – auf die Mitte zielen.',
  ],
};

// ===================== Hinweise aus dem Wurfbild =====================

export type Richtung = 'oben' | 'unten' | 'links' | 'rechts';

function zuRichtung([dx, dy]: [number, number]): Richtung {
  if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? 'unten' : 'oben';
  return dx > 0 ? 'rechts' : 'links';
}

/** Wohin ging der Fehlwurf, so wie man auf die Scheibe schaut? null = Treffer, Abpraller oder unklar. */
export function richtung(z: Ziel, h: Hit): Richtung | null {
  if (h.ring === 'BOUNCE') return null;
  if (z.seg === 25) {
    if (h.ring === 'DB' || h.ring === 'SB' || h.seg < 1 || h.seg > 20) return null;
    return zuRichtung(polar(1, segAngle(h.seg)));
  }
  const k = klasse(z, h);
  const aussen = polar(1, segAngle(z.seg));
  if (k === 'innen') return zuRichtung([-aussen[0], -aussen[1]]);
  if (k === 'aussen') return zuRichtung(aussen);
  if (k === 'nachbarUhr' || k === 'nachbarGegen') {
    const n = polar(1, segAngle(h.seg));
    return zuRichtung([n[0] - aussen[0], n[1] - aussen[1]]);
  }
  return null;
}

export interface Wurfbild { zaehl: Record<Richtung, number>; fehl: number }

export function wurfbild(darts: { hit: Hit; ziel: Ziel; frei?: boolean }[], z: Ziel): Wurfbild {
  const zaehl: Record<Richtung, number> = { oben: 0, unten: 0, links: 0, rechts: 0 };
  for (const d of darts) {
    if (d.frei || d.ziel.seg !== z.seg || d.ziel.ring !== z.ring) continue;
    const r = richtung(z, d.hit);
    if (r) zaehl[r]++;
  }
  return { zaehl, fehl: zaehl.oben + zaehl.unten + zaehl.links + zaehl.rechts };
}

export const MIN_FEHL = 20;

export interface WurfbildTipp {
  richtung: Richtung;
  staerke: 'Tendenz' | 'deutlich';
  anteil: number;
  muster: string;
  ursache: string;
  probier: string[];
  uebung: string;
}

const RAT: Record<Richtung, Omit<WurfbildTipp, 'richtung' | 'staerke' | 'anteil' | 'muster'>> = {
  unten: {
    ursache: 'Häufig wird der Dart zu früh losgelassen oder der Arm bremst nach dem Loslassen ab.',
    probier: [
      'Bewusst durchschwingen: Arm nach dem Wurf zum Ziel ausstrecken und kurz stehen lassen.',
      'Den Dart einen Moment später loslassen.',
      'Prüfen, ob der Ellbogen beim Wurf absackt.',
    ],
    uebung: 'Zieltraining auf dein Ziel, nur auf das Durchschwingen achten.',
  },
  oben: {
    ursache: 'Häufig wird der Dart zu spät losgelassen oder mit zu viel Kraft aus dem Handgelenk geworfen.',
    probier: [
      'Lockerer werfen, weniger Kraft – der Dart braucht weniger, als man denkt.',
      'Den Dart einen Moment früher loslassen.',
      'Den Ellbogen beim Ausholen nicht hochziehen.',
    ],
    uebung: 'Zieltraining mit bewusst ruhigem, lockerem Wurf.',
  },
  links: {
    ursache: 'Meist läuft der Arm nicht auf einer geraden Linie zum Ziel, oder Schulter bzw. Oberkörper drehen mit.',
    probier: [
      'Auge, Dart und Ziel auf eine Linie bringen – schon beim Ausholen.',
      'Ellbogen unter dem Dart halten, nicht seitlich wegdrehen.',
      'Stand prüfen: Steht der vordere Fuß jedes Mal gleich?',
    ],
    uebung: 'Zieltraining auf Bull oder die 20 und auf die gerade Armlinie achten.',
  },
  rechts: {
    ursache: 'Meist läuft der Arm nicht auf einer geraden Linie zum Ziel, oder Schulter bzw. Oberkörper drehen mit.',
    probier: [
      'Auge, Dart und Ziel auf eine Linie bringen – schon beim Ausholen.',
      'Ellbogen unter dem Dart halten, nicht seitlich wegdrehen.',
      'Stand prüfen: Steht der vordere Fuß jedes Mal gleich?',
    ],
    uebung: 'Zieltraining auf Bull oder die 20 und auf die gerade Armlinie achten.',
  },
};

const TEXT: Record<Richtung, string> = { oben: 'zu hoch', unten: 'zu tief', links: 'nach links', rechts: 'nach rechts' };

function achse(w: Wurfbild, a: Richtung, b: Richtung): WurfbildTipp | null {
  const n = w.zaehl[a] + w.zaehl[b];
  if (n < MIN_FEHL) return null;
  const r = w.zaehl[a] >= w.zaehl[b] ? a : b;
  const anteil = w.zaehl[r] / n;
  const staerke = n >= 50 && anteil >= 0.65 ? 'deutlich' : anteil >= 0.7 ? 'Tendenz' : null;
  if (!staerke) return null;
  const pz = Math.round(anteil * 100);
  return {
    richtung: r, staerke, anteil,
    muster: `Von deinen Fehlwürfen ${r === 'oben' || r === 'unten' ? 'nach oben oder unten' : 'zur Seite'} gehen ${pz} % ${TEXT[r]} (${staerke}).`,
    ...RAT[r],
  };
}

/** Bis zu zwei Hinweise (Höhe und Seite), stärkster zuerst. */
export function wurfbildTipps(w: Wurfbild): WurfbildTipp[] {
  return [achse(w, 'oben', 'unten'), achse(w, 'links', 'rechts')]
    .filter((t): t is WurfbildTipp => t !== null)
    .sort((x, y) => y.anteil - x.anteil);
}
