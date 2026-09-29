-- Migration 0004: role-based user accounts, replacing the shared password.
--
-- Previously all staff shared one password from the PETUGAS_PASSWORD secret, so
-- there was no way to tell who had acted and no way to revoke one person without
-- changing everyone else. Now each person has their own account.

CREATE TABLE pengguna (
  id         TEXT PRIMARY KEY,
  -- COLLATE NOCASE: 'Budi' and 'budi' must not become two different accounts.
  username   TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nama       TEXT NOT NULL,
  peran      TEXT NOT NULL CHECK (peran IN ('admin', 'petugas', 'pelapor')),
  -- PBKDF2-SHA256, 100,000 iterations, per-user salt. The plaintext is never stored.
  sandi_hash TEXT NOT NULL,
  sandi_salt TEXT NOT NULL,
  aktif      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pengguna_peran ON pengguna (peran, aktif);

-- Reports may stay anonymous, so the column is nullable. Only reports that carry
-- an owner are counted on the reporter leaderboard.
ALTER TABLE reports ADD COLUMN pelapor_id TEXT REFERENCES pengguna(id);
CREATE INDEX idx_reports_pelapor ON reports (pelapor_id);

-- The default admin account. The hash below is derived from the password 'Admin123!'.
-- CHANGE THIS PASSWORD after the first sign-in.
INSERT INTO pengguna (id, username, nama, peran, sandi_hash, sandi_salt) VALUES (
  'adm-0001',
  'admin',
  'Administrator',
  'admin',
  'aa5ddc9aec19027d530e492d19af4a885f31f74b0cc7f904c42c6844d16906ae',
  'd6a30f8de4b3950fc25e3f00c2dbd16d'
);
