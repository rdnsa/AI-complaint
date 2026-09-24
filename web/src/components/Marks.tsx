import type { ReactNode } from 'react';

/*
 * The app's whole visual vocabulary, in two tiers.
 *
 * Marks are the identity layer: a handful of flat shapes in the campus palette
 * on a rounded tile, drawn on one 48-unit grid with the same corner radii, so
 * they read as one family rather than a borrowed icon set. Every mark carries
 * exactly one small accent dot in a contrasting colour — the house rule that
 * ties them together.
 *
 * Glyphs are the inline layer: single-colour line drawings on a 20-unit grid
 * with one stroke weight and round ends, sized to sit beside a line of text and
 * take the text's colour.
 *
 * Everything here is decorative: the text beside it carries the meaning.
 */

function Tile({ size, className = '', children }: { size: string; className?: string; children: ReactNode }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center overflow-hidden ${size} ${className}`}>
      <svg viewBox="0 0 48 48" className="h-full w-full">
        {children}
      </svg>
    </span>
  );
}

type MarkProps = { size?: string; className?: string };

const ROLE_SIZE = 'h-12 w-12 rounded-[14px]';
const SMALL_SIZE = 'h-10 w-10 rounded-xl';
const LIGHT_TILE = 'bg-krem-100 ring-1 ring-inset ring-krem-200';

/** Student: a mortarboard, the tassel ending in the accent dot. */
export function StudentMark({ size = ROLE_SIZE, className = '' }: MarkProps) {
  return (
    <Tile size={size} className={`bg-bata-500 ring-1 ring-inset ring-black/5 ${className}`}>
      <path d="M15 22.5V29c0 3.1 4 5.6 9 5.6s9-2.5 9-5.6v-6.5l-9 4.2Z" className="fill-white/55" />
      <path d="M24 11 39 18 24 25 9 18Z" className="fill-white" />
      <path d="M39 18v9.5" className="stroke-white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="39" cy="30" r="2.4" className="fill-tetap-maroon" />
    </Tile>
  );
}

/** Cleaning staff: a drop of water with its highlight, and a smaller drop beside it. */
export function StaffMark({ size = ROLE_SIZE, className = '' }: MarkProps) {
  return (
    <Tile size={size} className={`bg-toska-500 ring-1 ring-inset ring-black/5 ${className}`}>
      <path d="M22 9.5S12 21.1 12 28a10 10 0 0 0 20 0c0-6.9-10-18.5-10-18.5Z" className="fill-white" />
      <path
        d="M17.2 28.4a4.8 4.8 0 0 0 4.8 4.8"
        className="stroke-toska-500"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M35.5 13.5S31 19 31 22a4.5 4.5 0 0 0 9 0c0-3-4.5-8.5-4.5-8.5Z" className="fill-white/55" />
      <circle cx="37" cy="34.5" r="2.4" className="fill-tetap-maroon" />
    </Tile>
  );
}

/** Supervisor: three rising bars, the overview of the whole building. */
export function SupervisorMark({ size = ROLE_SIZE, className = '' }: MarkProps) {
  return (
    <Tile size={size} className={`bg-tetap-maroon ring-1 ring-inset ring-white/15 ${className}`}>
      <rect x="11" y="26" width="6.5" height="11" rx="2" className="fill-tetap-krem/60" />
      <rect x="20.75" y="20" width="6.5" height="17" rx="2" className="fill-tetap-krem" />
      <rect x="30.5" y="13" width="6.5" height="24" rx="2" className="fill-white" />
      <circle cx="14.25" cy="19.5" r="2.4" className="fill-bata-400" />
    </Tile>
  );
}

const BUBBLE_BACK = 'M8 15a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v4a6 6 0 0 1-6 6h-8l-5 4.5V25A6 6 0 0 1 8 19Z';
const BUBBLE_FRONT = 'M17 25a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6h-.5v4.5L29 36h-6a6 6 0 0 1-6-6Z';

/** The chatbot: two speech bubbles in conversation, the front one mid-sentence. */
export function ChatMark({ size = ROLE_SIZE, className = '' }: MarkProps) {
  return (
    <Tile size={size} className={`bg-maroon-lembut ring-1 ring-inset ring-white/10 ${className}`}>
      <path d={BUBBLE_BACK} className="fill-tetap-krem/45" />
      <path d={BUBBLE_FRONT} className="fill-white" />
      <circle cx="24" cy="27.5" r="1.8" className="fill-tetap-maroon" />
      <circle cx="29" cy="27.5" r="1.8" className="fill-tetap-maroon" />
      <circle cx="34" cy="27.5" r="1.8" className="fill-bata-500" />
    </Tile>
  );
}

/** The chat bubbles alone, small enough to sit inline beside a label. */
export function ChatGlyph({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="8 9 34 32" className={`shrink-0 ${className}`}>
      <path d={BUBBLE_BACK} className="fill-bata-300" />
      <path d={BUBBLE_FRONT} className="fill-bata-500" />
    </svg>
  );
}

/** QR stickers: the three finder squares of a real QR code, and a few modules. */
export function QrMark({ size = ROLE_SIZE, className = '' }: MarkProps) {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect
        x={x + 1.3}
        y={y + 1.3}
        width="9.4"
        height="9.4"
        rx="2.6"
        fill="none"
        className="stroke-maroon-800"
        strokeWidth="2.6"
      />
      <rect x={x + 4} y={y + 4} width="4" height="4" rx="1" className="fill-maroon-800" />
    </g>
  );
  return (
    <Tile size={size} className={`${LIGHT_TILE} ${className}`}>
      {finder(9, 9)}
      {finder(27, 9)}
      {finder(9, 27)}
      <rect x="27" y="27" width="5" height="5" rx="1.2" className="fill-maroon-800" />
      <rect x="34" y="34" width="5" height="5" rx="1.2" className="fill-maroon-800" />
      <circle cx="36.5" cy="29.5" r="2.4" className="fill-bata-500" />
    </Tile>
  );
}

/** All reports: a stack of report slips. */
export function ReportsMark({ size = SMALL_SIZE, className = '' }: MarkProps) {
  return (
    <Tile size={size} className={`${LIGHT_TILE} ${className}`}>
      <rect x="16" y="9" width="21" height="26" rx="4" className="fill-krem-300" />
      <rect x="11" y="13" width="21" height="26" rx="4" className="fill-maroon-800" />
      <rect x="15.5" y="20" width="12" height="2.6" rx="1.3" className="fill-krem-100" />
      <rect x="15.5" y="26" width="8" height="2.6" rx="1.3" className="fill-krem-100" />
      <circle cx="35" cy="37" r="3" className="fill-bata-500" />
    </Tile>
  );
}

/** Leaderboard: a podium, the winner marked by the accent dot. */
export function PodiumMark({ size = SMALL_SIZE, className = '' }: MarkProps) {
  return (
    <Tile size={size} className={`${LIGHT_TILE} ${className}`}>
      <rect x="9" y="25" width="9" height="13" rx="2" className="fill-krem-300" />
      <rect x="19.5" y="18" width="9" height="20" rx="2" className="fill-maroon-800" />
      <rect x="30" y="29" width="9" height="9" rx="2" className="fill-krem-300" />
      <circle cx="24" cy="11.5" r="3" className="fill-bata-500" />
    </Tile>
  );
}

/**
 * A place on the leaderboard. The top three get a coloured tile in the role
 * colours, in podium order; everyone else a plain numbered tile.
 */
export function RankMark({ rank, size = SMALL_SIZE }: { rank: number; size?: string }) {
  const podium = [
    { tile: 'bg-bata-500', dot: 'fill-tetap-maroon' },
    { tile: 'bg-tetap-maroon ring-1 ring-inset ring-white/15', dot: 'fill-bata-400' },
    { tile: 'bg-toska-500', dot: 'fill-tetap-maroon' },
  ][rank - 1];

  if (!podium) {
    return (
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center text-sm font-extrabold tabular-nums text-maroon-700 ${LIGHT_TILE} ${size}`}
      >
        {rank}
      </span>
    );
  }
  return (
    <Tile size={size} className={podium.tile}>
      <text
        x="23"
        y="32.5"
        textAnchor="middle"
        fontSize="24"
        fontWeight="800"
        className="fill-white"
        style={{ fontFamily: 'inherit' }}
      >
        {rank}
      </text>
      <circle cx="37" cy="11" r="3" className={podium.dot} />
    </Tile>
  );
}

