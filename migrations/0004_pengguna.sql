-- Migration 0004: akun pengguna berperan, menggantikan sandi bersama.
--
-- Sebelumnya seluruh petugas memakai satu sandi dari secret PETUGAS_PASSWORD,
-- sehingga tidak ada cara memastikan siapa yang bertindak dan tidak ada cara
-- mencabut akses satu orang saja. Sekarang setiap orang punya akun sendiri.

CREATE TABLE pengguna (
  id         TEXT PRIMARY KEY,
  -- COLLATE NOCASE: 'Budi' dan 'budi' tidak boleh menjadi dua akun berbeda.
  username   TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nama       TEXT NOT NULL,
  peran      TEXT NOT NULL CHECK (peran IN ('admin', 'petugas', 'pelapor')),
  -- PBKDF2-SHA256, 100.000 iterasi, salt per pengguna. Sandi asli tidak pernah disimpan.
  sandi_hash TEXT NOT NULL,
  sandi_salt TEXT NOT NULL,
  aktif      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pengguna_peran ON pengguna (peran, aktif);

-- Laporan boleh tetap anonim, jadi kolomnya nullable. Yang bertanda pemilik
-- inilah yang dihitung pada papan peringkat pelapor.
ALTER TABLE reports ADD COLUMN pelapor_id TEXT REFERENCES pengguna(id);
CREATE INDEX idx_reports_pelapor ON reports (pelapor_id);

-- Akun admin bawaan. Hash di bawah dihitung dari sandi 'Admin123!'.
-- GANTI SANDI INI setelah masuk pertama kali.
INSERT INTO pengguna (id, username, nama, peran, sandi_hash, sandi_salt) VALUES (
  'adm-0001',
  'admin',
  'Administrator',
  'admin',
  'aa5ddc9aec19027d530e492d19af4a885f31f74b0cc7f904c42c6844d16906ae',
  'd6a30f8de4b3950fc25e3f00c2dbd16d'
);
