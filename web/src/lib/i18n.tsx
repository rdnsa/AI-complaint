import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'id' | 'en';

/**
 * The interface dictionary. Indonesian defines the shape, so TypeScript refuses
 * to compile when a key is left untranslated.
 *
 * Note: LLM output (summaries and recommendations) stays in Indonesian because
 * its readers are the cleaning staff; only the interface itself is translated
 * here.
 */
const ID = {
  'header.university': 'Universitas Pendidikan Indonesia',
  'header.campus': 'Kampus Tasikmalaya',
  'app.title': 'Lapor Kondisi Toilet',
  'app.subtitle':
    'Laporan kamu langsung diterima petugas kebersihan, tanpa perlu login dan tanpa menyebut nama.',

  'common.loading': 'Memuat…',
  'common.building': 'Gedung {code}',
  'common.floor': 'Lantai {n}',
  'nav.to_supervisor_dashboard': 'Buka dashboard SPV',
  'nav.home': 'Kembali ke beranda',
  'nav.back': 'Kembali',
  'nav.all_reports': 'Lihat semua laporan yang masuk',
  'language.label': 'Bahasa',
  'theme.to_dark': 'Ganti ke mode gelap',
  'theme.to_light': 'Ganti ke mode terang',
  'password.show': 'Tampilkan password',
  'password.hide': 'Sembunyikan password',

  'toilet_type.men': 'Pria',
  'toilet_type.women': 'Wanita',
  'toilet_type.accessible': 'Disabilitas',

  'home.hint':
    'Biasanya kamu cukup memindai QR yang tertempel di pintu toilet. Kalau QR-nya hilang atau rusak, pilih lokasinya di bawah ini.',
  'home.map_caption': 'Peta lokasi gedung — Jln. Dadaha No. 18, Kota Tasikmalaya',
  'home.map_alt': 'Peta lokasi gedung UPI Kampus Tasikmalaya',
  'home.map_enlarge': 'Ketuk untuk perbesar',
  'home.map_close': 'Tutup peta',
  'home.map_zoom_in': 'Perbesar',
  'home.map_zoom_out': 'Perkecil',
  'home.map_hint': 'Cubit, gulir, atau ketuk dua kali untuk zoom · seret untuk menggeser',
  'home.choose_location': 'Pilih gedung dan lantai',
  'home.empty': 'Daftar lokasi belum tersedia. Coba muat ulang halaman ini.',

  'report.choose_toilet': 'Toilet yang mana?',
  'report.prompt':
    'Tulis apa adanya, pakai bahasa sehari-hari. Sistem yang akan merapikan dan menentukan prioritasnya.',
  'report.description_label': 'Apa yang bermasalah?',
  'report.placeholder': 'Contoh: WC lantai 2 bau banget, lantainya becek, sama sabunnya habis.',
  'report.example1': 'WC-nya bau banget, lantainya becek, sabunnya habis.',
  'report.example2': 'Kloset yang pojok mampet, airnya hampir meluap.',
  'report.example3': 'Tisu di dispenser habis.',
  'report.photo': 'Foto keadaan (wajib)',
  'report.photo_reason': 'Foto membuat petugas tahu persis apa yang harus dibawa dan dikerjakan.',
  'report.take_photo': 'Buka kamera',
  'report.remove_photo': 'Hapus',
  'report.submit': 'Kirim laporan',
  'report.submitting': 'Mengirim…',
  'report.error_too_short': 'Tolong tulis keluhannya sedikit lebih jelas.',
  'report.error_photo_size': 'Ukuran foto maksimal 5 MB.',
  'report.error_submit': 'Gagal mengirim laporan',
  'report.unknown_location': 'Kode lokasi tidak dikenal',
  'report.unknown_location_body':
    'QR yang kamu pindai tidak terdaftar. Coba pilih lokasinya secara manual.',
  'report.choose_manually': 'Pilih lokasi',

  'status.success': 'Laporan kamu sudah masuk',
  'status.success_body': 'Petugas kebersihan akan melihatnya dan menanganinya. Terima kasih sudah melaporkan.',
  'status.analysis_result': 'Hasil analisis',
  'status.analysing': 'Sedang menganalisis keluhan kamu…',
  'status.analysis_failed':
    'Analisis otomatis belum berhasil, tetapi laporan kamu tetap tercatat dan akan ditinjau petugas.',
  'status.action': 'Tindakan untuk petugas:',
  'status.error_load': 'Gagal memuat laporan',
  'status.saved_hint':
    'Simpan tautan halaman ini, atau masuk ke akunmu agar laporan ini tercatat di daftar “Laporan saya”.',
  'status.saved_account': 'Laporan ini tercatat di daftar “Laporan saya” pada akunmu.',

  'public.title': 'Laporan Masuk',
  'public.description':
    'Semua laporan beserta status penanganannya, terbuka untuk siapa saja. Hanya petugas yang dapat mengubahnya.',
  'public.empty': 'Belum ada laporan yang masuk.',
  'public.pending_summary': 'Menunggu ringkasan otomatis.',
  'public.count': '{resolved} dari {total} laporan sudah selesai ditangani',

  'history.title': 'Laporan saya',
  'history.view': 'Lihat',

  'tracker.title': 'Status penanganan',
  'tracker.received': 'Laporan diterima',
  'tracker.in_progress': 'Sedang dikerjakan petugas',
  'tracker.resolved': 'Selesai ditangani',
  'tracker.waiting': 'Menunggu dikerjakan petugas',
  'tracker.by': 'oleh {name}',
  'tracker.auto_refresh': 'Halaman ini memperbarui dirinya sendiri.',

  'login.title': 'Masuk',
  'login.description':
    'Untuk SPV, atau mahasiswa yang ingin ikut papan peringkat. Petugas kebersihan tidak perlu masuk.',
  'login.username': 'Username',
  'login.full_name': 'Nama lengkap',
  'login.password': 'Password',
  'login.submit': 'Masuk',
  'login.checking': 'Memeriksa…',
  'login.error': 'Gagal masuk',
  'login.no_account': 'Belum punya akun? Daftar di sini',
  'register.title': 'Daftar Akun Pelapor',
  'register.description':
    'Dengan akun, laporanmu tercatat atas namamu dan masuk hitungan papan peringkat.',
  'register.submit': 'Daftar',
  'register.submitting': 'Mendaftarkan…',
  'register.have_account': 'Sudah punya akun? Masuk di sini',
  'register.password_rule': 'Minimal 8 karakter.',
  'register.username_rule': 'Huruf, angka, titik, garis bawah, atau strip. Minimal 3 karakter.',

  'session.hello': 'Halo, {name}',
  'session.logout': 'Keluar',
  'session.login': 'Masuk',
  'session.register': 'Daftar',
  'session.anonymous_info': 'Kamu melapor tanpa akun, jadi laporan ini tidak masuk papan peringkat.',
  'session.reporting_as': 'Melapor sebagai {name}',

  'leaderboard.title': 'Papan Peringkat Pelapor',
  'leaderboard.description':
    'Diurutkan dari jumlah laporan terbanyak. Yang dihargai bukan sekadar banyaknya kiriman, tetapi laporan yang benar-benar berbuah perbaikan.',
  'leaderboard.view': 'Lihat papan peringkat',
  'leaderboard.reports': '{n} laporan',
  'leaderboard.resolved': '{n} selesai',
  'leaderboard.empty': 'Belum ada laporan bertanda pemilik.',
  'leaderboard.my_position': 'Posisimu: peringkat {rank} dengan {reports} laporan',
  'leaderboard.no_reports_yet': 'Kamu belum mengirim laporan atas nama akun ini.',

  'tab.accounts': 'Petugas & SPV',
  'home.section_roles': 'Pilih peran',
  'home.section_ai': 'Tanya AI',
  'home.section_qr': 'Stiker QR',
  'ask.title': 'Chatbot AI',
  'ask.tagline': 'Tanya data laporan dalam bahasa sehari-hari',
  'ask.try': 'Coba tanyakan',
  'ask.ai_label': 'Jawaban Chatbot AI',
  'ask.description':
    'Chatbot ini dijawab oleh kecerdasan buatan (AI). Tanyakan apa saja tentang data laporan dalam bahasa sehari-hari — AI hanya melihat angka agregat dari basis data, bukan isi laporan mentah, jadi jawabannya selalu berdasar data yang ada.',
  'ask.placeholder': 'Tanya Chatbot AI, contoh: gedung mana yang paling sering mampet bulan ini?',
  'ask.submit': 'Tanya',
  'ask.thinking': 'AI sedang mengambil data…',
  'ask.example1': 'Gedung mana yang paling banyak laporan 30 hari terakhir?',
  'ask.example2': 'Berapa rata-rata waktu penyelesaian laporan prioritas tinggi?',
  'ask.example3': 'Jam berapa laporan paling sering masuk?',
  'ask.example4': 'Petugas siapa yang paling banyak menyelesaikan laporan minggu ini?',
  'ask.example4_public': 'Berapa laporan yang sudah selesai ditangani minggu ini?',
  'ask.remaining': 'Sisa {n} pertanyaan hari ini',
  'ask.error': 'Gagal mendapatkan jawaban',
  'ask.clear': 'Mulai percakapan baru',
  'action.question': 'Tanya data',
  'account.title': 'Kelola petugas dan SPV',
  'account.add_staff': 'Tambah petugas',
  'account.add_supervisor': 'Tambah akun SPV',
  'account.staff_no_login': 'Petugas cukup nama saja. Nama ini muncul di pilihan "Siapa kamu?" pada halaman petugas.',
  'account.username': 'Username',
  'account.name': 'Nama',
  'account.role_staff': 'Petugas',
  'account.new_password': 'Password baru',
  'account.save': 'Simpan',
  'account.cancel': 'Batal',
  'account.edit': 'Ubah',
  'account.deactivate': 'Nonaktifkan',
  'account.activate': 'Aktifkan',
  'account.inactive': 'nonaktif',
  'account.password_blank_hint': 'Kosongkan bila tidak ingin mengganti password.',
  'action.user_changed': 'Kelola akun',

  'dashboard.title': 'Dashboard SPV',
  'dashboard.signed_in_as': 'Masuk sebagai {name}',
  'dashboard.logout': 'Keluar',
  'dashboard.stat_total': 'Laporan hari ini',
  'dashboard.stat_high': 'Prioritas tinggi',
  'dashboard.stat_unresolved': 'Belum selesai',
  'dashboard.stat_ai_failed': 'Analisis gagal',
  'dashboard.summary': 'Ringkasan hari ini',
  'dashboard.regenerate': 'Buat ulang',
  'dashboard.generating': 'Menyusun…',
  'dashboard.summary_empty':
    'Belum ada ringkasan. Dibuat otomatis tiap pukul 17.00 WIB, atau tekan tombol Buat ulang.',
  'dashboard.top_locations': 'Lokasi terbanyak hari ini',
  'dashboard.loading_reports': 'Memuat laporan…',
  'dashboard.empty': 'Tidak ada laporan untuk filter ini.',
  'dashboard.all_statuses': 'Semua status',
  'dashboard.all_priorities': 'Semua prioritas',
  'dashboard.original_report': 'Laporan asli',
  'dashboard.action': 'Tindakan:',
  'dashboard.start_work': 'Kerjakan',
  'dashboard.mark_resolved': 'Tandai selesai',
  'dashboard.reanalyze': 'Analisis ulang',
  'dashboard.handled_by': 'Ditangani: {name}',
  'dashboard.delete': 'Hapus',
  'dashboard.proof_required': 'Foto toilet yang sudah bersih. AI memeriksa foto sebelum laporan bisa ditandai selesai.',
  'dashboard.uploading': 'Mengunggah…',
  'dashboard.checking': 'AI memeriksa foto…',
  'dashboard.proof': 'Bukti penyelesaian',
  'dashboard.proof_verified': 'Diverifikasi AI: bersih',
  'dashboard.proof_rejected': 'Foto ditolak',
  'dashboard.proof_rejected_dirty': 'Toilet pada foto masih terlihat kotor. Bersihkan lagi, lalu foto ulang.',
  'dashboard.proof_rejected_not_toilet':
    'Foto tidak menunjukkan toilet. Ambil foto kondisi toilet yang sudah dibersihkan.',
  'dashboard.verification_failed': 'Pemeriksaan foto gagal. Coba lagi sebentar.',
  'dashboard.ai_reason': 'Penilaian AI',
  'tab.reports': 'Laporan',
  'tab.charts': 'Grafik',
  'tab.activity': 'Aktivitas',
  'charts.daily': 'Laporan 14 hari terakhir',
  'charts.received': 'Masuk',
  'charts.resolved': 'Selesai',
  'charts.categories': 'Kategori masalah',
  'charts.priorities': 'Sebaran prioritas',
  'charts.buildings': 'Laporan per gedung',
  'charts.average': 'Rata-rata waktu penyelesaian',
  'charts.average_of': 'dari {n} laporan yang sudah selesai',
  'charts.no_data': 'Belum ada data yang cukup untuk digambarkan.',
  'charts.period': '{n} hari terakhir',
  'charts.vs_previous': 'vs {n} hari sebelumnya',
  'charts.kpi_reports': 'Laporan masuk',
  'charts.kpi_high': 'Prioritas tinggi',
  'charts.kpi_resolution_rate': 'Tingkat penyelesaian',
  'charts.composition': 'Komposisi prioritas per hari',
  'charts.composition_hint': 'Apakah beban yang berat bertambah, atau hanya jumlahnya yang naik?',
  'charts.pattern': 'Kapan keluhan masuk',
  'charts.pattern_hint': 'Hari × jam (WIB) — dasar untuk menyusun jadwal ronda petugas.',
  'charts.matrix': 'Gedung × jenis masalah',
  'charts.matrix_hint': 'Menunjukkan masalah mana yang menempel pada gedung tertentu.',
  'charts.effectiveness': 'Waktu penyelesaian per prioritas',
  'charts.effectiveness_hint':
    'Uji nyata sistem prioritas: laporan berprioritas tinggi seharusnya selesai lebih cepat.',
  'charts.fewer': 'sedikit',
  'charts.more': 'banyak',
  'charts.none_resolved': 'belum ada yang selesai',
  'weekday.0': 'Min',
  'weekday.1': 'Sen',
  'weekday.2': 'Sel',
  'weekday.3': 'Rab',
  'weekday.4': 'Kam',
  'weekday.5': 'Jum',
  'weekday.6': 'Sab',
  'charts.hours': '{n} jam',
  'charts.minutes': '{n} menit',
  'activity.title': 'Catatan aktivitas',
  'activity.description':
    'Setiap pergerakan laporan tercatat di sini dan tidak dapat diubah dari aplikasi. Laporan yang dihapus tetap meninggalkan salinan isinya.',
  'activity.all': 'Semua aktivitas',
  'activity.empty': 'Belum ada aktivitas.',
  'activity.deleted_contents': 'Isi laporan yang dihapus',
  'action.report_created': 'Laporan masuk',
  'action.analysis': 'Analisis',
  'action.analysis_failed': 'Analisis gagal',
  'action.status_changed': 'Ubah status',
  'action.report_deleted': 'Penghapusan',
  'action.login': 'SPV masuk',
  'action.daily_summary': 'Ringkasan harian',
  'action.proof_rejected': 'Bukti ditolak',
  'action.verification_failed': 'Verifikasi gagal',
  'action.work_logged': 'Laporan pekerjaan',
  'dashboard.delete_confirm': 'Hapus laporan ini secara permanen? Tindakan ini tidak bisa dibatalkan.',

  'tab.work_logs': 'Pekerjaan',
  'qr.title': 'Kode QR untuk pintu toilet',
  'qr.subtitle': 'Cetak ulang stiker yang hilang atau rusak.',
  'qr.show': 'Tampilkan',
  'qr.hide': 'Sembunyikan',
  'qr.description':
    'Satu kode QR untuk setiap lantai. Cetak lalu tempel di pintu toilet; mahasiswa dan petugas memindainya untuk melapor. Kode baru muncul otomatis saat lantai ditambahkan.',
  'qr.all_buildings': 'Semua gedung',
  'qr.count': '{n} kode QR',
  'qr.print': 'Cetak',
  'qr.empty': 'Belum ada lokasi terdaftar.',
  'qr.sticker_heading': 'Lapor kondisi toilet',
  'qr.scan_hint': 'Pindai untuk melapor',
  'qr.download_png': 'Unduh PNG',
  'work.title': 'Laporan pekerjaan',
  'work.choose_toilet': 'Toilet mana yang sudah dibersihkan?',
  'work.recorded_as': 'Dicatat atas nama {name}',
  'work.description_label': 'Apa yang sudah dikerjakan?',
  'work.placeholder': 'Contoh: lantai dipel, kloset disikat, sabun dan tisu diisi ulang.',
  'work.example1': 'Menyapu dan mengepel lantai, membuang sampah.',
  'work.example2': 'Menyikat kloset dan wastafel sampai bersih.',
  'work.example3': 'Mengisi ulang sabun dan tisu.',
  'work.photo': 'Foto hasil pekerjaan (wajib)',
  'work.photo_reason':
    'Foto toilet yang sudah bersih, langsung dari kamera. AI memeriksa foto sebelum laporan disimpan.',
  'work.submit': 'Kirim laporan pekerjaan',
  'work.error_too_short': 'Tulis sedikit lebih jelas apa yang dikerjakan.',
  'work.error_submit': 'Gagal mengirim laporan pekerjaan',
  'work.submitted': 'Laporan pekerjaan tersimpan',
  'work.report_another': 'Laporkan toilet lain di lantai ini',
  'work.description':
    'Catatan toilet yang sudah dibersihkan petugas. Setiap foto sudah diperiksa AI dan dinilai bersih.',
  'work.all_staff': 'Semua petugas',
  'work.empty': 'Belum ada laporan pekerjaan.',

  'role.label': 'Kamu siapa?',
  'role.student': 'Saya mahasiswa',
  'role.student_body': 'Laporkan toilet yang kotor atau rusak.',
  'role.staff': 'Saya petugas',
  'role.staff_body': 'Selesaikan laporan dan catat toilet yang sudah dibersihkan.',
  'role.supervisor': 'Saya SPV',
  'role.supervisor_body': 'Masuk untuk memantau laporan mahasiswa dan kerja petugas.',

  'staff.title': 'Halaman Petugas',
  'staff.description': 'Tanpa login. Cukup pilih namamu.',
  'staff.who_are_you': 'Siapa kamu?',
  'staff.pick_name': '— Pilih namamu —',
  'staff.list_empty': 'Belum ada nama petugas. Minta SPV menambahkannya.',
  'staff.tab_reports': 'Laporan mahasiswa',
  'staff.tab_work': 'Sudah saya bersihkan',
  'staff.no_reports': 'Tidak ada laporan mahasiswa di lantai ini.',
  'staff.report_resolved': 'Laporan selesai. Terima kasih!',
  'staff.resolve': 'Sudah beres — foto buktinya',
  'staff.start_work': 'Saya kerjakan sekarang',
  'staff.qr_hint':
    'Paling mudah: scan QR di pintu toilet, lalu tekan "Saya petugas". HP ini akan mengingat namamu.',
  'staff.waiting': 'Laporan yang menunggu',
  'staff.all_done': 'Semua laporan sudah selesai.',
  'staff.open': 'Buka',

  'camera.title': 'Kamera',
  'camera.starting': 'Menyalakan kamera…',
  'camera.capture': 'Ambil foto',
  'camera.close': 'Batal',
  'camera.retry': 'Coba lagi',
  'camera.error_title': 'Kamera tidak bisa dibuka',
  'camera.error_denied':
    'Izin kamera ditolak. Buka pengaturan situs di browser, izinkan kamera, lalu coba lagi.',
  'camera.error_not_found': 'Perangkat ini tidak punya kamera yang bisa dipakai.',
  'camera.error_insecure': 'Browser ini tidak mengizinkan kamera. Buka situs lewat HTTPS dengan Chrome atau Safari.',
  'camera.error_failed': 'Kamera sedang dipakai aplikasi lain, atau terjadi kesalahan.',

  'priority.high': 'Prioritas tinggi',
  'priority.medium': 'Prioritas sedang',
  'priority.low': 'Prioritas rendah',
  'status.new': 'baru',
  'status.in_progress': 'diproses',
  'status.resolved': 'selesai',
  'priority_short.high': 'Tinggi',
  'priority_short.medium': 'Sedang',
  'priority_short.low': 'Rendah',

  'category.cleanliness': 'kebersihan',
  'category.supplies': 'perlengkapan',
  'category.damage': 'kerusakan',
  'category.odor': 'bau',
  'category.flooding': 'genangan',
  'category.other': 'lainnya',

  'time.just_now': 'baru saja',
  'time.minutes_ago': '{n} menit lalu',
  'time.hours_ago': '{n} jam lalu',
  'time.days_ago': '{n} hari lalu',
  'time.filter': 'Waktu',
  'time.all': 'Semua',
  'time.today': 'Hari ini',
  'time.yesterday': 'Kemarin',
  'time.7_days': '7 hari',
  'time.30_days': '30 hari',
  'time.custom': 'Pilih tanggal…',
  'time.reset': 'Hapus filter waktu',
  'time.from_date': 'Dari tanggal',
  'time.to_date': 'Sampai tanggal',
  'time.from_hour': 'Dari jam',
  'time.to_hour': 'Sampai jam',
  'time.count': '{n} data ditampilkan',
  'time.received': 'Masuk',
  'time.resolved': 'Selesai',
  'time.cleaned': 'Dibersihkan',
} as const;

