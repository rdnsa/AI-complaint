-- Daftar WC per gedung dan lantai.
--
-- Berkas ini aman dijalankan ulang kapan saja, termasuk saat sudah ada laporan
-- masuk. Caranya: seluruh WC dinonaktifkan lebih dulu, lalu yang tercantum di
-- daftar bawah dihidupkan kembali. WC yang dihapus dari daftar tidak ikut
-- terhapus dari database — ia hanya berhenti muncul di aplikasi, sehingga
-- laporan lama yang menunjuk ke sana tetap utuh beserta riwayatnya.
--
-- Id wajib berformat '<kode gedung>-<lantai>-<JENIS>' karena pembuat QR dan
-- tampilan lokasi mengandalkannya.
--
-- Isi di bawah masih SEMENTARA: tiap gedung baru didaftarkan lantai 1 dengan WC
-- pria dan wanita. Sesuaikan dengan kondisi kampus — tambahkan baris untuk
-- setiap lantai yang punya toilet, dan tambahkan jenis 'disabilitas' di lokasi
-- yang menyediakannya. Setelah diubah: jalankan ulang seed, lalu buat ulang QR.

UPDATE toilets SET aktif = 0;

INSERT INTO toilets (id, gedung_kode, lantai, jenis) VALUES
  ('A-1-PRIA', 'A', 1, 'pria'), ('A-1-WANITA', 'A', 1, 'wanita'),
  ('B-1-PRIA', 'B', 1, 'pria'), ('B-1-WANITA', 'B', 1, 'wanita'),
  ('C-1-PRIA', 'C', 1, 'pria'), ('C-1-WANITA', 'C', 1, 'wanita'),
  ('D-1-PRIA', 'D', 1, 'pria'), ('D-1-WANITA', 'D', 1, 'wanita'),
  ('E-1-PRIA', 'E', 1, 'pria'), ('E-1-WANITA', 'E', 1, 'wanita'),
  ('F-1-PRIA', 'F', 1, 'pria'), ('F-1-WANITA', 'F', 1, 'wanita'),
  ('G-1-PRIA', 'G', 1, 'pria'), ('G-1-WANITA', 'G', 1, 'wanita'),
  ('H-1-PRIA', 'H', 1, 'pria'), ('H-1-WANITA', 'H', 1, 'wanita'),
  ('I-1-PRIA', 'I', 1, 'pria'), ('I-1-WANITA', 'I', 1, 'wanita'),
  ('J-1-PRIA', 'J', 1, 'pria'), ('J-1-WANITA', 'J', 1, 'wanita')
ON CONFLICT(id) DO UPDATE SET
  gedung_kode = excluded.gedung_kode,
  lantai      = excluded.lantai,
  jenis       = excluded.jenis,
  aktif       = 1;
