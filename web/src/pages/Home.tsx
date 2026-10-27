import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import AskPanel from '../components/AskPanel';
import { StatusBadge } from '../components/Badges';
import { ArrowGlyph, ChatMark, StaffMark, StudentMark } from '../components/Marks';
import { api, type Report } from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import { Reveal } from '../lib/motion';
import { useSession } from '../lib/session';

function MyReportRow({ report }: { report: Report }) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();

  return (
    <Link to={`/reports/${report.id}`} className="card group flex items-center gap-4 px-6 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value={report.status} />
          <span className="text-nav text-ink-600">{relativeTime(report.created_at)}</span>
        </div>
        <p className="mt-1.5 truncate font-display text-nav-title font-semibold text-ink-900">{report.location_name}</p>
        <p className="truncate text-body-sm text-ink-600">{report.summary ?? report.description}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-body-sm text-accent-600 group-hover:underline">
        {t('history.view')}
        <ArrowGlyph className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/**
 * A full-width band of the page. A 'white' band is a strip of glass across the
 * page; a 'mist' band leaves the page ground bare, so chapters still alternate.
 */
function Band({ id, tone, children }: { id?: string; tone: 'white' | 'mist'; children: ReactNode }) {
  return (
    <section
      id={id}
      className={`scroll-mt-14 ${tone === 'white' ? 'border-y border-white/50 bg-glass/70 backdrop-blur-2xl dark:border-white/10' : ''}`}
    >
      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-section">{children}</div>
    </section>
  );
}

/**
 * A chapter heading: the large Ink statement, with an optional Apple Blue link
 * opposite. Its parts rise into place one after another as it scrolls in.
 */
function BandHeading({ title, body, link }: { title: string; body?: string; link?: ReactNode }) {
  return (
    <Reveal stagger className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-2xl">
        <h2 className="font-display text-feature-sm font-light tracking-[-0.03em] text-ink-900 sm:text-feature">{title}</h2>
        {body && <p className="mt-3 text-body text-ink-600">{body}</p>}
      </div>
      {link && <div>{link}</div>}
    </Reveal>
  );
}

/** One of the three ways in: a white feature card on the mist band, lifting slightly under the pointer. */
function RoleDoor({ to, mark, title, body }: { to: string; mark: ReactNode; title: string; body: string }) {
  const { t } = useLanguage();
  return (
    <Link
      to={to}
      className="card group flex flex-col gap-6 p-7 transition-transform duration-500 [transition-timing-function:var(--ease-out-quint)] hover:-translate-y-1"
    >
      {mark}
      <span className="flex-1">
        <span className="block font-display text-[24px] font-semibold leading-[1.17] text-ink-900">{title}</span>
        <span className="mt-2 block text-body text-ink-600">{body}</span>
      </span>
      <span className="flex items-center gap-1 text-body text-accent-600 group-hover:underline">
        {t('nav.open')}
        <ArrowGlyph className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
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
    <div className="min-h-screen">
      <Header hero kicker={`UPI ${t('header.campus')}`} title={t('app.title')} description={t('app.subtitle')}>
        {/* The roles are the cards just below; the hero only carries the secondary ways in. */}
        <div className="flex flex-col items-center gap-2 text-body">
          <Link to="/reports" className="link inline-flex items-center gap-1">
            {t('nav.all_reports')}
            <ArrowGlyph className="h-3.5 w-3.5" />
          </Link>
          <Link to="/leaderboard" className="link inline-flex items-center gap-1">
            {t('leaderboard.view')}
            <ArrowGlyph className="h-3.5 w-3.5" />
          </Link>
          {session ? (
            <span className="text-ink-600">
              {t('session.hello', { name: session.name })} ·{' '}
              {session.role === 'supervisor' && (
                <>
                  <Link to="/supervisor" className="link">
                    {t('nav.to_supervisor_dashboard')}
                  </Link>{' '}
                  ·{' '}
                </>
              )}
              <button onClick={logout} className="link">
                {t('session.logout')}
              </button>
            </span>
          ) : (
            <span className="text-ink-600">
              <Link to="/login" className="link">
                {t('session.login')}
              </Link>{' '}
              ·{' '}
              <Link to="/register" className="link">
                {t('session.register')}
              </Link>
            </span>
          )}
        </div>
      </Header>

      {!!myReports.length && (
        <Band id="history" tone="mist">
          <BandHeading title={t('history.title')} />
          <Reveal stagger className="space-y-3">
            {myReports.map((r) => (
              <MyReportRow key={r.id} report={r} />
            ))}
          </Reveal>
        </Band>
      )}

      {/* Two doors, neither needs a sign-in. The supervisor signs in from the links above. */}
      <Band id="roles" tone="mist">
        <BandHeading title={t('home.section_roles')} body={t('register.description')} />
        <Reveal stagger className="grid gap-5 sm:grid-cols-2">
          <RoleDoor to="/student" mark={<StudentMark />} title={t('role.student')} body={t('role.student_body')} />
          <RoleDoor to="/staff" mark={<StaffMark />} title={t('role.staff')} body={t('role.staff_body')} />
        </Reveal>
      </Band>

      <Band id="ai" tone="white">
        <BandHeading title={t('ask.title')} body={t('ask.tagline')} link={<ChatMark />} />
        <Reveal className="card p-6 sm:p-8">
          <AskPanel compact />
        </Reveal>
      </Band>

    </div>
  );
}
