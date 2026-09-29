import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Kop from '../components/Kop';
import { LencanaStatus } from '../components/Lencana';
import { api, type Gedung, type LaporanRingkas } from '../lib/api';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';
import { ambilRiwayat, hapusRiwayat } from '../lib/riwayat';
import { useSesi } from '../lib/sesi';

function BarisRiwayat({ laporan }: { laporan: LaporanRingkas }) {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();

  return (
    <Link to={`/laporan/${laporan.id}`} className="kartu flex items-center gap-3 p-3 hover:shadow-naik">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <LencanaStatus nilai={laporan.status} />
          <span className="text-xs text-maroon-600">{waktuRelatif(laporan.created_at)}</span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-maroon-900">{laporan.toilet_nama}</p>
        <p className="truncate text-sm text-maroon-700">{laporan.ringkasan ?? laporan.teks}</p>
      </div>
      <span className="shrink-0 text-sm font-bold text-bata-600">{t('riwayat.lihat')} →</span>
    </Link>
  );
}

export default function Beranda() {
  const { t } = useBahasa();
  const { sesi, keluar } = useSesi();
  const [gedung, setGedung] = useState<Gedung[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [riwayat, setRiwayat] = useState<LaporanRingkas[]>([]);

  useEffect(() => {
    api
      .daftarGedung()
      .then((r) => setGedung(r.data))
      .catch(() => setGedung([]))
      .finally(() => setMemuat(false));
  }, []);

  // Status laporan sendiri diambil ulang tiap halaman depan dibuka, sehingga
  // pelapor melihat perkembangan terbaru tanpa perlu menyimpan tautannya.
  useEffect(() => {
    const jejak = ambilRiwayat();
    if (!jejak.length) return;
    api
      .ringkasLaporan(jejak.map((j) => j.id))
      .then((r) => setRiwayat(r.data))
      .catch(() => setRiwayat([]));
  }, []);

  return (
    <div className="min-h-screen pb-16">
      <Kop judul={t('app.judul')} keterangan={t('app.subjudul')} />

      <main className="mx-auto max-w-5xl px-4">
        {!!riwayat.length && (
          <section className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="judul-bagian">{t('riwayat.judul')}</h2>
              <button
                onClick={() => {
                  hapusRiwayat();
                  setRiwayat([]);
                }}
                className="text-xs font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-2 hover:text-bata-600"
              >
                {t('riwayat.hapus')}
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {riwayat.map((l) => (
                <BarisRiwayat key={l.id} laporan={l} />
              ))}
            </div>
            <p className="mt-2 text-xs text-maroon-600/70">{t('riwayat.keterangan')}</p>
          </section>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-krem-200">
          {sesi ? (
            <>
              <span className="font-semibold text-maroon-900">
                {t('sesi.halo', { nama: sesi.nama })}
              </span>
              <button
                onClick={keluar}
                className="ml-auto text-sm font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-4 hover:text-bata-600"
              >
                {t('sesi.keluar')}
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-maroon-700">{t('daftar.keterangan')}</span>
              <span className="ml-auto flex gap-2">
                <Link to="/masuk" className="tombol-netral !py-1.5 text-xs">
                  {t('sesi.masuk')}
                </Link>
                <Link to="/daftar" className="tombol-utama !py-1.5 text-xs">
                  {t('sesi.daftar')}
                </Link>
              </span>
            </>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link to="/laporan" className="kartu flex items-center justify-between gap-3 p-4 hover:shadow-naik">
            <span className="font-semibold text-maroon-900">{t('nav.semua_laporan')}</span>
            <span className="shrink-0 font-bold text-bata-600">→</span>
          </Link>
          <Link to="/peringkat" className="kartu flex items-center justify-between gap-3 p-4 hover:shadow-naik">
            <span className="font-semibold text-maroon-900">🏆 {t('peringkat.lihat')}</span>
            <span className="shrink-0 font-bold text-bata-600">→</span>
          </Link>
        </div>

        <p className="mt-6 leading-relaxed text-maroon-700">{t('beranda.petunjuk')}</p>

        <figure className="kartu mt-5 overflow-hidden">
          <a href="/peta-lokasi-gedung.jpg" target="_blank" rel="noreferrer" className="block">
            <img
              src="/peta-lokasi-gedung.jpg"
              alt={t('beranda.peta_alt')}
              className="w-full"
              loading="lazy"
            />
          </a>
          <figcaption className="flex items-center justify-between gap-3 border-t border-krem-200 bg-krem-50 px-4 py-2.5 text-xs text-maroon-600">
            <span>{t('beranda.peta_keterangan')}</span>
            <span className="shrink-0 font-bold text-bata-600">{t('beranda.peta_perbesar')}</span>
          </figcaption>
        </figure>

        <h2 className="judul-bagian mt-8">{t('beranda.pilih')}</h2>

        {memuat ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="kartu h-28 animate-pulse bg-krem-50" />
            ))}
          </div>
        ) : !gedung.length ? (
          <p className="kartu mt-3 p-8 text-center text-maroon-600">{t('beranda.kosong')}</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {gedung.map((g) => (
              <section key={g.kode} className="kartu p-4 transition hover:shadow-naik">
                <div className="flex items-center gap-3">
                  {/* Lingkaran kode gedung meniru penanda pada poster peta kampus. */}
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-maroon-800 bg-bata-500 text-base font-extrabold text-white">
                    {g.kode}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-bata-600">
                      {t('umum.gedung', { kode: g.kode })}
                    </p>
                    <p className="truncate font-bold text-maroon-900">{g.nama}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {g.lantai.map((l) => (
                    <Link
                      key={l}
                      to={`/lapor/${g.kode}-${l}`}
                      className="rounded-lg border border-krem-300 bg-krem-50 px-3 py-1.5 text-sm font-semibold text-maroon-700 transition hover:border-bata-400 hover:bg-bata-50 hover:text-bata-700"
                    >
                      {t('umum.lantai', { n: l })}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <Link
          to="/petugas"
          className="mx-auto mt-10 block w-fit text-sm font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-4 hover:text-bata-600"
        >
          {t('nav.petugas')}
        </Link>
      </main>
    </div>
  );
}
