export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;

  // vars (wrangler.jsonc)
  LLM_BASE_URL: string;
  LLM_MODEL: string;
  R2_PUBLIC_URL: string;

  // secrets (wrangler secret put)
  LLM_API_KEY: string;
  AUTH_SECRET: string;
  PETUGAS_PASSWORD: string;
}

/** Tipe Hono bersama: binding + variabel yang diisi middleware auth. */
export type AppEnv = {
  Bindings: Env;
  Variables: { petugas: string };
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
  created_at: string;
  updated_at: string;
  // hasil JOIN toilets
  toilet_nama?: string;
  gedung?: string;
  lantai?: number;
}

/** Bentuk yang dikirim ke frontend: kategori sudah jadi array, foto sudah jadi URL. */
export interface ReportDTO extends Omit<ReportRow, 'kategori' | 'foto_key'> {
  kategori: Kategori[];
  foto_url: string | null;
}

export function toDTO(row: ReportRow, r2PublicUrl: string): ReportDTO {
  const { kategori, foto_key, ...rest } = row;
  return {
    ...rest,
    kategori: kategori ? (JSON.parse(kategori) as Kategori[]) : [],
    foto_url: foto_key ? `${r2PublicUrl.replace(/\/$/, '')}/${foto_key}` : null,
  };
}
