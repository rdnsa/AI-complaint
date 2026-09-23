import type { PetugasPilihan } from '../lib/api';
import { useBahasa } from '../lib/i18n';

/**
 * "Who are you?" for cleaning staff: one large dropdown instead of a sign-in.
 * Deliberately big and plain, for staff who rarely use apps.
 */
export default function PilihPetugas({
  daftar,
  terpilih,
  onPilih,
}: {
  daftar: PetugasPilihan[];
  terpilih: PetugasPilihan | null;
  onPilih: (id: string) => void;
}) {
  const { t } = useBahasa();

  return (
    <div
      className={`rounded-2xl p-4 ring-1 ${
        terpilih ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-300'
      }`}
    >
      <label htmlFor="pilih-petugas" className="block text-base font-bold text-maroon-900">
        👤 {t('petugas.siapa')}
      </label>
      <select
        id="pilih-petugas"
        className="input mt-2 !py-3 text-base font-semibold"
        value={terpilih?.id ?? ''}
        onChange={(e) => onPilih(e.target.value)}
      >
        <option value="">{t('petugas.pilih_nama')}</option>
        {daftar.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nama}
          </option>
        ))}
      </select>
      {!daftar.length && <p className="mt-2 text-sm text-amber-900">{t('petugas.daftar_kosong')}</p>}
    </div>
  );
}
