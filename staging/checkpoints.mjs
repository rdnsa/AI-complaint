/**
 * The content of the journey pages (see journey.mjs), one entry per checkpoint.
 * Written for classmates who were not part of the development: what changed,
 * for whom, and why — technical detail stays in "behind".
 *
 * `commit` is the checkpoint-N tag's commit on main; a page is published only
 * once that commit has been merged into staging.
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
    problem:
      'Keluhan tentang toilet kampus jarang sampai ke petugas. Mahasiswa yang menemukan toilet bau, becek, atau kehabisan sabun biasanya diam saja: tidak jelas harus lapor ke siapa, dan tidak ada yang tahu apakah laporannya ditindaklanjuti. Masalah kecil dibiarkan sampai menjadi besar.',
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
    example: {
      title: 'Contoh nyata',
      sub: 'Satu kalimat dari mahasiswa, dan tiket kerja yang dihasilkan AI.',
      inLabel: 'Yang ditulis mahasiswa',
      input: 'WC lantai 2 bau banget, lantainya becek, sama sabunnya habis.',
      outLabel: 'Yang diterima petugas',
      output: [
        ['Prioritas', '**Tinggi**'],
        ['Masalah', 'bau, genangan air, perlengkapan habis'],
        ['Ringkasan', 'Toilet berbau menyengat, lantai tergenang air, dan sabun habis.'],
        ['Perintah', 'Keringkan lantai lebih dulu karena berisiko membuat pengguna terpeleset, lalu bersihkan sumber bau dan isi ulang sabun.'],
      ],
    },
    behind: [
      'Seluruh sistem berjalan di **Cloudflare Workers**: halaman web dan server-nya ada di satu tempat, jadi cukup sekali deploy. Data laporan disimpan di database **D1**, dan foto di penyimpanan **R2**.',
      'AI yang membaca keluhan adalah **DeepSeek**. AI bekerja *setelah* konfirmasi terkirim, jadi pelapor tidak perlu menunggu AI selesai.',
      'Kalau AI sedang gangguan, laporan **tidak hilang**. Laporan tetap tersimpan dan tampil tanpa label, lalu bisa dianalisis ulang oleh petugas.',
      'Jawaban AI selalu diperiksa ulang. Kategori yang tidak dikenal dibuang, dan prioritas yang aneh dianggap *sedang*, sehingga data di database selalu rapi.',
      'Foto ditampilkan lewat alamat aplikasi sendiri, bukan lewat alamat penyimpanan, karena sebagian penyedia internet di Indonesia memblokir alamat penyimpanan tersebut dan foto jadi gagal dimuat di jaringan kampus.',
    ],
    limits: [
      'Daftar toilet masih data contoh, belum sesuai gedung kampus yang sebenarnya.',
      'Setelah menutup halaman konfirmasi, pelapor tidak punya cara melacak laporannya lagi.',
      'Semua petugas memakai satu sandi, jadi tidak bisa diketahui siapa mengerjakan apa.',
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
    problem:
      'Di checkpoint 1, satu stiker QR mewakili satu WC, sehingga stiker yang harus dicetak dan dirawat sangat banyak. Daftar lokasinya juga belum sesuai kampus. Selain itu, laporan yang sudah dikirim seolah hilang ke dalam kotak hitam: pelapor dan orang lain tidak bisa melihat tindak lanjutnya.',
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
    behind: [
      'Tetap **anonim**: tidak ada login, nomor telepon, atau data pelapor yang disimpan di server. Nomor laporan berupa kode acak panjang yang hanya diketahui pelapornya.',
      'Papan terbuka sengaja tidak menampilkan foto dari pelapor, karena foto toilet bisa saja tanpa sengaja memotret orang lain.',
      'Daftar toilet bisa diperbarui berulang kali tanpa merusak riwayat. Toilet yang dihapus dari daftar hanya disembunyikan, sehingga laporan lamanya tetap utuh.',
      'Bahasa Indonesia/Inggris memakai kamus buatan sendiri tanpa pustaka tambahan, jadi aplikasinya tetap ringan.',
    ],
    limits: [
      'Petugas masih bisa menandai laporan *selesai* hanya dengan menekan tombol, tanpa bukti.',
      'Belum ada catatan tentang siapa melakukan apa, dan belum ada grafik untuk pimpinan.',
      'Semua petugas masih memakai satu sandi bersama.',
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
    problem:
      'Sampai checkpoint 2, sebuah laporan bisa ditutup hanya dengan satu klik, tanpa bukti bahwa toiletnya benar sudah dibersihkan. Karena semua petugas memakai satu sandi yang sama, tidak bisa dipastikan siapa yang bertindak. Mencabut akses satu orang pun berarti mengganti sandi semua orang.',
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
    behind: [
      'Aturan "wajib foto" dijaga di **server**, bukan hanya disembunyikan di tampilan. Jadi aturan itu tidak bisa diakali lewat aplikasi lain.',
      'Kata sandi tidak pernah disimpan apa adanya. Yang disimpan hanya bentuk acaknya (hash), yang diacak berulang kali, sehingga sandi asli tidak bisa dibaca meskipun database bocor.',
      'Pesan "akun tidak ada" dan "sandi salah" sengaja dibuat sama, supaya halaman masuk tidak bisa dipakai untuk menebak username mana yang terdaftar.',
      'Warna grafik tidak dipilih asal-asalan. Palet warnanya diuji supaya tetap bisa dibedakan oleh orang buta warna dan cukup kontras dengan latar.',
    ],
    limits: [
      'Dashboard baru menjawab "berapa banyak", belum menjawab "kapan" dan "di mana" masalah paling sering muncul.',
      'Susunan kode server masih bercampur, sehingga makin sulit dirawat seiring fitur bertambah.',
      '"Laporan saya" masih terikat pada satu ponsel.',
    ],
    tryIt: [
      { label: 'Papan laporan', href: '/laporan' },
      { label: 'Papan peringkat', href: '/peringkat' },
      { label: 'Daftar akun', href: '/daftar' },
      { label: 'Masuk', href: '/masuk' },
    ],
  },

  {
    n: 4,
    commit: 'd2e7d72',
    short: 'Rapi & tajam',
    title: 'Rapi di dalam, tajam di dashboard',
    lead:
      'Checkpoint ini sebagian besar merapikan bagian dalam supaya sistem mudah dikembangkan. Dashboard juga naik kelas: bukan lagi sekadar menghitung, tetapi menjawab pertanyaan.',
    problem:
      'Fitur sudah banyak, tetapi kode server bercampur jadi satu: urusan menerima permintaan, aturan bisnis, dan database ada di tempat yang sama. Setiap perubahan kecil berisiko merusak bagian lain. Di sisi lain, grafik baru menampilkan jumlah, padahal pimpinan butuh jawaban seperti "kapan jadwal ronda yang tepat?" atau "apakah prioritas dari AI benar-benar berguna?".',
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
    behind: [
      'Kode server dipecah menjadi beberapa **lapisan**, seperti dapur restoran: pelayan menerima pesanan (*routes*), koki mengolah sesuai resep (*services* dan *domain*), dan gudang menyimpan bahan (*repositories*). Masing-masing bisa diganti tanpa membongkar yang lain.',
      'Aturan "laporan hanya boleh ditutup dengan bukti" kini hanya ditulis sekali, di lapisan inti, sehingga semua bagian sistem memakai aturan yang persis sama.',
      'Setelah dirapikan, semua fitur diuji ulang: analisis AI, wajib bukti, papan terbuka, papan peringkat, grafik, catatan aktivitas, ringkasan harian, dan batas wewenang ketiga peran.',
      'README dan semua komentar di kode kini berbahasa Inggris, supaya dokumentasi dan kode memakai bahasa yang sama.',
    ],
    limits: [
      'Foto bukti dari petugas masih dipercaya begitu saja. Belum ada yang memeriksa apakah fotonya benar-benar toilet yang bersih.',
      'Untuk menjawab pertanyaan tentang data, orang masih harus membaca grafik sendiri.',
    ],
    tryIt: [
      { label: 'Dashboard (masuk dulu)', href: '/petugas' },
      { label: 'Papan laporan', href: '/laporan' },
      { label: 'Beranda', href: '/' },
    ],
    tryNote: 'Grafik baru ada di tab **Grafik** pada dashboard, dan dashboard hanya bisa dibuka setelah masuk dengan akun petugas atau admin.',
  },

  {
    n: 5,
    commit: 'e44958b',
    short: 'AI kedua',
    title: 'AI kedua: memeriksa foto dan menjawab pertanyaan',
    lead:
      'Foto bukti dari petugas kini diperiksa AI: benar toilet? sudah bersih? Selain itu, ada Chatbot AI yang menjawab pertanyaan tentang data laporan dengan bahasa biasa.',
    problem:
      'Sejak checkpoint 3, petugas wajib mengunggah foto bukti. Tetapi foto apa pun diterima, termasuk foto lama, foto buram, atau foto yang bukan toilet. Di sisi lain, pimpinan yang ingin tahu "gedung mana yang paling bermasalah bulan ini?" masih harus membaca grafik sendiri.',
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
    example: {
      kind: 'verdicts',
      title: 'Contoh putusan AI pemeriksa foto',
      sub: 'Dua foto bukti, dua hasil yang berbeda.',
      items: [
        { ok: false, photo: 'lantai toilet masih basah, ada tisu bekas di sudut', reason: 'Lantai masih basah dan ada tisu bekas.' },
        { ok: true, photo: 'kloset dan lantai kering, tempat sampah kosong', reason: 'Kloset dan lantai terlihat bersih tanpa sampah.' },
      ],
    },
    behind: [
      'Sistem kini memakai **dua AI**. **DeepSeek** membaca tulisan karena murah dan akurat, tetapi tidak bisa melihat gambar. Karena itu foto diserahkan ke **Google Gemini**.',
      'Chatbot **tidak mengarang**. Ia hanya boleh menjawab dari angka yang diambil lewat beberapa "alat" yang sudah ditentukan, misalnya menghitung laporan, mengukur waktu penyelesaian, atau mengambil ringkasan harian. Kalau datanya tidak ada, ia bilang tidak ada.',
      'Chatbot tidak pernah melihat database secara langsung, hanya hasil hitungan kecil. Karena itu biaya setiap pertanyaan tetap kecil berapa pun banyaknya laporan.',
      'Jumlah pertanyaan dibatasi **50 per hari** untuk seluruh kampus, dan **20** per pengunjung tanpa akun, supaya biayanya terkendali.',
    ],
    limits: [
      'Foto masih bisa dipilih dari galeri, jadi foto lama masih mungkin dipakai ulang.',
      'Petugas masih harus login, padahal mereka bekerja sambil membawa alat kebersihan.',
      'Pekerjaan rutin petugas di luar keluhan mahasiswa belum tercatat.',
    ],
    tryIt: [
      { label: 'Beranda dan Chatbot AI', href: '/' },
      { label: 'Papan laporan', href: '/laporan' },
      { label: 'Dashboard', href: '/petugas' },
    ],
  },

  {
    n: 6,
    commit: 'defb699',
    short: 'Siap pakai',
    title: 'Dirancang ulang untuk pemakaian sehari-hari',
    lead:
      'Alurnya dirombak mengikuti cara kerja di lapangan: tiga pintu masuk untuk tiga peran, petugas tidak perlu login, foto diambil langsung dari kamera, dan tampilan baru bernama Kato Report.',
    problem:
      'Dibayangkan untuk pemakaian sehari-hari, masih ada beberapa hambatan. Petugas akan enggan login sambil membawa alat pel. Foto dari galeri membuka celah memakai foto lama. Pekerjaan rutin petugas di luar keluhan tidak terlihat oleh pengawas. Dan satu halaman beranda untuk semua orang terasa membingungkan.',
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
    behind: [
      'Peran **admin** diganti dengan **supervisor**, dan petugas tidak lagi punya akun. Petugas memang tidak perlu login untuk bekerja, sedangkan semua tindakan pengelolaan tetap dipegang orang yang login.',
      'Nama tabel dan kolom di database diganti ke bahasa Inggris lewat satu migrasi, tanpa kehilangan data yang sudah ada.',
      'Kalau satu kunci akses (API key) AI kena batas pemakaian, sistem otomatis beralih ke kunci cadangan. Pemeriksaan foto jadi tidak mudah macet saat sedang ramai.',
      'Dokumen pelengkap ditambahkan: diagram proses bisnis (BPMN) *to-be*, diagram arsitektur sistem, dan dokumen kebutuhan produk (PRD).',
    ],
    limits: [
      'Gedung D masih perlu dipastikan apakah memiliki toilet sebelum stikernya dicetak.',
      'Sandi akun supervisor bawaan sebaiknya segera diganti sebelum dipakai secara resmi.',
      'Notifikasi langsung ke ponsel petugas saat ada laporan prioritas tinggi bisa menjadi pengembangan berikutnya.',
    ],
    tryIt: [
      { label: 'Beranda', href: '/' },
      { label: 'Saya mahasiswa', href: '/student' },
      { label: 'Saya petugas', href: '/staff' },
      { label: 'Contoh lantai', href: '/report/A-1' },
      { label: 'Papan laporan', href: '/reports' },
      { label: 'Supervisor', href: '/supervisor' },
    ],
  },
];
