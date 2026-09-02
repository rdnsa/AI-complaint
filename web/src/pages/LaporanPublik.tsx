import { useCallback, useEffect, useState } from 'react';
import Kop from '../components/Kop';
import { LencanaKategori, LencanaPrioritas, LencanaStatus } from '../components/Lencana';
import { api, type LaporanPublik as Laporan } from '../lib/api';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';

/**
 * Papan laporan terbuka.
 *
 * Isinya sama dengan daftar di dashboard petugas, tetapi tanpa satu pun tombol
 * tindakan: mengubah status, menganalisis ulang, dan menghapus tetap menjadi
 * wewenang petugas yang sudah masuk.
 */
export default function LaporanPublik() {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();

  const [daftar, setDaftar] = useState<Laporan[]>([]);
  const [jumlah, setJumlah] = useState({ total: 0, selesai: 0 });
  const [filter, setFilter] = useState({ status: '', prioritas: '' });
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    try {
      const r = await api.laporanPublik(filter);
      setDaftar(r.data);
      setJumlah({ total: r.jumlah.total, selesai: r.jumlah.selesai ?? 0 });
    } catch {
      setDaftar([]);
    } finally {
      setMemuat(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <div className="min-h-screen pb-16">
      <Kop judul={t('publik.judul')} keterangan={t('publik.keterangan')} />

      <main className="mx-auto max-w-3xl px-4">
        <p className="mt-6 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-maroon-800 ring-1 ring-krem-200">
          {t('publik.jumlah', { selesai: jumlah.selesai, total: jumlah.total })}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <select
            className="input !w-auto !py-2"
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">{t('dash.semua_status')}</option>
            <option value="baru">{t('status.baru')}</option>
            <option value="diproses">{t('status.diproses')}</option>
            <option value="selesai">{t('status.selesai')}</option>
          </select>
          <select
            className="input !w-auto !py-2"
            value={filter.prioritas}
            onChange={(e) => setFilter((f) => ({ ...f, prioritas: e.target.value }))}
          >
            <option value="">{t('dash.semua_prioritas')}</option>
            <option value="tinggi">{t('pilih.tinggi')}</option>
            <option value="sedang">{t('pilih.sedang')}</option>
            <option value="rendah">{t('pilih.rendah')}</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {memuat && <p className="text-maroon-600">{t('dash.memuat_laporan')}</p>}
          {!memuat && !daftar.length && (
            <p className="kartu p-10 text-center text-maroon-600">{t('publik.kosong')}</p>
          )}

          {daftar.map((l) => {
            const tepi =
              l.prioritas === 'tinggi'
                ? 'border-l-4 border-l-red-500'
                : l.prioritas === 'sedang'
                  ? 'border-l-4 border-l-amber-400'
                  : 'border-l-4 border-l-emerald-400';

            return (
              <article key={l.id} className={`kartu p-4 ${tepi}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <LencanaPrioritas nilai={l.prioritas} />
                  <LencanaStatus nilai={l.status} />
                  {l.kategori.map((k) => (
                    <LencanaKategori key={k} nilai={k} />
                  ))}
                  <span className="ml-auto text-xs text-maroon-600">
                    {waktuRelatif(l.created_at)}
                  </span>
                </div>

                <p className="mt-2.5 font-bold text-maroon-900">{l.toilet_nama}</p>
                <p className="mt-1 text-maroon-800">
                  {l.ringkasan ?? (
                    <span className="italic text-maroon-600">{t('publik.menunggu')}</span>
                  )}
                </p>

                {/* Foto bukti dari petugas ditampilkan terbuka: inilah yang
                    membuat klaim "sudah ditangani" bisa diperiksa siapa saja. */}
                {l.foto_selesai_url && (
                  <a href={l.foto_selesai_url} target="_blank" rel="noreferrer" className="mt-3 block w-fit">
                    <img
                      src={l.foto_selesai_url}
                      alt={t('dash.bukti')}
                      className="max-h-48 rounded-xl ring-2 ring-emerald-400"
                    />
                  </a>
                )}

                {l.selesai_at && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    ✓ {t('lacak.selesai')} · {waktuRelatif(l.selesai_at)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
