-- Migration 0010: one list of six daily tasks, the same on every area.
--
-- The staff page now shows the same tasks wherever the staff member is:
-- menyapu & mengepel (one task now), mengelap kaca jendela, membersihkan toilet,
-- membuang sampah, mengisi ulang galon, merapikan ruangan. Each is photographed
-- and sent on its own.
--
-- 'sweep' and 'mop' are no longer offered but stay allowed in
-- cleaning_report_tasks, so the reports filed before this migration remain
-- valid. The CHECK constraint cannot be altered in SQLite, so the table is
-- rebuilt; nothing points at it, so no foreign key needs care.

CREATE TABLE cleaning_report_tasks_new (
  report_id   TEXT NOT NULL REFERENCES cleaning_reports(id),
  task        TEXT NOT NULL CHECK (task IN (
                'sweep_mop', 'glass', 'toilet', 'trash', 'gallon', 'tidy',
                'sweep', 'mop'  -- before 0010
              )),
  -- UNIQUE: one photo can never prove two tasks, nor two reports.
  photo_key   TEXT NOT NULL UNIQUE,
  photo_at    TEXT NOT NULL,                 -- when the server received the photo (UTC)
  PRIMARY KEY (report_id, task)
);
INSERT INTO cleaning_report_tasks_new (report_id, task, photo_key, photo_at)
  SELECT report_id, task, photo_key, photo_at FROM cleaning_report_tasks;
DROP TABLE cleaning_report_tasks;
ALTER TABLE cleaning_report_tasks_new RENAME TO cleaning_report_tasks;

UPDATE cleaning_areas SET tasks = '["sweep_mop","glass","toilet","trash","gallon","tidy"]';
