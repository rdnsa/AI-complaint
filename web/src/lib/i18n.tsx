import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Bahasa = 'id' | 'en';

/**
 * The interface dictionary. Indonesian defines the shape, so TypeScript refuses
 * to compile when a key is left untranslated.
 *
 * Note: LLM output (summaries and recommendations) stays in Indonesian because
 * its readers are the cleaning staff; only the interface itself is translated
 * here.
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
  'nav.kembali': 'Kembali',
  'nav.semua_laporan': 'Lihat semua laporan yang masuk',
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
  'lapor.foto': 'Foto keadaan (wajib)',
  'lapor.foto_alasan': 'Foto membuat petugas tahu persis apa yang harus dibawa dan dikerjakan.',
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
  'status.tersimpan':
    'Simpan tautan halaman ini, atau masuk ke akunmu agar laporan ini tercatat di daftar “Laporan saya”.',
  'status.tersimpan_akun': 'Laporan ini tercatat di daftar “Laporan saya” pada akunmu.',

  'publik.judul': 'Laporan Masuk',
  'publik.keterangan':
    'Semua laporan beserta status penanganannya, terbuka untuk siapa saja. Hanya petugas yang dapat mengubahnya.',
  'publik.kosong': 'Belum ada laporan yang masuk.',
  'publik.menunggu': 'Menunggu ringkasan otomatis.',
  'publik.jumlah': '{selesai} dari {total} laporan sudah selesai ditangani',

  'riwayat.judul': 'Laporan saya',
  'riwayat.lihat': 'Lihat',

  'lacak.judul': 'Status penanganan',
  'lacak.diterima': 'Laporan diterima',
  'lacak.dikerjakan': 'Sedang dikerjakan petugas',
  'lacak.selesai': 'Selesai ditangani',
  'lacak.menunggu': 'Menunggu dikerjakan petugas',
  'lacak.oleh': 'oleh {nama}',
  'lacak.otomatis': 'Halaman ini memperbarui dirinya sendiri.',

  'login.judul': 'Masuk',
  'login.keterangan': 'Masuk untuk mengelola laporan, atau untuk ikut papan peringkat pelapor.',
  'login.username': 'Username',
  'login.nama': 'Nama lengkap',
  'login.password': 'Password',
  'login.masuk': 'Masuk',
  'login.memeriksa': 'Memeriksa…',
  'login.galat': 'Gagal masuk',
  'login.belum_punya': 'Belum punya akun? Daftar di sini',
  'daftar.judul': 'Daftar Akun Pelapor',
  'daftar.keterangan':
    'Dengan akun, laporanmu tercatat atas namamu dan masuk hitungan papan peringkat.',
  'daftar.tombol': 'Daftar',
  'daftar.memproses': 'Mendaftarkan…',
  'daftar.sudah_punya': 'Sudah punya akun? Masuk di sini',
  'daftar.syarat_sandi': 'Minimal 8 karakter.',
  'daftar.syarat_username': 'Huruf, angka, titik, garis bawah, atau strip. Minimal 3 karakter.',

  'sesi.halo': 'Halo, {nama}',
  'sesi.keluar': 'Keluar',
  'sesi.masuk': 'Masuk',
  'sesi.daftar': 'Daftar',
  'sesi.anonim_info': 'Kamu melapor tanpa akun, jadi laporan ini tidak masuk papan peringkat.',
  'sesi.sebagai': 'Melapor sebagai {nama}',

  'peringkat.judul': 'Papan Peringkat Pelapor',
  'peringkat.keterangan':
    'Diurutkan dari jumlah laporan terbanyak. Yang dihargai bukan sekadar banyaknya kiriman, tetapi laporan yang benar-benar berbuah perbaikan.',
  'peringkat.lihat': 'Lihat papan peringkat',
  'peringkat.laporan': '{n} laporan',
  'peringkat.selesai': '{n} selesai',
  'peringkat.kosong': 'Belum ada laporan bertanda pemilik.',
  'peringkat.posisi_saya': 'Posisimu: peringkat {peringkat} dengan {laporan} laporan',
  'peringkat.belum_lapor': 'Kamu belum mengirim laporan atas nama akun ini.',

  'tab.pengguna': 'Akun Petugas',
  'akun.judul': 'Kelola akun petugas',
  'akun.tambah': 'Tambah petugas',
  'akun.username': 'Username',
  'akun.nama': 'Nama',
  'akun.password_baru': 'Password baru',
  'akun.simpan': 'Simpan',
  'akun.batal': 'Batal',
  'akun.ubah': 'Ubah',
  'akun.nonaktifkan': 'Nonaktifkan',
  'akun.aktifkan': 'Aktifkan',
  'akun.nonaktif': 'nonaktif',
  'akun.kosongkan_sandi': 'Kosongkan bila tidak ingin mengganti password.',
  'aksi.pengguna': 'Kelola akun',

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
  'dash.hapus': 'Hapus',
  'dash.bukti_wajib': 'Unggah foto bukti untuk menyelesaikan',
  'dash.mengunggah': 'Mengunggah…',
  'dash.bukti': 'Bukti penyelesaian',
  'tab.laporan': 'Laporan',
  'tab.grafik': 'Grafik',
  'tab.aktivitas': 'Aktivitas',
  'grafik.harian': 'Laporan 14 hari terakhir',
  'grafik.masuk': 'Masuk',
  'grafik.selesai': 'Selesai',
  'grafik.kategori': 'Kategori masalah',
  'grafik.prioritas': 'Sebaran prioritas',
  'grafik.gedung': 'Laporan per gedung',
  'grafik.rata': 'Rata-rata waktu penyelesaian',
  'grafik.rata_dari': 'dari {n} laporan yang sudah selesai',
  'grafik.belum': 'Belum ada data yang cukup untuk digambarkan.',
  'grafik.periode': '{n} hari terakhir',
  'grafik.vs_lalu': 'vs {n} hari sebelumnya',
  'grafik.kpi_laporan': 'Laporan masuk',
  'grafik.kpi_tinggi': 'Prioritas tinggi',
  'grafik.kpi_tuntas': 'Tingkat penyelesaian',
  'grafik.komposisi': 'Komposisi prioritas per hari',
  'grafik.komposisi_ket': 'Apakah beban yang berat bertambah, atau hanya jumlahnya yang naik?',
  'grafik.pola': 'Kapan keluhan masuk',
  'grafik.pola_ket': 'Hari × jam (WIB) — dasar untuk menyusun jadwal ronda petugas.',
  'grafik.matriks': 'Gedung × jenis masalah',
  'grafik.matriks_ket': 'Menunjukkan masalah mana yang menempel pada gedung tertentu.',
  'grafik.efektivitas': 'Waktu penyelesaian per prioritas',
  'grafik.efektivitas_ket':
    'Uji nyata sistem prioritas: laporan berprioritas tinggi seharusnya selesai lebih cepat.',
  'grafik.sedikit': 'sedikit',
  'grafik.banyak': 'banyak',
  'grafik.belum_selesai': 'belum ada yang selesai',
  'hari.0': 'Min',
  'hari.1': 'Sen',
  'hari.2': 'Sel',
  'hari.3': 'Rab',
  'hari.4': 'Kam',
  'hari.5': 'Jum',
  'hari.6': 'Sab',
  'grafik.jam': '{n} jam',
  'grafik.menit': '{n} menit',
  'aktivitas.judul': 'Catatan aktivitas',
  'aktivitas.keterangan':
    'Setiap pergerakan laporan tercatat di sini dan tidak dapat diubah dari aplikasi. Laporan yang dihapus tetap meninggalkan salinan isinya.',
  'aktivitas.semua': 'Semua aktivitas',
  'aktivitas.kosong': 'Belum ada aktivitas.',
  'aktivitas.isi_dihapus': 'Isi laporan yang dihapus',
  'aksi.lapor': 'Laporan masuk',
  'aksi.analisis': 'Analisis',
  'aksi.analisis_gagal': 'Analisis gagal',
  'aksi.status': 'Ubah status',
  'aksi.hapus': 'Penghapusan',
  'aksi.masuk': 'Petugas masuk',
  'aksi.ringkasan': 'Ringkasan harian',
  'dash.hapus_konfirmasi': 'Hapus laporan ini secara permanen? Tindakan ini tidak bisa dibatalkan.',

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
  'nav.kembali': 'Back',
  'nav.semua_laporan': 'See all incoming reports',
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
  'lapor.foto': 'Photo of the condition (required)',
  'lapor.foto_alasan': 'A photo tells staff exactly what to bring and what to fix.',
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
  'status.tersimpan':
    'Save this page\u2019s link, or sign in so the report is listed under “My reports” on your account.',
  'status.tersimpan_akun': 'This report is listed under “My reports” on your account.',

  'publik.judul': 'Incoming Reports',
  'publik.keterangan':
    'Every report and how far it has been handled, open to anyone. Only staff can change them.',
  'publik.kosong': 'No reports have come in yet.',
  'publik.menunggu': 'Waiting for the automatic summary.',
  'publik.jumlah': '{selesai} of {total} reports resolved',

  'riwayat.judul': 'My reports',
  'riwayat.lihat': 'View',

  'lacak.judul': 'Handling status',
  'lacak.diterima': 'Report received',
  'lacak.dikerjakan': 'Staff are working on it',
  'lacak.selesai': 'Resolved',
  'lacak.menunggu': 'Waiting for staff',
  'lacak.oleh': 'by {nama}',
  'lacak.otomatis': 'This page refreshes itself.',

  'login.judul': 'Sign In',
  'login.keterangan': 'Sign in to manage reports, or to join the reporter leaderboard.',
  'login.username': 'Username',
  'login.nama': 'Full name',
  'login.password': 'Password',
  'login.masuk': 'Sign in',
  'login.memeriksa': 'Checking…',
  'login.galat': 'Could not sign in',
  'login.belum_punya': "Don't have an account? Register here",
  'daftar.judul': 'Create a Reporter Account',
  'daftar.keterangan':
    'With an account your reports are recorded under your name and count towards the leaderboard.',
  'daftar.tombol': 'Register',
  'daftar.memproses': 'Registering…',
  'daftar.sudah_punya': 'Already have an account? Sign in',
  'daftar.syarat_sandi': 'At least 8 characters.',
  'daftar.syarat_username': 'Letters, digits, dot, underscore, or hyphen. At least 3 characters.',

  'sesi.halo': 'Hi, {nama}',
  'sesi.keluar': 'Sign out',
  'sesi.masuk': 'Sign in',
  'sesi.daftar': 'Register',
  'sesi.anonim_info': 'You are reporting without an account, so this will not count on the leaderboard.',
  'sesi.sebagai': 'Reporting as {nama}',

  'peringkat.judul': 'Reporter Leaderboard',
  'peringkat.keterangan':
    'Ranked by number of reports. What counts is not volume alone, but reports that led to a real fix.',
  'peringkat.lihat': 'View the leaderboard',
  'peringkat.laporan': '{n} reports',
  'peringkat.selesai': '{n} resolved',
  'peringkat.kosong': 'No reports have been filed under an account yet.',
  'peringkat.posisi_saya': 'Your position: rank {peringkat} with {laporan} reports',
  'peringkat.belum_lapor': 'You have not filed any report under this account yet.',

  'tab.pengguna': 'Staff Accounts',
  'akun.judul': 'Manage staff accounts',
  'akun.tambah': 'Add staff',
  'akun.username': 'Username',
  'akun.nama': 'Name',
  'akun.password_baru': 'New password',
  'akun.simpan': 'Save',
  'akun.batal': 'Cancel',
  'akun.ubah': 'Edit',
  'akun.nonaktifkan': 'Deactivate',
  'akun.aktifkan': 'Activate',
  'akun.nonaktif': 'inactive',
  'akun.kosongkan_sandi': 'Leave blank to keep the current password.',
  'aksi.pengguna': 'Account management',

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
  'dash.hapus': 'Delete',
  'dash.bukti_wajib': 'Upload proof photo to finish',
  'dash.mengunggah': 'Uploading…',
  'dash.bukti': 'Proof of completion',
  'tab.laporan': 'Reports',
  'tab.grafik': 'Charts',
  'tab.aktivitas': 'Activity',
  'grafik.harian': 'Reports over the last 14 days',
  'grafik.masuk': 'Received',
  'grafik.selesai': 'Resolved',
  'grafik.kategori': 'Problem categories',
  'grafik.prioritas': 'Priority spread',
  'grafik.gedung': 'Reports per building',
  'grafik.rata': 'Average time to resolve',
  'grafik.rata_dari': 'across {n} resolved reports',
  'grafik.belum': 'Not enough data to plot yet.',
  'grafik.periode': 'last {n} days',
  'grafik.vs_lalu': 'vs the previous {n} days',
  'grafik.kpi_laporan': 'Reports received',
  'grafik.kpi_tinggi': 'High priority',
  'grafik.kpi_tuntas': 'Resolution rate',
  'grafik.komposisi': 'Priority mix per day',
  'grafik.komposisi_ket': 'Is the heavy work growing, or only the raw count?',
  'grafik.pola': 'When complaints arrive',
  'grafik.pola_ket': 'Day × hour (WIB) — the basis for scheduling cleaning rounds.',
  'grafik.matriks': 'Building × problem type',
  'grafik.matriks_ket': 'Shows which problem is stuck to which building.',
  'grafik.efektivitas': 'Time to resolve, by priority',
  'grafik.efektivitas_ket':
    'The real test of the priority system: high-priority reports should close faster.',
  'grafik.sedikit': 'fewer',
  'grafik.banyak': 'more',
  'grafik.belum_selesai': 'none resolved yet',
  'hari.0': 'Sun',
  'hari.1': 'Mon',
  'hari.2': 'Tue',
  'hari.3': 'Wed',
  'hari.4': 'Thu',
  'hari.5': 'Fri',
  'hari.6': 'Sat',
  'grafik.jam': '{n} h',
  'grafik.menit': '{n} min',
  'aktivitas.judul': 'Activity log',
  'aktivitas.keterangan':
    'Every movement of a report is recorded here and cannot be altered from the app. Deleted reports still leave a copy of their contents.',
  'aktivitas.semua': 'All activity',
  'aktivitas.kosong': 'No activity yet.',
  'aktivitas.isi_dihapus': 'Contents of the deleted report',
  'aksi.lapor': 'Report received',
  'aksi.analisis': 'Analysis',
  'aksi.analisis_gagal': 'Analysis failed',
  'aksi.status': 'Status change',
  'aksi.hapus': 'Deletion',
  'aksi.masuk': 'Staff sign-in',
  'aksi.ringkasan': 'Daily summary',
  'dash.hapus_konfirmasi': 'Delete this report permanently? This cannot be undone.',

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
    // An English-speaking visitor gets the English interface straight away.
    if (navigator.language?.toLowerCase().startsWith('en')) return 'en';
  } catch {
    /* localStorage may be blocked; fall back to the default */
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
      /* ignore when storage is unavailable */
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

/** Relative time that follows the active language. */
export function useWaktuRelatif() {
  const { t } = useBahasa();
  return useCallback(
    (iso: string) => {
      // created_at from D1 is 'YYYY-MM-DD HH:MM:SS' in UTC.
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
