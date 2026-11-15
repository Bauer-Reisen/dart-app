// Hilfe wie in der Film-App:
// - Rundgang: beim allerersten Öffnen ein paar Karten nacheinander, jederzeit überspringbar (Tipps → „Rundgang ansehen").
// - „Was ist neu?": nach einem Update einmal, wenn man den Rundgang schon kennt. Nur für neue Funktionen, die man bemerkt.
// - Einmal-Hinweise: kurze Erklärung beim ersten Öffnen einer Seite.
//
// PFLICHT bei jeder neuen Version mit „Was ist neu?“-Eintrag (geprüft von hilfe.test.ts, läuft vor jedem Hochladen):
// - rundgang: welche Karte(n) die Neuerung erklären – oder 'klein', wenn sie nicht in den Rundgang gehört
//   (Kleinigkeiten, Reparaturen, Feinheiten). Größere Umbauten und neue Bereiche gehören immer in den Rundgang.
// - Die genannte Karte muss dann überarbeitet sein: ihr `stand` muss mindestens die Version des Eintrags haben.
import { useState, type ReactNode } from 'react';

interface HilfeStand { rundgang?: boolean; neuGesehen?: string; einmal?: string[] }
const SCHLUESSEL = 'dart-hilfe';

function stand(): HilfeStand {
  try { return JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '{}') ?? {}; } catch { return {}; }
}
function setzen(s: Partial<HilfeStand>) {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify({ ...stand(), ...s })); } catch { /* egal */ }
}

// ---------------- Was ist neu? (neueste oben, v = Version des Updates) ----------------
export const NEUES: { v: string; titel: string; rundgang: KartenId[] | 'klein'; punkte: ReactNode[] }[] = [
  {
    v: '0.9.0', titel: 'Allein oder in der Gruppe',
    rundgang: ['statistik'],
    punkte: [
      <>In der <b>Statistik</b> wählst du oben <b>Alle · Allein · In der Gruppe</b>. So siehst du, wie du im Training wirfst und wie in Spielen mit anderen.</>,
      <>Allein = Training und Spiele allein oder gegen den Computer. Gruppe = Spiele mit mindestens einem anderen Spieler. Gilt auch für alle bisherigen Würfe.</>,
    ],
  },
  {
    v: '0.8.7', titel: 'Scheibe mit zwei Fingern zoomen',
    rundgang: ['eintippen'],
    punkte: [
      <>Zieh die Scheibe mit <b>zwei Fingern auf und zu</b> und verschieb sie – wie bei Fotos. Ganz zuziehen zeigt wieder die ganze Scheibe.</>,
      <>Ein Dart zählt jetzt, sobald du den Finger <b>loslässt</b>. Die Lupe 🔍 braucht es dafür nicht mehr.</>,
    ],
  },
  {
    v: '0.8.1', titel: 'Reihenfolge ändern',
    rundgang: 'klein',
    punkte: [
      <>Vor dem Spiel kannst du die Spieler mit <b>↑ ↓</b> umsortieren – z. B. nach dem Ausbullen: Wer gewinnt, kommt nach oben und fängt an.</>,
    ],
  },
  {
    v: '0.8.0', titel: 'Ansage bei 501',
    rundgang: ['spiele'],
    punkte: [
      <>Bei <b>501/301</b> kannst du eine <b>Ansage</b> einschalten (Deutsch oder Englisch): Nach jeder Aufnahme sagt die App die Punkte – und im Finish-Bereich z. B. „Alex, you require 32“.</>,
      <>In den Spielen gibt es <b>keine Zielauswahl</b> mehr – Ziele wählst du nur noch im Training. So bleibt dein Trefferbild sauber.</>,
      <>Liga: Ist die verbundene Liga von jemand anderem, fragt die App einmal, <b>wem sie gehört</b>, und legt dafür einen eigenen Spieler an.</>,
    ],
  },
  {
    v: '0.7.0', titel: 'Spieler wechseln – überall',
    rundgang: ['wer'],
    punkte: [
      <>Auch in <b>Statistik</b> und <b>Liga</b> steht oben <b>Es wirft: …</b> – so schaust du schnell die Statistik von jemand anderem an.</>,
      <>Die <b>Liga</b> gehört jetzt zum Spieler: Mehrere Ligaspieler auf einem Gerät haben jeweils ihre eigene Liga, ihre Spieltage und ihren Plan.</>,
    ],
  },
  {
    v: '0.6.0', titel: 'Genau tippen lohnt sich',
    rundgang: ['eintippen', 'statistik'],
    punkte: [
      <>Die App merkt sich jetzt, <b>wo genau</b> du ins Feld tippst. Tippe den Dart möglichst an die Stelle, wo er steckt.</>,
      <>In der <b>Statistik</b> siehst du bei Triple, Doppel und Bull ein kleines Bild mit allen Darts, deinem <b>mittleren Treffpunkt</b> und wie weit du streust – z. B. „im Schnitt 6 mm zu tief“.</>,
      <>Neue Versionen kommen jetzt <b>von selbst</b>: Die App lädt kurz neu, sobald es ein Update gibt.</>,
    ],
  },
  {
    v: '0.5.0', titel: 'Mehrere Spieler und geführtes Training',
    rundgang: ['wer', 'training'],
    punkte: [
      <>Oben bei Training und Spiele: <b>Es wirft: …</b> – tippe drauf, um zu wählen, wer wirft, oder neue Spieler anzulegen. Jeder hat seine eigene Statistik. Mit ✎ machst du aus „Ich“ deinen Namen, die bisherigen Würfe gehen mit.</>,
      <>Im Reiter Training steht ein <b>Trainingsvorschlag</b> aus deinem Trefferbild: welches Ziel, worauf du achten sollst – und nach 10 Aufnahmen der Vergleich mit vorher.</>,
    ],
  },
  {
    v: '0.4.0', titel: '1., 2. und 3. Dart',
    rundgang: ['eintippen'],
    punkte: [
      <>Die Felder oben sind jetzt nummeriert. Tippe die Darts <b>in der Reihenfolge</b> ein, wie du geworfen hast.</>,
      <>In der <b>Statistik</b> siehst du je Ziel, wie oft dein 1., 2. und 3. Dart trifft – und ob du nach einem Treffer öfter triffst.</>,
    ],
  },
  {
    v: '0.3.0', titel: 'Bullseye und mehr',
    rundgang: 'klein',
    punkte: [
      <>Beim <b>＋</b> gibt es jetzt <b>Bull</b> (unter Single: 25 und 50 zählen) und <b>Bullseye</b> (unter Doppel: nur 50 zählt).</>,
      <>Gehst du mitten in einer Aufnahme übers <b>☰ Menü</b> raus, sind die getippten Darts beim Zurückkommen noch da.</>,
    ],
  },
];
const NEUSTE = NEUES[0].v;

