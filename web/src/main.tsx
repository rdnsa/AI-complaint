import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { LanguageProvider } from './lib/i18n';
import { SessionProvider } from './lib/session';
import { ThemeProvider } from './lib/theme';
import Home from './pages/Home';
import Register from './pages/Register';
import SupervisorDashboard from './pages/SupervisorDashboard';
import Login from './pages/Login';
import Leaderboard from './pages/Leaderboard';
import ReportForm from './pages/ReportForm';
import PublicReports from './pages/PublicReports';
import StudentHome from './pages/StudentHome';
import StaffHome from './pages/StaffHome';
import StaffFloor from './pages/StaffFloor';
import ReportStatus from './pages/ReportStatus';
import './index.css';

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
        <Routes>
          <Route path="/" element={<Home />} />
          {/* QR target: one URL per floor, e.g. /report/A-1. Students report
              here; staff switch to /staff/A-1 with the switch above the form. */}
          <Route path="/report/:floorId" element={<ReportForm />} />
          {/* Without a QR: students pick the building and floor here. */}
          <Route path="/student" element={<StudentHome />} />
          {/* Staff without sign-in: pick a name, resolve reports, log work. */}
          <Route path="/staff" element={<StaffHome />} />
          <Route path="/staff/:floorId" element={<StaffFloor />} />
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
        </BrowserRouter>
      </SessionProvider>
    </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
