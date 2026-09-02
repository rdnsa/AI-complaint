-- Migration 0003: proof-of-completion photos and the activity log.

-- The photo staff upload as evidence that a complaint was genuinely handled.
ALTER TABLE reports ADD COLUMN foto_selesai_key TEXT;

-- Activity log, for management oversight.
--
-- Deliberately WITHOUT a foreign key to reports: a deleted report is exactly the
-- one that most needs to stay traceable. On deletion the entire report is copied
-- into the `rincian` column, so management can still see what was lost, who
-- removed it, and when.
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
