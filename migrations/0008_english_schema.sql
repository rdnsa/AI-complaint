-- Migration 0008: the whole schema in English.
--
-- Every table, column and stored enum value moves from Indonesian to English,
-- so the code can use one vocabulary end to end. User-visible text that lives
-- in the data (complaint text, AI summaries, activity one-liners, the toilet
-- display name built by the view) stays Indonesian.
--
-- Method. Several enum columns carry CHECK constraints, which SQLite cannot
-- alter, so every table is rebuilt: new tables are created and filled with
-- translated values, the old ones are dropped children-first (so no foreign
-- key is ever left dangling), and the tables whose name stays the same are
-- renamed into place at the end. Renaming updates the foreign keys of the
-- tables that point at them.
--
-- Toilet ids change suffix ('A-1-PRIA' → 'A-1-MEN'), and every reference to
-- them moves with them. Photos already in R2 keep their old keys; the app still
-- reads the old 'laporan/', 'bukti/' and 'kerja/' prefixes.
PRAGMA defer_foreign_keys = true;

DROP VIEW toilet_info;

-- ---------------------------------------------------------------- buildings
CREATE TABLE buildings (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
INSERT INTO buildings (code, name, sort_order) SELECT kode, nama, urutan FROM gedung;

-- ---------------------------------------------------------------- toilets
CREATE TABLE toilets_new (
  id            TEXT PRIMARY KEY,          -- e.g. 'A-2-MEN': <building>-<floor>-<TYPE>
  building_code TEXT REFERENCES buildings(code),
  floor         INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('men', 'women', 'accessible')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO toilets_new (id, building_code, floor, type, active, created_at)
SELECT replace(replace(replace(id, '-PRIA', '-MEN'), '-WANITA', '-WOMEN'), '-DISABILITAS', '-ACCESSIBLE'),
       gedung_kode,
       lantai,
       CASE jenis WHEN 'pria' THEN 'men' WHEN 'wanita' THEN 'women' ELSE 'accessible' END,
       aktif,
       created_at
  FROM toilets;

-- ---------------------------------------------------------------- users
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  -- COLLATE NOCASE: 'Budi' and 'budi' must not become two different accounts.
  username      TEXT UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('supervisor', 'staff', 'reporter')),
  -- PBKDF2-SHA256, per-user salt. Cleaning staff never sign in, so they have neither.
  password_hash TEXT,
  password_salt TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (role = 'staff' OR (username IS NOT NULL AND password_hash IS NOT NULL AND password_salt IS NOT NULL))
);
INSERT INTO users (id, username, name, role, password_hash, password_salt, active, created_at)
SELECT id, username, nama,
       CASE peran WHEN 'spv' THEN 'supervisor' WHEN 'admin' THEN 'supervisor'
                  WHEN 'petugas' THEN 'staff' ELSE 'reporter' END,
       sandi_hash, sandi_salt, aktif, created_at
  FROM pengguna;

