import { useState } from 'react';
import { EASE, useMounted } from './motion';
import { INK, inkOn, sequentialStep } from './colors';
import { NARROW, useWidth } from './useWidth';

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
/** A phone's map: taller, so the small tiles have the height for a label and a number. */
const H_NARROW = 100;

/** Squarified treemap: areas stay in proportion and the tiles stay close to square. */
function squarify(values: number[], H: number = 62): Box[] {
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

/** Nothing counted yet: the same frame, every place an equal dashed tile at zero. */
function EmptyTreemap({ items }: { items: TreeItem[] }) {
  const mounted = useMounted();
  // Without even the names, a few blank tiles keep the shape.
  const shown = items.length ? items : Array.from({ length: 4 }, (_, i) => ({ key: String(i), label: '', value: 0 }));
  const boxes = squarify(shown.map(() => 1));
  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      {shown.map((it, i) => {
        const b = boxes[i];
        return (
          <div
            key={it.key}
            className="absolute p-[2px]"
            style={{
              left: `${b.x}%`,
              top: `${(b.y / H) * 100}%`,
              width: `${b.w}%`,
              height: `${(b.h / H) * 100}%`,
              opacity: mounted ? 1 : 0,
              transition: `opacity .5s ${i * 40}ms`,
            }}
          >
            <div
              className="flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border border-dashed border-ink-600/50 p-2.5"
              style={{ color: INK.muted }}
            >
              <span className="truncate text-nav font-bold uppercase tracking-wide">{it.label}</span>
              {it.label && <span className="text-nav font-bold tabular-nums">0</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Treemap({ items }: { items: TreeItem[] }) {
  const mounted = useMounted();
  const [hot, setHot] = useState<string | null>(null);
  const [frame, width] = useWidth<HTMLElement>();
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (!sorted.length) return <EmptyTreemap items={items} />;

  const narrow = width > 0 && width < NARROW;
  const H = narrow ? H_NARROW : 62;
  const boxes = squarify(sorted.map((i) => i.value), H);
  // One unit of the map in pixels: what decides how a tile can carry its label.
  const px = (width || 600) / W;
  const max = sorted[0].value;

  // The readout under the map: the tile under the pointer, or else the biggest.
  const shown = sorted.find((it) => it.key === hot) ?? sorted[0];
  const fullName = (it: TreeItem) => (it.sub && it.sub !== it.label ? `${it.label} · ${it.sub}` : it.label);

  return (
    <figure ref={frame} className="m-0">
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      {sorted.map((it, i) => {
        const b = boxes[i];
        // Decided in real pixels, so a phone's narrow tiles get the compact form instead of an overlap.
        const roomy = b.w * px > 84 && b.h * px > 72;
        // Too small even for a stacked label: the number alone, the name is in the readout below.
        const tiny = b.w * px < 30 || b.h * px < 38;
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
            title={`${fullName(it)}: ${it.value}`}
          >
            <div
              className={`flex h-full w-full flex-col justify-between overflow-hidden rounded-xl ${roomy ? 'p-2.5' : 'p-1.5'}`}
              style={{ background: sequentialStep(it.value, max), color: inkOn(it.value, max) }}
            >
              {roomy ? (
                <>
                  {/* A long name (a court, not a building letter) takes two lines rather than an ellipsis. */}
                  <span className="line-clamp-2 break-words text-nav font-bold uppercase leading-tight tracking-wide opacity-80">
                    {it.label}
                  </span>
                  <span className="font-display text-2xl font-light leading-none tabular-nums">{it.value}</span>
                </>
              ) : tiny ? (
                <span className="m-auto text-[11px] font-bold tabular-nums">{it.value}</span>
              ) : (
                // Label over number, so a narrow tile never cuts either.
                <>
                  <span className="line-clamp-2 break-all text-[10px] font-bold uppercase leading-tight opacity-80">{it.label}</span>
                  <span className="text-sm font-semibold leading-none tabular-nums">{it.value}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
      <span className="sr-only" style={{ color: INK.primary }}>
        {sorted.map((i) => `${fullName(i)} ${i.value}`).join(', ')}
      </span>
    </div>
      <figcaption className="mt-2 truncate text-right text-xs font-bold" style={{ color: INK.primary }} aria-live="polite">
        {fullName(shown)}: {shown.value}
      </figcaption>
    </figure>
  );
}
