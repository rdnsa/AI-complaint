/**
 * Chart colours, already passed through scripts/validate_palette.js against the
 * white card surface: lightness band, chroma floor, colour-vision separation
 * (deutan/protan/tritan), and contrast against the surface.
 *
 * Do not change these to taste — re-run the validator first. The brick orange
 * comes from the campus identity; the teal was chosen as the partner that stays
 * clearly separable from it for colour-blind readers.
 */
export const SERI = {
  masuk: '#E2571F',
  selesai: '#0D9488',
} as const;

/** Priority is a state, not an identity, so it uses the status palette. */
export const PRIORITAS_WARNA: Record<string, string> = {
  tinggi: '#B91C1C',
  sedang: '#D97706',
  rendah: '#0E9F6E',
};

/**
 * Sequential ramp for magnitude in heatmaps: one hue, light to dark.
 *
 * Verified monotonic in relative luminance (0.933 → 0.164), which is the check
 * that matters for a sequential scale. Never a rainbow: hue changes would imply
 * category differences that do not exist in a single measure.
 */
export const SEKUENSIAL = [
  '#FEF6F1',
  '#FCE8DC',
  '#F7CBB0',
  '#F0A87F',
  '#EA8149',
  '#E2571F',
  '#C74513',
] as const;

/** Maps a value onto the ramp; zero keeps the empty surface rather than a colour. */
export function langkahSekuensial(nilai: number, maks: number): string {
  if (nilai <= 0) return TINTA.permukaan;
  const indeks = Math.min(
    SEKUENSIAL.length - 1,
    Math.ceil((nilai / Math.max(maks, 1)) * (SEKUENSIAL.length - 1)),
  );
  return SEKUENSIAL[indeks];
}

/** Cells past the middle of the ramp are dark enough to need light text. */
export function tintaDiAtas(nilai: number, maks: number): string {
  return nilai / Math.max(maks, 1) > 0.62 ? '#FFFFFF' : TINTA.utama;
}

/** A single magnitude series needs one colour — and no legend. */
export const TUNGGAL = '#E2571F';

/**
 * Ink colours follow the theme: they read the same CSS variables the Tailwind
 * palette uses (web/src/index.css), so charts flip to dark along with the page.
 * `#3E1712` etc. in the light theme, their mirrored values in the dark one.
 */
export const TINTA = {
  utama: 'rgb(var(--maroon-900))',
  sekunder: 'rgb(var(--maroon-700))',
  redup: 'rgb(var(--maroon-600))',
  garis: 'rgb(var(--krem-200))',
  permukaan: 'rgb(var(--permukaan))',
};
