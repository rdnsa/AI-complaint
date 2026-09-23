-- Migration 0006: work reports filed by cleaning staff.
--
-- A student report says "this toilet is dirty"; a work report says "I cleaned
-- this toilet". Both follow the same flow (scan the floor QR, pick the toilet,
-- describe, photograph), but they are kept in separate tables: a work report
-- has no priority, no category, and no status to move through, and mixing them
-- into `reports` would distort every complaint statistic, the public board, and
-- the reporter leaderboard.
--
-- Only photos the vision model judged clean are stored here; rejected ones are
-- deleted and their verdict lives in the activity log (aksi = 'bukti_ditolak').
CREATE TABLE pekerjaan (
  id              TEXT PRIMARY KEY,
  toilet_id       TEXT NOT NULL REFERENCES toilets(id),
  petugas_id      TEXT NOT NULL REFERENCES pengguna(id),
  petugas         TEXT NOT NULL,           -- name at the time of filing, like reports.petugas
  teks            TEXT NOT NULL,           -- what was done, in the staff member's own words
  foto_key        TEXT NOT NULL,           -- R2 key under 'kerja/'
  bukti_ai_hasil  TEXT NOT NULL,           -- always 'bersih'; kept for symmetry with reports
  bukti_ai_alasan TEXT,
  bukti_ai_model  TEXT,
  bukti_ai_ms     INTEGER,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pekerjaan_created ON pekerjaan (created_at DESC);
CREATE INDEX idx_pekerjaan_toilet  ON pekerjaan (toilet_id, created_at DESC);
CREATE INDEX idx_pekerjaan_petugas ON pekerjaan (petugas_id, created_at DESC);
