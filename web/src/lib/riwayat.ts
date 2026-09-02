/**
 * The reporter's own report ids, kept on their device.
 *
 * Reporting deliberately works without a login, so there is no account to hang
 * reports on. Keeping the ids in localStorage lets a reporter check back on
 * their reports without having to save the link themselves.
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
    // localStorage can be blocked (private mode, browser settings) — treat as empty.
    return [];
  }
}

export function simpanRiwayat(jejak: JejakLaporan): void {
  try {
    const lama = ambilRiwayat().filter((j) => j.id !== jejak.id);
    localStorage.setItem(KUNCI, JSON.stringify([jejak, ...lama].slice(0, MAKS)));
  } catch {
    /* a failed write must never fail the report itself */
  }
}

export function hapusRiwayat(): void {
  try {
    localStorage.removeItem(KUNCI);
  } catch {
    /* ignore */
  }
}
