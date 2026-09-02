/**
 * Jejak laporan milik pelapor, disimpan di perangkatnya sendiri.
 *
 * Sistem ini sengaja tidak memakai login, jadi tidak ada akun tempat menautkan
 * laporan. Menyimpan daftar id di localStorage membuat pelapor tetap bisa
 * menengok status laporannya tanpa harus menyimpan tautannya sendiri.
 */
const KUNCI = 'laporan-saya';
const MAKS = 20;

export interface JejakLaporan {
  id: string;
  lokasi: string;
  waktu: string;
}

export function ambilRiwayat(): JejakLaporan[] {
  try {
    const isi = localStorage.getItem(KUNCI);
    if (!isi) return [];
    const data: unknown = JSON.parse(isi);
    return Array.isArray(data) ? (data as JejakLaporan[]) : [];
  } catch {
    // localStorage bisa diblokir (mode penyamaran, setelan browser) — anggap kosong.
    return [];
  }
}

export function simpanRiwayat(jejak: JejakLaporan): void {
  try {
    const lama = ambilRiwayat().filter((j) => j.id !== jejak.id);
    localStorage.setItem(KUNCI, JSON.stringify([jejak, ...lama].slice(0, MAKS)));
  } catch {
    /* gagal menyimpan tidak boleh menggagalkan pelaporan */
  }
}

export function hapusRiwayat(): void {
  try {
    localStorage.removeItem(KUNCI);
  } catch {
    /* abaikan */
  }
}
