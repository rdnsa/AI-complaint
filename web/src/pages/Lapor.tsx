import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Toilet } from '../lib/api';

const CONTOH = [
  'WC lantai 2 bau banget, lantainya becek, sama sabunnya habis.',
  'Kloset yang pojok mampet, airnya hampir meluap.',
  'Tisu di dispenser habis.',
];

export default function Lapor() {
  const { toiletId = '' } = useParams();
  const navigate = useNavigate();

  const [toilet, setToilet] = useState<Toilet | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [teks, setTeks] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .toilet(toiletId)
      .then(setToilet)
      .catch(() => setToilet(null))
      .finally(() => setMemuat(false));
  }, [toiletId]);

  // URL pratinjau adalah object URL; dibebaskan saat foto berganti agar tidak bocor memori.
  useEffect(() => {
    if (!foto) return setPratinjau(null);
    const url = URL.createObjectURL(foto);
    setPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (teks.trim().length < 5) return setGalat('Tolong tulis keluhannya sedikit lebih jelas.');

    setMengirim(true);
    setGalat(null);
    try {
      // Foto diunggah lebih dulu supaya laporan tersimpan dengan referensi yang sudah pasti ada.
      const foto_key = foto ? (await api.unggahFoto(foto)).key : null;
      const hasil = await api.kirimLaporan({ toilet_id: toiletId, teks: teks.trim(), foto_key });
      navigate(`/laporan/${hasil.id}`, { replace: true });
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Gagal mengirim laporan');
      setMengirim(false);
    }
  }

  if (memuat) return <p className="p-8 text-center text-slate-500">Memuat…</p>;

  if (!toilet) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Kode WC tidak dikenal</h1>
        <p className="mt-2 text-slate-600">
          QR yang kamu pindai (<code className="rounded bg-slate-200 px-1">{toiletId}</code>) tidak
          terdaftar. Coba pilih lokasi secara manual.
        </p>
        <a href="/" className="tombol-utama mt-6">
          Pilih lokasi
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-32">
      <p className="text-sm font-medium text-merek-600">{toilet.gedung}</p>
      <h1 className="text-2xl font-bold">{toilet.nama}</h1>
      <p className="mt-2 text-slate-600">
        Tulis apa adanya, pakai bahasa sehari-hari. Sistem yang akan merapikan dan menentukan
        prioritasnya.
      </p>

      <form onSubmit={kirim} className="mt-6 space-y-5">
        <div>
          <label htmlFor="teks" className="label">
            Apa yang bermasalah?
          </label>
          <textarea
            id="teks"
            className="input min-h-[130px] resize-y"
            placeholder="Contoh: WC lantai 2 bau banget, lantainya becek, sama sabunnya habis."
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            maxLength={1000}
            autoFocus
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CONTOH.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setTeks(c)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                {c.length > 34 ? `${c.slice(0, 34)}…` : c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Foto (opsional)</span>
          <input
            ref={inputFoto}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 5 * 1024 * 1024) {
                setGalat('Ukuran foto maksimal 5 MB.');
                return;
              }
              setGalat(null);
              setFoto(f);
            }}
          />
          {pratinjau ? (
            <div className="relative">
              <img src={pratinjau} alt="Pratinjau foto" className="w-full rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setFoto(null);
                  if (inputFoto.current) inputFoto.current.value = '';
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
              >
                Hapus
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => inputFoto.current?.click()} className="tombol-netral w-full">
              📷 Ambil / pilih foto
            </button>
          )}
        </div>

        {galat && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {galat}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4">
          <div className="mx-auto max-w-lg">
            <button type="submit" disabled={mengirim} className="tombol-utama w-full">
              {mengirim ? 'Mengirim…' : 'Kirim laporan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
