export type Prioritas = 'rendah' | 'sedang' | 'tinggi';
export type StatusLaporan = 'baru' | 'diproses' | 'selesai';

export type Jenis = 'pria' | 'wanita' | 'disabilitas';

export interface Gedung {
  kode: string;
  nama: string;
  lantai: number[];
}

/** Satu lantai pada satu gedung — inilah yang diwakili sebuah QR. */
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

/** Bentuk ringkas yang dipakai daftar "Laporan saya". */
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

  /** Status ringkas beberapa laporan sekaligus, untuk daftar "Laporan saya". */
  ringkasLaporan: (ids: string[]) =>
    req<{ data: LaporanRingkas[] }>(`/api/reports/ringkas?ids=${ids.join(',')}`),

  unggahFoto: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return req<{ key: string; url: string }>('/api/uploads', { method: 'POST', body: fd });
  },

  // --- petugas ---
  login: (nama: string, password: string) =>
    req<{ nama: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ nama, password }) }),
  logout: () => req<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  saya: () => req<{ nama: string }>('/api/auth/me'),

  daftarLaporan: (filter: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: Laporan[] }>(`/api/reports?${q}`);
  },
  ubahStatus: (id: string, status: StatusLaporan) =>
    req<{ ok: boolean }>(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  analisaUlang: (id: string) => req<{ ok: boolean }>(`/api/reports/${id}/analisa-ulang`, { method: 'POST' }),

  statistik: (tanggal?: string) => req<Statistik>(`/api/summary/stats${tanggal ? `?tanggal=${tanggal}` : ''}`),
  ringkasan: (tanggal?: string) => req<Ringkasan>(`/api/summary${tanggal ? `?tanggal=${tanggal}` : ''}`),
  buatRingkasan: (tanggal?: string) =>
    req<Ringkasan>(`/api/summary/generate${tanggal ? `?tanggal=${tanggal}` : ''}`, { method: 'POST' }),
};
