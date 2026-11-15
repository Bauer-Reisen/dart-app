import { useMemo, useRef } from 'react';
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
  flash: { hit: Hit; key: number } | null;
  onHit: (h: Hit) => void;
}

/**
 * Ausschnitt beim Zoom: Die Scheibe bleibt, wie sie an der Wand hängt.
 * Es wird nur auf die Stelle des Ziels vergrößert (Ziel in der Mitte, Nachbarn drumherum).
 */
function viewBox(ziel: Ziel, zoom: boolean): string {
  if (!zoom || ziel.ring === 'B') return '-200 -200 400 400';
  const r = ziel.ring === 'D' ? (RADIUS.SO + RADIUS.D) / 2 : ziel.ring === 'T' ? (RADIUS.SI + RADIUS.T) / 2 : 110;
  const w = ziel.ring === 'D' ? 170 : ziel.ring === 'T' ? 180 : 230;
  const h = w * 1.25;
  const [cx, cy] = polar(r, segAngle(ziel.seg));
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

  function down(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault();
    const m = g.current?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onHit(hitAt(p.x, p.y));
  }

  const fp = flash ? hitPath(flash.hit) : null;

  return (
    <svg className="board" viewBox={viewBox(ziel, zoom)} preserveAspectRatio="xMidYMid meet" onPointerDown={down}>
      <g ref={g} transform={`rotate(${rot})`}>
        {/* alles außerhalb der Scheibe zählt als "daneben" */}
        <rect x={-2000} y={-2000} width={4000} height={4000} fill="transparent" />
        {felder}
        <circle r={RADIUS.SB} fill={FARBE.gruen} />
        <circle r={RADIUS.DB} fill={FARBE.rot} />
        <path d={zielPath(ziel)} className="zielrand" />
        {fp && <path key={flash!.key} d={fp} className="flash" fillRule="evenodd" />}
        {zahlen}
      </g>
    </svg>
  );
}
