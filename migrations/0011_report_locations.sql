-- Migration 0011: reports about any location on campus, not only toilets.
--
-- The system now covers the whole campus: a complaint can be about a floor, a
-- building's yard (halaman), or a court, the same locations the staff page
-- offers, which are the cleaning areas (seed/cleaning-areas.sql). A new report
-- therefore points at an area; the reports filed before this migration keep
-- pointing at their toilet. Exactly one of the two is set.
--
-- location_info puts both behind one set of columns, so a query reads the
-- location of any report the same way:
--   JOIN location_info t ON t.id = COALESCE(r.area_id, r.toilet_id)
-- Area ids and toilet ids never collide: toilet ids always end in the toilet
-- type ('A-2-MEN').
--
-- The proof check no longer asks "is this a toilet" but "is this the reported
-- location", so the verdict 'not_toilet' becomes 'wrong_place', in the reports
-- and in the older work logs alike.
--
-- reports is rebuilt because SQLite cannot drop NOT NULL or change a CHECK;
-- nothing points at reports, so no foreign key needs care.

CREATE TABLE reports_new (
  id              TEXT PRIMARY KEY,
  -- Where: an area for every report since 0011, a toilet for the ones before.
  area_id         TEXT REFERENCES cleaning_areas(id),
  toilet_id       TEXT REFERENCES toilets(id),
  description     TEXT NOT NULL,           -- the reporter's raw complaint
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
  proof_verdict   TEXT CHECK (proof_verdict IS NULL OR proof_verdict IN ('clean', 'dirty', 'wrong_place')),
  proof_reason    TEXT,
  proof_model     TEXT,
  proof_ms        INTEGER,

  reporter_id     TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  CHECK ((area_id IS NULL) <> (toilet_id IS NULL))
);

INSERT INTO reports_new (
  id, area_id, toilet_id, description, photo_key, status, staff_name, resolved_at,
  ai_status, categories, priority, summary, recommendation, ai_error, ai_model, ai_ms,
  proof_photo_key, proof_verdict, proof_reason, proof_model, proof_ms,
  reporter_id, created_at, updated_at
)
SELECT
  id, NULL, toilet_id, description, photo_key, status, staff_name, resolved_at,
  ai_status, categories, priority, summary, recommendation, ai_error, ai_model, ai_ms,
  proof_photo_key, CASE proof_verdict WHEN 'not_toilet' THEN 'wrong_place' ELSE proof_verdict END,
  proof_reason, proof_model, proof_ms,
  reporter_id, created_at, updated_at
FROM reports;

DROP TABLE reports;
ALTER TABLE reports_new RENAME TO reports;

CREATE INDEX idx_reports_created  ON reports (created_at DESC);
CREATE INDEX idx_reports_status   ON reports (status, created_at DESC);
CREATE INDEX idx_reports_area     ON reports (area_id, created_at DESC);
CREATE INDEX idx_reports_toilet   ON reports (toilet_id, created_at DESC);
CREATE INDEX idx_reports_ai       ON reports (ai_status) WHERE ai_status <> 'ok';
CREATE INDEX idx_reports_reporter ON reports (reporter_id);

UPDATE work_logs SET proof_verdict = 'wrong_place' WHERE proof_verdict = 'not_toilet';

-- Every location a report can point at. For an area, floor 0 is the yard and
-- NULL the whole place; type is a toilet's alone.
CREATE VIEW location_info AS
SELECT id, building_code, building_name, building_order, floor, type, active, name
  FROM toilet_info
UNION ALL
SELECT a.id, a.building_code, b.name, COALESCE(b.sort_order, 999), a.floor, NULL, a.active, a.name
  FROM cleaning_areas a
  LEFT JOIN buildings b ON b.code = a.building_code;
