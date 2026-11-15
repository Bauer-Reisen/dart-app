import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ORDER, RADIUS, hitAt, hitPath, polar, sector, segAngle, zielPath,
  type Hit, type Ziel,
} from './board';

const FARBE = {
  dunkel: '#1c1c1c',
  hell: '#efe3c2',
  rot: '#d0352d',
  gruen: '#178a4a',
  daneben: '#2a2a2a',
};

interface Props {
  ziel: Ziel;
  zoom: boolean;
  flash: { hit: Hit; key: number; punkt?: [number, number] } | null;
  /** punkt = getippte Stelle in Bildschirm-Koordinaten der Scheibe */
  onHit: (h: Hit, punkt: [number, number]) => void;
}

/** Sichtbarer Ausschnitt: Mitte und Größe in Scheiben-Einheiten. */
interface Ansicht { cx: number; cy: number; w: number; h: number }

const GANZ: Ansicht = { cx: 0, cy: 0, w: 400, h: 400 };
const MIN_W = 90;       // weiter rein geht es nicht
const RAND = 220;       // so weit darf die Mitte von der Scheibenmitte weg

/**
 * Ausschnitt der Lupe: Die Scheibe bleibt, wie sie an der Wand hängt.
 * Es wird nur auf die Stelle des Ziels vergrößert (Ziel in der Mitte, Nachbarn drumherum).
 */
function lupenAnsicht(ziel: Ziel): Ansicht {
  if (ziel.seg === 25) return { cx: 0, cy: 0, w: 240, h: 300 };
  const r = ziel.ring === 'D' ? (RADIUS.SO + RADIUS.D) / 2 : ziel.ring === 'T' ? (RADIUS.SI + RADIUS.T) / 2 : (RADIUS.T + RADIUS.SO) / 2;
  const w = ziel.ring === 'D' ? 170 : ziel.ring === 'T' ? 180 : 230;
  const [cx, cy] = polar(r, segAngle(ziel.seg));
  return { cx, cy, w, h: w * 1.25 };
}

const vbText = (a: Ansicht) =>
  `${(a.cx - a.w / 2).toFixed(1)} ${(a.cy - a.h / 2).toFixed(1)} ${a.w.toFixed(1)} ${a.h.toFixed(1)}`;

