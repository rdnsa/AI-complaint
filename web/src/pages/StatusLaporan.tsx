import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LencanaKategori, LencanaPrioritas, LencanaStatus } from '../components/Lencana';
import { api, type Laporan } from '../lib/api';

/**
 * Halaman konfirmasi untuk mahasiswa. Laporan tersimpan seketika, sedangkan
 * analisis LLM menyusul; halaman ini melakukan polling sampai hasilnya siap.
 */
export default function StatusLaporan() {
  const { id = '' } = useParams();
  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    let timer: ReturnType<typeof setTimeout>;
    let percobaan = 0;

    async function ambil() {
      try {
        const data = await api.laporan(id);
        if (batal) return;
        setLaporan(data);
        // Berhenti polling begitu analisis selesai, atau setelah ~40 detik.
        if (data.ai_status === 'pending' && percobaan++ < 20) timer = setTimeout(ambil, 2000);
      } catch (err) {
        if (!batal) setGalat(err instanceof Error ? err.message : 'Gagal memuat laporan');
      }
    }

    ambil();
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (galat) return <p className="p-8 text-center text-red-700">{galat}</p>;
  if (!laporan) return <p className="p-8 text-center text-slate-500">Memuat…</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
        <p className="font-semibold">✓ Laporan kamu sudah masuk</p>
        <p className="mt-1 text-sm">
          Petugas akan melihatnya di dashboard. Terima kasih sudah melaporkan.
        </p>
      </div>

      <div className="kartu mt-6 p-4">
        <p className="text-sm text-slate-500">{laporan.toilet_nama}</p>
        <p className="mt-1 whitespace-pre-wrap">{laporan.teks}</p>
        {laporan.foto_url && (
          <img src={laporan.foto_url} alt="Foto laporan" className="mt-3 w-full rounded-lg" />
        )}
        <div className="mt-3">
          <LencanaStatus nilai={laporan.status} />
        </div>
      </div>

      <div className="kartu mt-4 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Hasil analisis
        </h2>

        {laporan.ai_status === 'pending' && (
          <p className="mt-3 animate-pulse text-slate-500">Sedang menganalisis keluhan kamu…</p>
        )}

        {laporan.ai_status === 'gagal' && (
          <p className="mt-3 text-slate-500">
            Analisis otomatis belum berhasil, tetapi laporan kamu tetap tercatat dan akan ditinjau
            petugas.
          </p>
        )}

        {laporan.ai_status === 'ok' && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <LencanaPrioritas nilai={laporan.prioritas} />
              {laporan.kategori.map((k) => (
                <LencanaKategori key={k} nilai={k} />
              ))}
            </div>
            <p>{laporan.ringkasan}</p>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold">Tindakan untuk petugas: </span>
              {laporan.rekomendasi}
            </div>
          </div>
        )}
      </div>

      <Link to="/" className="mt-8 block text-center text-sm text-slate-500 underline">
        Kembali ke beranda
      </Link>
    </div>
  );
}
