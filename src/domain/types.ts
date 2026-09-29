/**
 * The domain layer: vocabulary and rules of the problem itself.
 *
 * Nothing here may import Hono, D1, R2, or any other framework — that is the
 * property which lets these rules be read, tested, and reused without booting
 * a Worker.
 */

export const PERAN = ['admin', 'petugas', 'pelapor'] as const;
export type Peran = (typeof PERAN)[number];

export const KATEGORI = [
  'kebersihan',
  'perlengkapan',
  'kerusakan',
  'bau',
  'genangan',
  'lainnya',
] as const;
export type Kategori = (typeof KATEGORI)[number];

export const PRIORITAS = ['rendah', 'sedang', 'tinggi'] as const;
export type Prioritas = (typeof PRIORITAS)[number];

export const STATUS = ['baru', 'diproses', 'selesai'] as const;
export type Status = (typeof STATUS)[number];

/** A raw `reports` row as stored, joined with its location. */
export interface ReportRow {
  id: string;
  toilet_id: string;
  teks: string;
  foto_key: string | null;
  foto_selesai_key: string | null;
  status: Status;
  petugas: string | null;
  selesai_at: string | null;
  ai_status: 'pending' | 'ok' | 'gagal';
  kategori: string | null;
  prioritas: Prioritas | null;
  ringkasan: string | null;
  rekomendasi: string | null;
  ai_error: string | null;
  ai_model: string | null;
  ai_ms: number | null;
  pelapor_id: string | null;
  created_at: string;
  updated_at: string;
  // produced by the JOIN against the toilet_info view
  toilet_nama?: string;
  gedung_kode?: string;
  gedung_nama?: string;
  lantai?: number;
  jenis?: string;
}

/** What the frontend receives: categories parsed, photo keys turned into URLs. */
export interface ReportDTO
  extends Omit<ReportRow, 'kategori' | 'foto_key' | 'foto_selesai_key'> {
  kategori: Kategori[];
  foto_url: string | null;
  foto_selesai_url: string | null;
}

/** Photos are served by our own Worker, never by a third-party domain. */
export function urlFoto(key: string | null | undefined): string | null {
  return key ? `/api/uploads/${key}` : null;
}

export function toDTO(row: ReportRow): ReportDTO {
  const { kategori, foto_key, foto_selesai_key, ...rest } = row;
  return {
    ...rest,
    kategori: kategori ? (JSON.parse(kategori) as Kategori[]) : [],
    foto_url: urlFoto(foto_key),
    foto_selesai_url: urlFoto(foto_selesai_key),
  };
}

/**
 * A report may only be closed once evidence exists.
 *
 * This is the one business rule strict enough to deserve its own function: the
 * HTTP layer, the service layer, and any future caller all decide the same way.
 */
export function bolehDiselesaikan(status: Status, fotoBukti: string | null): boolean {
  return status !== 'selesai' || Boolean(fotoBukti);
}
