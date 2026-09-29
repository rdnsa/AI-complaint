import { LencanaStatus } from './Lencana';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';
import type { Laporan } from '../lib/api';

/**
 * Garis waktu tiga langkah: diterima → dikerjakan → selesai.
 *
 * Pelapor tidak punya akun, jadi inilah satu-satunya cara ia melihat sejauh
 * mana keluhannya ditangani. Karena itu langkah yang belum tercapai tetap
 * ditampilkan, bukan disembunyikan — supaya jelas masih ada tahap berikutnya.
 */
export default function Lacak({ laporan }: { laporan: Laporan }) {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();

  const urutan = { baru: 0, diproses: 1, selesai: 2 }[laporan.status];

  const langkah = [
    { label: t('lacak.diterima'), catatan: waktuRelatif(laporan.created_at) },
    {
      label: urutan >= 1 ? t('lacak.dikerjakan') : t('lacak.menunggu'),
      catatan: urutan >= 1 && laporan.petugas ? t('lacak.oleh', { nama: laporan.petugas }) : '',
    },
    {
      label: t('lacak.selesai'),
      catatan: laporan.selesai_at ? waktuRelatif(laporan.selesai_at) : '',
    },
  ];

  return (
    <div className="kartu mt-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="judul-bagian">{t('lacak.judul')}</h2>
        <LencanaStatus nilai={laporan.status} />
      </div>

      <ol className="mt-4">
        {langkah.map((l, i) => {
          const tercapai = i <= urutan;
          const terakhir = i === langkah.length - 1;
          return (
            <li key={l.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ring-2 ${
                    tercapai
                      ? 'bg-bata-500 text-white ring-bata-200'
                      : 'bg-white text-krem-300 ring-krem-200'
                  }`}
                >
                  {tercapai ? '✓' : i + 1}
                </span>
                {!terakhir && (
                  <span className={`w-0.5 flex-1 ${i < urutan ? 'bg-bata-400' : 'bg-krem-200'}`} />
                )}
              </div>
              <div className={`pb-5 ${terakhir ? 'pb-0' : ''}`}>
                <p className={`text-sm font-semibold ${tercapai ? 'text-maroon-900' : 'text-maroon-600/60'}`}>
                  {l.label}
                </p>
                {l.catatan && <p className="text-xs text-maroon-600">{l.catatan}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-1 text-xs text-maroon-600/70">{t('lacak.otomatis')}</p>
    </div>
  );
}
