import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PenyediaBahasa } from './lib/i18n';
import Beranda from './pages/Beranda';
import Dashboard from './pages/Dashboard';
import Lapor from './pages/Lapor';
import LaporanPublik from './pages/LaporanPublik';
import StatusLaporan from './pages/StatusLaporan';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PenyediaBahasa>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Beranda />} />
          {/* Tujuan QR: satu URL per lantai, mis. /lapor/A-1 */}
          <Route path="/lapor/:lokasiId" element={<Lapor />} />
          {/* Papan laporan terbuka, dan halaman status satu laporan. */}
          <Route path="/laporan" element={<LaporanPublik />} />
          <Route path="/laporan/:id" element={<StatusLaporan />} />
          <Route path="/petugas" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PenyediaBahasa>
  </React.StrictMode>,
);
