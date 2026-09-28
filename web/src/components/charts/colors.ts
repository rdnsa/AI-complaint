/**
 * Chart colours, following design.md: the page is monochrome with one blue, so
 * the blue marks what matters (reports resolved) and Steel gray carries the
 * volume (reports received). The two differ strongly in lightness as well as
 * hue, which keeps them apart for colour-blind readers and in grayscale print.
 */
export const SERIES = {
  received: '#86868B',
  resolved: '#0071E3',
} as const;

/** Priority is a state, not an identity, so it uses the status palette. */
export const PRIORITY_COLORS: Record<string, string> = {
  high: '#B91C1C',
  medium: '#D97706',
  low: '#0E9F6E',
};

/**
 * Sequential ramp for magnitude in heatmaps: one hue, light to dark.
 *
 * Verified monotonic in relative luminance (0.933 → 0.164), which is the check
 * that matters for a sequential scale. Never a rainbow: hue changes would imply
 * category differences that do not exist in a single measure.
 */
export const SEQUENTIAL = [
  '#EEF5FD',
  '#D4E6FA',
  '#A9CDF5',
  '#6FAAEE',
  '#3B8AE6',
  '#0071E3',
  '#0058B0',
] as const;

/** Maps a value onto the ramp; zero keeps the empty surface rather than a colour. */
export function sequentialStep(value: number, max: number): string {
  if (value <= 0) return INK.surface;
  const index = Math.min(
    SEQUENTIAL.length - 1,
    Math.ceil((value / Math.max(max, 1)) * (SEQUENTIAL.length - 1)),
  );
  return SEQUENTIAL[index];
}

/** Cells past the middle of the ramp are dark enough to need light text. */
export function inkOn(value: number, max: number): string {
  return value / Math.max(max, 1) > 0.62 ? '#FFFFFF' : INK.primary;
}

/** A single magnitude series needs one colour — and no legend. */
export const SINGLE = '#0071E3';

/**
 * Ink colours follow the theme: they read the same CSS variables the Tailwind
 * palette uses (web/src/index.css), so charts flip to dark along with the page.
 * `#1d1d1f` etc. in the light theme, their mirrored values in the dark one.
 */
export const INK = {
  primary: 'rgb(var(--ink-900))',
  secondary: 'rgb(var(--ink-700))',
  muted: 'rgb(var(--ink-600))',
  gridline: 'rgb(var(--mist-200))',
  surface: 'rgb(var(--surface))',
};
