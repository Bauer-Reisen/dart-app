// Tipps: allgemeine Themen, Tipps je Übung und Hinweise aus dem eigenen Wurfbild.
// Texte in eigenen Worten nach gängigen Trainer-Ratgebern (u. a. cleverdarts.com, thedartscout.com, dartsplanet.tv,
// mydartfinder.com, shotdarts.com; gelesen 16.11.2026) – Anstöße, kein Ersatz für einen Trainer.
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

// Ursachen nach gängigen Trainer-Ratgebern (siehe Kopf der Datei). Früh losgelassen → hoch, spät → tief.
export const RAT: Record<Richtung, Omit<WurfbildTipp, 'richtung' | 'staerke' | 'anteil' | 'muster'>> = {
  unten: {
    ursache: 'Meist geht der Dart zu spät aus der Hand – oft, weil der Griff zu fest ist. Auch ein absackender Ellbogen, zu viel Gewicht auf dem hinteren Fuß oder eine Hand, die nach dem Loslassen zurückzuckt, schicken ihn nach unten.',
    probier: [
      'Griff lockern: den Dart 3 Sekunden fest drücken, dann lösen, bis er gerade noch in den Fingern liegt – so locker werfen.',
      'Arm nach dem Wurf ausgestreckt stehen lassen, bis der Dart steckt.',
      'Gewicht nach vorn, bis die hintere Ferse leicht abhebt.',
    ],
    uebung: 'Einfrier-Test: nach jedem Wurf 2 Sekunden stehen bleiben. Zeigt der Zeigefinger aufs Ziel, ist der Arm ganz gestreckt?',
  },
  oben: {
    ursache: 'Meist geht der Dart zu früh aus der Hand, oder das Handgelenk schnippt nach. Auch ein zu lockerer Griff, bei dem der Dart beim Ausholen schon rutscht, schickt ihn nach oben.',
    probier: [
      'Den Dart etwas länger führen und erst vorn loslassen.',
      'Handgelenk ruhiger – der Schwung kommt aus dem Unterarm.',
      'Griff eine Spur fester, nur so viel, dass der Dart beim Ausholen nicht rutscht.',
    ],
    uebung: 'Halbe Distanz: aus etwa 1,2 m locker auf die Mitte werfen. Sitzen die Darts dort eng, liegt es am Zeitpunkt des Loslassens – dieses Gefühl mit zurück an die Linie nehmen.',
  },
  links: {
    ursache: 'Der Arm läuft nicht auf einer geraden Linie zum Ziel: Die Schulter dreht mit, der Ellbogen wandert zur Seite, oder die Hand greift schon nach dem nächsten Dart. Liegen die Darts gleichmäßig versetzt, ist es oft einfach der Stand.',
    probier: [
      'Zuerst den Stand prüfen: vorderen Fuß ein kleines Stück verschieben oder den ganzen Stand leicht drehen – statt anders zu zielen.',
      'Schulter, Ellbogen und Fingerspitzen auf eine Linie zum Ziel bringen, schon beim Ausholen.',
      'Jeden Wurf ganz zu Ende bringen und erst dann den nächsten Dart greifen.',
    ],
    uebung: 'Augen-zu-Test: an der Linie in Wurfhaltung stehen und 5 Sekunden die Augen schließen. Schwankst du, ist der Stand nicht stabil genug – Füße etwas weiter auseinander, Gewicht nach vorn.',
  },
  rechts: {
    ursache: 'Der Arm läuft nicht auf einer geraden Linie zum Ziel: Die Schulter dreht mit, der Ellbogen wandert zur Seite, oder die Hand greift schon nach dem nächsten Dart. Liegen die Darts gleichmäßig versetzt, ist es oft einfach der Stand.',
    probier: [
      'Zuerst den Stand prüfen: vorderen Fuß ein kleines Stück verschieben oder den ganzen Stand leicht drehen – statt anders zu zielen.',
      'Schulter, Ellbogen und Fingerspitzen auf eine Linie zum Ziel bringen, schon beim Ausholen.',
      'Jeden Wurf ganz zu Ende bringen und erst dann den nächsten Dart greifen.',
    ],
    uebung: 'Augen-zu-Test: an der Linie in Wurfhaltung stehen und 5 Sekunden die Augen schließen. Schwankst du, ist der Stand nicht stabil genug – Füße etwas weiter auseinander, Gewicht nach vorn.',
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
