import type { Prioritas, StatusLaporan } from '../lib/api';

const WARNA_PRIORITAS: Record<Prioritas, string> = {
  tinggi: 'bg-red-100 text-red-800 ring-red-200',
  sedang: 'bg-amber-100 text-amber-800 ring-amber-200',
  rendah: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
};

const WARNA_STATUS: Record<StatusLaporan, string> = {
  baru: 'bg-merek-100 text-merek-700 ring-merek-200',
  diproses: 'bg-violet-100 text-violet-800 ring-violet-200',
  selesai: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const dasar = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';

export function LencanaPrioritas({ nilai }: { nilai: Prioritas | null }) {
  if (!nilai) return null;
  return <span className={`${dasar} ${WARNA_PRIORITAS[nilai]}`}>Prioritas {nilai}</span>;
}

export function LencanaStatus({ nilai }: { nilai: StatusLaporan }) {
  return <span className={`${dasar} ${WARNA_STATUS[nilai]}`}>{nilai}</span>;
}

export function LencanaKategori({ nilai }: { nilai: string }) {
  return <span className={`${dasar} bg-slate-100 text-slate-700 ring-slate-200`}>{nilai}</span>;
}
