import { execSync } from 'node:child_process';

/**
 * The checkpoints of the staging site, shown on the /checkpoint hub (see
 * journey.mjs). Written for classmates who were not part of the development:
 * what each checkpoint adds and where to try it. `tryIt` paths are relative to
 * that checkpoint's own app.
 *
 * `commit` is the checkpoint-N tag's commit on main; a checkpoint counts as
 * reported once that commit has been merged into staging.
 *
 * Text may use **bold**, *italic* and `code`.
 */
export const CHECKPOINTS = [
  {
    n: 1,
    commit: 'dd9c91a',
    short: 'Pondasi',
    title: 'Pondasi: keluhan menjadi tiket kerja',
    lead:
      'Mahasiswa memindai QR di pintu toilet dan menulis keluhan dengan bahasa sehari-hari. AI merapikannya menjadi tiket kerja yang jelas untuk petugas kebersihan.',
    features: [
      {
        who: ['Mahasiswa'],
        title: 'Lapor cukup dari QR',
        text: 'Setiap toilet punya stiker QR. Dipindai dengan kamera ponsel, formulir langsung terbuka dan sudah tahu toilet mana yang dimaksud. Tidak perlu memasang aplikasi atau membuat akun.',
      },
      {
        who: ['Mahasiswa'],
        title: 'Tulis apa adanya',
        text: 'Keluhan boleh ditulis dengan bahasa gaul dan singkatan, seperti *"wc lt 2 bau bgt"*. Foto boleh dilampirkan. Begitu dikirim, konfirmasi langsung muncul.',
      },
      {
        who: ['AI'],
        title: 'AI memahami dan menggolongkan',
        text: 'Dalam sekitar satu detik, AI menentukan **jenis masalah** (kebersihan, perlengkapan, kerusakan, bau, genangan air), **prioritas** (tinggi, sedang, rendah), ringkasan yang sopan, dan **perintah kerja** untuk petugas.',
      },
      {
        who: ['Petugas'],
        title: 'Dashboard petugas',
        text: 'Petugas melihat semua laporan dengan yang paling mendesak di atas, lalu mengubah statusnya dari *baru* ke *diproses* ke *selesai*. Untuk tahap ini, semua petugas masuk dengan satu sandi bersama.',
      },
      {
        who: ['Pimpinan'],
        title: 'Ringkasan harian otomatis',
        text: 'Setiap pukul 17.00 WIB, sistem menulis satu paragraf ringkasan tentang keadaan toilet hari itu. Ringkasan juga bisa dibuat ulang kapan saja dari dashboard.',
      },
    ],
    tryIt: [
      { label: 'Buka beranda', href: '/' },
      { label: 'Contoh formulir lapor', href: '/lapor/A-1-PRIA' },
      { label: 'Dashboard petugas', href: '/petugas' },
    ],
    tryNote: 'Dashboard petugas meminta sandi bersama. Tanyakan sandinya kepada pengembang.',
  },

  {
    n: 2,
    commit: 'feb7e49',
    short: 'Sesuai kampus',
    title: 'Sesuai kampus, dan bisa dilacak',
    lead:
      'Sistem disesuaikan dengan gedung UPI Kampus Tasikmalaya yang sebenarnya. Pelapor kini bisa melacak laporannya, dan siapa pun bisa melihat apakah keluhan benar-benar ditangani.',
    features: [
      {
        who: ['Mahasiswa', 'Petugas'],
        title: 'Satu QR per lantai',
        text: 'Satu stiker kini mewakili satu lantai, dan pelapor memilih sendiri WC pria, wanita, atau disabilitas di formulir. Hasilnya cukup **13 stiker** untuk 6 gedung yang memiliki toilet.',
      },
      {
        who: ['Semua'],
        title: 'Lokasi sesuai gedung asli',
        text: 'Nama dan lantai gedung diambil dari peta resmi kampus. Gedung yang tidak punya toilet tidak muncul. Peta kampus dipasang di beranda sebagai cadangan kalau stiker QR hilang atau rusak.',
      },
      {
        who: ['Semua'],
        title: 'Identitas kampus dan dwibahasa',
        text: 'Tampilan memakai warna dari poster kampus: maroon, oranye bata, dan krem. Bahasa bisa diganti Indonesia atau Inggris dari bagian atas halaman. Hasil AI tetap berbahasa Indonesia karena pembacanya petugas.',
      },
      {
        who: ['Mahasiswa'],
        title: 'Lacak laporan sendiri',
        text: 'Halaman konfirmasi menampilkan garis waktu tiga langkah: *diterima*, *dikerjakan petugas*, *selesai*. Halamannya menyegarkan diri sendiri. Di beranda muncul daftar **"Laporan saya"** yang diingat oleh ponsel pelapor.',
      },
      {
        who: ['Umum'],
        title: 'Papan laporan terbuka',
        text: 'Halaman **/laporan** menampilkan semua laporan beserta statusnya tanpa perlu login, supaya siapa pun bisa menilai apakah keluhan ditindaklanjuti. Yang tampil hanya ringkasan AI, bukan tulisan asli atau foto pelapor.',
      },
      {
        who: ['Petugas'],
        title: 'Hapus spam',
        text: 'Karena papannya kini terbuka untuk umum, petugas mendapat tombol untuk menghapus laporan spam atau yang isinya tidak pantas. Foto laporan itu ikut terhapus.',
      },
    ],
    tryIt: [
      { label: 'Contoh formulir lapor', href: '/lapor/A-1' },
      { label: 'Papan laporan terbuka', href: '/laporan' },
      { label: 'Beranda dan peta', href: '/' },
    ],
  },

  {
    n: 3,
    commit: '2e18c48',
    short: 'Bukti & akun',
    title: 'Bukti, jejak, dan akun',
    lead:
      '"Sudah selesai" kini harus dibuktikan dengan foto. Setiap tindakan tercatat, pimpinan mendapat grafik, dan sandi bersama diganti dengan akun pribadi.',
    features: [
      {
        who: ['Mahasiswa'],
        title: 'Foto keadaan wajib',
        text: 'Pelapor wajib melampirkan foto kondisi toilet, sehingga petugas tahu apa yang akan dihadapi sebelum datang.',
      },
      {
        who: ['Petugas'],
        title: 'Selesai = ada foto bukti',
        text: 'Laporan hanya bisa berstatus *selesai* setelah petugas mengunggah **foto bukti**. Foto bukti ini tampil di papan terbuka, jadi klaim "sudah bersih" bisa diperiksa siapa saja.',
      },
      {
        who: ['Pimpinan'],
        title: 'Catatan aktivitas',
        text: 'Semua kejadian tercatat: laporan masuk, hasil AI, perubahan status, penghapusan, dan siapa yang masuk ke sistem. Bahkan laporan yang dihapus tetap meninggalkan jejak lengkap.',
      },
      {
        who: ['Pimpinan'],
        title: 'Grafik di dashboard',
        text: 'Dashboard kini punya tiga tab: laporan, grafik, dan aktivitas. Grafiknya menampilkan laporan masuk dan selesai per hari, sebaran prioritas, jenis masalah, laporan per gedung, dan rata-rata waktu penyelesaian.',
      },
      {
        who: ['Admin', 'Petugas'],
        title: 'Akun untuk setiap orang',
        text: 'Setiap orang punya akun sendiri dengan peran **admin**, **petugas**, atau **pelapor**. Admin menambah dan menonaktifkan akun petugas, dan setiap perubahan akun ikut tercatat.',
      },
      {
        who: ['Mahasiswa'],
        title: 'Papan peringkat',
        text: 'Mahasiswa boleh mendaftar untuk masuk **papan peringkat** pelapor paling aktif. Melapor tanpa akun tetap bisa, karena mewajibkan pendaftaran di depan pintu toilet akan membuat orang malas melapor.',
      },
    ],
    tryIt: [
      { label: 'Papan laporan', href: '/laporan' },
      { label: 'Papan peringkat', href: '/peringkat' },
      { label: 'Daftar akun', href: '/daftar' },
      { label: 'Masuk', href: '/masuk' },
    ],
    tryNote: 'Dashboard petugas butuh akun petugas atau admin; tanyakan akunnya kepada pengembang. Akun pelapor bisa dibuat sendiri lewat **Daftar akun**.',
  },

  {
    n: 4,
    commit: 'd2e7d72',
    short: 'Rapi & tajam',
    title: 'Rapi di dalam, tajam di dashboard',
    lead:
      'Checkpoint ini sebagian besar merapikan bagian dalam supaya sistem mudah dikembangkan. Dashboard juga naik kelas: bukan lagi sekadar menghitung, tetapi menjawab pertanyaan.',
    features: [
      {
        who: ['Mahasiswa'],
        title: '"Laporan saya" ikut akun',
        text: 'Mahasiswa yang masuk dengan akun kini melihat daftar laporannya dari ponsel atau laptop mana pun, tidak lagi hanya dari satu perangkat. Melapor tanpa akun tetap bisa.',
      },
      {
        who: ['Pimpinan'],
        title: 'Angka utama beserta trennya',
        text: 'Deretan angka utama di bagian atas dashboard kini dilengkapi garis tren kecil dan perbandingan dengan periode sebelumnya, jadi naik-turunnya terlihat sekilas.',
      },
      {
        who: ['Pimpinan'],
        title: 'Peta panas hari × jam',
        text: 'Terlihat pada hari dan jam berapa keluhan paling sering masuk. Ini bisa menjadi dasar menyusun **jadwal ronda kebersihan**.',
      },
      {
        who: ['Pimpinan'],
        title: 'Gedung × jenis masalah',
        text: 'Satu tabel yang menunjukkan masalah yang menempel di satu gedung saja, misalnya bau yang selalu muncul di gedung yang sama. Pola seperti ini tidak terlihat kalau grafiknya dipisah.',
      },
      {
        who: ['Pimpinan'],
        title: 'Uji prioritas AI',
        text: 'Waktu penyelesaian kini dipecah per prioritas. Kalau laporan berprioritas *tinggi* tidak selesai lebih cepat daripada yang *rendah*, berarti prioritas dari AI hanya hiasan. Dashboard menunjukkan hal ini secara langsung.',
      },
      {
        who: ['Semua'],
        title: 'Dua dokumen',
        text: '**Panduan umum** tanpa istilah teknis untuk staf dan pimpinan kampus, dan **dokumentasi teknis** untuk penilai. Keduanya tersedia sebagai halaman web dan PDF.',
      },
    ],
    tryIt: [
      { label: 'Dashboard (masuk dulu)', href: '/petugas' },
      { label: 'Papan laporan', href: '/laporan' },
      { label: 'Beranda', href: '/' },
    ],
    tryNote: 'Grafik baru ada di tab **Grafik** pada dashboard. Dashboard hanya bisa dibuka setelah masuk dengan akun petugas atau admin; tanyakan akunnya kepada pengembang.',
  },

  {
    n: 5,
    commit: 'e44958b',
    short: 'AI kedua',
    title: 'AI kedua: memeriksa foto dan menjawab pertanyaan',
    lead:
      'Foto bukti dari petugas kini diperiksa AI: benar toilet? sudah bersih? Selain itu, ada Chatbot AI yang menjawab pertanyaan tentang data laporan dengan bahasa biasa.',
    features: [
      {
        who: ['Petugas', 'AI'],
        title: 'AI pemeriksa foto',
        text: 'Setiap foto bukti dinilai AI: apakah ini toilet, dan apakah sudah bersih. Kalau belum, foto **ditolak beserta alasannya**, laporan tetap terbuka, dan petugas diminta membersihkan lagi lalu memotret ulang.',
      },
      {
        who: ['Umum'],
        title: 'Lencana "Diverifikasi AI"',
        text: 'Foto bukti yang lolos pemeriksaan tampil di papan terbuka dengan tanda *diverifikasi AI*, jadi pembaca tahu fotonya sudah dinilai, bukan sekadar diunggah.',
      },
      {
        who: ['Pimpinan', 'Umum'],
        title: 'Chatbot AI',
        text: 'Ketik pertanyaan biasa seperti *"Gedung mana yang paling banyak laporan 30 hari terakhir?"*, dan dalam beberapa detik chatbot menjawab dengan angka dari data laporan yang sebenarnya.',
      },
      {
        who: ['Semua'],
        title: 'Mode gelap dan detail kecil',
        text: 'Sakelar terang/gelap di bagian atas halaman. Ada juga ikon mata di kolom sandi untuk melihat apa yang sedang diketik, dan logo baru.',
      },
    ],
    tryIt: [
      { label: 'Beranda dan Chatbot AI', href: '/' },
      { label: 'Papan laporan', href: '/laporan' },
      { label: 'Dashboard', href: '/petugas' },
    ],
    tryNote: 'Untuk mencoba pemeriksaan foto, masuk sebagai petugas, pilih laporan, lalu unggah foto bukti. Akun petugas bisa ditanyakan kepada pengembang.',
  },

  {
    n: 6,
    commit: 'defb699',
    short: 'Siap pakai',
    title: 'Dirancang ulang untuk pemakaian sehari-hari',
    lead:
      'Alurnya dirombak mengikuti cara kerja di lapangan: tiga pintu masuk untuk tiga peran, petugas tidak perlu login, foto diambil langsung dari kamera, dan tampilan baru bernama Kato Report.',
    features: [
      {
        who: ['Semua'],
        title: 'Tiga pintu di beranda',
        text: 'Beranda kini punya tiga pintu yang jelas: **Saya mahasiswa**, **Saya petugas**, dan **Saya supervisor**. Setiap peran langsung dibawa ke halamannya sendiri.',
      },
      {
        who: ['Petugas'],
        title: 'Petugas tanpa login',
        text: 'Petugas cukup memilih namanya dari daftar *"Siapa kamu?"*, dan pilihannya diingat di ponsel itu. Hanya **supervisor** yang login, dan supervisor pula yang mengelola daftar nama petugas.',
      },
      {
        who: ['Mahasiswa', 'Petugas'],
        title: 'Foto langsung dari kamera',
        text: 'Semua foto diambil langsung dari kamera, bukan dari galeri, sehingga foto lama tidak bisa dipakai ulang sebagai bukti.',
      },
      {
        who: ['Petugas', 'Supervisor'],
        title: 'Laporan pekerjaan',
        text: 'Petugas mencatat toilet yang ia bersihkan saat ronda rutin, juga dengan foto yang diperiksa AI. Supervisor melihat catatan itu per petugas.',
      },
      {
        who: ['Mahasiswa', 'Petugas'],
        title: 'Satu QR, dua peran',
        text: 'Mahasiswa dan petugas memindai QR yang sama. Di bagian atas halaman lantai ada sakelar besar *Saya mahasiswa / Saya petugas*.',
      },
      {
        who: ['Supervisor'],
        title: 'Filter waktu',
        text: 'Laporan dan laporan pekerjaan bisa disaring per rentang waktu, misalnya hari ini, 7 hari, atau 30 hari terakhir.',
      },
      {
        who: ['Semua'],
        title: 'Peta interaktif dan foto yang bisa diperbesar',
        text: 'Peta kampus bisa diperbesar dan digeser dengan jari. Foto laporan juga bisa diperbesar untuk melihat detailnya. Chatbot AI dan cetak stiker QR kini ada di beranda.',
      },
      {
        who: ['Semua'],
        title: 'Kato Report',
        text: 'Aplikasi berganti nama menjadi **Kato Report**, dengan tampilan baru yang bersih dan lapang. Alamat halaman kini berbahasa Inggris (misalnya `/report`, `/staff`, `/supervisor`), tetapi alamat lama di stiker yang sudah tertempel tetap berfungsi.',
      },
    ],
    tryIt: [
      { label: 'Beranda', href: '/' },
      { label: 'Saya mahasiswa', href: '/student' },
      { label: 'Saya petugas', href: '/staff' },
      { label: 'Contoh lantai', href: '/report/A-1' },
      { label: 'Papan laporan', href: '/reports' },
      { label: 'Supervisor', href: '/supervisor' },
    ],
    tryNote: 'Petugas tidak perlu login: cukup pilih nama di halaman petugas. Dashboard supervisor butuh akun; tanyakan kepada pengembang.',
  },
];

/** The checkpoints merged into the current checkout, oldest first (at least checkpoint 1). */
export function reachedCheckpoints() {
  const isAncestor = (commit) => {
    try {
      execSync(`git merge-base --is-ancestor ${commit} HEAD`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
  const reached = CHECKPOINTS.filter((c) => isAncestor(c.commit));
  return reached.length ? reached : CHECKPOINTS.slice(0, 1);
}
