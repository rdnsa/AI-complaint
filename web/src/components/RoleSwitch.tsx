import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';

/**
 * The first choice on a floor page: student or cleaning staff.
 *
 * Both open from the same QR code on the door, so the switch sits at the very
 * top, in large type, and never needs a sign-in.
 */
export default function RoleSwitch({
  floorId,
  active,
}: {
  floorId: string;
  active: 'student' | 'staff';
}) {
  const { t } = useLanguage();
  const classes = (on: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
      on ? 'bg-maroon-800 text-permukaan shadow-naik' : 'text-maroon-700 hover:bg-krem-50'
    }`;

  return (
    <nav className="mt-5 flex gap-1 rounded-2xl bg-permukaan p-1 ring-1 ring-krem-200" aria-label={t('role.label')}>
      <Link
        to={`/report/${floorId}?as=student`}
        replace
        aria-current={active === 'student' ? 'page' : undefined}
        className={classes(active === 'student')}
      >
        <span aria-hidden>🎓</span> {t('role.student')}
      </Link>
      <Link
        to={`/staff/${floorId}`}
        replace
        aria-current={active === 'staff' ? 'page' : undefined}
        className={classes(active === 'staff')}
      >
        <span aria-hidden>🧹</span> {t('role.staff')}
      </Link>
    </nav>
  );
}
