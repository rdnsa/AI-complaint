import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, type PesanTanya } from '../lib/api';
import { useBahasa } from '../lib/i18n';
import { useSesi } from '../lib/sesi';

type Gelembung = PesanTanya;

/** Staff may ask about individual staff members; the public gets a question about totals instead. */
const CONTOH_STAF = ['tanya.contoh1', 'tanya.contoh2', 'tanya.contoh3', 'tanya.contoh4'] as const;
const CONTOH_UMUM = ['tanya.contoh1', 'tanya.contoh2', 'tanya.contoh3', 'tanya.contoh4_umum'] as const;

/** How many recent turns go back to the server with each question. */
const RIWAYAT_DIKIRIM = 6;

/**
 * Ask questions about the report data in plain language. Open to everyone on
 * the landing page; the server decides how much detail the asker may see.
 */
export default function PanelTanya({ rapat = false }: { rapat?: boolean }) {
  const { t } = useBahasa();
  const { sesi } = useSesi();
  const contoh = sesi && sesi.peran !== 'pelapor' ? CONTOH_STAF : CONTOH_UMUM;
  const [percakapan, setPercakapan] = useState<Gelembung[]>([]);
  const [teks, setTeks] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sisa, setSisa] = useState<number | null>(null);
  const ujung = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ujung.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [percakapan, sibuk]);

  async function kirim(pertanyaan: string) {
    const bersih = pertanyaan.trim();
    if (!bersih || sibuk) return;

    setGalat(null);
    setTeks('');
    setSibuk(true);
    const riwayat: PesanTanya[] = percakapan
      .slice(-RIWAYAT_DIKIRIM)
      .map(({ peran, teks }) => ({ peran, teks }));
    setPercakapan((p) => [...p, { peran: 'pengguna', teks: bersih }]);

    try {
      const jawaban = await api.tanya(bersih, riwayat);
      setPercakapan((p) => [...p, { peran: 'asisten', teks: jawaban.teks }]);
      setSisa(jawaban.sisa_hari_ini);
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : t('tanya.galat'));
      // Put the question back so it can be sent again after the error.
      setPercakapan((p) => p.slice(0, -1));
      setTeks(bersih);
    } finally {
      setSibuk(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    kirim(teks);
  }

  return (
    <div className="mt-6">
      <p className="rounded-xl bg-permukaan px-4 py-3 text-sm leading-relaxed text-maroon-700 ring-1 ring-krem-200">
        {t('tanya.keterangan')}
      </p>

      {!percakapan.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {contoh.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => kirim(t(k))}
              disabled={sibuk}
              className="tombol-netral !px-3 !py-1.5 text-xs"
            >
              {t(k)}
            </button>
          ))}
        </div>
      )}

      <section className="kartu mt-4 flex flex-col overflow-hidden">
        {(percakapan.length > 0 || sibuk || galat) && (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
          {percakapan.map((g, i) =>
            g.peran === 'pengguna' ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-maroon-800 px-4 py-2.5 text-sm text-permukaan">
                  {g.teks}
                </p>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-krem-50 px-4 py-2.5 text-sm text-maroon-900 ring-1 ring-krem-200">
                  <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-bata-600">🤖 {t('tanya.label_ai')}</p>
                  <p className="whitespace-pre-line leading-relaxed">{g.teks}</p>
                </div>
              </div>
            ),
          )}

          {sibuk && (
            <div className="flex justify-start">
              <p className="rounded-2xl rounded-bl-md bg-krem-50 px-4 py-2.5 text-sm italic text-maroon-600 ring-1 ring-krem-200">
                {t('tanya.berpikir')}
              </p>
            </div>
          )}

          {galat && (
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">
              {galat}
            </p>
          )}
          <div ref={ujung} />
        </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 bg-permukaan p-3">
          <input
            className="input flex-1"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder={t('tanya.placeholder')}
            maxLength={500}
            disabled={sibuk}
          />
          <button type="submit" disabled={sibuk || !teks.trim()} className="tombol-utama">
            {t('tanya.kirim')}
          </button>
        </form>
      </section>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-maroon-600">
        {sisa !== null ? <span>{t('tanya.sisa', { n: sisa })}</span> : <span />}
        {!!percakapan.length && (
          <button
            type="button"
            onClick={() => {
              setPercakapan([]);
              setGalat(null);
            }}
            className="underline-offset-2 hover:underline"
          >
            {t('tanya.kosongkan')}
          </button>
        )}
      </div>
    </div>
  );
}
