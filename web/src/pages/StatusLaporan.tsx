import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Kop from '../components/Kop';
import Lacak from '../components/Lacak';
import { LencanaKategori, LencanaPrioritas } from '../components/Lencana';
import { api, type Laporan } from '../lib/api';
import { useBahasa } from '../lib/i18n';

/**
 * Confirmation page for the reporter. The report is stored instantly while the
 * LLM analysis follows; this page polls until the result is ready.
 */
export default function StatusLaporan() {
  const { id = '' } = useParams();
  const { t } = useBahasa();
  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    let timer: ReturnType<typeof setTimeout>;
    let cepat = 0;

    async function ambil() {
      // A hidden tab does not need refreshing; it is simply checked again later.
      if (document.hidden) return jadwalkan(15_000);
      try {
        const data = await api.laporan(id);
        if (batal) return;
        setLaporan(data);
        // While the analysis runs, refresh every 2 seconds so the result appears
        // at once. After that a slow pace is enough, just to catch status changes
        // made by staff while the page stays open.
        jadwalkan(data.ai_status === 'pending' && cepat++ < 20 ? 2000 : 15_000);
      } catch {
        if (!batal) setGalat(t('status.galat_muat'));
      }
    }

    function jadwalkan(jeda: number) {
      if (!batal) timer = setTimeout(ambil, jeda);
    }

    ambil();
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [id, t]);

  return (
    <div className="min-h-screen pb-16">
      <Kop judul={t('app.judul')} ramping />

      <main className="mx-auto max-w-lg px-4">
        {galat && <p className="mt-8 text-center text-red-700">{galat}</p>}
        {!laporan && !galat && <p className="mt-10 text-center text-maroon-600">{t('umum.memuat')}</p>}

        {laporan && (
          <>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-base font-bold text-white">
                ✓
              </span>
              <div>
                <p className="font-bold text-emerald-900">{t('status.berhasil')}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-emerald-800">
                  {t('status.berhasil_isi')}
                </p>
              </div>
            </div>

            <div className="kartu mt-4 p-4">
              <p className="text-sm font-semibold text-bata-600">{laporan.toilet_nama}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-maroon-900">{laporan.teks}</p>
              {laporan.foto_url && (
                <img src={laporan.foto_url} alt="" className="mt-3 w-full rounded-xl" />
              )}
            </div>

            <Lacak laporan={laporan} />

            <div className="kartu mt-4 p-4">
              <h2 className="judul-bagian">{t('status.hasil')}</h2>

              {laporan.ai_status === 'pending' && (
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-krem-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-krem-200" />
                  <p className="pt-1 text-sm text-maroon-600">{t('status.menganalisis')}</p>
                </div>
              )}

              {laporan.ai_status === 'gagal' && (
                <p className="mt-3 text-sm leading-relaxed text-maroon-600">{t('status.gagal')}</p>
              )}

              {laporan.ai_status === 'ok' && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <LencanaPrioritas nilai={laporan.prioritas} />
                    {laporan.kategori.map((k) => (
                      <LencanaKategori key={k} nilai={k} />
                    ))}
                  </div>
                  <p className="text-maroon-900">{laporan.ringkasan}</p>
                  <div className="rounded-xl border-l-4 border-bata-400 bg-krem-50 p-3 text-sm text-maroon-700">
                    <span className="font-bold">{t('status.tindakan')} </span>
                    {laporan.rekomendasi}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {laporan && (
          <p className="mt-4 text-center text-xs leading-relaxed text-maroon-600">
            {t('status.tersimpan')}
          </p>
        )}

        <Link
          to="/"
          className="mx-auto mt-6 block w-fit text-sm font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-4 hover:text-bata-600"
        >
          {t('nav.beranda')}
        </Link>
      </main>
    </div>
  );
}
