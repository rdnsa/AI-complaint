import { useBahasa } from '../lib/i18n';
import type { Prioritas, StatusLaporan } from '../lib/api';

const WARNA_PRIORITAS: Record<Prioritas, string> = {
  tinggi: 'bg-red-50 text-red-800 ring-red-200',
  sedang: 'bg-amber-50 text-amber-800 ring-amber-200',
  rendah: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

const WARNA_STATUS: Record<StatusLaporan, string> = {
  baru: 'bg-bata-50 text-bata-700 ring-bata-200',
  diproses: 'bg-toska-500/10 text-toska-600 ring-toska-400/40',
  selesai: 'bg-krem-100 text-maroon-600 ring-krem-300',
};

const dasar =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset';

export function LencanaPrioritas({ nilai }: { nilai: Prioritas | null }) {
  const { t } = useBahasa();
  if (!nilai) return null;
  return <span className={`${dasar} ${WARNA_PRIORITAS[nilai]}`}>{t(`prioritas.${nilai}`)}</span>;
}

export function LencanaStatus({ nilai }: { nilai: StatusLaporan }) {
  const { t } = useBahasa();
  return <span className={`${dasar} ${WARNA_STATUS[nilai]}`}>{t(`status.${nilai}`)}</span>;
}

export function LencanaKategori({ nilai }: { nilai: string }) {
  const { t } = useBahasa();
  // Kategori di luar daftar baku tetap ditampilkan apa adanya.
  const label = t(`kategori.${nilai}` as 'kategori.lainnya');
  return (
    <span className={`${dasar} bg-krem-100 text-maroon-700 ring-krem-300`}>
      {label.startsWith('kategori.') ? nilai : label}
    </span>
  );
}
