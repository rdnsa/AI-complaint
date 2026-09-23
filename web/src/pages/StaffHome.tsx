import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Kop from '../components/Kop';
import { LencanaPrioritas, LencanaStatus } from '../components/Lencana';
import PilihPetugas from '../components/PilihPetugas';
import { api, type Gedung, type Laporan } from '../lib/api';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';
import { usePetugasTerpilih } from '../lib/petugas';

/**
 * The staff starting point when no QR is at hand: every report still waiting,
 * across campus, and a way to open any floor. The actual work happens on the
 * floor page, where the staff member is standing.
 */
export default function PetugasBeranda() {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();
  const { daftar, terpilih, pilih } = usePetugasTerpilih();
  const [terbuka, setTerbuka] = useState<Laporan[]>([]);
  const [gedung, setGedung] = useState<Gedung[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    Promise.all([
      api.laporanTerbuka().catch(() => ({ data: [] as Laporan[] })),
      api.daftarGedung().catch(() => ({ data: [] as Gedung[] })),
    ])
      .then(([l, g]) => {
        setTerbuka(l.data);
        setGedung(g.data);
      })
      .finally(() => setMemuat(false));
  }, []);

  return (
    <div className="min-h-screen pb-16">
      <Kop judul={t('petugas.judul')} keterangan={t('petugas.keterangan')} ramping />

      <main className="mx-auto max-w-lg px-4">
        <div className="mt-6">
          <PilihPetugas daftar={daftar} terpilih={terpilih} onPilih={pilih} />
        </div>

        <p className="mt-4 rounded-xl bg-krem-50 px-3.5 py-2.5 text-sm leading-relaxed text-maroon-700 ring-1 ring-krem-200">
          {t('petugas.petunjuk_qr')}
        </p>

        <h2 className="judul-bagian mt-6">
          {t('petugas.menunggu')} {!memuat && `(${terbuka.length})`}
        </h2>
        <div className="mt-2 space-y-2">
          {memuat && <p className="text-maroon-600">{t('umum.memuat')}</p>}
          {!memuat && !terbuka.length && (
            <p className="kartu p-6 text-center text-maroon-700">{t('petugas.semua_beres')}</p>
          )}
          {terbuka.map((l) => (
            <Link
              key={l.id}
              to={`/petugas/${l.gedung_kode}-${l.lantai}`}
              className="kartu flex items-center gap-3 p-3 hover:shadow-naik"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <LencanaPrioritas nilai={l.prioritas} />
                  <LencanaStatus nilai={l.status} />
                  <span className="text-xs text-maroon-600">{waktuRelatif(l.created_at)}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-maroon-900">{l.toilet_nama}</p>
                <p className="truncate text-sm text-maroon-700">{l.ringkasan ?? l.teks}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-bata-600">{t('petugas.buka')} →</span>
            </Link>
          ))}
        </div>

        <h2 className="judul-bagian mt-8">{t('beranda.pilih')}</h2>
        <div className="mt-2 space-y-3">
          {gedung.map((g) => (
            <section key={g.kode} className="kartu p-4">
              <p className="font-bold text-maroon-900">
                {t('umum.gedung', { kode: g.kode })} · {g.nama}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.lantai.map((n) => (
                  <Link
                    key={n}
                    to={`/petugas/${g.kode}-${n}`}
                    className="rounded-lg border border-krem-300 bg-krem-50 px-3.5 py-2 text-sm font-semibold text-maroon-700 transition hover:border-bata-400 hover:bg-bata-50 hover:text-bata-700"
                  >
                    {t('umum.lantai', { n })}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
