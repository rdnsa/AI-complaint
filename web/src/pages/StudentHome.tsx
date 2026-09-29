import Header from '../components/Header';
import LocationPicker from '../components/LocationPicker';
import { useLanguage } from '../lib/i18n';
import { StudentMark } from '../components/Marks';

/**
 * The student starting point when no QR is at hand: pick the building and
 * floor, then report. `?as=student` keeps a phone that once picked a staff
 * name on the complaint form, since the choice here was explicit.
 */
export default function StudentHome() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-16">
      <Header title={t('role.student')} description={t('role.student_body')} compact mark={<StudentMark />} />
      <main className="mx-auto max-w-5xl px-4">
        <LocationPicker target={(code, floor) => `/report/${code}-${floor}?as=student`} />
      </main>
    </div>
  );
}
