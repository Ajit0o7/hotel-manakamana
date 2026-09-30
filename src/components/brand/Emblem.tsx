import type { CSSProperties } from 'react';

/* Hotel Manakamana emblem, redrawn as vectors from the hotel's stamp logo:
   ring text "Hotel Manakamana ★ Traffic Chowk, Manthali ★" around the Manakamana pagoda.
   Classes drive the curtain intro animation in globals.css. */

function star(cx: number, cy: number, r: number) {
  const k = r * 0.28;
  const f = (n: number) => +n.toFixed(2);
  return `M${cx} ${cy - r}L${f(cx + k)} ${f(cy - k)}L${cx + r} ${cy}L${f(cx + k)} ${f(cy + k)}L${cx} ${cy + r}L${f(cx - k)} ${f(cy + k)}L${cx - r} ${cy}L${f(cx - k)} ${f(cy - k)}Z`;
}

/** Short hanging lines under a curved eave (quadratic with a centred control point, so x is linear in t). */
function fringe(xs: number[], [x0, y0, cy, x1, y1]: [number, number, number, number, number], top = 1.4, len = 3.6) {
  return xs
    .map((x) => {
      const t = (x - x0) / (x1 - x0);
      const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
      return `M${x.toFixed(1)} ${(y + top).toFixed(1)}V${(y + top + len).toFixed(1)}`;
    })
    .join('');
}

const range = (start: number, step: number, n: number) => Array.from({ length: n }, (_, i) => start + i * step);
const LOWER_EAVE: [number, number, number, number, number] = [64, 133, 142, 176, 133];
const UPPER_EAVE: [number, number, number, number, number] = [86, 97, 104, 154, 97];

type Part = { d: string; kind: 'draw' | 'fine' | 'solid' };
// built from the ground up in the intro: each group has its own delay
const TEMPLE: { delay: string; parts: Part[] }[] = [
  { delay: '.3s', parts: [ // plinth
    { d: 'M82 160H158', kind: 'draw' }, { d: 'M78 160V164H162V160', kind: 'draw' },
    { d: 'M74 164V168H166V164', kind: 'draw' }, { d: 'M70 168V172H170V168', kind: 'draw' },
  ] },
  { delay: '.42s', parts: [ // ground-floor shrine
    { d: 'M90 139V160', kind: 'draw' }, { d: 'M150 139V160', kind: 'draw' },
    { d: 'M112 160V150Q120 143 128 150V160', kind: 'draw' },
    { d: 'M90 142L75 135.5', kind: 'draw' }, { d: 'M150 142L165 135.5', kind: 'draw' },
    { d: 'M97 142V160M104 142V160M136 142V160M143 142V160', kind: 'fine' },
  ] },
  { delay: '.54s', parts: [ // lower roof
    { d: 'M102 117L74 131Q69 134 64 133', kind: 'draw' }, { d: 'M138 117L166 131Q171 134 176 133', kind: 'draw' },
    { d: 'M102 117H138', kind: 'draw' }, { d: 'M64 133Q120 142 176 133', kind: 'draw' },
    { d: 'M110 117L94 137', kind: 'draw' }, { d: 'M130 117L146 137', kind: 'draw' },
    { d: fringe(range(70, 6.25, 17), LOWER_EAVE), kind: 'fine' },
  ] },
  { delay: '.66s', parts: [ // upper storey
    { d: 'M102 101V117', kind: 'draw' }, { d: 'M138 101V117', kind: 'draw' },
    { d: 'M102 104L91 98.8', kind: 'draw' }, { d: 'M138 104L149 98.8', kind: 'draw' },
    { d: 'M110 105V113M116 105V113M124 105V113M130 105V113', kind: 'fine' },
  ] },
  { delay: '.78s', parts: [ // upper roof
    { d: 'M120 80L94 95Q90 97.5 86 97', kind: 'draw' }, { d: 'M120 80L146 95Q150 97.5 154 97', kind: 'draw' },
    { d: 'M86 97Q120 104 154 97', kind: 'draw' },
    { d: 'M120 80L107 99.5', kind: 'draw' }, { d: 'M120 80L133 99.5', kind: 'draw' },
    { d: fringe(range(91, 5.8, 11), UPPER_EAVE), kind: 'fine' },
  ] },
  { delay: '.9s', parts: [ // gajur (golden finial)
    { d: 'M112 79.5H128', kind: 'draw' }, { d: 'M114.5 79C115 72.5 125 72.5 125.5 79', kind: 'draw' },
    { d: 'M120 58V67', kind: 'draw' }, { d: 'M114.5 79C115 72.5 125 72.5 125.5 79Z', kind: 'solid' },
  ] },
];

export function Emblem({ idPrefix = 'emblem', className = 'emblem' }: { idPrefix?: string; className?: string }) {
  const top = `${idPrefix}-top`;
  const bottom = `${idPrefix}-bottom`;
  return (
    <svg className={className} viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <defs>
        <path id={top} d="M32 120A88 88 0 0 1 208 120" />
        <path id={bottom} d="M22 120A98 98 0 0 0 218 120" />
      </defs>
      <circle className="emblem__ring emblem__ring--outer" cx="120" cy="120" r="114" pathLength={1} />
      <circle className="emblem__ring emblem__ring--thin" cx="120" cy="120" r="108" pathLength={1} />
      <circle className="emblem__ring emblem__ring--inner" cx="120" cy="120" r="78" pathLength={1} />
      <g className="emblem__words">
        <text className="emblem__text" textAnchor="middle">
          <textPath href={`#${top}`} startOffset="50%">HOTEL MANAKAMANA</textPath>
        </text>
        <text className="emblem__text emblem__text--sub" textAnchor="middle">
          <textPath href={`#${bottom}`} startOffset="50%">TRAFFIC CHOWK · MANTHALI</textPath>
        </text>
        <path className="emblem__star" d={star(27, 120, 5)} />
        <path className="emblem__star" d={star(213, 120, 5)} />
      </g>
      <g className="emblem__temple">
        {/* scaled 94% and lowered a touch so the temple sits optically centred in the ring */}
        <g transform="translate(120 121) scale(.94) translate(-120 -115)">
          {TEMPLE.map((g) => (
            <g key={g.delay} style={{ '--d': g.delay } as CSSProperties}>
              {g.parts.map((p, i) =>
                p.kind === 'draw' ? (
                  <path key={i} className="draw" d={p.d} pathLength={1} />
                ) : (
                  <path key={i} className={p.kind} d={p.d} />
                ),
              )}
              {g.delay === '.9s' && <circle className="solid" cx="120" cy="69.5" r="2.3" />}
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