const zahl = (v: string) => v.split('.').map(Number);
function neuer(a: string, b: string) {
  const x = zahl(a); const y = zahl(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

// ---------------- Rundgang ----------------
export type KartenId = 'willkommen' | 'eintippen' | 'training' | 'wer' | 'spiele' | 'liga' | 'statistik' | 'daten';
/** stand = Version, in der die Karte zuletzt überarbeitet wurde. */
export const KARTEN: { id: KartenId; stand: string; icon: string; titel: string; text: ReactNode }[] = [
  {
    id: 'willkommen', stand: '0.3.0', icon: '🎯', titel: 'Willkommen!',
    text: <>Hier trainierst du Steeldarts und siehst, wo du dich verbesserst. Unten wechselst du zwischen den Bereichen <b>Training</b>, <b>Spiele</b>, <b>Liga</b>, <b>Statistik</b> und <b>Tipps</b>.</>,
  },
  {
    id: 'eintippen', stand: '0.8.7', icon: '👆', titel: 'Darts eintippen',
    text: <>Nach jedem Wurf tippst du auf der Scheibe an, <b>wo der Dart steckt</b> – möglichst genau an die Stelle und der Reihe nach, wie geworfen (Felder 1., 2., 3.). Daneben? Tippe außen in den grauen Rand. Ein Dart zählt, sobald du loslässt. Zum genauen Tippen ziehst du die Scheibe mit <b>zwei Fingern</b> auf. <b>↶ Zurück</b> nimmt den letzten Dart zurück, ein Tipp auf ein Feld oben ändert ihn.</>,
  },
  {
    id: 'training', stand: '0.5.0', icon: '🏋️', titel: 'Training',
    text: <><b>Zieltraining</b>: Ziel wählen und werfen – die App merkt sich, wohin du danebenwirfst. Sobald sie dein Wurfbild kennt, macht sie oben einen <b>Trainingsvorschlag</b>. Dazu Doppeltraining, Around the Clock und Bob's 27.</>,
  },
  {
    id: 'wer', stand: '0.7.0', icon: '👥', titel: 'Wer wirft?',
    text: <>Oben in Training, Spiele, Liga und Statistik steht <b>Es wirft: …</b>. Tippe drauf, um den Spieler zu wechseln oder neue anzulegen – praktisch, wenn mehrere ein Gerät nutzen. Jeder hat seine eigene Statistik und seine eigene Liga.</>,
  },
  {
    id: 'spiele', stand: '0.8.0', icon: '🎮', titel: 'Spiele',
    text: <>501/301, Cricket und Halve-It – allein, mit bis zu 4 Spielern oder bei 501 gegen den <b>Computer</b>. Die App rechnet mit und schlägt den Checkout-Weg vor. Bei 501 sagt sie auf Wunsch die Punkte an („you require 32“). Ziele wählst du nur im Training – im Spiel zählt einfach, wo der Dart steckt.</>,
  },
  {
    id: 'liga', stand: '0.7.0', icon: '🏆', titel: 'Liga',
    text: <>Spielst du in einer Liga? Verbinde die App mit deiner Liga (Bayerischer Dart-Verband) oder trag Spieltage selbst ein. Dann bekommst du einen Plan bis zum nächsten Spieltag.</>,
  },
  {
    id: 'statistik', stand: '0.9.0', icon: '📊', titel: 'Statistik und 💡',
    text: <>Die <b>Statistik</b> zeigt Average, Doppelquote und dein Trefferbild – oben wählst du <b>Alle</b>, <b>Allein</b> oder <b>In der Gruppe</b>. Leuchtet im Spiel die <b>💡</b>, hat die App einen Hinweis zu deinem Wurfbild für dich.</>,
  },
  {
    id: 'daten', stand: '0.3.0', icon: '💾', titel: 'Deine Daten',
    text: <>Alles bleibt nur auf diesem Gerät, ohne Anmeldung. Unter <b>Statistik → Als Datei sichern</b> machst du ab und zu eine Sicherung. Den Rundgang findest du wieder unter <b>Tipps</b>.</>,
  },
];

export function Rundgang({ onFertig }: { onFertig: () => void }) {
  const [i, setI] = useState(0);
  const k = KARTEN[i];
  const letzte = i === KARTEN.length - 1;
  const fertig = () => { setzen({ rundgang: true, neuGesehen: NEUSTE }); onFertig(); };
  return (
    <div className="wahl mitte">
      <div className="wahl-box hilfe-box">
        <div className="hilfe-icon" aria-hidden="true">{k.icon}</div>
        <h3>{k.titel}</h3>
        <p>{k.text}</p>
        <p className="hilfe-punkte" aria-label={`Schritt ${i + 1} von ${KARTEN.length}`}>
          {KARTEN.map((_, j) => <span key={j} className={j === i ? 'an' : ''} />)}
        </p>
        <div className="hilfe-knoepfe">
          <button className="btn" onClick={fertig}>Überspringen</button>
          <button className="btn an" onClick={() => (letzte ? fertig() : setI(i + 1))}>{letzte ? 'Los geht’s' : 'Weiter'}</button>
        </div>
      </div>
    </div>
  );
}

function WasIstNeu({ liste, onFertig }: { liste: typeof NEUES; onFertig: () => void }) {
  return (
    <div className="wahl mitte">
      <div className="wahl-box hilfe-box tipp-box">
        <h3>Was ist neu?</h3>
        {liste.map((n) => (
          <div key={n.v}>
            <h4>{n.titel}</h4>
            <ul>{n.punkte.map((p, j) => <li key={j}>{p}</li>)}</ul>
          </div>
        ))}
        <button className="btn an gross" style={{ width: '100%', marginTop: 10 }} onClick={() => { setzen({ neuGesehen: NEUSTE }); onFertig(); }}>
          Alles klar
        </button>
      </div>
    </div>
  );
}

/** Beim Start: Rundgang (wer neu ist) oder „Was ist neu?" (nach einem Update). */
export function StartHilfe() {
  const [s] = useState(stand);
  const [zu, setZu] = useState(false);
  if (zu) return null;
  if (!s.rundgang) return <Rundgang onFertig={() => setZu(true)} />;
  const liste = NEUES.filter((n) => !s.neuGesehen || neuer(n.v, s.neuGesehen));
  if (!liste.length) return null;
  return <WasIstNeu liste={liste} onFertig={() => setZu(true)} />;
}

// ---------------- Einmal-Hinweise ----------------
export function einmalGesehen(name: string): boolean {
  return (stand().einmal ?? []).includes(name);
}
export function einmalMerken(name: string) {
  const e = stand().einmal ?? [];
  if (!e.includes(name)) setzen({ einmal: [...e, name] });
}

/** Kurze Erklärung in einem Fenster mit „Alles klar". */
export function Erklaerung({ titel, children, onZu, knopf = 'Alles klar' }: { titel: string; children: ReactNode; onZu: () => void; knopf?: string }) {
  return (
    <div className="wahl mitte" onClick={onZu}>
      <div className="wahl-box hilfe-box tipp-box" onClick={(e) => e.stopPropagation()}>
        <h3>{titel}</h3>
        {children}
        <button className="btn an gross" style={{ width: '100%', marginTop: 10 }} onClick={onZu}>{knopf}</button>
      </div>
    </div>
  );
}
