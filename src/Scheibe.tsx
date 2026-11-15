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

/**
 * Ausschnitt beim Zoom: Die Scheibe bleibt, wie sie an der Wand hängt.
 * Es wird nur auf die Stelle des Ziels vergrößert (Ziel in der Mitte, Nachbarn drumherum).
 */
function viewBox(ziel: Ziel, zoom: boolean, [vx, vy]: [number, number] = [0, 0]): string {
  if (!zoom) return '-200 -200 400 400';
  if (ziel.seg === 25) return `${(-120 + vx).toFixed(1)} ${(-150 + vy).toFixed(1)} 240 300`;
  const r = ziel.ring === 'D' ? (RADIUS.SO + RADIUS.D) / 2 : ziel.ring === 'T' ? (RADIUS.SI + RADIUS.T) / 2 : (RADIUS.T + RADIUS.SO) / 2;
  const w = ziel.ring === 'D' ? 170 : ziel.ring === 'T' ? 180 : 230;
  const h = w * 1.25;
  const [px, py] = polar(r, segAngle(ziel.seg));
  const cx = px + vx;
  const cy = py + vy;
  return `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w} ${h.toFixed(1)}`;
}

export function Scheibe({ ziel, zoom, flash, onHit }: Props) {
  const g = useRef<SVGGElement>(null);
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

  // Lupe: mit zwei Fingern verschieben. Damit der erste Finger dabei nicht als Dart zählt,
  // gilt ein Tippen in der Lupe erst beim Loslassen – und nur, wenn kein zweiter Finger dazukam.
  const [versatz, setVersatz] = useState<[number, number]>([0, 0]);
  useEffect(() => { setVersatz([0, 0]); }, [zoom, ziel.seg, ziel.ring]);
  const finger = useRef(new Map<number, [number, number]>());
  const offen = useRef<{ id: number; p: [number, number] } | null>(null);
  const geschoben = useRef(false);
  const mitte = () => {
    const l = [...finger.current.values()];
    return [l.reduce((a, b) => a + b[0], 0) / l.length, l.reduce((a, b) => a + b[1], 0) / l.length] as [number, number];
  };
  const letzteMitte = useRef<[number, number] | null>(null);

  function scheibenPunkt(x: number, y: number): [number, number] | null {
    const m = g.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    return [p.x, p.y];
  }

  function down(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault();
    const p = scheibenPunkt(e.clientX, e.clientY);
    if (!p) return;
    if (!zoom) { onHit(hitAt(p[0], p[1]), p); return; }
    finger.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (finger.current.size === 1) {
      geschoben.current = false;
      offen.current = { id: e.pointerId, p };
    } else {
      offen.current = null; // zweiter Finger: verschieben statt tippen
      geschoben.current = true;
      letzteMitte.current = mitte();
    }
  }

  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!zoom || !finger.current.has(e.pointerId)) return;
    finger.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (finger.current.size < 2 || !letzteMitte.current) return;
    const neu = mitte();
    const m = g.current?.getScreenCTM();
    const proPx = m ? 1 / m.a : 1;
    const dx = (neu[0] - letzteMitte.current[0]) * proPx;
    const dy = (neu[1] - letzteMitte.current[1]) * proPx;
    letzteMitte.current = neu;
    const grenze = (v: number) => Math.max(-220, Math.min(220, v));
    setVersatz(([x, y]) => [grenze(x - dx), grenze(y - dy)]);
  }

  function up(e: React.PointerEvent<SVGSVGElement>) {
    if (!zoom) return;
    finger.current.delete(e.pointerId);
    if (finger.current.size >= 2) letzteMitte.current = mitte();
    else letzteMitte.current = null;
    const o = offen.current;
    if (e.type === 'pointerup' && o && o.id === e.pointerId && !geschoben.current) onHit(hitAt(o.p[0], o.p[1]), o.p);
    if (o?.id === e.pointerId) offen.current = null;
  }

  const fp = flash ? hitPath(flash.hit) : null;

  return (
    <svg className="board" viewBox={viewBox(ziel, zoom, versatz)} preserveAspectRatio="xMidYMid meet"
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