type Key = keyof typeof ID;

const EN: Record<Key, string> = {
  'header.university': 'Universitas Pendidikan Indonesia',
  'header.campus': 'Tasikmalaya Campus',
  'app.title': 'Report Toilet Condition',
  'app.subtitle':
    'Your report goes straight to the cleaning staff. No sign-in, and no name required.',

  'common.loading': 'Loading…',
  'common.building': 'Building {code}',
  'common.floor': 'Floor {n}',
  'nav.to_supervisor_dashboard': 'Open the supervisor dashboard',
  'nav.home': 'Back to home',
  'nav.back': 'Back',
  'nav.all_reports': 'See all incoming reports',
  'language.label': 'Language',
  'theme.to_dark': 'Switch to dark mode',
  'theme.to_light': 'Switch to light mode',
  'password.show': 'Show password',
  'password.hide': 'Hide password',

  'toilet_type.men': 'Men',
  'toilet_type.women': 'Women',
  'toilet_type.accessible': 'Accessible',

  'home.hint':
    'Normally you just scan the QR code on the toilet door. If the code is missing or damaged, pick the location below.',
  'home.map_caption': 'Building map — Jln. Dadaha No. 18, Tasikmalaya',
  'home.map_alt': 'Building location map of UPI Tasikmalaya Campus',
  'home.map_enlarge': 'Tap to enlarge',
  'home.map_close': 'Close map',
  'home.map_zoom_in': 'Zoom in',
  'home.map_zoom_out': 'Zoom out',
  'home.map_hint': 'Pinch, scroll or double-tap to zoom · drag to move around',
  'home.choose_location': 'Choose building and floor',
  'home.empty': 'No locations available yet. Try reloading this page.',

  'report.choose_toilet': 'Which toilet?',
  'report.prompt':
    'Just write it the way you would say it. The system will tidy it up and work out the priority.',
  'report.description_label': "What's wrong?",
  'report.placeholder': 'For example: the toilet smells bad, the floor is wet, and the soap has run out.',
  'report.example1': 'It smells really bad, the floor is soaking wet, and the soap is gone.',
  'report.example2': 'The corner toilet is clogged and the water is about to overflow.',
  'report.example3': 'The tissue dispenser is empty.',
  'report.photo': 'Photo of the condition (required)',
  'report.photo_reason': 'A photo tells staff exactly what to bring and what to fix.',
  'report.take_photo': 'Open camera',
  'report.remove_photo': 'Remove',
  'report.submit': 'Send report',
  'report.submitting': 'Sending…',
  'report.error_too_short': 'Please describe the problem a little more clearly.',
  'report.error_photo_size': 'Photos must be 5 MB or smaller.',
  'report.error_submit': 'Could not send the report',
  'report.unknown_location': 'Unknown location code',
  'report.unknown_location_body':
    'The QR code you scanned is not registered. Try choosing the location manually.',
  'report.choose_manually': 'Choose a location',

  'status.success': 'Your report has been received',
  'status.success_body': 'The cleaning staff will see it and take care of it. Thanks for reporting.',
  'status.analysis_result': 'Analysis result',
  'status.analysing': 'Analysing your report…',
  'status.analysis_failed':
    'Automatic analysis has not succeeded yet, but your report is recorded and staff will review it.',
  'status.action': 'Action for staff:',
  'status.error_load': 'Could not load the report',
  'status.saved_hint':
    'Save this page\u2019s link, or sign in so the report is listed under “My reports” on your account.',
  'status.saved_account': 'This report is listed under “My reports” on your account.',

  'public.title': 'Incoming Reports',
  'public.description':
    'Every report and how far it has been handled, open to anyone. Only staff can change them.',
  'public.empty': 'No reports have come in yet.',
  'public.pending_summary': 'Waiting for the automatic summary.',
  'public.count': '{resolved} of {total} reports resolved',

  'history.title': 'My reports',
  'history.view': 'View',

  'tracker.title': 'Handling status',
  'tracker.received': 'Report received',
  'tracker.in_progress': 'Staff are working on it',
  'tracker.resolved': 'Resolved',
  'tracker.waiting': 'Waiting for staff',
  'tracker.by': 'by {name}',
  'tracker.auto_refresh': 'This page refreshes itself.',

  'login.title': 'Sign In',
  'login.description':
    'For supervisors, or students who want to join the leaderboard. Cleaning staff do not need to sign in.',
  'login.username': 'Username',
  'login.full_name': 'Full name',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.checking': 'Checking…',
  'login.error': 'Could not sign in',
  'login.no_account': "Don't have an account? Register here",
  'register.title': 'Create a Reporter Account',
  'register.description':
    'With an account your reports are recorded under your name and count towards the leaderboard.',
  'register.submit': 'Register',
  'register.submitting': 'Registering…',
  'register.have_account': 'Already have an account? Sign in',
  'register.password_rule': 'At least 8 characters.',
  'register.username_rule': 'Letters, digits, dot, underscore, or hyphen. At least 3 characters.',

  'session.hello': 'Hi, {name}',
  'session.logout': 'Sign out',
  'session.login': 'Sign in',
  'session.register': 'Register',
  'session.anonymous_info': 'You are reporting without an account, so this will not count on the leaderboard.',
  'session.reporting_as': 'Reporting as {name}',

  'leaderboard.title': 'Reporter Leaderboard',
  'leaderboard.description':
    'Ranked by number of reports. What counts is not volume alone, but reports that led to a real fix.',
  'leaderboard.view': 'View the leaderboard',
  'leaderboard.reports': '{n} reports',
  'leaderboard.resolved': '{n} resolved',
  'leaderboard.empty': 'No reports have been filed under an account yet.',
  'leaderboard.my_position': 'Your position: rank {rank} with {reports} reports',
  'leaderboard.no_reports_yet': 'You have not filed any report under this account yet.',

  'tab.accounts': 'Staff & Supervisors',
  'home.section_roles': 'Choose your role',
  'home.section_ai': 'Ask the AI',
  'home.section_qr': 'QR stickers',
  'ask.title': 'AI Chatbot',
  'ask.tagline': 'Ask about the report data in plain language',
  'ask.try': 'Try asking',
  'ask.ai_label': 'AI Chatbot answer',
  'ask.description':
    'This chatbot is answered by artificial intelligence (AI). Ask anything about the report data in plain language — the AI only sees aggregates fetched from the database, never raw complaint text, so every answer is grounded in the data.',
  'ask.placeholder': 'Ask the AI Chatbot, e.g. which building has the most blocked toilets this month?',
  'ask.submit': 'Ask',
  'ask.thinking': 'AI is fetching data…',
  'ask.example1': 'Which building had the most reports in the last 30 days?',
  'ask.example2': 'What is the average resolution time for high-priority reports?',
  'ask.example3': 'At what hour do reports come in most often?',
  'ask.example4': 'Which staff member resolved the most reports this week?',
  'ask.example4_public': 'How many reports were resolved this week?',
  'ask.remaining': '{n} questions left today',
  'ask.error': 'Could not get an answer',
  'ask.clear': 'Start a new conversation',
  'action.question': 'Data question',
  'account.title': 'Manage staff and supervisors',
  'account.add_staff': 'Add staff',
  'account.add_supervisor': 'Add supervisor account',
  'account.staff_no_login': 'Staff need only a name. It appears in the "Who are you?" list on the staff page.',
  'account.username': 'Username',
  'account.name': 'Name',
  'account.role_staff': 'Staff',
  'account.new_password': 'New password',
  'account.save': 'Save',
  'account.cancel': 'Cancel',
  'account.edit': 'Edit',
  'account.deactivate': 'Deactivate',
  'account.activate': 'Activate',
  'account.inactive': 'inactive',
  'account.password_blank_hint': 'Leave blank to keep the current password.',
  'action.user_changed': 'Account management',

  'dashboard.title': 'Supervisor Dashboard',
  'dashboard.signed_in_as': 'Signed in as {name}',
  'dashboard.logout': 'Sign out',
  'dashboard.stat_total': 'Reports today',
  'dashboard.stat_high': 'High priority',
  'dashboard.stat_unresolved': 'Still open',
  'dashboard.stat_ai_failed': 'Analysis failed',
  'dashboard.summary': "Today's summary",
  'dashboard.regenerate': 'Rebuild',
  'dashboard.generating': 'Writing…',
  'dashboard.summary_empty':
    'No summary yet. One is written automatically at 17.00 WIB, or press Rebuild.',
  'dashboard.top_locations': 'Most reported locations today',
  'dashboard.loading_reports': 'Loading reports…',
  'dashboard.empty': 'No reports match this filter.',
  'dashboard.all_statuses': 'All statuses',
  'dashboard.all_priorities': 'All priorities',
  'dashboard.original_report': 'Original report',
  'dashboard.action': 'Action:',
  'dashboard.start_work': 'Start work',
  'dashboard.mark_resolved': 'Mark done',
  'dashboard.reanalyze': 'Re-analyse',
  'dashboard.handled_by': 'Handled by: {name}',
  'dashboard.delete': 'Delete',
  'dashboard.proof_required': 'Photo of the cleaned toilet. AI checks the photo before the report can be marked done.',
  'dashboard.uploading': 'Uploading…',
  'dashboard.checking': 'AI is checking the photo…',
  'dashboard.proof': 'Proof of completion',
  'dashboard.proof_verified': 'AI-verified: clean',
  'dashboard.proof_rejected': 'Photo rejected',
  'dashboard.proof_rejected_dirty': 'The toilet in the photo still looks dirty. Clean it again, then retake the photo.',
  'dashboard.proof_rejected_not_toilet':
    'The photo does not show a toilet. Take a photo of the cleaned toilet.',
  'dashboard.verification_failed': 'The photo check failed. Please try again shortly.',
  'dashboard.ai_reason': 'AI assessment',
  'tab.reports': 'Reports',
  'tab.charts': 'Charts',
  'tab.activity': 'Activity',
  'charts.daily': 'Reports over the last 14 days',
  'charts.received': 'Received',
  'charts.resolved': 'Resolved',
  'charts.categories': 'Problem categories',
  'charts.priorities': 'Priority spread',
  'charts.buildings': 'Reports per building',
  'charts.average': 'Average time to resolve',
  'charts.average_of': 'across {n} resolved reports',
  'charts.no_data': 'Not enough data to plot yet.',
  'charts.period': 'last {n} days',
  'charts.vs_previous': 'vs the previous {n} days',
  'charts.kpi_reports': 'Reports received',
  'charts.kpi_high': 'High priority',
  'charts.kpi_resolution_rate': 'Resolution rate',
  'charts.composition': 'Priority mix per day',
  'charts.composition_hint': 'Is the heavy work growing, or only the raw count?',
  'charts.pattern': 'When complaints arrive',
  'charts.pattern_hint': 'Day × hour (WIB) — the basis for scheduling cleaning rounds.',
  'charts.matrix': 'Building × problem type',
  'charts.matrix_hint': 'Shows which problem is stuck to which building.',
  'charts.effectiveness': 'Time to resolve, by priority',
  'charts.effectiveness_hint':
    'The real test of the priority system: high-priority reports should close faster.',
  'charts.fewer': 'fewer',
  'charts.more': 'more',
  'charts.none_resolved': 'none resolved yet',
  'weekday.0': 'Sun',
  'weekday.1': 'Mon',
  'weekday.2': 'Tue',
  'weekday.3': 'Wed',
  'weekday.4': 'Thu',
  'weekday.5': 'Fri',
  'weekday.6': 'Sat',
  'charts.hours': '{n} h',
  'charts.minutes': '{n} min',
  'activity.title': 'Activity log',
  'activity.description':
    'Every movement of a report is recorded here and cannot be altered from the app. Deleted reports still leave a copy of their contents.',
  'activity.all': 'All activity',
  'activity.empty': 'No activity yet.',
  'activity.deleted_contents': 'Contents of the deleted report',
  'action.report_created': 'Report received',
  'action.analysis': 'Analysis',
  'action.analysis_failed': 'Analysis failed',
  'action.status_changed': 'Status change',
  'action.report_deleted': 'Deletion',
  'action.login': 'Supervisor sign-in',
  'action.daily_summary': 'Daily summary',
  'action.proof_rejected': 'Proof rejected',
  'action.verification_failed': 'Verification failed',
  'action.work_logged': 'Work report',
  'dashboard.delete_confirm': 'Delete this report permanently? This cannot be undone.',

  'tab.work_logs': 'Work log',
  'qr.title': 'QR codes for toilet doors',
  'qr.subtitle': 'Reprint a sticker that is lost or damaged.',
  'qr.show': 'Show',
  'qr.hide': 'Hide',
  'qr.description':
    'One QR code per floor. Print it and stick it on the toilet door; students and staff scan it to report. New codes appear automatically when a floor is added.',
  'qr.all_buildings': 'All buildings',
  'qr.count': '{n} QR codes',
  'qr.print': 'Print',
  'qr.empty': 'No locations registered yet.',
  'qr.sticker_heading': 'Report toilet condition',
  'qr.scan_hint': 'Scan to report',
  'qr.download_png': 'Download PNG',
  'work.title': 'Work report',
  'work.choose_toilet': 'Which toilet did you clean?',
  'work.recorded_as': 'Recorded as {name}',
  'work.description_label': 'What did you do?',
  'work.placeholder': 'For example: mopped the floor, scrubbed the toilet, refilled soap and tissue.',
  'work.example1': 'Swept and mopped the floor, emptied the bins.',
  'work.example2': 'Scrubbed the toilet and the sink clean.',
  'work.example3': 'Refilled the soap and tissue.',
  'work.photo': 'Photo of the result (required)',
  'work.photo_reason':
    'A photo of the cleaned toilet, straight from the camera. AI checks it before the report is saved.',
  'work.submit': 'Send work report',
  'work.error_too_short': 'Please describe what you did a little more clearly.',
  'work.error_submit': 'Could not send the work report',
  'work.submitted': 'Work report saved',
  'work.report_another': 'Report another toilet on this floor',
  'work.description':
    'Toilets the cleaning staff have cleaned. Every photo has been checked by AI and judged clean.',
  'work.all_staff': 'All staff',
  'work.empty': 'No work reports yet.',

  'role.label': 'Who are you?',
  'role.student': "I'm a student",
  'role.student_body': 'Report a dirty or broken toilet.',
  'role.staff': "I'm cleaning staff",
  'role.staff_body': 'Finish reports and record the toilets you cleaned.',
  'role.supervisor': "I'm the supervisor",
  'role.supervisor_body': 'Sign in to monitor student reports and staff work.',

  'staff.title': 'Staff Page',
  'staff.description': 'No sign-in. Just pick your name.',
  'staff.who_are_you': 'Who are you?',
  'staff.pick_name': '— Pick your name —',
  'staff.list_empty': 'No staff names yet. Ask the supervisor to add them.',
  'staff.tab_reports': 'Student reports',
  'staff.tab_work': 'I cleaned it',
  'staff.no_reports': 'No student reports on this floor.',
  'staff.report_resolved': 'Report done. Thank you!',
  'staff.resolve': 'Fixed — take the proof photo',
  'staff.start_work': "I'm on it now",
  'staff.qr_hint':
    'Easiest: scan the QR on the toilet door, then tap "I\'m cleaning staff". This phone will remember your name.',
  'staff.waiting': 'Reports waiting',
  'staff.all_done': 'Every report is done.',
  'staff.open': 'Open',

  'camera.title': 'Camera',
  'camera.starting': 'Starting the camera…',
  'camera.capture': 'Take photo',
  'camera.close': 'Cancel',
  'camera.retry': 'Try again',
  'camera.error_title': 'Could not open the camera',
  'camera.error_denied':
    'Camera permission was denied. Allow the camera in your browser site settings, then try again.',
  'camera.error_not_found': 'This device has no usable camera.',
  'camera.error_insecure': 'This browser does not allow the camera here. Open the site over HTTPS in Chrome or Safari.',
  'camera.error_failed': 'The camera is in use by another app, or something went wrong.',

  'priority.high': 'High priority',
  'priority.medium': 'Medium priority',
  'priority.low': 'Low priority',
  'status.new': 'new',
  'status.in_progress': 'in progress',
  'status.resolved': 'done',
  'priority_short.high': 'High',
  'priority_short.medium': 'Medium',
  'priority_short.low': 'Low',

  'category.cleanliness': 'cleanliness',
  'category.supplies': 'supplies',
  'category.damage': 'damage',
  'category.odor': 'odour',
  'category.flooding': 'flooding',
  'category.other': 'other',

  'time.just_now': 'just now',
  'time.minutes_ago': '{n} min ago',
  'time.hours_ago': '{n} h ago',
  'time.days_ago': '{n} d ago',
  'time.filter': 'Time',
  'time.all': 'All',
  'time.today': 'Today',
  'time.yesterday': 'Yesterday',
  'time.7_days': '7 days',
  'time.30_days': '30 days',
  'time.custom': 'Pick dates…',
  'time.reset': 'Clear time filter',
  'time.from_date': 'From date',
  'time.to_date': 'To date',
  'time.from_hour': 'From hour',
  'time.to_hour': 'To hour',
  'time.count': '{n} shown',
  'time.received': 'Received',
  'time.resolved': 'Resolved',
  'time.cleaned': 'Cleaned',
};

