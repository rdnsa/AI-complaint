import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PenyediaBahasa } from './lib/i18n';
import { PenyediaSesi } from './lib/sesi';
import { PenyediaTema } from './lib/tema';
import Beranda from './pages/Beranda';
import Daftar from './pages/Daftar';
import Dashboard from './pages/Dashboard';
import Masuk from './pages/Masuk';
import Peringkat from './pages/Peringkat';
import Lapor from './pages/Lapor';
import LaporanPublik from './pages/LaporanPublik';
import PetugasBeranda from './pages/PetugasBeranda';
import PetugasLantai from './pages/PetugasLantai';
import StatusLaporan from './pages/StatusLaporan';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PenyediaTema>
    <PenyediaBahasa>
      <PenyediaSesi>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Beranda />} />
          {/* Tujuan QR: satu URL per lantai, mis. /lapor/A-1. Mahasiswa melapor di
              sini; petugas beralih ke /petugas/A-1 lewat saklar di atas formulir. */}
          <Route path="/lapor/:lokasiId" element={<Lapor />} />
          {/* Petugas tanpa login: pilih nama, selesaikan laporan, lapor pekerjaan. */}
          <Route path="/petugas" element={<PetugasBeranda />} />
          <Route path="/petugas/:lokasiId" element={<PetugasLantai />} />
          {/* Papan laporan terbuka, dan halaman status satu laporan. */}
          <Route path="/laporan" element={<LaporanPublik />} />
          <Route path="/laporan/:id" element={<StatusLaporan />} />
          <Route path="/masuk" element={<Masuk />} />
          <Route path="/daftar" element={<Daftar />} />
          <Route path="/peringkat" element={<Peringkat />} />
          {/* Dashboard pemantauan, hanya untuk SPV yang login. */}
          <Route path="/spv" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </PenyediaSesi>
    </PenyediaBahasa>
    </PenyediaTema>
  </React.StrictMode>,
);
