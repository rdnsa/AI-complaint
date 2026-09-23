import Kop from '../components/Kop';
import PilihLokasi from '../components/PilihLokasi';
import { useBahasa } from '../lib/i18n';

/**
 * The student starting point when no QR is at hand: pick the building and
 * floor, then report. `?sebagai=mahasiswa` keeps a phone that once picked a
 * staff name on the complaint form, since the choice here was explicit.
 */
export default function MahasiswaBeranda() {
  const { t } = useBahasa();

  return (
    <div className="min-h-screen pb-16">
      <Kop judul={t('peran.mahasiswa')} keterangan={t('peran.mahasiswa_isi')} ramping />
      <main className="mx-auto max-w-5xl px-4">
        <PilihLokasi tujuan={(kode, lantai) => `/lapor/${kode}-${lantai}?sebagai=mahasiswa`} />
      </main>
    </div>
  );
}
