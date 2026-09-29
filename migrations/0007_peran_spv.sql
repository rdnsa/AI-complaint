-- Migration 0007: three parties — student, cleaning staff, supervisor (SPV).
--
-- * 'admin' becomes 'spv': the supervisor signs in, monitors the student
--   reports and the staff work log, and maintains the list of staff names.
-- * Cleaning staff no longer sign in at all. On the floor page they pick their
--   own name from a dropdown, because many of them are not comfortable with
--   usernames and passwords. A staff row is therefore just a name: username
--   and password become optional. SQLite's UNIQUE allows many NULLs, so staff
--   without a username do not collide.
--
-- SQLite cannot alter a CHECK constraint in place, so the table is rebuilt.
-- The order matters. reports.pelapor_id and pekerjaan.petugas_id reference
-- `pengguna`, and D1 cannot switch foreign keys off, only defer them. Dropping
-- the table counts one deferred violation per referencing row; SQLite only
-- cancels those again when rows are inserted into a table *named* `pengguna`.
-- So the rows go to a scratch copy first, and the new table is created under
-- its final name and filled from that copy (not created elsewhere and renamed).
PRAGMA defer_foreign_keys = true;

CREATE TABLE pengguna_salinan AS SELECT * FROM pengguna;

DROP TABLE pengguna;

CREATE TABLE pengguna (
  id         TEXT PRIMARY KEY,
  username   TEXT UNIQUE COLLATE NOCASE,
  nama       TEXT NOT NULL,
  peran      TEXT NOT NULL CHECK (peran IN ('spv', 'petugas', 'pelapor')),
  sandi_hash TEXT,
  sandi_salt TEXT,
  aktif      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Anyone who signs in needs both halves of a password; staff need neither.
  CHECK (peran = 'petugas' OR (username IS NOT NULL AND sandi_hash IS NOT NULL AND sandi_salt IS NOT NULL))
);

INSERT INTO pengguna (id, username, nama, peran, sandi_hash, sandi_salt, aktif, created_at)
SELECT id, username, nama,
       CASE peran WHEN 'admin' THEN 'spv' ELSE peran END,
       sandi_hash, sandi_salt, aktif, created_at
  FROM pengguna_salinan;

DROP TABLE pengguna_salinan;

CREATE INDEX idx_pengguna_peran ON pengguna (peran, aktif);
