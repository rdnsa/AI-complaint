import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Pekerjaan, type PetugasPilihan } from '../lib/api';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';

/**
 * The supervisor's view of the staff work log: which toilets have been
 * cleaned, by whom, with the AI-checked photo — for everyone, or one person.
 */
export default function PanelPekerjaan() {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();
  const [data, setData] = useState<Pekerjaan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [petugas, setPetugas] = useState<PetugasPilihan[]>([]);
  const [petugasId, setPetugasId] = useState('');

  const muat = useCallback(async () => {
    try {
      setData((await api.daftarPekerjaan({ petugas_id: petugasId, limit: '200' })).data);
    } catch {
      setData([]);
    } finally {
      setMemuat(false);
    }
  }, [petugasId]);

  useEffect(() => {
    muat();
  }, [muat]);

  useEffect(() => {
    api
      .daftarPetugas()
      .then((r) => setPetugas(r.data))
      .catch(() => setPetugas([]));
  }, []);

  // How many toilets each person has on record in the loaded list, busiest first.
  const perPetugas = useMemo(() => {
    const hitung = new Map<string, number>();
    for (const p of data) hitung.set(p.petugas, (hitung.get(p.petugas) ?? 0) + 1);
    return [...hitung].sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="mt-6">
      <p className="rounded-xl bg-permukaan px-4 py-3 text-sm leading-relaxed text-maroon-700 ring-1 ring-krem-200">
        {t('kerja.keterangan')}
      </p>

      <select
        className="input mt-4 !w-auto !py-2"
        value={petugasId}
        onChange={(e) => setPetugasId(e.target.value)}
      >
        <option value="">{t('kerja.semua_petugas')}</option>
        {petugas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nama}
          </option>
        ))}
      </select>

      {!petugasId && perPetugas.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {perPetugas.map(([nama, jumlah]) => (
            <span
              key={nama}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200"
            >
              {nama}: {jumlah}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {memuat && <p className="text-maroon-600">{t('umum.memuat')}</p>}
        {!memuat && !data.length && (
          <p className="kartu p-10 text-center text-maroon-600">{t('kerja.kosong')}</p>
        )}
        {data.map((p) => (
          <article key={p.id} className="kartu border-l-4 border-l-emerald-400 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                ✓ {t('dash.bukti_terverifikasi')}
              </span>
              <span className="text-sm font-semibold text-maroon-900">{p.petugas}</span>
              <span className="ml-auto text-xs text-maroon-600">{waktuRelatif(p.created_at)}</span>
            </div>
            <p className="mt-2.5 font-bold text-maroon-900">{p.toilet_nama}</p>
            <p className="mt-1 text-maroon-800">{p.teks}</p>
            {p.foto_url && (
              <figure className="m-0 mt-3">
                <a href={p.foto_url} target="_blank" rel="noreferrer">
                  <img src={p.foto_url} alt="" className="max-h-44 rounded-xl ring-2 ring-emerald-400" />
                </a>
                {p.bukti_ai_alasan && (
                  <figcaption className="mt-1 max-w-xs text-xs italic text-maroon-600">
                    {p.bukti_ai_alasan}
                  </figcaption>
                )}
              </figure>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
