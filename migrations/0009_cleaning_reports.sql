-- Migration 0009: cleaning reports per area, from the 2026 staff assignment letter
-- ("Penempatan Lokasi Kerja PHL dan OB 2026").
--
-- Management's problem: cleaning staff reported their work in WhatsApp with old
-- photos, so the reports could not be trusted. A cleaning report replaces that:
-- the staff member scans the QR of an area (usually one floor), ticks the tasks
-- done — sweep, mop, wipe glass, clean the toilet — and every ticked task needs
-- its own photo from the live camera. The server, not the phone, decides the
-- time, and the phone's GPS position is compared with the campus.
--
-- Areas are not toilets: an area may have no toilet at all (a yard, a sports
-- court), and a floor that has one is still a single area. The list and the
-- assignments are data, maintained in seed/cleaning-areas.sql.

CREATE TABLE cleaning_areas (
  id            TEXT PRIMARY KEY,            -- what the QR carries, e.g. 'C-2' or 'MASJID'
  name          TEXT NOT NULL,               -- e.g. 'Gedung C (Perkuliahan) - Lantai 2'
  building_code TEXT REFERENCES buildings(code),
  floor         INTEGER,
  -- JSON array of the tasks that apply here, a subset of
  -- ["sweep","mop","glass","toilet"]: a yard has no glass and no toilet.
  tasks         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1
);

-- Who is assigned where, per the letter. Several staff may share an area
-- (Gedung C floors 1-3), and one staff member may cover several areas.
CREATE TABLE cleaning_assignments (
  area_id  TEXT NOT NULL REFERENCES cleaning_areas(id),
  staff_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (area_id, staff_id)
);

CREATE TABLE cleaning_reports (
  id              TEXT PRIMARY KEY,
  area_id         TEXT NOT NULL REFERENCES cleaning_areas(id),
  staff_id        TEXT NOT NULL REFERENCES users(id),
  staff_name      TEXT NOT NULL,             -- name at the time of filing
  note            TEXT,                      -- optional: obstacles, e.g. "air mati"
  -- GPS as the phone reported it; NULL when the phone gave none.
  latitude        REAL,
  longitude       REAL,
  accuracy_m      REAL,
  distance_m      REAL,                      -- from the campus centre, computed by the server
  -- 'ok' inside the campus, 'far' outside it, 'unknown' without a position.
  -- 'far' and 'unknown' are shown to the supervisor as alerts.
  location_status TEXT NOT NULL CHECK (location_status IN ('ok', 'far', 'unknown')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per ticked task, each with its own photo.
CREATE TABLE cleaning_report_tasks (
  report_id   TEXT NOT NULL REFERENCES cleaning_reports(id),
  task        TEXT NOT NULL CHECK (task IN ('sweep', 'mop', 'glass', 'toilet')),
  -- UNIQUE: one photo can never prove two tasks, nor two reports.
  photo_key   TEXT NOT NULL UNIQUE,
  photo_at    TEXT NOT NULL,                 -- when the server received the photo (UTC)
  PRIMARY KEY (report_id, task)
);

CREATE INDEX idx_cleaning_reports_created ON cleaning_reports (created_at DESC);
CREATE INDEX idx_cleaning_reports_staff   ON cleaning_reports (staff_id, created_at DESC);
CREATE INDEX idx_cleaning_reports_area    ON cleaning_reports (area_id, created_at DESC);
CREATE INDEX idx_cleaning_reports_alerts  ON cleaning_reports (created_at DESC) WHERE location_status <> 'ok';
CREATE INDEX idx_cleaning_assignments_staff ON cleaning_assignments (staff_id);