/** Done: a check on the staff colour, for the moment a job is finished. */
export function DoneMark({ size = 'h-16 w-16 rounded-[20px]', className = '' }: MarkProps) {
  return (
    <Tile size={size} className={`bg-toska-500 ring-1 ring-inset ring-black/5 ${className}`}>
      <path
        d="M13.5 24.5l7 7L34.5 17"
        className="stroke-white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="37" cy="35.5" r="2.6" className="fill-tetap-maroon" />
    </Tile>
  );
}

/* ---------------------------------------------------------------- glyphs */

function Glyph({ className, children }: { className: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

type GlyphProps = { className?: string };

/** A drawn arrow, so it keeps its weight and alignment in every font. Rotate it for other directions. */
export function ArrowGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M4 10h11.5M11 5.5l4.5 4.5-4.5 4.5" />
    </Glyph>
  );
}

export function CheckGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M4.5 10.5 8 14l7.5-8" />
    </Glyph>
  );
}

export function CameraGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h2l1.3-2h4.4l1.3 2h2A1.5 1.5 0 0 1 17 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5Z" />
      <circle cx="10" cy="10.8" r="2.8" />
    </Glyph>
  );
}

export function PrintGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M6 7V3.5h8V7" />
      <path d="M6 14H4.5A1.5 1.5 0 0 1 3 12.5v-4A1.5 1.5 0 0 1 4.5 7h11A1.5 1.5 0 0 1 17 8.5v4a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M6 11.5h8V17H6Z" />
    </Glyph>
  );
}

