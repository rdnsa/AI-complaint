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

/** A single magnitude series needs one colour — and no legend. */
export const TUNGGAL = '#E2571F';

export const TINTA = {
  utama: '#3E1712',
  sekunder: '#5D2A20',
  redup: '#9A7B72',
  garis: '#EFE4D6',
};
