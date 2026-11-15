// Kleines Bild: Ausschnitt einer echten Scheibe um das Ziel, jeder getippte Dart als Punkt, der mittlere Treffpunkt als Kreuz.
import { ECHT_MM, ORDER, polar, sector, segAngle, sameZiel, type Ziel } from './board';
import { klasse } from './klassen';
import { zielPunkt } from './gegner';
import type { Dart } from './speicher';
import type { Treffpunkt } from './treffpunkt';

const FENSTER = 56; // mm Breite des Ausschnitts

function zielFlaeche(z: Ziel): string {
  if (z.seg === 25) {
    const r = z.ring === 'D' ? ECHT_MM.DB : ECHT_MM.SB;
    return `M${-r} 0 A${r} ${r} 0 1 0 ${r} 0 A${r} ${r} 0 1 0 ${-r} 0 Z`;
  }
  const a = segAngle(z.seg);
  const [r0, r1] = z.ring === 'T' ? [ECHT_MM.SI, ECHT_MM.T] : [ECHT_MM.SO, ECHT_MM.D];
  return sector(r0, r1, a - 9, a + 9);
}

export function TrefferBild({ darts, ziel, t }: { darts: Dart[]; ziel: Ziel; t: Treffpunkt }) {
  const [mx, my] = zielPunkt(ziel);
  const mitP = darts.filter((d) => d.p && !d.frei && sameZiel(d.ziel, ziel)).slice(-150);
  const h = FENSTER / 2;
  return (
    <svg className="trefferbild" viewBox={`${mx - h} ${my - h} ${FENSTER} ${FENSTER}`} role="img"
      aria-label={`Trefferbild: ${t.n} getippte Darts`}>
      <rect x={mx - h} y={my - h} width={FENSTER} height={FENSTER} fill="#1a1a1a" />
      <path d={zielFlaeche(ziel)} fill="#ffd23f22" stroke="#ffd23f" strokeWidth={0.6} />
      {Object.values(ECHT_MM).map((r) => <circle key={r} r={r} fill="none" stroke="#666" strokeWidth={0.3} />)}
      {ORDER.map((seg) => {
        const [x0, y0] = polar(ECHT_MM.SB, segAngle(seg) - 9);
        const [x1, y1] = polar(ECHT_MM.MISS, segAngle(seg) - 9);
        return <line key={seg} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#666" strokeWidth={0.3} />;
      })}
      {mitP.map((d, i) => (
        <circle key={i} cx={d.p![0]} cy={d.p![1]} r={1}
          fill={klasse(ziel, d.hit) === 'treffer' ? '#4cc26b' : '#e0533f'} opacity={0.75} />
      ))}
      {t.n >= 10 && (
        <g stroke="#fff" strokeWidth={0.8}>
          <circle cx={mx + t.dx} cy={my + t.dy} r={t.streuung} fill="none" strokeDasharray="2 1.5" opacity={0.6} />
          <line x1={mx + t.dx - 3} y1={my + t.dy} x2={mx + t.dx + 3} y2={my + t.dy} />
          <line x1={mx + t.dx} y1={my + t.dy - 3} x2={mx + t.dx} y2={my + t.dy + 3} />
        </g>
      )}
    </svg>
  );
}
