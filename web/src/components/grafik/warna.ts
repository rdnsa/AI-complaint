/**
 * Warna grafik, sudah lolos scripts/validate_palette.js pada latar putih kartu:
 * rentang terang, ambang chroma, keterpisahan bagi buta warna (deutan/protan/
 * tritan), dan kontras terhadap latar.
 *
 * Jangan mengganti nilainya berdasarkan selera — jalankan ulang validator dulu.
 * Oranye bata diambil dari identitas kampus; hijau-toska dipilih sebagai
 * pasangan yang terpisah jelas darinya bagi mata buta warna.
 */
export const SERI = {
  masuk: '#E2571F',
  selesai: '#0D9488',
} as const;

/** Prioritas adalah keadaan, bukan identitas, jadi memakai palet status. */
export const PRIORITAS_WARNA: Record<string, string> = {
  tinggi: '#B91C1C',
  sedang: '#D97706',
  rendah: '#0E9F6E',
};

/** Satu deret magnitudo cukup satu warna — tidak perlu legenda. */
export const TUNGGAL = '#E2571F';

export const TINTA = {
  utama: '#3E1712',
  sekunder: '#5D2A20',
  redup: '#9A7B72',
  garis: '#EFE4D6',
};
