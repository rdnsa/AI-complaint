import { useState } from 'react';
import { EASE, useMounted } from './motion';
import { INK, inkOn, sequentialStep } from './colors';

export interface TreeItem {
  key: string;
  label: string;
  sub?: string;
  value: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const W = 100;
const H = 62;

/** Squarified treemap: areas stay in proportion and the tiles stay close to square. */
function squarify(values: number[]): Box[] {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const areas = values.map((v) => (v / total) * W * H);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const worst = (row: number[], side: number) => {
    const s = sum(row);
    return Math.max((side * side * Math.max(...row)) / (s * s), (s * s) / (side * side * Math.min(...row)));
  };

  const out: Box[] = [];
  let x = 0;
  let y = 0;
  let w = W;
  let h = H;
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(w, h);
    const row = [areas[i]];
    let j = i + 1;
    while (j < areas.length && worst([...row, areas[j]], side) <= worst(row, side)) row.push(areas[j++]);
    const s = sum(row);
    if (w >= h) {
      const cw = s / h;
      let cy = y;
      for (const a of row) {
        out.push({ x, y: cy, w: cw, h: a / cw });
        cy += a / cw;
      }
      x += cw;
      w -= cw;
    } else {
      const rh = s / w;
      let cx = x;
      for (const a of row) {
        out.push({ x: cx, y, w: a / rh, h: rh });
        cx += a / rh;
      }
      y += rh;
      h -= rh;
    }
    i = j;
  }
  return out;
}

export default function Treemap({ items }: { items: TreeItem[] }) {
  const mounted = useMounted();
  const [hot, setHot] = useState<string | null>(null);
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (!sorted.length) return null;

  const boxes = squarify(sorted.map((i) => i.value));
  const max = sorted[0].value;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      {sorted.map((it, i) => {
        const b = boxes[i];
        const roomy = b.w > 15 && b.h > 14;
        return (
          <div
            key={it.key}
            className="absolute p-[2px]"
            style={{
              left: `${b.x}%`,
              top: `${(b.y / H) * 100}%`,
              width: `${b.w}%`,
              height: `${(b.h / H) * 100}%`,
              opacity: mounted ? (hot && hot !== it.key ? 0.4 : 1) : 0,
              transform: mounted ? 'none' : 'scale(0.85)',
              transition: `opacity .5s ${i * 60}ms, transform .8s ${EASE} ${i * 60}ms`,
            }}
            onMouseEnter={() => setHot(it.key)}
            onMouseLeave={() => setHot(null)}
            title={`${it.label}: ${it.value}`}
          >
            <div
              className="flex h-full w-full flex-col justify-between overflow-hidden rounded-xl p-2.5"
              style={{ background: sequentialStep(it.value, max), color: inkOn(it.value, max) }}
            >
              {roomy ? (
                <>
                  <span className="truncate text-nav font-bold uppercase tracking-wide opacity-80">{it.label}</span>
                  <span className="font-display text-2xl font-light leading-none tabular-nums">{it.value}</span>
                </>
              ) : (
                <span className="truncate text-nav font-bold tabular-nums">
                  {it.label} · {it.value}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <span className="sr-only" style={{ color: INK.primary }}>
        {sorted.map((i) => `${i.label} ${i.value}`).join(', ')}
      </span>
    </div>
  );
}
