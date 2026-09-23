import { useCallback, useEffect, useState } from 'react';
import { api, type Aktivitas } from '../lib/api';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';

const AKSI = [
  'lapor',
  'kerja',
  'status',
  'bukti_ditolak',
  'hapus',
  'analisis',
  'analisis_gagal',
  'verifikasi_gagal',
  'masuk',
  'ringkasan',
  'tanya',
] as const;

const WARNA: Record<string, string> = {
  lapor: 'bg-bata-50 text-bata-700 ring-bata-200',
  kerja: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  status: 'bg-toska-500/10 text-toska-600 ring-toska-400/40',
  hapus: 'bg-red-50 text-red-800 ring-red-200',
  analisis: 'bg-krem-100 text-maroon-700 ring-krem-300',
  analisis_gagal: 'bg-amber-50 text-amber-800 ring-amber-200',
  bukti_ditolak: 'bg-amber-50 text-amber-800 ring-amber-200',
  verifikasi_gagal: 'bg-amber-50 text-amber-800 ring-amber-200',
  masuk: 'bg-krem-100 text-maroon-700 ring-krem-300',
  ringkasan: 'bg-krem-100 text-maroon-700 ring-krem-300',
  tanya: 'bg-krem-100 text-maroon-700 ring-krem-300',
};

export default function PanelAktivitas() {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();
  const [data, setData] = useState<Aktivitas[]>([]);
  const [aksi, setAksi] = useState('');
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    try {
      setData((await api.aktivitas(aksi ? { aksi } : {})).data);
    } catch {
      setData([]);
    } finally {
      setMemuat(false);
    }
  }, [aksi]);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <div className="mt-6">
      <p className="rounded-xl bg-permukaan px-4 py-3 text-sm leading-relaxed text-maroon-700 ring-1 ring-krem-200">
        {t('aktivitas.keterangan')}
      </p>

      <select
        className="input mt-4 !w-auto !py-2"
        value={aksi}
        onChange={(e) => setAksi(e.target.value)}
      >
        <option value="">{t('aktivitas.semua')}</option>
        {AKSI.map((a) => (
          <option key={a} value={a}>
            {t(`aksi.${a}`)}
          </option>
        ))}
      </select>

      <ol className="mt-4 space-y-2">
        {memuat && <p className="text-maroon-600">{t('umum.memuat')}</p>}
        {!memuat && !data.length && (
          <p className="kartu p-10 text-center text-maroon-600">{t('aktivitas.kosong')}</p>
        )}

        {data.map((a) => (
          <li key={a.id} className="kartu p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
                  WARNA[a.aksi] ?? WARNA.analisis
                }`}
              >
                {t(`aksi.${a.aksi}`)}
              </span>
              <span className="text-sm font-semibold text-maroon-900">{a.pelaku}</span>
              <span className="ml-auto text-xs text-maroon-600">{waktuRelatif(a.waktu)}</span>
            </div>

            <p className="mt-1.5 text-sm text-maroon-800">{a.ringkas}</p>

            {/* Penghapusan adalah satu-satunya tindakan yang menghilangkan data,
                jadi salinannya dibentangkan langsung tanpa perlu diklik. */}
            {a.aksi === 'hapus' && a.rincian && (
              <div className="mt-2 rounded-xl border-l-4 border-red-400 bg-red-50/60 p-3 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-red-800">
                  {t('aktivitas.isi_dihapus')}
                </p>
                <p className="mt-1 italic text-maroon-800">“{String(a.rincian.teks ?? '')}”</p>
                <p className="mt-1 text-xs text-maroon-600">
                  {String(a.rincian.toilet_nama ?? '')} · {String(a.rincian.status ?? '')} ·{' '}
                  {String(a.rincian.dibuat ?? '')}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