const DICTIONARIES: Record<Language, Record<Key, string>> = { id: ID, en: EN };
const STORAGE_KEY = 'language';

export type Translate = (key: Key, values?: Record<string, string | number>) => string;

const Context = createContext<{ language: Language; setLanguage: (l: Language) => void; t: Translate } | null>(
  null,
);

function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'id' || stored === 'en') return stored;
    // An English-speaking visitor gets the English interface straight away.
    if (navigator.language?.toLowerCase().startsWith('en')) return 'en';
  } catch {
    /* localStorage may be blocked; fall back to the default */
  }
  return 'id';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* ignore when storage is unavailable */
    }
  }, [language]);

  const t = useCallback<Translate>(
    (key, values) => {
      const text = DICTIONARIES[language][key] ?? key;
      if (!values) return text;
      return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLanguage() {
  const value = useContext(Context);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}

/** Relative time that follows the active language. */
export function useRelativeTime() {
  const { t } = useLanguage();
  return useCallback(
    (iso: string) => {
      // created_at from D1 is 'YYYY-MM-DD HH:MM:SS' in UTC.
      const time = Date.parse(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
      const minutes = Math.floor((Date.now() - time) / 60000);
      if (minutes < 1) return t('time.just_now');
      if (minutes < 60) return t('time.minutes_ago', { n: minutes });
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t('time.hours_ago', { n: hours });
      return t('time.days_ago', { n: Math.floor(hours / 24) });
    },
    [t],
  );
}

/**
 * A full WIB timestamp in the active language, e.g. "Sel, 23 Sep 2026 · 14.05".
 * Always shown in campus time, whatever time zone the viewing device is in.
 */
export function useFormatTime() {
  const { language } = useLanguage();
  return useMemo(() => {
    const locale = language === 'id' ? 'id-ID' : 'en-GB';
    const day = new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const clock = new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return (iso: string) => {
      // created_at from D1 is 'YYYY-MM-DD HH:MM:SS' in UTC.
      const time = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
      return `${day.format(time)} · ${clock.format(time)} WIB`;
    };
  }, [language]);
}