export function DownloadGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M10 3.5v9M6 9l4 4 4-4M4 16.5h12" />
    </Glyph>
  );
}

export function ClockGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <circle cx="10" cy="10" r="6.8" />
      <path d="M10 6.2V10l2.6 1.6" />
    </Glyph>
  );
}

export function PersonGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M4 17c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
    </Glyph>
  );
}

/** Report received: a tray with something landing in it. */
export function InboxGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M3 11.5 5 4.5h10l2 7v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M3 11.5h4l1 2h4l1-2h4" />
    </Glyph>
  );
}

/** Cleaned: the drop of the staff mark, as a line drawing. */
export function DropGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M10 3S5 8.6 5 12a5 5 0 0 0 10 0c0-3.4-5-9-5-9Z" />
    </Glyph>
  );
}

export function EyeGlyph({ off = false, className = 'h-4 w-4' }: GlyphProps & { off?: boolean }) {
  return (
    <Glyph className={className}>
      <path d="M2.5 10S5.2 4.8 10 4.8 17.5 10 17.5 10 14.8 15.2 10 15.2 2.5 10 2.5 10Z" />
      <circle cx="10" cy="10" r="2.4" />
      {off && <path d="M3.5 3.5l13 13" />}
    </Glyph>
  );
}

export function CloseGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M5 5l10 10M15 5 5 15" />
    </Glyph>
  );
}

export function PlusGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M10 4.5v11M4.5 10h11" />
    </Glyph>
  );
}

export function MinusGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <path d="M4.5 10h11" />
    </Glyph>
  );
}

/** A magnifier with a plus: this picture can be looked at more closely. */
export function ZoomGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <Glyph className={className}>
      <circle cx="8.5" cy="8.5" r="5.2" />
      <path d="m12.4 12.4 4.1 4.1M8.5 6.3v4.4M6.3 8.5h4.4" />
    </Glyph>
  );
}

/** Direction of a change: up, down, or level. */
export function TrendGlyph({ direction, className = 'h-3.5 w-3.5' }: GlyphProps & { direction: 'up' | 'down' | 'flat' }) {
  return (
    <Glyph className={className}>
      <path d={direction === 'up' ? 'M5 12.5 10 7.5l5 5' : direction === 'down' ? 'M5 7.5l5 5 5-5' : 'M5 10h10'} />
    </Glyph>
  );
}

/** Toilet types, drawn rather than typed: the ♂/♀/♿ characters change shape from phone to phone. */
export function ToiletTypeGlyph({ type, className = 'h-6 w-6' }: GlyphProps & { type: 'men' | 'women' | 'accessible' }) {
  return (
    <Glyph className={className}>
      {type === 'men' && (
        <>
          <circle cx="8.5" cy="11.5" r="4.5" />
          <path d="M11.7 8.3 16 4M12 4h4v4" />
        </>
      )}
      {type === 'women' && (
        <>
          <circle cx="10" cy="7.5" r="4.5" />
          <path d="M10 12v6M7 15h6" />
        </>
      )}
      {type === 'accessible' && (
        <>
          <circle cx="9" cy="3.6" r="1.4" fill="currentColor" stroke="none" />
          <path d="M9 6.5v5h4.5l2 4.5" />
          <path d="M9 9h3.5" />
          <path d="M6.5 9.3a4.7 4.7 0 1 0 6.2 6.3" />
        </>
      )}
    </Glyph>
  );
}
