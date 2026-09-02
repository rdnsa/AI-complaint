import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Bahasa = 'id' | 'en';

/**
 * Kamus antarmuka. Bahasa Indonesia menjadi acuan bentuk kamus, sehingga
 * TypeScript menolak kompilasi bila ada kunci yang lupa diterjemahkan.
 *
 * Catatan: hasil analisis LLM (ringkasan dan rekomendasi) tetap berbahasa
 * Indonesia karena pembacanya adalah petugas kebersihan; yang diterjemahkan
 * di sini hanyalah antarmukanya.
 */
const ID = {
  'kop.universitas': 'Universitas Pendidikan Indonesia',
  'kop.kampus': 'Kampus Tasikmalaya',
  'app.judul': 'Lapor Kondisi Toilet',
  'app.subjudul':
    'Laporan kamu langsung diterima petugas kebersihan, tanpa perlu login dan tanpa menyebut nama.',

  'umum.memuat': 'Memuat…',
  'umum.gedung': 'Gedung {kode}',
  'umum.lantai': 'Lantai {n}',
  'nav.petugas': 'Masuk sebagai petugas',
  'nav.beranda': 'Kembali ke beranda',
  'bahasa.label': 'Bahasa',

  'jenis.pria': 'Pria',
  'jenis.wanita': 'Wanita',
  'jenis.disabilitas': 'Disabilitas',

  'beranda.petunjuk':
    'Biasanya kamu cukup memindai QR yang tertempel di pintu toilet. Kalau QR-nya hilang atau rusak, pilih lokasinya di bawah ini.',
  'beranda.peta_keterangan': 'Peta lokasi gedung — Jln. Dadaha No. 18, Kota Tasikmalaya',
  'beranda.peta_alt': 'Peta lokasi gedung UPI Kampus Tasikmalaya',
  'beranda.peta_perbesar': 'Ketuk untuk perbesar',
  'beranda.pilih': 'Pilih gedung dan lantai',
  'beranda.kosong': 'Daftar lokasi belum tersedia. Coba muat ulang halaman ini.',

  'lapor.pilih_jenis': 'Toilet yang mana?',
  'lapor.ajakan':
    'Tulis apa adanya, pakai bahasa sehari-hari. Sistem yang akan merapikan dan menentukan prioritasnya.',
  'lapor.label_teks': 'Apa yang bermasalah?',
  'lapor.placeholder': 'Contoh: WC lantai 2 bau banget, lantainya becek, sama sabunnya habis.',
  'lapor.contoh1': 'WC-nya bau banget, lantainya becek, sabunnya habis.',
  'lapor.contoh2': 'Kloset yang pojok mampet, airnya hampir meluap.',
  'lapor.contoh3': 'Tisu di dispenser habis.',
  'lapor.foto': 'Foto (opsional)',
  'lapor.ambil_foto': 'Ambil atau pilih foto',
  'lapor.hapus_foto': 'Hapus',
  'lapor.kirim': 'Kirim laporan',
  'lapor.mengirim': 'Mengirim…',
  'lapor.galat_pendek': 'Tolong tulis keluhannya sedikit lebih jelas.',
  'lapor.galat_foto': 'Ukuran foto maksimal 5 MB.',
  'lapor.galat_kirim': 'Gagal mengirim laporan',
  'lapor.tidak_dikenal': 'Kode lokasi tidak dikenal',
  'lapor.tidak_dikenal_isi':
    'QR yang kamu pindai tidak terdaftar. Coba pilih lokasinya secara manual.',
  'lapor.pilih_manual': 'Pilih lokasi',

  'status.berhasil': 'Laporan kamu sudah masuk',
  'status.berhasil_isi': 'Petugas akan melihatnya di dashboard. Terima kasih sudah melaporkan.',
  'status.hasil': 'Hasil analisis',
  'status.menganalisis': 'Sedang menganalisis keluhan kamu…',
  'status.gagal':
    'Analisis otomatis belum berhasil, tetapi laporan kamu tetap tercatat dan akan ditinjau petugas.',
  'status.tindakan': 'Tindakan untuk petugas:',
  'status.galat_muat': 'Gagal memuat laporan',

  'login.judul': 'Masuk Petugas',
  'login.keterangan': 'Nama dipakai untuk mencatat siapa yang menangani laporan.',
  'login.nama': 'Nama petugas',
  'login.password': 'Password',
  'login.masuk': 'Masuk',
  'login.memeriksa': 'Memeriksa…',
  'login.galat': 'Gagal masuk',

  'dash.judul': 'Dashboard Petugas',
  'dash.sebagai': 'Masuk sebagai {nama}',
  'dash.keluar': 'Keluar',
  'dash.stat_total': 'Laporan hari ini',
  'dash.stat_tinggi': 'Prioritas tinggi',
  'dash.stat_belum': 'Belum selesai',
  'dash.stat_gagal': 'Analisis gagal',
  'dash.ringkasan': 'Ringkasan hari ini',
  'dash.buat_ulang': 'Buat ulang',
  'dash.menyusun': 'Menyusun…',
  'dash.ringkasan_kosong':
    'Belum ada ringkasan. Dibuat otomatis tiap pukul 17.00 WIB, atau tekan tombol Buat ulang.',
  'dash.lokasi_teratas': 'Lokasi terbanyak hari ini',
  'dash.memuat_laporan': 'Memuat laporan…',
  'dash.kosong': 'Tidak ada laporan untuk filter ini.',
  'dash.semua_status': 'Semua status',
  'dash.semua_prioritas': 'Semua prioritas',
  'dash.laporan_asli': 'Laporan asli',
  'dash.tindakan': 'Tindakan:',
  'dash.kerjakan': 'Kerjakan',
  'dash.selesaikan': 'Tandai selesai',
  'dash.analisa_ulang': 'Analisis ulang',
  'dash.ditangani': 'Ditangani: {nama}',

  'prioritas.tinggi': 'Prioritas tinggi',
  'prioritas.sedang': 'Prioritas sedang',
  'prioritas.rendah': 'Prioritas rendah',
  'status.baru': 'baru',
  'status.diproses': 'diproses',
  'status.selesai': 'selesai',
  'pilih.tinggi': 'Tinggi',
  'pilih.sedang': 'Sedang',
  'pilih.rendah': 'Rendah',

  'kategori.kebersihan': 'kebersihan',
  'kategori.perlengkapan': 'perlengkapan',
  'kategori.kerusakan': 'kerusakan',
  'kategori.bau': 'bau',
  'kategori.genangan': 'genangan',
  'kategori.lainnya': 'lainnya',

  'waktu.baru': 'baru saja',
  'waktu.menit': '{n} menit lalu',
  'waktu.jam': '{n} jam lalu',
  'waktu.hari': '{n} hari lalu',
} as const;

