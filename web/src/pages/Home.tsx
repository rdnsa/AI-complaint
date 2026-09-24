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
import { useSession } from '../lib/session';

function MyReportRow({ report }: { report: Report }) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();

  return (
    <Link to={`/reports/${report.id}`} className="card group flex items-center gap-3 p-3 hover:shadow-naik">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={report.status} />
          <span className="text-xs text-maroon-600">{relativeTime(report.created_at)}</span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-maroon-900">{report.toilet_name}</p>
        <p className="truncate text-sm text-maroon-700">{report.summary ?? report.description}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-bata-600">
        {t('history.view')}
        <ArrowGlyph className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/**
 * An editorial section break: the section name and a hairline to the edge.
 * Left-aligned so the eye picks it up where it already starts reading each line.
 */
function SectionDivider({ label, className = 'mt-12' }: { label: string; className?: string }) {
  return (
    <div role="separator" aria-label={label} className={`flex items-center gap-3 ${className}`}>
      <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-maroon-800">{label}</span>
      <span className="h-px flex-1 bg-krem-300" />
    </div>
  );
}

/** One of the three ways in. Horizontal on a phone, a tall tile from the small breakpoint up. */
function RoleDoor({ to, mark, title, body }: { to: string; mark: ReactNode; title: string; body: string }) {
  return (
    <Link
      to={to}
      className="card group relative flex items-center gap-4 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-bata-200 hover:shadow-naik sm:flex-col sm:items-start sm:gap-5 sm:p-5"
    >
      {mark}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold tracking-tight text-maroon-900">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-maroon-700">{body}</span>
      </span>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-bata-600 ring-1 ring-krem-300 transition group-hover:bg-bata-500 group-hover:text-white group-hover:ring-bata-500 sm:absolute sm:right-5 sm:top-5">
        <ArrowGlyph className="h-4 w-4" />
      </span>
    </Link>
  );
}

function QuickLink({ to, mark, label }: { to: string; mark: ReactNode; label: string }) {
  return (
    <Link to={to} className="card group flex items-center gap-3 p-3 pr-4 transition hover:border-bata-200 hover:shadow-naik">
      {mark}
      <span className="min-w-0 flex-1 font-bold text-maroon-900">{label}</span>
      <ArrowGlyph className="h-4 w-4 text-bata-600 transition-transform group-hover:translate-x-1" />
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

        <SectionDivider label={t('home.section_roles')} className="mt-8" />

        {/* Three parties, three doors. Students and staff need no sign-in; the supervisor signs in. */}
        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <RoleDoor to="/student" mark={<StudentMark />} title={t('role.student')} body={t('role.student_body')} />
          <RoleDoor to="/staff" mark={<StaffMark />} title={t('role.staff')} body={t('role.staff_body')} />
          {/* A signed-in supervisor goes straight to the dashboard; anyone else signs in first. */}
          <RoleDoor
            to={session?.role === 'supervisor' ? '/supervisor' : '/login'}
            mark={<SupervisorMark />}
            title={t('role.supervisor')}
            body={session?.role === 'supervisor' ? t('nav.to_supervisor_dashboard') : t('role.supervisor_body')}
          />
        </section>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-permukaan px-4 py-3 ring-1 ring-krem-200">
          {session ? (
            <>
              <span className="font-semibold text-maroon-900">
                {t('session.hello', { name: session.name })}
              </span>
              <button
                onClick={logout}
                className="-my-1.5 -mr-2 ml-auto rounded-lg px-2 py-1.5 text-sm font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-4 hover:text-bata-600"
              >
                {t('session.logout')}
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-maroon-700">{t('register.description')}</span>
              <span className="ml-auto flex gap-2">
                <Link to="/login" className="btn-neutral !py-2 text-xs">
                  {t('session.login')}
                </Link>
                <Link to="/register" className="btn-primary !py-2 text-xs">
                  {t('session.register')}
                </Link>
              </span>
            </>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <QuickLink to="/reports" mark={<ReportsMark />} label={t('nav.all_reports')} />
          <QuickLink to="/leaderboard" mark={<PodiumMark />} label={t('leaderboard.view')} />
        </div>

        <SectionDivider label={t('home.section_ai')} />

        <section className="mt-4 overflow-hidden rounded-3xl bg-permukaan shadow-kartu ring-1 ring-krem-200">
          <div className="flex items-center gap-4 border-b border-krem-200 bg-krem-50 px-5 py-4 sm:px-6">
            <ChatMark />
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight text-maroon-900">{t('ask.title')}</h2>
              <p className="text-sm text-maroon-700">{t('ask.tagline')}</p>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <AskPanel compact />
          </div>
        </section>

        {/* The stickers are only floor addresses that are already on every door,
            so anyone may print a replacement. Folded by default: thirteen QR
            codes would otherwise bury the rest of the page. */}
        <SectionDivider label={t('home.section_qr')} />

        <section className="mt-4">
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            className="card group flex w-full items-center gap-4 p-4 text-left transition hover:border-bata-200 hover:shadow-naik print:hidden sm:px-5"
          >
            <QrMark />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold tracking-tight text-maroon-900">{t('qr.title')}</span>
              <span className="block text-sm text-maroon-700">{t('qr.subtitle')}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-bata-600">
              <span className="hidden sm:inline">{showQr ? t('qr.hide') : t('qr.show')}</span>
              <ArrowGlyph className={`h-4 w-4 transition-transform duration-200 ${showQr ? '-rotate-90' : 'rotate-90'}`} />
            </span>
          </button>
          {showQr && <QrCodesPanel />}
        </section>
      </main>
    </div>
  );
}
