import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import AskPanel from '../components/AskPanel';
import { StatusBadge } from '../components/Badges';
import { api, type Report } from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import { useSession } from '../lib/session';

function MyReportRow({ report }: { report: Report }) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();

  return (
    <Link to={`/reports/${report.id}`} className="card flex items-center gap-3 p-3 hover:shadow-naik">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={report.status} />
          <span className="text-xs text-maroon-600">{relativeTime(report.created_at)}</span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-maroon-900">{report.toilet_name}</p>
        <p className="truncate text-sm text-maroon-700">{report.summary ?? report.description}</p>
      </div>
      <span className="shrink-0 text-sm font-bold text-bata-600">{t('history.view')} →</span>
    </Link>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const { session, logout } = useSession();
  const [myReports, setMyReports] = useState<Report[]>([]);

  // Reports belong to the account, not to the device, so the list follows the
  // reporter to any phone or browser they sign in from.
  useEffect(() => {
    if (session?.role !== 'reporter') return setMyReports([]);
    api
      .myReports()
      .then((r) => setMyReports(r.data))
      .catch(() => setMyReports([]));
  }, [session]);

  return (
    <div className="min-h-screen pb-16">
      <Header title={t('app.title')} description={t('app.subtitle')} />

      <main className="mx-auto max-w-5xl px-4">
        {!!myReports.length && (
          <section className="mt-6">
            <h2 className="section-title">{t('history.title')}</h2>
            <div className="mt-2 space-y-2">
              {myReports.map((r) => (
                <MyReportRow key={r.id} report={r} />
              ))}
            </div>
          </section>
        )}

        {/* Three parties, three doors. Students and staff need no sign-in; the supervisor signs in. */}
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link to="/student" className="card flex items-center gap-3 p-4 hover:shadow-naik">
            <span aria-hidden className="text-3xl">
              🎓
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-maroon-900">{t('role.student')}</span>
              <span className="block text-sm text-maroon-700">{t('role.student_body')}</span>
            </span>
            <span className="shrink-0 font-bold text-bata-600">→</span>
          </Link>
          <Link to="/staff" className="card flex items-center gap-3 p-4 hover:shadow-naik">
            <span aria-hidden className="text-3xl">
              🧹
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-maroon-900">{t('role.staff')}</span>
              <span className="block text-sm text-maroon-700">{t('role.staff_body')}</span>
            </span>
            <span className="shrink-0 font-bold text-bata-600">→</span>
          </Link>
          {/* A signed-in supervisor goes straight to the dashboard; anyone else signs in first. */}
          <Link
            to={session?.role === 'supervisor' ? '/supervisor' : '/login'}
            className="card flex items-center gap-3 p-4 hover:shadow-naik"
          >
            <span aria-hidden className="text-3xl">
              👔
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-maroon-900">{t('role.supervisor')}</span>
              <span className="block text-sm text-maroon-700">
                {session?.role === 'supervisor' ? t('nav.to_supervisor_dashboard') : t('role.supervisor_body')}
              </span>
            </span>
            <span className="shrink-0 font-bold text-bata-600">→</span>
          </Link>
        </section>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-permukaan px-4 py-3 ring-1 ring-krem-200">
          {session ? (
            <>
              <span className="font-semibold text-maroon-900">
                {t('session.hello', { name: session.name })}
              </span>
              <button
                onClick={logout}
                className="ml-auto text-sm font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-4 hover:text-bata-600"
              >
                {t('session.logout')}
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-maroon-700">{t('register.description')}</span>
              <span className="ml-auto flex gap-2">
                <Link to="/login" className="btn-neutral !py-1.5 text-xs">
                  {t('session.login')}
                </Link>
                <Link to="/register" className="btn-primary !py-1.5 text-xs">
                  {t('session.register')}
                </Link>
              </span>
            </>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link to="/reports" className="card flex items-center justify-between gap-3 p-4 hover:shadow-naik">
            <span className="font-semibold text-maroon-900">{t('nav.all_reports')}</span>
            <span className="shrink-0 font-bold text-bata-600">→</span>
          </Link>
          <Link to="/leaderboard" className="card flex items-center justify-between gap-3 p-4 hover:shadow-naik">
            <span className="font-semibold text-maroon-900">🏆 {t('leaderboard.view')}</span>
            <span className="shrink-0 font-bold text-bata-600">→</span>
          </Link>
        </div>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-maroon-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-bata-500 text-lg text-white shadow-naik">🤖</span>
            {t('ask.title')}
          </h2>
          <AskPanel compact />
        </section>
      </main>
    </div>
  );
}
