-- Migration 0014: each staff member's official duties.
--
-- The campus's placement letter (Penempatan Lokasi Kerja PHL dan OB) gives every
-- cleaner a job title, an assigned area and a numbered list of duties. The list
-- is kept line by line, so it can be shown and edited, and its length is the
-- person's daily task target on the dashboard: tasks reported over the range
-- against duties × working days. Reporting more than the list (other tasks)
-- simply goes past 100%.
--
-- The rows go with the account (ON DELETE CASCADE); a deleted staff member's
-- duties have no one left to belong to.

CREATE TABLE staff_duties (
  staff_id TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,          -- 1-based, the number on the letter
  text     TEXT    NOT NULL,
  PRIMARY KEY (staff_id, position)
);

ALTER TABLE users ADD COLUMN job_title TEXT;   -- e.g. "Petugas Kebersihan"
ALTER TABLE users ADD COLUMN assignment TEXT;  -- the area on the letter, e.g. "Gedung C / Perkuliahan Lt. 1, 2, 3"
