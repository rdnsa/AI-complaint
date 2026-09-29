export type Peran = 'admin' | 'petugas' | 'pelapor';

export interface Sesi {
  id: string;
  nama: string;
  peran: Peran;
}

export interface AkunPengelola {
  id: string;
  username: string;
  nama: string;
  peran: Peran;
  aktif: number;
  created_at: string;
}

export interface BarisPeringkat {
  id: string;
  nama: string;
  laporan: number;
  selesai: number | null;
}

export type Prioritas = 'rendah' | 'sedang' | 'tinggi';
export type StatusLaporan = 'baru' | 'diproses' | 'selesai';

export type Jenis = 'pria' | 'wanita' | 'disabilitas';
export type HasilBukti = 'bersih' | 'kotor' | 'bukan_toilet';

export interface Gedung {
  kode: string;
  nama: string;
  lantai: number[];
}

/** One floor of one building — this is what a QR code stands for. */
export interface Lokasi {
  gedung_kode: string;
  gedung_nama: string;
  lantai: number;
  toilets: Array<{ id: string; jenis: Jenis }>;
}

export interface Laporan {
  id: string;
  toilet_id: string;
  toilet_nama: string;
  gedung_kode: string;
  gedung_nama: string;
  lantai: number;
  jenis: Jenis;
  teks: string;
  foto_url: string | null;
  foto_selesai_url: string | null;
  /** The vision model's verdict on the proof photo; only 'bersih' ever gets stored. */
  bukti_ai_hasil: HasilBukti | null;
  bukti_ai_alasan: string | null;
  status: StatusLaporan;
  petugas: string | null;
  selesai_at: string | null;
  ai_status: 'pending' | 'ok' | 'gagal';
  kategori: string[];
  prioritas: Prioritas | null;
  ringkasan: string | null;
  rekomendasi: string | null;
  ai_ms: number | null;
  created_at: string;
}

/** A report on the public board: no raw text, no photo, no staff name. */
export interface LaporanPublik {
  id: string;
  status: StatusLaporan;
  prioritas: Prioritas | null;
  kategori: string[];
  ringkasan: string | null;
  ai_status: 'pending' | 'ok' | 'gagal';
  toilet_nama: string;
  gedung_kode: string;
  lantai: number;
  created_at: string;
  selesai_at: string | null;
  foto_selesai_url: string | null;
}

/** The numbers behind the dashboard charts. */
export interface DataGrafik {
  harian: Array<{ tanggal: string; total: number; selesai: number }>;
  harianPrioritas: Array<{ tanggal: string; tinggi: number; sedang: number; rendah: number }>;
  kategori: Array<{ kategori: string; jumlah: number }>;
  prioritas: Array<{ prioritas: string; jumlah: number }>;
  gedung: Array<{ gedung_kode: string; gedung_nama: string; jumlah: number }>;
  penyelesaian: { jumlah: number; menit: number | null };
  jamHari: Array<{ hari: number; jam: number; jumlah: number }>;
  matriks: Array<{ gedung_kode: string; kategori: string; jumlah: number }>;
  waktuPrioritas: Array<{ prioritas: string; jumlah: number; menit: number | null }>;
  tren: {
    hari: number;
    laporan: number;
    laporan_lalu: number;
    perubahan: number | null;
    selesai: number;
    tinggi: number;
  };
}

export interface Aktivitas {
  id: number;
  waktu: string;
  aksi:
    | 'lapor'
    | 'analisis'
    | 'analisis_gagal'
    | 'status'
    | 'hapus'
    | 'masuk'
    | 'ringkasan'
    | 'pengguna'
    | 'bukti_ditolak'
    | 'verifikasi_gagal'
    | 'tanya';
  report_id: string | null;
  pelaku: string;
  ringkas: string;
  rincian: Record<string, unknown> | null;
}

export interface Statistik {
  tanggal: string;
  hari_ini: {
    total: number;
    tinggi: number | null;
    sedang: number | null;
    rendah: number | null;
    ai_gagal: number | null;
  };
  belum_selesai: number;
  lokasi_teratas: Array<{ lokasi: string; jumlah: number }>;
}

export interface Ringkasan {
  ada: boolean;
  tanggal: string;
  total_laporan?: number;
  ringkasan?: string;
  sorotan?: string[];
}

/** One turn of the admin question-answering chat. */
export interface PesanTanya {
  peran: 'pengguna' | 'asisten';
  teks: string;
}

