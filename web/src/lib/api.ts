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

/** The compact shape used by the "My reports" list. */
export interface LaporanRingkas {
  id: string;
  status: StatusLaporan;
  prioritas: Prioritas | null;
  ai_status: 'pending' | 'ok' | 'gagal';
  ringkasan: string | null;
  teks: string;
  toilet_nama: string;
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
  kategori: Array<{ kategori: string; jumlah: number }>;
  prioritas: Array<{ prioritas: string; jumlah: number }>;
  gedung: Array<{ gedung_kode: string; gedung_nama: string; jumlah: number }>;
  penyelesaian: { jumlah: number; menit: number | null };
}

export interface Aktivitas {
  id: number;
  waktu: string;
  aksi: 'lapor' | 'analisis' | 'analisis_gagal' | 'status' | 'hapus' | 'masuk' | 'ringkasan';
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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
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
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? 'Gagal menghubungi server', res.status);
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

  /** Status of several reports at once, for the "My reports" list. */
  ringkasLaporan: (ids: string[]) =>
    req<{ data: LaporanRingkas[] }>(`/api/reports/ringkas?ids=${ids.join(',')}`),

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
  ubahStatus: (id: string, status: StatusLaporan, foto_selesai_key?: string) =>
    req<{ ok: boolean }>(`/api/reports/${id}`, {
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
  buatRingkasan: (tanggal?: string) =>
    req<Ringkasan>(`/api/summary/generate${tanggal ? `?tanggal=${tanggal}` : ''}`, { method: 'POST' }),
};
