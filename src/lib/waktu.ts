/**
 * D1 menyimpan `created_at` sebagai UTC ('YYYY-MM-DD HH:MM:SS'), sedangkan
 * kampus berpikir dalam WIB (UTC+7). Semua konversi hari dikumpulkan di sini
 * supaya batas "hari ini" konsisten antara dashboard dan cron ringkasan.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function formatUTC(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Tanggal WIB ('YYYY-MM-DD') dari sebuah waktu absolut. */
export function tanggalWIB(now: Date = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Batas awal & akhir sebuah tanggal WIB, dinyatakan dalam string UTC untuk query D1. */
export function rentangHariWIB(tanggal: string): { mulai: string; selesai: string } {
  const mulaiMs = Date.parse(`${tanggal}T00:00:00Z`) - WIB_OFFSET_MS;
  return {
    mulai: formatUTC(new Date(mulaiMs)),
    selesai: formatUTC(new Date(mulaiMs + 24 * 60 * 60 * 1000)),
  };
}
