import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Kamera from '../components/Kamera';
import Kop from '../components/Kop';
import { LencanaKategori, LencanaPrioritas, LencanaStatus } from '../components/Lencana';
import PilihPetugas from '../components/PilihPetugas';
import SaklarPeran from '../components/SaklarPeran';
import {
  api,
  ApiError,
  type HasilBukti,
  type Jenis,
  type Laporan,
  type Lokasi,
  type PetugasPilihan,
} from '../lib/api';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';
import { usePetugasTerpilih } from '../lib/petugas';

const IKON: Record<Jenis, string> = { pria: '♂', wanita: '♀', disabilitas: '♿' };

type Penolakan = { hasil: HasilBukti | null; alasan: string | null };

/** The vision verdict carried by a 422, or a plain failure otherwise. */
function penolakanDari(err: unknown): Penolakan {
  if (err instanceof ApiError && err.status === 422) {
    return {
      hasil: (err.data.hasil as HasilBukti | undefined) ?? 'kotor',
      alasan: (err.data.alasan as string | undefined) ?? null,
    };
  }
  return { hasil: null, alasan: err instanceof Error ? err.message : null };
}

/**
 * The staff side of a floor QR: no sign-in, just "who are you?" and then the
 * two jobs a cleaner has on this floor — finish the student reports waiting
 * here, and record the toilets cleaned on the regular round. Every photo comes
 * from the live camera and is judged by the vision model before it counts.
 */
