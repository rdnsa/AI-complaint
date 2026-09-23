import { Link } from 'react-router-dom';
import { useBahasa } from '../lib/i18n';

/**
 * The first choice on a floor page: student or cleaning staff.
 *
 * Both open from the same QR code on the door, so the switch sits at the very
 * top, in large type, and never needs a sign-in.
 */
export default function SaklarPeran({
  lokasiId,
  aktif,
}: {
  lokasiId: string;
  aktif: 'mahasiswa' | 'petugas';
}) {
  const { t } = useBahasa();
  const kelas = (hidup: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
      hidup ? 'bg-maroon-800 text-permukaan shadow-naik' : 'text-maroon-700 hover:bg-krem-50'
    }`;

  return (
    <nav className="mt-5 flex gap-1 rounded-2xl bg-permukaan p-1 ring-1 ring-krem-200" aria-label={t('peran.label')}>
      <Link
        to={`/lapor/${lokasiId}?sebagai=mahasiswa`}
        replace
        aria-current={aktif === 'mahasiswa' ? 'page' : undefined}
        className={kelas(aktif === 'mahasiswa')}
      >
        <span aria-hidden>🎓</span> {t('peran.mahasiswa')}
      </Link>
      <Link
        to={`/petugas/${lokasiId}`}
        replace
        aria-current={aktif === 'petugas' ? 'page' : undefined}
        className={kelas(aktif === 'petugas')}
      >
        <span aria-hidden>🧹</span> {t('peran.petugas')}
      </Link>
    </nav>
  );
}
