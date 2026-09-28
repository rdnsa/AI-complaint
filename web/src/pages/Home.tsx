import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import AskPanel from '../components/AskPanel';
import QrCodesPanel from '../components/QrCodesPanel';
import { StatusBadge } from '../components/Badges';
import {
  ArrowGlyph,
  ChatMark,
  PodiumMark,
  QrMark,
  ReportsMark,
  StaffMark,
  StudentMark,
  SupervisorMark,
} from '../components/Marks';
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
        <p className="mt-1.5 truncate font-display text-nav-title font-semibold text-ink-900">{report.toilet_name}</p>
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
 * A full-width band of the page. Bands alternate Gallery White and Studio Mist,
 * so chapters separate by tone rather than by lines or shadows.
 */
function Band({ id, tone, children }: { id?: string; tone: 'white' | 'mist'; children: ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-14 ${tone === 'white' ? 'bg-surface' : 'bg-mist-100'}`}>
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
        <h2 className="font-display text-feature-sm font-semibold text-ink-900 sm:text-feature">{title}</h2>
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

function QuickLink({ to, mark, label }: { to: string; mark: ReactNode; label: string }) {
  return (
    <Link to={to} className="card group flex items-center gap-4 px-6 py-5">
      {mark}
      <span className="min-w-0 flex-1 font-display text-nav-title font-semibold text-ink-900">{label}</span>
      <ArrowGlyph className="h-4 w-4 text-accent-600 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const { session, logout } = useSession();
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [showQr, setShowQr] = useState(false);

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
          {session ? (
            <span className="text-ink-600">
              {t('session.hello', { name: session.name })} ·{' '}
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

      {/* Three parties, three doors. Students and staff need no sign-in; the supervisor signs in. */}
      <Band id="roles" tone="mist">
        <BandHeading title={t('home.section_roles')} body={t('register.description')} />
        <Reveal stagger className="grid gap-5 sm:grid-cols-3">
          <RoleDoor to="/student" mark={<StudentMark />} title={t('role.student')} body={t('role.student_body')} />
          <RoleDoor to="/staff" mark={<StaffMark />} title={t('role.staff')} body={t('role.staff_body')} />
          {/* A signed-in supervisor goes straight to the dashboard; anyone else signs in first. */}
          <RoleDoor
            to={session?.role === 'supervisor' ? '/supervisor' : '/login'}
            mark={<SupervisorMark />}
            title={t('role.supervisor')}
            body={session?.role === 'supervisor' ? t('nav.to_supervisor_dashboard') : t('role.supervisor_body')}
          />
        </Reveal>
        <Reveal stagger delay={150} className="mt-5 grid gap-5 sm:grid-cols-2">
          <QuickLink to="/reports" mark={<ReportsMark />} label={t('nav.all_reports')} />
          <QuickLink to="/leaderboard" mark={<PodiumMark />} label={t('leaderboard.view')} />
        </Reveal>
      </Band>

      <Band id="ai" tone="white">
        <BandHeading title={t('ask.title')} body={t('ask.tagline')} link={<ChatMark />} />
        <Reveal className="rounded-card bg-mist-100 p-6 sm:p-8">
          <AskPanel compact />
        </Reveal>
      </Band>

      {/* The stickers are only floor addresses that are already on every door,
          so anyone may print a replacement. Folded by default: thirteen QR
          codes would otherwise bury the rest of the page. */}
      <Band id="qr" tone="mist">
        <BandHeading
          title={t('qr.title')}
          body={t('qr.subtitle')}
          link={
            <button
              type="button"
              onClick={() => setShowQr((v) => !v)}
              aria-expanded={showQr}
              className="link inline-flex items-center gap-1 text-body print:hidden"
            >
              {showQr ? t('qr.hide') : t('qr.show')}
              <ArrowGlyph className={`h-3.5 w-3.5 transition-transform duration-200 ${showQr ? '-rotate-90' : 'rotate-90'}`} />
            </button>
          }
        />
        {showQr ? (
          <QrCodesPanel />
        ) : (
          <Reveal>
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="card flex w-full items-center gap-4 px-6 py-5 text-left print:hidden"
            >
              <QrMark />
              <span className="font-display text-nav-title font-semibold text-ink-900">{t('home.section_qr')}</span>
            </button>
          </Reveal>
        )}
      </Band>
    </div>
  );
}
