-- Daftar WC per gedung dan lantai — UPI Kampus Tasikmalaya.
--
-- Berkas ini aman dijalankan ulang kapan saja, termasuk saat sudah ada laporan
-- masuk. Caranya: seluruh WC dinonaktifkan lebih dulu, lalu yang tercantum di
-- daftar bawah dihidupkan kembali. WC yang dikeluarkan dari daftar tidak ikut
-- terhapus dari database — ia hanya berhenti muncul di aplikasi, sehingga
-- laporan lama yang menunjuk ke sana tetap utuh beserta riwayatnya.
--
-- Id wajib berformat '<kode gedung>-<lantai>-<JENIS>' karena pembuat QR dan
-- tampilan lokasi mengandalkannya.
--
-- Status tiap gedung:
--   A  Ki Hajar Dewantara       lantai 1-3, ada toilet          → terdaftar
--   B  Masjid At-Tarbiyah       1 lantai                        → terdaftar
--   C  Dewi Sartika             5 lantai                        → terdaftar
--   D  KH. Ahmad Dahlan         1 lantai, ada toilet atau tidak masih dipastikan
--   E  Dr. Wahidin Sudirohusodo 2 lantai, sejauh diketahui tanpa toilet
--   F  Daoed Joesoef            gedung tidak terpakai, perlu dipastikan
--   G  RA. Kartini              1 lantai                        → terdaftar
--   H  Mohamad Yamin            2 lantai, toilet hanya lantai 1 → terdaftar
--   I  Dr. Sutomo               3 lantai, toilet lantai 1-2      → terdaftar
--   J  KH. Moh. Hasyim Ashari   tanpa toilet
--
-- Gedung tanpa toilet sengaja tidak didaftarkan: ia tidak muncul di daftar
-- pilihan dan tidak dibuatkan QR. Baris untuk D, E, dan F sudah disiapkan di
-- bagian bawah — cukup hapus tanda komentarnya setelah kondisinya dipastikan.
--
-- CATATAN: tiap lantai diasumsikan punya WC pria dan wanita. Bila ada lantai
-- yang hanya punya salah satunya, atau punya WC disabilitas, sesuaikan barisnya
-- lalu jalankan ulang seed dan buat ulang QR.

UPDATE toilets SET aktif = 0;

INSERT INTO toilets (id, gedung_kode, lantai, jenis) VALUES
  -- Gedung A - Ki Hajar Dewantara (lantai 1-3)
  ('A-1-PRIA', 'A', 1, 'pria'), ('A-1-WANITA', 'A', 1, 'wanita'),
  ('A-2-PRIA', 'A', 2, 'pria'), ('A-2-WANITA', 'A', 2, 'wanita'),
  ('A-3-PRIA', 'A', 3, 'pria'), ('A-3-WANITA', 'A', 3, 'wanita'),

  -- Gedung B - Masjid At-Tarbiyah (1 lantai)
  ('B-1-PRIA', 'B', 1, 'pria'), ('B-1-WANITA', 'B', 1, 'wanita'),

  -- Gedung C - Dewi Sartika (lantai 1-5)
  ('C-1-PRIA', 'C', 1, 'pria'), ('C-1-WANITA', 'C', 1, 'wanita'),
  ('C-2-PRIA', 'C', 2, 'pria'), ('C-2-WANITA', 'C', 2, 'wanita'),
  ('C-3-PRIA', 'C', 3, 'pria'), ('C-3-WANITA', 'C', 3, 'wanita'),
  ('C-4-PRIA', 'C', 4, 'pria'), ('C-4-WANITA', 'C', 4, 'wanita'),
  ('C-5-PRIA', 'C', 5, 'pria'), ('C-5-WANITA', 'C', 5, 'wanita'),

  -- Gedung G - RA. Kartini (1 lantai)
  ('G-1-PRIA', 'G', 1, 'pria'), ('G-1-WANITA', 'G', 1, 'wanita'),

  -- Gedung H - Mohamad Yamin (2 lantai, toilet hanya di lantai 1)
  ('H-1-PRIA', 'H', 1, 'pria'), ('H-1-WANITA', 'H', 1, 'wanita'),

  -- Gedung I - Dr. Sutomo (3 lantai, toilet di lantai 1 dan 2)
  ('I-1-PRIA', 'I', 1, 'pria'), ('I-1-WANITA', 'I', 1, 'wanita'),
  ('I-2-PRIA', 'I', 2, 'pria'), ('I-2-WANITA', 'I', 2, 'wanita')

  -- Belum dipastikan — hapus tanda komentar bila ternyata ada toiletnya:
  -- , ('D-1-PRIA', 'D', 1, 'pria'), ('D-1-WANITA', 'D', 1, 'wanita')
  -- , ('E-1-PRIA', 'E', 1, 'pria'), ('E-1-WANITA', 'E', 1, 'wanita')
  -- , ('E-2-PRIA', 'E', 2, 'pria'), ('E-2-WANITA', 'E', 2, 'wanita')
  -- , ('F-1-PRIA', 'F', 1, 'pria'), ('F-1-WANITA', 'F', 1, 'wanita')

ON CONFLICT(id) DO UPDATE SET
  gedung_kode = excluded.gedung_kode,
  lantai      = excluded.lantai,
  jenis       = excluded.jenis,
  aktif       = 1;
