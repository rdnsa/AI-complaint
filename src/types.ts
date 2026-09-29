export const PERAN = ['admin', 'petugas', 'pelapor'] as const;
export type Peran = (typeof PERAN)[number];

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;

  // vars (wrangler.jsonc)
  LLM_BASE_URL: string;
  LLM_MODEL: string;

  // secrets (wrangler secret put)
  LLM_API_KEY: string;
  AUTH_SECRET: string;
}

/** Tipe Hono bersama: binding + variabel yang diisi middleware auth. */
export type AppEnv = {
  Bindings: Env;
  Variables: { sesi: { id: string; nama: string; peran: Peran } };
};

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

/** Baris mentah tabel `reports` seperti yang dikembalikan D1. */
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
  // hasil JOIN view toilet_info
  toilet_nama?: string;
  gedung_kode?: string;
  gedung_nama?: string;
  lantai?: number;
  jenis?: string;
}

/** Bentuk yang dikirim ke frontend: kategori sudah jadi array, foto sudah jadi URL. */
export interface ReportDTO
  extends Omit<ReportRow, 'kategori' | 'foto_key' | 'foto_selesai_key'> {
  kategori: Kategori[];
  foto_url: string | null;
  foto_selesai_url: string | null;
}

export function toDTO(row: ReportRow): ReportDTO {
  const { kategori, foto_key, foto_selesai_key, ...rest } = row;
  return {
    ...rest,
    kategori: kategori ? (JSON.parse(kategori) as Kategori[]) : [],
    // Path relatif: foto dilayani Worker ini sendiri, satu domain dengan aplikasi.
    foto_url: foto_key ? `/api/uploads/${foto_key}` : null,
    foto_selesai_url: foto_selesai_key ? `/api/uploads/${foto_selesai_key}` : null,
  };
}
