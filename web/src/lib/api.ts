export type Prioritas = 'rendah' | 'sedang' | 'tinggi';
export type StatusLaporan = 'baru' | 'diproses' | 'selesai';

export interface Toilet {
  id: string;
  gedung: string;
  lantai: number;
  jenis: string;
  nama: string;
}

export interface Laporan {
  id: string;
  toilet_id: string;
  toilet_nama: string;
  gedung: string;
  lantai: number;
  teks: string;
  foto_url: string | null;
  status: StatusLaporan;
  petugas: string | null;
  ai_status: 'pending' | 'ok' | 'gagal';
  kategori: string[];
  prioritas: Prioritas | null;
  ringkasan: string | null;
  rekomendasi: string | null;
  ai_ms: number | null;
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
  toilet: (id: string) => req<Toilet>(`/api/toilets/${encodeURIComponent(id)}`),
  daftarToilet: () => req<{ data: Toilet[] }>('/api/toilets'),

  kirimLaporan: (body: { toilet_id: string; teks: string; foto_key?: string | null }) =>
    req<{ id: string; toilet: string; duplikat: boolean }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  laporan: (id: string) => req<Laporan>(`/api/reports/${id}`),

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

export function waktuRelatif(iso: string): string {
  // created_at dari D1 berformat 'YYYY-MM-DD HH:MM:SS' dalam UTC.
  const t = Date.parse(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
  const menit = Math.floor((Date.now() - t) / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}
