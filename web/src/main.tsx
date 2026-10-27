import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { LanguageProvider } from './lib/i18n';
import { SessionProvider } from './lib/session';
import { ThemeProvider } from './lib/theme';
import Home from './pages/Home';
import './index.css';

// Every page but the landing page loads on first visit, so the landing page
// does not download the supervisor dashboard and its charts. The browser keeps
// each chunk (see web/public/_headers).
const Register = lazy(() => import('./pages/Register'));
const SupervisorDashboard = lazy(() => import('./pages/SupervisorDashboard'));
const Login = lazy(() => import('./pages/Login'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const ReportForm = lazy(() => import('./pages/ReportForm'));
const PublicReports = lazy(() => import('./pages/PublicReports'));
const StaffHome = lazy(() => import('./pages/StaffHome'));
const ReportStatus = lazy(() => import('./pages/ReportStatus'));

/**
 * Sends an old (Indonesian) URL to its new home, keeping the path params, the
 * query string and the hash. Printed QR stickers point at /lapor/A-1, so these
 * must keep working. The old student switch `?sebagai=mahasiswa` becomes
 * `?as=student` on the way.
 */
function LegacyRedirect({ to }: { to: string }) {
  const params = useParams();
  const { search, hash } = useLocation();
  const path = to.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ''));
  const query = new URLSearchParams(search);
  if (query.get('sebagai') === 'mahasiswa') {
    query.delete('sebagai');
    query.set('as', 'student');
  }
  const qs = query.toString();
  return <Navigate to={`${path}${qs ? `?${qs}` : ''}${hash}`} replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
    <LanguageProvider>
      <SessionProvider>
        <BrowserRouter>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* QR target: one URL per location, e.g. /report/C-2 or /report/C-HALAMAN.
              Reporters report here; staff switch to /staff/C-2 with the switch
              above the form. Without a QR (/student) the location is picked on
              the same page. */}
          <Route path="/report/:locationId" element={<ReportForm />} />
          <Route path="/student" element={<ReportForm />} />
          {/* Staff without sign-in: one page for complaints and daily tasks.
              The location QR (/staff/C-2) and the staff sticker (/clean/<area>)
              open it with the location already picked. */}
          <Route path="/staff" element={<StaffHome />} />
          <Route path="/staff/:locationId" element={<StaffHome />} />
          <Route path="/clean/:areaId" element={<StaffHome />} />
          <Route path="/clean" element={<Navigate to="/staff" replace />} />
          {/* The public report board, and the status page of a single report. */}
          <Route path="/reports" element={<PublicReports />} />
          <Route path="/reports/:id" element={<ReportStatus />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          {/* Monitoring dashboard, only for a signed-in supervisor. */}
          <Route path="/supervisor" element={<SupervisorDashboard />} />

          {/* Old URLs, kept as redirects (printed QR stickers point at /lapor/:id). */}
          <Route path="/lapor/:floorId" element={<LegacyRedirect to="/report/:floorId" />} />
          <Route path="/mahasiswa" element={<LegacyRedirect to="/student" />} />
          <Route path="/petugas" element={<LegacyRedirect to="/staff" />} />
          <Route path="/petugas/:floorId" element={<LegacyRedirect to="/staff/:floorId" />} />
          <Route path="/kerja/:floorId" element={<LegacyRedirect to="/staff/:floorId" />} />
          <Route path="/laporan" element={<LegacyRedirect to="/reports" />} />
          <Route path="/laporan/:id" element={<LegacyRedirect to="/reports/:id" />} />
          <Route path="/masuk" element={<LegacyRedirect to="/login" />} />
          <Route path="/daftar" element={<LegacyRedirect to="/register" />} />
          <Route path="/peringkat" element={<LegacyRedirect to="/leaderboard" />} />
          <Route path="/spv" element={<LegacyRedirect to="/supervisor" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </BrowserRouter>
      </SessionProvider>
    </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
