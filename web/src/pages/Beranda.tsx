import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Toilet } from '../lib/api';

/** Halaman cadangan bila QR rusak atau tidak terbaca: pengguna memilih WC manual. */
export default function Beranda() {
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    api
      .daftarToilet()
      .then((r) => setToilets(r.data))
      .catch(() => setToilets([]))
      .finally(() => setMemuat(false));
  }, []);

  const perGedung = toilets.reduce<Record<string, Toilet[]>>((acc, t) => {
    (acc[t.gedung] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">Lapor Kondisi WC Kampus</h1>
      <p className="mt-2 text-slate-600">
        Biasanya kamu cukup memindai QR yang tertempel di pintu toilet. Kalau QR-nya hilang atau
        rusak, pilih lokasinya di bawah ini.
      </p>

      {memuat ? (
        <p className="mt-8 text-slate-500">Memuat daftar lokasi…</p>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(perGedung).map(([gedung, daftar]) => (
            <section key={gedung}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {gedung}
              </h2>
              <ul className="kartu divide-y divide-slate-100">
                {daftar.map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/lapor/${t.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                    >
                      <span>
                        Lantai {t.lantai} · <span className="capitalize">{t.jenis}</span>
                      </span>
                      <span className="text-merek-600">Lapor →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Link to="/petugas" className="mt-10 block text-center text-sm text-slate-500 underline">
        Masuk sebagai petugas
      </Link>
    </div>
  );
}