type Kunci = keyof typeof ID;

const EN: Record<Kunci, string> = {
  'kop.universitas': 'Universitas Pendidikan Indonesia',
  'kop.kampus': 'Tasikmalaya Campus',
  'app.judul': 'Report Toilet Condition',
  'app.subjudul':
    'Your report goes straight to the cleaning staff. No sign-in, and no name required.',

  'umum.memuat': 'Loading…',
  'umum.gedung': 'Building {kode}',
  'umum.lantai': 'Floor {n}',
  'nav.petugas': 'Staff sign in',
  'nav.beranda': 'Back to home',
  'bahasa.label': 'Language',

  'jenis.pria': 'Men',
  'jenis.wanita': 'Women',
  'jenis.disabilitas': 'Accessible',

  'beranda.petunjuk':
    'Normally you just scan the QR code on the toilet door. If the code is missing or damaged, pick the location below.',
  'beranda.peta_keterangan': 'Building map — Jln. Dadaha No. 18, Tasikmalaya',
  'beranda.peta_alt': 'Building location map of UPI Tasikmalaya Campus',
  'beranda.peta_perbesar': 'Tap to enlarge',
  'beranda.pilih': 'Choose building and floor',
  'beranda.kosong': 'No locations available yet. Try reloading this page.',

  'lapor.pilih_jenis': 'Which toilet?',
  'lapor.ajakan':
    'Just write it the way you would say it. The system will tidy it up and work out the priority.',
  'lapor.label_teks': "What's wrong?",
  'lapor.placeholder': 'For example: the toilet smells bad, the floor is wet, and the soap has run out.',
  'lapor.contoh1': 'It smells really bad, the floor is soaking wet, and the soap is gone.',
  'lapor.contoh2': 'The corner toilet is clogged and the water is about to overflow.',
  'lapor.contoh3': 'The tissue dispenser is empty.',
  'lapor.foto': 'Photo (optional)',
  'lapor.ambil_foto': 'Take or choose a photo',
  'lapor.hapus_foto': 'Remove',
  'lapor.kirim': 'Send report',
  'lapor.mengirim': 'Sending…',
  'lapor.galat_pendek': 'Please describe the problem a little more clearly.',
  'lapor.galat_foto': 'Photos must be 5 MB or smaller.',
  'lapor.galat_kirim': 'Could not send the report',
  'lapor.tidak_dikenal': 'Unknown location code',
  'lapor.tidak_dikenal_isi':
    'The QR code you scanned is not registered. Try choosing the location manually.',
  'lapor.pilih_manual': 'Choose a location',

  'status.berhasil': 'Your report has been received',
  'status.berhasil_isi': 'Staff will see it on their dashboard. Thanks for reporting.',
  'status.hasil': 'Analysis result',
  'status.menganalisis': 'Analysing your report…',
  'status.gagal':
    'Automatic analysis has not succeeded yet, but your report is recorded and staff will review it.',
  'status.tindakan': 'Action for staff:',
  'status.galat_muat': 'Could not load the report',

  'login.judul': 'Staff Sign In',
  'login.keterangan': 'Your name is used to record who handled each report.',
  'login.nama': 'Staff name',
  'login.password': 'Password',
  'login.masuk': 'Sign in',
  'login.memeriksa': 'Checking…',
  'login.galat': 'Could not sign in',

  'dash.judul': 'Staff Dashboard',
  'dash.sebagai': 'Signed in as {nama}',
  'dash.keluar': 'Sign out',
  'dash.stat_total': 'Reports today',
  'dash.stat_tinggi': 'High priority',
  'dash.stat_belum': 'Still open',
  'dash.stat_gagal': 'Analysis failed',
  'dash.ringkasan': "Today's summary",
  'dash.buat_ulang': 'Rebuild',
  'dash.menyusun': 'Writing…',
  'dash.ringkasan_kosong':
    'No summary yet. One is written automatically at 17.00 WIB, or press Rebuild.',
  'dash.lokasi_teratas': 'Most reported locations today',
  'dash.memuat_laporan': 'Loading reports…',
  'dash.kosong': 'No reports match this filter.',
  'dash.semua_status': 'All statuses',
  'dash.semua_prioritas': 'All priorities',
  'dash.laporan_asli': 'Original report',
  'dash.tindakan': 'Action:',
  'dash.kerjakan': 'Start work',
  'dash.selesaikan': 'Mark done',
  'dash.analisa_ulang': 'Re-analyse',
  'dash.ditangani': 'Handled by: {nama}',

  'prioritas.tinggi': 'High priority',
  'prioritas.sedang': 'Medium priority',
  'prioritas.rendah': 'Low priority',
  'status.baru': 'new',
  'status.diproses': 'in progress',
  'status.selesai': 'done',
  'pilih.tinggi': 'High',
  'pilih.sedang': 'Medium',
  'pilih.rendah': 'Low',

  'kategori.kebersihan': 'cleanliness',
  'kategori.perlengkapan': 'supplies',
  'kategori.kerusakan': 'damage',
  'kategori.bau': 'odour',
  'kategori.genangan': 'flooding',
  'kategori.lainnya': 'other',

  'waktu.baru': 'just now',
  'waktu.menit': '{n} min ago',
  'waktu.jam': '{n} h ago',
  'waktu.hari': '{n} d ago',
};

