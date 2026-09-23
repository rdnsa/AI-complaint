import { rentangHariWIB, tanggalSah } from '../adapters/clock';

/**
 * The time filter shared by the report and work-report lists, so the
 * supervisor's "when" means the same thing on both tabs.
 *
 * Dates are WIB and inclusive at both ends; hours are WIB clock hours (0–23),
 * also inclusive, so `jam_dari=7&jam_sampai=12` covers 07:00 to 12:59.
 */
export interface FilterWaktu {
  /** A single WIB day — kept for existing callers; `dari`/`sampai` supersede it. */
  tanggal?: string;
  dari?: string;
  sampai?: string;
  jam_dari?: number;
  jam_sampai?: number;
}

const jamSah = (j: number | undefined): j is number => j !== undefined && Number.isInteger(j) && j >= 0 && j <= 23;

export function susunFilterWaktu(kolom: string, f: FilterWaktu): { where: string[]; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];

  const dari = tanggalSah(f.dari) ? f.dari : tanggalSah(f.tanggal) ? f.tanggal : undefined;
  const sampai = tanggalSah(f.sampai) ? f.sampai : tanggalSah(f.tanggal) ? f.tanggal : undefined;
  if (dari) {
    where.push(`${kolom} >= ?`);
    params.push(rentangHariWIB(dari).mulai);
  }
  if (sampai) {
    where.push(`${kolom} < ?`);
    params.push(rentangHariWIB(sampai).selesai);
  }

  // The stored instant is UTC; shifting it by seven hours gives the WIB clock hour.
  const jamWib = `CAST(strftime('%H', ${kolom}, '+7 hours') AS INTEGER)`;
  if (jamSah(f.jam_dari)) {
    where.push(`${jamWib} >= ?`);
    params.push(f.jam_dari);
  }
  if (jamSah(f.jam_sampai)) {
    where.push(`${jamWib} <= ?`);
    params.push(f.jam_sampai);
  }

  return { where, params };
}

/** Reads the time filter from query-string values. */
export function bacaFilterWaktu(q: Record<string, string | undefined>): FilterWaktu {
  const jam = (v: string | undefined) => (v !== undefined && /^\d{1,2}$/.test(v) ? Number(v) : undefined);
  return {
    tanggal: q.tanggal,
    dari: q.dari,
    sampai: q.sampai,
    jam_dari: jam(q.jam_dari),
    jam_sampai: jam(q.jam_sampai),
  };
}