export default function PetugasLantai() {
  const { lokasiId = '' } = useParams();
  const { t } = useBahasa();
  const { daftar, terpilih, pilih, memuat: memuatPetugas } = usePetugasTerpilih();

  const [lokasi, setLokasi] = useState<Lokasi | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [terbuka, setTerbuka] = useState<Laporan[]>([]);
  const [tab, setTab] = useState<'laporan' | 'kerja' | null>(null);

  const muatTerbuka = useCallback(async (l: Lokasi) => {
    const r = await api
      .laporanTerbuka({ gedung: l.gedung_kode, lantai: l.lantai })
      .catch(() => ({ data: [] as Laporan[] }));
    setTerbuka(r.data);
    return r.data;
  }, []);

  useEffect(() => {
    api
      .lokasi(lokasiId)
      .then(async (l) => {
        setLokasi(l);
        // Open on the student reports when some are waiting here; otherwise on the round.
        const data = await muatTerbuka(l);
        setTab((sekarang) => sekarang ?? (data.length ? 'laporan' : 'kerja'));
      })
      .catch(() => setLokasi(null))
      .finally(() => setMemuat(false));
  }, [lokasiId, muatTerbuka]);

  if (memuat || memuatPetugas) {
    return (
      <div className="min-h-screen">
        <Kop judul={t('petugas.judul')} ramping />
        <p className="p-10 text-center text-maroon-600">{t('umum.memuat')}</p>
      </div>
    );
  }

  if (!lokasi) {
    return (
      <div className="min-h-screen">
        <Kop judul={t('lapor.tidak_dikenal')} ramping />
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          <p className="text-maroon-700">{t('lapor.tidak_dikenal_isi')}</p>
          <p className="mt-2">
            <code className="rounded-lg bg-krem-200 px-2 py-1 text-sm text-maroon-800">{lokasiId}</code>
          </p>
          <Link to="/petugas" className="tombol-utama mt-6">
            {t('lapor.pilih_manual')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <Kop
        judul={t('umum.gedung', { kode: lokasi.gedung_kode })}
        keterangan={lokasi.gedung_nama}
        ramping
      />

      <main className="mx-auto max-w-lg px-4">
        <SaklarPeran lokasiId={lokasiId} aktif="petugas" />

        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-maroon-900">
          {t('umum.lantai', { n: lokasi.lantai })}
        </h2>

        <div className="mt-4">
          <PilihPetugas daftar={daftar} terpilih={terpilih} onPilih={pilih} />
        </div>

        {terpilih && (
          <>
            <nav className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTab('laporan')}
                aria-pressed={tab === 'laporan'}
                className={tab === 'laporan' ? 'pilihan-hidup !py-3' : 'pilihan-mati !py-3'}
              >
                <span aria-hidden className="text-xl leading-none">
                  📋
                </span>
                <span>
                  {t('petugas.tab_laporan')}
                  {!!terbuka.length && (
                    <span className="ml-1.5 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                      {terbuka.length}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('kerja')}
                aria-pressed={tab === 'kerja'}
                className={tab === 'kerja' ? 'pilihan-hidup !py-3' : 'pilihan-mati !py-3'}
              >
                <span aria-hidden className="text-xl leading-none">
                  🧹
                </span>
                {t('petugas.tab_kerja')}
              </button>
            </nav>

            {tab === 'laporan' && (
              <section className="mt-4 space-y-3">
                {!terbuka.length && (
                  <p className="kartu p-8 text-center text-maroon-700">{t('petugas.tidak_ada_laporan')}</p>
                )}
                {terbuka.map((l) => (
                  <KartuTugas
                    key={l.id}
                    laporan={l}
                    petugas={terpilih}
                    onBerubah={() => muatTerbuka(lokasi)}
                  />
                ))}
              </section>
            )}

            {tab === 'kerja' && <FormPekerjaan lokasi={lokasi} petugas={terpilih} />}
          </>
        )}
      </main>
    </div>
  );
}

/** One student report the staff member can take on and close with a proof photo. */
function KartuTugas({
  laporan: l,
  petugas,
  onBerubah,
}: {
  laporan: Laporan;
  petugas: PetugasPilihan;
  onBerubah: () => void;
}) {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();
  const [kamera, setKamera] = useState(false);
  const [tahap, setTahap] = useState<'diam' | 'mengunggah' | 'memeriksa'>('diam');
  const [penolakan, setPenolakan] = useState<Penolakan | null>(null);
  const [selesai, setSelesai] = useState(false);

  async function kerjakan() {
    await api.ubahStatus(l.id, 'diproses', { petugas_id: petugas.id }).catch(() => {});
    onBerubah();
  }

  async function selesaikan(foto: File) {
    setPenolakan(null);
    setTahap('mengunggah');
    try {
      const { key } = await api.unggahFoto(foto, 'bukti');
      setTahap('memeriksa');
      await api.ubahStatus(l.id, 'selesai', { petugas_id: petugas.id, foto_selesai_key: key });
      setSelesai(true);
      // Leave the success visible for a moment before the card drops off the list.
      setTimeout(onBerubah, 2500);
    } catch (err) {
      setPenolakan(penolakanDari(err));
    } finally {
      setTahap('diam');
    }
  }

  const tepi =
    l.prioritas === 'tinggi'
      ? 'border-l-4 border-l-red-500'
      : l.prioritas === 'sedang'
        ? 'border-l-4 border-l-amber-400'
        : 'border-l-4 border-l-emerald-400';

  if (selesai) {
    return (
      <article className="kartu border-l-4 border-l-emerald-500 bg-emerald-50 p-4 text-emerald-900">
        <p className="font-bold">✅ {t('petugas.laporan_selesai')}</p>
        <p className="mt-0.5 text-sm">{l.toilet_nama}</p>
      </article>
    );
  }

  const sibuk = tahap !== 'diam';

  return (
    <article className={`kartu p-4 ${tepi}`}>
      <div className="flex flex-wrap items-center gap-2">
        <LencanaPrioritas nilai={l.prioritas} />
        <LencanaStatus nilai={l.status} />
        {l.kategori.map((k) => (
          <LencanaKategori key={k} nilai={k} />
        ))}
        <span className="ml-auto text-xs text-maroon-600">{waktuRelatif(l.created_at)}</span>
      </div>

      <p className="mt-2.5 font-bold text-maroon-900">{l.toilet_nama}</p>
      <p className="mt-1 text-maroon-800">{l.ringkasan ?? l.teks}</p>
      {l.ringkasan && (
        <p className="mt-1 text-sm italic text-maroon-600">
          {t('dash.laporan_asli')}: “{l.teks}”
        </p>
      )}
      {l.rekomendasi && (
        <p className="mt-2.5 rounded-xl border-l-4 border-bata-400 bg-krem-50 p-3 text-sm text-maroon-700">
          <span className="font-bold">{t('dash.tindakan')} </span>
          {l.rekomendasi}
        </p>
      )}
      {l.foto_url && (
        <a href={l.foto_url} target="_blank" rel="noreferrer" className="mt-3 block">
          <img src={l.foto_url} alt="" className="max-h-56 rounded-xl" />
        </a>
      )}

      {penolakan && <KotakPenolakan penolakan={penolakan} />}

      <Kamera buka={kamera} onTutup={() => setKamera(false)} onAmbil={selesaikan} />
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setKamera(true)}
          disabled={sibuk}
          className="tombol-utama w-full py-3 text-base"
        >
          {tahap === 'mengunggah'
            ? t('dash.mengunggah')
            : tahap === 'memeriksa'
              ? t('dash.memeriksa')
              : `📷 ${t('petugas.selesaikan')}`}
        </button>
        {l.status === 'baru' && (
          <button type="button" onClick={kerjakan} disabled={sibuk} className="tombol-netral w-full py-2.5">
            {t('petugas.kerjakan')}
          </button>
        )}
        {l.status === 'diproses' && l.petugas && (
          <p className="text-center text-xs text-maroon-600">{t('dash.ditangani', { nama: l.petugas })}</p>
        )}
      </div>
    </article>
  );
}

function KotakPenolakan({ penolakan }: { penolakan: Penolakan }) {
  const { t } = useBahasa();
  return (
    <div role="alert" className="mt-3 rounded-xl border-l-4 border-red-400 bg-red-50/70 p-3 text-sm text-red-900">
      <p className="font-bold">{penolakan.hasil ? t('dash.bukti_ditolak') : t('dash.verifikasi_gagal')}</p>
      {penolakan.hasil && (
        <p className="mt-0.5">
          {penolakan.hasil === 'bukan_toilet'
            ? t('dash.bukti_ditolak_bukan_toilet')
            : t('dash.bukti_ditolak_kotor')}
        </p>
      )}
      {penolakan.alasan && (
        <p className="mt-1 text-xs italic text-red-800">
          {penolakan.hasil ? `${t('dash.alasan_ai')}: ` : ''}
          {penolakan.alasan}
        </p>
      )}
    </div>
  );
}

/** The regular round: "I cleaned this toilet", with a photo of the result. */
function FormPekerjaan({ lokasi, petugas }: { lokasi: Lokasi; petugas: PetugasPilihan }) {
  const { t } = useBahasa();
  const [toiletId, setToiletId] = useState(lokasi.toilets.length === 1 ? lokasi.toilets[0].id : '');
  const [teks, setTeks] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [kamera, setKamera] = useState(false);
  const [tahap, setTahap] = useState<'diam' | 'mengunggah' | 'memeriksa'>('diam');
  const [galat, setGalat] = useState<string | null>(null);
  const [penolakan, setPenolakan] = useState<Penolakan | null>(null);
  const [terkirim, setTerkirim] = useState<{ toilet: string; alasan: string | null } | null>(null);

  useEffect(() => {
    if (!foto) return setPratinjau(null);
    const url = URL.createObjectURL(foto);
    setPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (teks.trim().length < 5) return setGalat(t('kerja.galat_pendek'));
    if (!foto) return setGalat(t('kerja.foto_alasan'));

    setGalat(null);
    setPenolakan(null);
    setTahap('mengunggah');
    try {
      const foto_key = (await api.unggahFoto(foto, 'kerja')).key;
      setTahap('memeriksa');
      const hasil = await api.kirimPekerjaan({
        petugas_id: petugas.id,
        toilet_id: toiletId,
        teks: teks.trim(),
        foto_key,
      });
      setTerkirim({ toilet: hasil.toilet, alasan: hasil.verifikasi?.alasan ?? null });
    } catch (err) {
      // A rejected or unchecked photo has already been deleted server-side; take a new one.
      if (err instanceof ApiError && (err.status === 422 || err.status >= 500)) setFoto(null);
      if (err instanceof ApiError && err.status === 422) setPenolakan(penolakanDari(err));
      else setGalat(err instanceof Error ? err.message : t('kerja.galat_kirim'));
    } finally {
      setTahap('diam');
    }
  }

  function ulangi() {
    setTerkirim(null);
    setTeks('');
    setFoto(null);
    if (lokasi.toilets.length > 1) setToiletId('');
  }

  if (terkirim) {
    return (
      <section className="kartu mt-4 p-6 text-center">
        <p className="text-5xl" aria-hidden>
          ✅
        </p>
        <h3 className="mt-3 text-xl font-extrabold tracking-tight text-maroon-900">{t('kerja.terkirim')}</h3>
        <p className="mt-1 text-maroon-700">{terkirim.toilet}</p>
        {terkirim.alasan && (
          <p className="mt-2 text-sm italic text-maroon-600">
            {t('dash.alasan_ai')}: {terkirim.alasan}
          </p>
        )}
        <button type="button" onClick={ulangi} className="tombol-utama mt-6 w-full py-3">
          {t('kerja.lapor_lagi')}
        </button>
      </section>
    );
  }

  const sibuk = tahap !== 'diam';

  return (
    <form onSubmit={kirim} className="mt-4 space-y-5">
      <div>
        <span className="label">{t('kerja.pilih_jenis')}</span>
        <div className="flex gap-2">
          {lokasi.toilets.map((wc) => (
            <button
              key={wc.id}
              type="button"
              onClick={() => setToiletId(wc.id)}
              aria-pressed={toiletId === wc.id}
              className={toiletId === wc.id ? 'pilihan-hidup' : 'pilihan-mati'}
            >
              <span aria-hidden className="text-xl leading-none">
                {IKON[wc.jenis]}
              </span>
              {t(`jenis.${wc.jenis}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="teks" className="label">
          {t('kerja.label_teks')}
        </label>
        <textarea
          id="teks"
          className="input min-h-[110px] resize-y"
          placeholder={t('kerja.placeholder')}
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          maxLength={1000}
        />
        {/* Ready-made sentences: a tap is easier than typing for most staff. */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([t('kerja.contoh1'), t('kerja.contoh2'), t('kerja.contoh3')] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTeks(c)}
              className="rounded-full border border-krem-200 bg-permukaan px-3 py-1.5 text-sm text-maroon-700 transition hover:border-bata-300 hover:text-bata-700"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">{t('kerja.foto')}</span>
        <p className="-mt-1 mb-2 text-xs leading-relaxed text-maroon-600">{t('kerja.foto_alasan')}</p>
        <Kamera
          buka={kamera}
          onTutup={() => setKamera(false)}
          onAmbil={(f) => {
            setGalat(null);
            setPenolakan(null);
            setFoto(f);
          }}
        />
        {pratinjau ? (
          <div className="relative overflow-hidden rounded-xl">
            <img src={pratinjau} alt="" className="w-full" />
            <button
              type="button"
              onClick={() => setFoto(null)}
              disabled={sibuk}
              className="absolute right-2 top-2 rounded-lg bg-tetap-maroon/75 px-3 py-1.5 text-sm font-semibold text-white"
            >
              {t('lapor.hapus_foto')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setKamera(true)}
            className="tombol-netral w-full border-dashed py-3.5"
          >
            📷 {t('lapor.ambil_foto')}
          </button>
        )}
      </div>

      {penolakan && <KotakPenolakan penolakan={penolakan} />}
      {galat && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800" role="alert">
          {galat}
        </p>
      )}

      <button
        type="submit"
        disabled={sibuk || !toiletId || !foto}
        className="tombol-utama w-full py-3.5 text-base"
      >
        {tahap === 'mengunggah'
          ? t('dash.mengunggah')
          : tahap === 'memeriksa'
            ? t('dash.memeriksa')
            : t('kerja.kirim')}
      </button>
    </form>
  );
}