const KAMUS: Record<Bahasa, Record<Kunci, string>> = { id: ID, en: EN };
const PENYIMPANAN = 'bahasa';

export type Terjemah = (kunci: Kunci, isian?: Record<string, string | number>) => string;

const Konteks = createContext<{ bahasa: Bahasa; ubah: (b: Bahasa) => void; t: Terjemah } | null>(null);

function bahasaAwal(): Bahasa {
  try {
    const tersimpan = localStorage.getItem(PENYIMPANAN);
    if (tersimpan === 'id' || tersimpan === 'en') return tersimpan;
    // Pengunjung berbahasa Inggris langsung mendapat antarmuka Inggris.
    if (navigator.language?.toLowerCase().startsWith('en')) return 'en';
  } catch {
    /* localStorage bisa diblokir; jatuh ke bawaan */
  }
  return 'id';
}

export function PenyediaBahasa({ children }: { children: React.ReactNode }) {
  const [bahasa, setBahasa] = useState<Bahasa>(bahasaAwal);

  useEffect(() => {
    document.documentElement.lang = bahasa;
    try {
      localStorage.setItem(PENYIMPANAN, bahasa);
    } catch {
      /* abaikan bila penyimpanan tidak tersedia */
    }
  }, [bahasa]);

  const t = useCallback<Terjemah>(
    (kunci, isian) => {
      const teks = KAMUS[bahasa][kunci] ?? kunci;
      if (!isian) return teks;
      return teks.replace(/\{(\w+)\}/g, (_, nama: string) => String(isian[nama] ?? `{${nama}}`));
    },
    [bahasa],
  );

  const nilai = useMemo(() => ({ bahasa, ubah: setBahasa, t }), [bahasa, t]);
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

export function useBahasa() {
  const nilai = useContext(Konteks);
  if (!nilai) throw new Error('useBahasa harus dipakai di dalam PenyediaBahasa');
  return nilai;
}

/** Waktu relatif yang mengikuti bahasa aktif. */
export function useWaktuRelatif() {
  const { t } = useBahasa();
  return useCallback(
    (iso: string) => {
      // created_at dari D1 berformat 'YYYY-MM-DD HH:MM:SS' dalam UTC.
      const waktu = Date.parse(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
      const menit = Math.floor((Date.now() - waktu) / 60000);
      if (menit < 1) return t('waktu.baru');
      if (menit < 60) return t('waktu.menit', { n: menit });
      const jam = Math.floor(menit / 60);
      if (jam < 24) return t('waktu.jam', { n: jam });
      return t('waktu.hari', { n: Math.floor(jam / 24) });
    },
    [t],
  );
}
