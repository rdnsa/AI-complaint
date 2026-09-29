import { useEffect, useState } from 'react';
import Kop from '../components/Kop';
import { api, type BarisPeringkat } from '../lib/api';
import { useBahasa } from '../lib/i18n';
import { useSesi } from '../lib/sesi';

const MEDALI = ['🥇', '🥈', '🥉'];

export default function Peringkat() {
  const { t } = useBahasa();
  const { sesi } = useSesi();
  const [data, setData] = useState<BarisPeringkat[]>([]);
  const [saya, setSaya] = useState<{ peringkat: number; laporan: number } | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    api
      .peringkat()
      .then((r) => {
        setData(r.data);
        setSaya(r.saya);
      })
      .catch(() => setData([]))
      .finally(() => setMemuat(false));
  }, []);

  return (
    <div className="min-h-screen pb-16">
      <Kop judul={t('peringkat.judul')} keterangan={t('peringkat.keterangan')} />

      <main className="mx-auto max-w-2xl px-4">
        {sesi?.peran === 'pelapor' && saya && (
          <p className="mt-6 rounded-xl bg-bata-50 px-4 py-3 text-sm font-semibold text-bata-700 ring-1 ring-bata-200">
            {saya.laporan
              ? t('peringkat.posisi_saya', { peringkat: saya.peringkat, laporan: saya.laporan })
              : t('peringkat.belum_lapor')}
          </p>
        )}

        {memuat && <p className="mt-6 text-maroon-600">{t('umum.memuat')}</p>}
        {!memuat && !data.length && (
          <p className="kartu mt-6 p-10 text-center text-maroon-600">{t('peringkat.kosong')}</p>
        )}

        <ol className="mt-4 space-y-2">
          {data.map((u, i) => {
            const sayaSendiri = sesi?.id === u.id;
            return (
              <li
                key={u.id}
                className={`kartu flex items-center gap-3 p-3.5 ${
                  sayaSendiri ? 'ring-2 ring-bata-400' : ''
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                    i < 3 ? 'bg-bata-50 text-lg' : 'bg-krem-100 text-maroon-700'
                  }`}
                >
                  {MEDALI[i] ?? i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-maroon-900">{u.nama}</p>
                  <p className="text-xs text-maroon-600">
                    {t('peringkat.selesai', { n: u.selesai ?? 0 })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-bata-600">
                  {t('peringkat.laporan', { n: u.laporan })}
                </span>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
