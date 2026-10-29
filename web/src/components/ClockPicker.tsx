import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useLanguage } from '../lib/i18n';
import { ClockGlyph } from './Marks';

const CX = 120;
const R_OUTER = 92;
const R_INNER = 60;
const SPLIT = 76; // closer to the middle than this picks the inner ring

const pad = (n: number) => String(n).padStart(2, '0');
const polar = (r: number, deg: number) => ({
  x: CX + r * Math.sin((deg * Math.PI) / 180),
  y: CX - r * Math.cos((deg * Math.PI) / 180),
});

function parse(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  return match ? { h: Number(match[1]), m: Number(match[2]) } : null;
}

/**
 * A time of day read off a round clock face, as on a phone: pick the hour on
 * the dial (outer ring 00–11, inner ring 12–23), then the minute, to the exact
 * minute, by tapping or dragging. The value is committed on "Done" or when the
 * popover is dismissed by clicking away; Escape throws the change away.
 */
export default function ClockPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [draft, setDraft] = useState({ h: 0, m: 0 });
  const root = useRef<HTMLDivElement>(null);
  const dial = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  // The latest draft for the click-away handler, which must not re-subscribe on every drag step.
  const latest = useRef(draft);
  latest.current = draft;

  const openPicker = () => {
    setDraft(parse(value) ?? { h: new Date().getHours(), m: 0 });
    setMode('hour');
    setOpen(true);
  };

  const commit = () => {
    onChange(`${pad(latest.current.h)}:${pad(latest.current.m)}`);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) commit();
    };
    const key = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pick(e: PointerEvent<SVGSVGElement>) {
    const box = dial.current!.getBoundingClientRect();
    const scale = 240 / box.width;
    const dx = (e.clientX - box.left) * scale - CX;
    const dy = (e.clientY - box.top) * scale - CX;
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI + 360;
    if (mode === 'hour') {
      const slot = Math.round((deg % 360) / 30) % 12;
      const inner = Math.hypot(dx, dy) < SPLIT;
      setDraft((d) => ({ ...d, h: slot + (inner ? 12 : 0) }));
    } else {
      setDraft((d) => ({ ...d, m: Math.round((deg % 360) / 6) % 60 }));
    }
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    const step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    setDraft((d) =>
      mode === 'hour' ? { ...d, h: (d.h + step + 24) % 24 } : { ...d, m: (d.m + step + 60) % 60 },
    );
  }

  // The hand and its bubble.
  const inner = draft.h >= 12;
  const handDeg = mode === 'hour' ? (draft.h % 12) * 30 : draft.m * 6;
  const handR = mode === 'hour' ? (inner ? R_INNER : R_OUTER) : R_OUTER;
  const tip = polar(handR, handDeg);
  const accent = 'rgb(var(--accent-500))';

  return (
    <div ref={root} className="relative text-xs text-ink-700">
      <span className="mb-1 block font-semibold">{label}</span>
      <button
        type="button"
        onClick={() => (open ? commit() : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="input flex !w-auto min-w-[7.5rem] items-center gap-2 !py-1.5 text-left tabular-nums"
      >
        <ClockGlyph className="h-3.5 w-3.5 text-ink-600" />
        <span className={value ? 'text-ink-900' : 'text-ink-600'}>{value || '--:--'}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-2 w-[288px] rounded-card bg-surface p-4 shadow-2xl ring-1 ring-mist-300"
        >
          <div className="flex items-center justify-center gap-1 font-display text-5xl font-light tabular-nums">
            {(['hour', 'minute'] as const).map((k, i) => (
              <span key={k} className="flex items-center gap-1">
                {i === 1 && <span className="text-ink-600">:</span>}
                <button
                  type="button"
                  onClick={() => setMode(k)}
                  aria-pressed={mode === k}
                  className={`rounded-nav px-2.5 py-1 transition ${
                    mode === k ? 'bg-accent-100 text-accent-600' : 'text-ink-700 hover:bg-mist-100'
                  }`}
                >
                  {pad(k === 'hour' ? draft.h : draft.m)}
                </button>
              </span>
            ))}
          </div>

          <svg
            ref={dial}
            viewBox="0 0 240 240"
            className="mx-auto mt-3 aspect-square w-full max-w-[240px] touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-full"
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={mode === 'hour' ? 23 : 59}
            aria-valuenow={mode === 'hour' ? draft.h : draft.m}
            onKeyDown={onKey}
            onPointerDown={(e) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              pick(e);
            }}
            onPointerMove={(e) => dragging.current && pick(e)}
            onPointerUp={() => {
              dragging.current = false;
              // Hour chosen: on to the minutes, the way a phone's picker goes.
              if (mode === 'hour') setMode('minute');
            }}
          >
            <circle cx={CX} cy={CX} r={118} fill="rgb(var(--mist-100))" />

            {mode === 'minute' &&
              Array.from({ length: 60 }, (_, m) => {
                const p = polar(110, m * 6);
                return <circle key={m} cx={p.x} cy={p.y} r={m % 5 === 0 ? 1.8 : 1} fill="rgb(var(--ink-600))" opacity={0.6} />;
              })}

            <line x1={CX} y1={CX} x2={tip.x} y2={tip.y} stroke={accent} strokeWidth={2} />
            <circle cx={CX} cy={CX} r={4} fill={accent} />
            <circle cx={tip.x} cy={tip.y} r={mode === 'minute' && draft.m % 5 !== 0 ? 5 : 17} fill={accent} />

            {mode === 'hour'
              ? Array.from({ length: 24 }, (_, h) => {
                  const ring = h >= 12;
                  const p = polar(ring ? R_INNER : R_OUTER, (h % 12) * 30);
                  const on = h === draft.h;
                  return (
                    <text
                      key={h}
                      x={p.x}
                      y={p.y + 4.5}
                      textAnchor="middle"
                      fontSize={ring ? 12 : 14}
                      fontWeight={on ? 700 : 500}
                      fill={on ? '#fff' : 'rgb(var(--ink-900))'}
                      pointerEvents="none"
                    >
                      {pad(h)}
                    </text>
                  );
                })
              : Array.from({ length: 12 }, (_, i) => {
                  const m = i * 5;
                  const p = polar(R_OUTER, m * 6);
                  const on = m === draft.m;
                  return (
                    <text
                      key={m}
                      x={p.x}
                      y={p.y + 4.5}
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight={on ? 700 : 500}
                      fill={on ? '#fff' : 'rgb(var(--ink-900))'}
                      pointerEvents="none"
                    >
                      {pad(m)}
                    </text>
                  );
                })}
          </svg>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="rounded-full px-3 py-1.5 text-body-sm font-semibold text-accent-600 hover:bg-mist-100"
            >
              {t('time.clear')}
            </button>
            <button type="button" onClick={commit} className="btn-primary !min-h-0 !px-5 !py-1.5 text-body-sm">
              {t('time.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