export interface JawabanTanya {
  teks: string;
  alat: Array<{ nama: string; argumen: Record<string, unknown> }>;
  token: { prompt: number; jawaban: number; cache_hit: number };
  ms: number;
  sisa_hari_ini: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The rest of the error body, e.g. the verdict behind a rejected proof photo. */
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { 'content-type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const { error, ...sisa } = data as { error?: string } & Record<string, unknown>;
    throw new ApiError(error ?? 'Gagal menghubungi server', res.status, sisa);
  }
  return data as T;
}

export const api = {
  daftarGedung: () => req<{ data: Gedung[] }>('/api/lokasi'),
  lokasi: (id: string) => req<Lokasi>(`/api/lokasi/${encodeURIComponent(id)}`),

  kirimLaporan: (body: { toilet_id: string; teks: string; foto_key?: string | null }) =>
    req<{ id: string; toilet: string; duplikat: boolean }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  laporan: (id: string) => req<Laporan>(`/api/reports/${id}`),

  /** The public report board — no sign-in required. */
  laporanPublik: (filter: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: LaporanPublik[]; jumlah: { total: number; selesai: number | null } }>(
      `/api/reports/publik?${q}`,
    );
  },

  /** The signed-in reporter's own reports. */
  laporanSaya: () => req<{ data: Laporan[] }>('/api/reports/saya'),

  /** `jenis` separates the reporter's condition photo from the staff proof photo. */
  unggahFoto: (file: File, jenis: 'laporan' | 'bukti' = 'laporan') => {
    const fd = new FormData();
    fd.append('file', file);
    return req<{ key: string; url: string }>(`/api/uploads?jenis=${jenis}`, {
      method: 'POST',
      body: fd,
    });
  },

  // --- accounts ---
  masuk: (username: string, password: string) =>
    req<Sesi>('/api/auth/masuk', { method: 'POST', body: JSON.stringify({ username, password }) }),
  daftar: (username: string, nama: string, password: string) =>
    req<Sesi>('/api/auth/daftar', {
      method: 'POST',
      body: JSON.stringify({ username, nama, password }),
    }),
  keluar: () => req<{ ok: boolean }>('/api/auth/keluar', { method: 'POST' }),
  saya: () => req<Sesi>('/api/auth/saya'),

  // --- admin only ---
  daftarPengguna: () => req<{ data: AkunPengelola[] }>('/api/pengguna'),
  buatPengguna: (body: { username: string; nama: string; password: string }) =>
    req<AkunPengelola>('/api/pengguna', { method: 'POST', body: JSON.stringify(body) }),
  ubahPengguna: (id: string, body: { nama?: string; password?: string; aktif?: boolean }) =>
    req<{ ok: boolean }>(`/api/pengguna/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  peringkat: () =>
    req<{ data: BarisPeringkat[]; saya: { peringkat: number; laporan: number } | null }>(
      '/api/peringkat',
    ),

  daftarLaporan: (filter: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: Laporan[] }>(`/api/reports?${q}`);
  },
  /** Closing with a photo takes a few seconds: the server runs the vision check first. */
  ubahStatus: (id: string, status: StatusLaporan, foto_selesai_key?: string) =>
    req<{ ok: boolean; status: StatusLaporan; verifikasi: { hasil: HasilBukti; alasan: string } | null }>(`/api/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, foto_selesai_key }),
    }),
  analisaUlang: (id: string) => req<{ ok: boolean }>(`/api/reports/${id}/analisa-ulang`, { method: 'POST' }),
  hapusLaporan: (id: string) => req<{ ok: boolean }>(`/api/reports/${id}`, { method: 'DELETE' }),

  grafik: () => req<DataGrafik>('/api/summary/grafik'),
  aktivitas: (filter: Record<string, string> = {}) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: Aktivitas[] }>(`/api/aktivitas?${q}`);
  },

  statistik: (tanggal?: string) => req<Statistik>(`/api/summary/stats${tanggal ? `?tanggal=${tanggal}` : ''}`),
  ringkasan: (tanggal?: string) => req<Ringkasan>(`/api/summary${tanggal ? `?tanggal=${tanggal}` : ''}`),
  /** Admin only. `riwayat` carries the recent turns so follow-up questions make sense. */
  tanya: (pertanyaan: string, riwayat: PesanTanya[]) =>
    req<JawabanTanya>('/api/tanya', { method: 'POST', body: JSON.stringify({ pertanyaan, riwayat }) }),

  buatRingkasan: (tanggal?: string) =>
    req<Ringkasan>(`/api/summary/generate${tanggal ? `?tanggal=${tanggal}` : ''}`, { method: 'POST' }),
};
