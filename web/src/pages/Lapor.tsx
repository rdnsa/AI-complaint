import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Kop from '../components/Kop';
import { api, type Jenis, type Lokasi } from '../lib/api';
import { useBahasa } from '../lib/i18n';
import { useSesi } from '../lib/sesi';

const IKON: Record<Jenis, string> = { pria: '♂', wanita: '♀', disabilitas: '♿' };

export default function Lapor() {
  const { lokasiId = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useBahasa();
  const { sesi } = useSesi();

  const [lokasi, setLokasi] = useState<Lokasi | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [toiletId, setToiletId] = useState<string>('');
  const [teks, setTeks] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .lokasi(lokasiId)
      .then((l) => {
        setLokasi(l);
        // When a floor has only one toilet, there is nothing to choose.
        if (l.toilets.length === 1) setToiletId(l.toilets[0].id);
      })
      .catch(() => setLokasi(null))
      .finally(() => setMemuat(false));
  }, [lokasiId]);

  // The preview is an object URL; released when the photo changes so memory is not leaked.
  useEffect(() => {
    if (!foto) return setPratinjau(null);
    const url = URL.createObjectURL(foto);
    setPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (teks.trim().length < 5) return setGalat(t('lapor.galat_pendek'));
    if (!foto) return setGalat(t('lapor.foto_alasan'));

    setMengirim(true);
    setGalat(null);
    try {
  // The photo is uploaded first, so the report is stored with a reference that already exists.
      const foto_key = (await api.unggahFoto(foto)).key;
      const hasil = await api.kirimLaporan({ toilet_id: toiletId, teks: teks.trim(), foto_key });
      navigate(`/laporan/${hasil.id}`, { replace: true });
    } catch (err) {
      setGalat(err instanceof Error ? err.message : t('lapor.galat_kirim'));
      setMengirim(false);
    }
  }

  if (memuat) {
    return (
      <div className="min-h-screen">
        <Kop judul={t('app.judul')} ramping />
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
            <code className="rounded-lg bg-krem-200 px-2 py-1 text-sm text-maroon-800">
              {lokasiId}
            </code>
          </p>
          <Link to="/" className="tombol-utama mt-6">
            {t('lapor.pilih_manual')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36">
      <Kop
        judul={t('umum.gedung', { kode: lokasi.gedung_kode })}
        keterangan={lokasi.gedung_nama}
        ramping
      />

      <main className="mx-auto max-w-lg px-4">
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-maroon-900">
          {t('umum.lantai', { n: lokasi.lantai })}
        </h2>

        <div className="mt-4">
          <span className="label">{t('lapor.pilih_jenis')}</span>
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

        {/* Melapor tanpa akun tetap boleh; keterangan ini hanya menjelaskan
            konsekuensinya terhadap papan peringkat. */}
        <p className="mt-5 rounded-xl bg-krem-50 px-3.5 py-2.5 text-sm text-maroon-700 ring-1 ring-krem-200">
          {sesi?.peran === 'pelapor' ? (
            t('sesi.sebagai', { nama: sesi.nama })
          ) : (
            <>
              {t('sesi.anonim_info')}{' '}
              <Link to="/masuk" className="font-semibold text-bata-600 underline underline-offset-2">
                {t('sesi.masuk')}
              </Link>
            </>
          )}
        </p>

        <p className="mt-4 leading-relaxed text-maroon-700">{t('lapor.ajakan')}</p>

        <form onSubmit={kirim} className="mt-5 space-y-5">
          <div>
            <label htmlFor="teks" className="label">
              {t('lapor.label_teks')}
            </label>
            <textarea
              id="teks"
              className="input min-h-[140px] resize-y"
              placeholder={t('lapor.placeholder')}
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              maxLength={1000}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([t('lapor.contoh1'), t('lapor.contoh2'), t('lapor.contoh3')] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTeks(c)}
                  className="rounded-full border border-krem-200 bg-white px-3 py-1 text-xs text-maroon-600 transition hover:border-bata-300 hover:text-bata-700"
                >
                  {c.length > 36 ? `${c.slice(0, 36)}…` : c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">{t('lapor.foto')}</span>
            <p className="-mt-1 mb-2 text-xs leading-relaxed text-maroon-600">
              {t('lapor.foto_alasan')}
            </p>
            <input
              ref={inputFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 5 * 1024 * 1024) return setGalat(t('lapor.galat_foto'));
                setGalat(null);
                setFoto(f);
              }}
            />
            {pratinjau ? (
              <div className="relative overflow-hidden rounded-xl">
                <img src={pratinjau} alt="" className="w-full" />
                <button
                  type="button"
                  onClick={() => {
                    setFoto(null);
                    if (inputFoto.current) inputFoto.current.value = '';
                  }}
                  className="absolute right-2 top-2 rounded-lg bg-maroon-900/75 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  {t('lapor.hapus_foto')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputFoto.current?.click()}
                className="tombol-netral w-full border-dashed py-3.5"
              >
                📷 {t('lapor.ambil_foto')}
              </button>
            )}
          </div>

          {galat && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800" role="alert">
              {galat}
            </p>
          )}

          <div className="fixed inset-x-0 bottom-0 border-t border-krem-200 bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-lg">
              <button
                type="submit"
                disabled={mengirim || !toiletId || !foto}
                className="tombol-utama w-full py-3.5 text-base"
              >
                {mengirim ? t('lapor.mengirim') : t('lapor.kirim')}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
