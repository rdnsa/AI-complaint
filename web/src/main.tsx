import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Beranda from './pages/Beranda';
import Dashboard from './pages/Dashboard';
import Lapor from './pages/Lapor';
import StatusLaporan from './pages/StatusLaporan';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Beranda />} />
        {/* Tujuan QR: satu URL per WC */}
        <Route path="/lapor/:toiletId" element={<Lapor />} />
        <Route path="/laporan/:id" element={<StatusLaporan />} />
        <Route path="/petugas" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