-- ---------------------------------------------------------------- reports
CREATE TABLE reports_new (
  id              TEXT PRIMARY KEY,
  toilet_id       TEXT NOT NULL REFERENCES toilets_new(id),
  description     TEXT NOT NULL,           -- the student's raw complaint
  photo_key       TEXT,                    -- R2 key of the condition photo

  -- Staff workflow (driven by people)
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'in_progress', 'resolved')),
  staff_name      TEXT,
  resolved_at     TEXT,

  -- LLM analysis (driven by the machine, filled in asynchronously)
  ai_status       TEXT NOT NULL DEFAULT 'pending'
                  CHECK (ai_status IN ('pending', 'ok', 'failed')),
  categories      TEXT,                    -- JSON array, e.g. ["cleanliness","supplies"]
  priority        TEXT CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high')),
  summary         TEXT,
  recommendation  TEXT,
  ai_error        TEXT,
  ai_model        TEXT,
  ai_ms           INTEGER,

  -- Proof of completion, judged by the vision model
  proof_photo_key TEXT,
  proof_verdict   TEXT CHECK (proof_verdict IS NULL OR proof_verdict IN ('clean', 'dirty', 'not_toilet')),
  proof_reason    TEXT,
  proof_model     TEXT,
  proof_ms        INTEGER,

  reporter_id     TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO reports_new (
  id, toilet_id, description, photo_key, status, staff_name, resolved_at,
  ai_status, categories, priority, summary, recommendation, ai_error, ai_model, ai_ms,
  proof_photo_key, proof_verdict, proof_reason, proof_model, proof_ms,
  reporter_id, created_at, updated_at
)
SELECT id,
       replace(replace(replace(toilet_id, '-PRIA', '-MEN'), '-WANITA', '-WOMEN'), '-DISABILITAS', '-ACCESSIBLE'),
       teks, foto_key,
       CASE status WHEN 'baru' THEN 'new' WHEN 'diproses' THEN 'in_progress' ELSE 'resolved' END,
       petugas, selesai_at,
       CASE ai_status WHEN 'gagal' THEN 'failed' ELSE ai_status END,
       replace(replace(replace(replace(replace(replace(kategori,
         '"kebersihan"', '"cleanliness"'), '"perlengkapan"', '"supplies"'), '"kerusakan"', '"damage"'),
         '"bau"', '"odor"'), '"genangan"', '"flooding"'), '"lainnya"', '"other"'),
       CASE prioritas WHEN 'rendah' THEN 'low' WHEN 'sedang' THEN 'medium' WHEN 'tinggi' THEN 'high' END,
       ringkasan, rekomendasi, ai_error, ai_model, ai_ms,
       foto_selesai_key,
       CASE bukti_ai_hasil WHEN 'bersih' THEN 'clean' WHEN 'kotor' THEN 'dirty'
                           WHEN 'bukan_toilet' THEN 'not_toilet' END,
       bukti_ai_alasan, bukti_ai_model, bukti_ai_ms,
       pelapor_id, created_at, updated_at
  FROM reports;

