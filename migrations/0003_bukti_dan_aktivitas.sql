-- Migration 0003: foto bukti penyelesaian dan catatan aktivitas.

-- Foto yang diunggah petugas sebagai bukti bahwa keluhan benar-benar ditangani.
ALTER TABLE reports ADD COLUMN foto_selesai_key TEXT;

-- Catatan aktivitas untuk pihak manajemen.
--
-- Sengaja TANPA foreign key ke reports: justru laporan yang sudah dihapuslah
-- yang paling perlu tetap terlacak. Saat penghapusan terjadi, seluruh isi
-- laporan disalin ke kolom `rincian`, sehingga manajemen masih bisa melihat apa
-- yang hilang, siapa yang menghapusnya, dan kapan.
CREATE TABLE aktivitas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu     TEXT NOT NULL DEFAULT (datetime('now')),
  aksi      TEXT NOT NULL,   -- 'lapor' | 'analisis' | 'analisis_gagal' | 'status' | 'hapus' | 'masuk' | 'ringkasan'
  report_id TEXT,            -- id laporan terkait, tetap tercatat walau laporannya sudah dihapus
  pelaku    TEXT NOT NULL,   -- nama petugas, atau 'pelapor' / 'sistem'
  ringkas   TEXT NOT NULL,   -- satu baris yang langsung terbaca manusia
  rincian   TEXT             -- JSON: perubahan nilai, atau salinan laporan yang dihapus
);

CREATE INDEX idx_aktivitas_waktu  ON aktivitas (waktu DESC);
CREATE INDEX idx_aktivitas_report ON aktivitas (report_id);
CREATE INDEX idx_aktivitas_aksi   ON aktivitas (aksi, waktu DESC);