export function Scheibe({ ziel, zoom, flash, onHit }: Props) {
  const g = useRef<SVGGElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const rot = 0; // nie drehen: die Scheibe sieht immer aus wie in echt

  const felder = useMemo(() => {
    const out: JSX.Element[] = [];
    ORDER.forEach((seg, i) => {
      const a = i * 18;
      const a0 = a - 9;
      const a1 = a + 9;
      const gerade = i % 2 === 0;
      const single = gerade ? FARBE.dunkel : FARBE.hell;
      const ring = gerade ? FARBE.rot : FARBE.gruen;
      out.push(
        <path key={`m${seg}`} d={sector(RADIUS.D, RADIUS.MISS, a0, a1)} fill={FARBE.daneben} stroke="#3a3a3a" strokeWidth={0.6} />,
        <path key={`si${seg}`} d={sector(RADIUS.SB, RADIUS.SI, a0, a1)} fill={single} />,
        <path key={`t${seg}`} d={sector(RADIUS.SI, RADIUS.T, a0, a1)} fill={ring} />,
        <path key={`so${seg}`} d={sector(RADIUS.T, RADIUS.SO, a0, a1)} fill={single} />,
        <path key={`d${seg}`} d={sector(RADIUS.SO, RADIUS.D, a0, a1)} fill={ring} />,
      );
    });
    return out;
  }, []);

  const zahlen = ORDER.map((seg) => {
    const [x, y] = polar((RADIUS.D + RADIUS.MISS) / 2, segAngle(seg));
    return (
      <text
        key={`z${seg}`} x={x} y={y}
        transform={`rotate(${-rot} ${x} ${y})`}
        className="zahl"
      >
        {seg}
      </text>
    );
  });

  // Eigener Ausschnitt aus Zwei-Finger-Zoom; null = Standard (ganze Scheibe oder Lupe aufs Ziel).
  // Die Lupe (an/aus) setzt ihn zurück. Neue Ziele ändern ihn nicht – sonst spränge das Bild nach jedem Dart.
  const [eigen, setEigen] = useState<Ansicht | null>(null);
  useEffect(() => { setEigen(null); }, [zoom]);
  const ansicht = eigen ?? (zoom ? lupenAnsicht(ziel) : GANZ);

  // Ein Finger tippt (zählt beim Loslassen), zwei Finger ziehen auf/zu und verschieben.
  const finger = useRef(new Map<number, [number, number]>());
  const offen = useRef<{ id: number; p: [number, number] } | null>(null);
  const geste = useRef<{ ansicht: Ansicht; abstand: number; punkt: [number, number]; mitte: [number, number]; proPx: number } | null>(null);
  const mehrfinger = useRef(false);

  function scheibenPunkt(x: number, y: number): [number, number] | null {
    const m = g.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    return [p.x, p.y];
  }

  function zweiFinger(): { mitte: [number, number]; abstand: number } {
    const [a, b] = [...finger.current.values()];
    return { mitte: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], abstand: Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1])) };
  }

  function gesteStarten() {
    const { mitte, abstand } = zweiFinger();
    const punkt = scheibenPunkt(mitte[0], mitte[1]);
    const m = g.current?.getScreenCTM();
    if (!punkt || !m) return;
    geste.current = { ansicht, abstand, punkt, mitte, proPx: 1 / m.a };
  }

  function down(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault();
    try { svg.current?.setPointerCapture(e.pointerId); } catch { /* egal */ }
    finger.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (finger.current.size === 1) {
      mehrfinger.current = false;
      const p = scheibenPunkt(e.clientX, e.clientY);
      offen.current = p ? { id: e.pointerId, p } : null;
    } else {
      offen.current = null; // zweiter Finger: kein Dart, sondern zoomen/verschieben
      mehrfinger.current = true;
      if (finger.current.size === 2) gesteStarten();
    }
  }

  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!finger.current.has(e.pointerId)) return;
    finger.current.set(e.pointerId, [e.clientX, e.clientY]);
    const st = geste.current;
    const el = svg.current;
    if (finger.current.size !== 2 || !st || !el) return;
    const { mitte, abstand } = zweiFinger();
    // neue Größe: Finger auseinander = näher ran
    const w = Math.min(GANZ.w, Math.max(MIN_W, st.ansicht.w * (st.abstand / abstand)));
    const faktor = w / st.ansicht.w;
    const h = st.ansicht.h * faktor;
    const proPx = st.proPx * faktor;
    // der Punkt unter den Fingern bleibt unter den Fingern
    const r = el.getBoundingClientRect();
    const sx = r.left + r.width / 2;
    const sy = r.top + r.height / 2;
    const grenze = (v: number) => Math.max(-RAND, Math.min(RAND, v));
    const cx = grenze(st.punkt[0] - (mitte[0] - sx) * proPx);
    const cy = grenze(st.punkt[1] - (mitte[1] - sy) * proPx);
    setEigen(w >= GANZ.w ? GANZ : { cx, cy, w, h }); // ganz rausgezogen: wieder die ganze Scheibe
  }

  function up(e: React.PointerEvent<SVGSVGElement>) {
    finger.current.delete(e.pointerId);
    if (finger.current.size === 2) gesteStarten();
    else geste.current = null;
    const o = offen.current;
    if (e.type === 'pointerup' && o && o.id === e.pointerId && !mehrfinger.current) onHit(hitAt(o.p[0], o.p[1]), o.p);
    if (o?.id === e.pointerId) offen.current = null;
  }

  const fp = flash ? hitPath(flash.hit) : null;

  return (
    <svg ref={svg} className="board" viewBox={vbText(ansicht)} preserveAspectRatio="xMidYMid meet"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <g ref={g} transform={`rotate(${rot})`}>
        {/* alles außerhalb der Scheibe zählt als "daneben" */}
        <rect x={-2000} y={-2000} width={4000} height={4000} fill="transparent" />
        {felder}
        <circle r={RADIUS.SB} fill={FARBE.gruen} />
        <circle r={RADIUS.DB} fill={FARBE.rot} />
        <path d={zielPath(ziel)} className="zielrand" />
        {fp && <path key={flash!.key} d={fp} className="flash" fillRule="evenodd" />}
        {flash?.punkt && <circle key={'p' + flash.key} cx={flash.punkt[0]} cy={flash.punkt[1]} r={4} className="tipp-punkt" />}
        {zahlen}
      </g>
    </svg>
  );
}