-- ---------------------------------------------------------------- work_logs
CREATE TABLE work_logs (
  id            TEXT PRIMARY KEY,
  toilet_id     TEXT NOT NULL REFERENCES toilets_new(id),
  staff_id      TEXT NOT NULL REFERENCES users(id),
  staff_name    TEXT NOT NULL,             -- name at the time of filing
  description   TEXT NOT NULL,             -- what was done, in the staff member's own words
  photo_key     TEXT NOT NULL,
  proof_verdict TEXT NOT NULL,             -- always 'clean': rejected photos are never stored
  proof_reason  TEXT,
  proof_model   TEXT,
  proof_ms      INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO work_logs (
  id, toilet_id, staff_id, staff_name, description, photo_key,
  proof_verdict, proof_reason, proof_model, proof_ms, created_at
)
SELECT id,
       replace(replace(replace(toilet_id, '-PRIA', '-MEN'), '-WANITA', '-WOMEN'), '-DISABILITAS', '-ACCESSIBLE'),
       petugas_id, petugas, teks, foto_key,
       CASE bukti_ai_hasil WHEN 'bersih' THEN 'clean' WHEN 'kotor' THEN 'dirty' ELSE 'not_toilet' END,
       bukti_ai_alasan, bukti_ai_model, bukti_ai_ms, created_at
  FROM pekerjaan;

-- ---------------------------------------------------------------- daily_summaries
CREATE TABLE daily_summaries_new (
  date         TEXT PRIMARY KEY,           -- 'YYYY-MM-DD' in WIB
  report_count INTEGER NOT NULL,
  summary      TEXT NOT NULL,
  highlights   TEXT,                       -- JSON array of strings
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO daily_summaries_new (date, report_count, summary, highlights, created_at)
SELECT tanggal, total_laporan, ringkasan, sorotan, created_at FROM daily_summaries;

-- ---------------------------------------------------------------- activity_log
-- Deliberately without a foreign key to reports: a deleted report is exactly
-- the one that most needs to stay traceable.
CREATE TABLE activity_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  action     TEXT NOT NULL,
  report_id  TEXT,
  actor      TEXT NOT NULL,                -- a person's name, or 'reporter' / 'system'
  summary    TEXT NOT NULL,                -- one line a human can read at a glance
  details    TEXT                          -- JSON: changed values, or a copy of a deleted report
);
INSERT INTO activity_log (id, created_at, action, report_id, actor, summary, details)
SELECT id, waktu,
       CASE aksi
         WHEN 'lapor' THEN 'report_created'
         WHEN 'analisis' THEN 'analysis'
         WHEN 'analisis_gagal' THEN 'analysis_failed'
         WHEN 'status' THEN 'status_changed'
         WHEN 'hapus' THEN 'report_deleted'
         WHEN 'masuk' THEN 'login'
         WHEN 'ringkasan' THEN 'daily_summary'
         WHEN 'pengguna' THEN 'user_changed'
         WHEN 'bukti_ditolak' THEN 'proof_rejected'
         WHEN 'verifikasi_gagal' THEN 'verification_failed'
         WHEN 'tanya' THEN 'question'
         WHEN 'kerja' THEN 'work_logged'
         ELSE aksi
       END,
       report_id,
       CASE pelaku WHEN 'pelapor' THEN 'reporter' WHEN 'sistem' THEN 'system'
                   WHEN 'pengunjung' THEN 'visitor' ELSE pelaku END,
       ringkas,
       -- The copy of a deleted report is what the supervisor reads back, so its
       -- keys follow the new names. Other details are historical and kept as-is.
       CASE WHEN aksi = 'hapus' AND json_valid(rincian) THEN json_object(
         'toilet_name', json_extract(rincian, '$.toilet_nama'),
         'description', json_extract(rincian, '$.teks'),
         'status', CASE json_extract(rincian, '$.status')
                     WHEN 'baru' THEN 'new' WHEN 'diproses' THEN 'in_progress' WHEN 'selesai' THEN 'resolved'
                     ELSE json_extract(rincian, '$.status') END,
         'priority', CASE json_extract(rincian, '$.prioritas')
                       WHEN 'rendah' THEN 'low' WHEN 'sedang' THEN 'medium' WHEN 'tinggi' THEN 'high' END,
         'categories', replace(replace(replace(replace(replace(replace(json_extract(rincian, '$.kategori'),
           '"kebersihan"', '"cleanliness"'), '"perlengkapan"', '"supplies"'), '"kerusakan"', '"damage"'),
           '"bau"', '"odor"'), '"genangan"', '"flooding"'), '"lainnya"', '"other"'),
         'summary', json_extract(rincian, '$.ringkasan'),
         'created_at', json_extract(rincian, '$.dibuat'),
         'had_photo', json_extract(rincian, '$.ada_foto')
       ) ELSE rincian END
  FROM aktivitas;

-- ---------------------------------------------------------------- swap in
-- Children first, so no drop ever removes a row something still points at.
DROP TABLE pekerjaan;
DROP TABLE reports;
DROP TABLE aktivitas;
DROP TABLE daily_summaries;
DROP TABLE pengguna;
DROP TABLE toilets;
DROP TABLE gedung;

ALTER TABLE toilets_new RENAME TO toilets;
ALTER TABLE reports_new RENAME TO reports;
ALTER TABLE daily_summaries_new RENAME TO daily_summaries;

-- ---------------------------------------------------------------- indexes
CREATE INDEX idx_toilets_location ON toilets (building_code, floor, type);

CREATE INDEX idx_reports_created  ON reports (created_at DESC);
CREATE INDEX idx_reports_status   ON reports (status, created_at DESC);
CREATE INDEX idx_reports_toilet   ON reports (toilet_id, created_at DESC);
CREATE INDEX idx_reports_ai       ON reports (ai_status) WHERE ai_status <> 'ok';
CREATE INDEX idx_reports_reporter ON reports (reporter_id);

CREATE INDEX idx_users_role ON users (role, active);

CREATE INDEX idx_work_logs_created ON work_logs (created_at DESC);
CREATE INDEX idx_work_logs_toilet  ON work_logs (toilet_id, created_at DESC);
CREATE INDEX idx_work_logs_staff   ON work_logs (staff_id, created_at DESC);

CREATE INDEX idx_activity_created ON activity_log (created_at DESC);
CREATE INDEX idx_activity_report  ON activity_log (report_id);
CREATE INDEX idx_activity_action  ON activity_log (action, created_at DESC);

-- ---------------------------------------------------------------- view
-- The display name is assembled in one place, so the dashboard, the daily
-- summary and the context sent to the LLM all name a location the same way.
-- It stays Indonesian: it is text the users read.
CREATE VIEW toilet_info AS
SELECT
  t.id,
  t.building_code,
  b.name       AS building_name,
  b.sort_order AS building_order,
  t.floor,
  t.type,
  t.active,
  'WC ' || CASE t.type WHEN 'men' THEN 'Pria' WHEN 'women' THEN 'Wanita' ELSE 'Disabilitas' END
        || ' - Lantai ' || t.floor
        || ', Gedung ' || t.building_code || ' (' || b.name || ')' AS name
FROM toilets t
JOIN buildings b ON b.code = t.building_code;
