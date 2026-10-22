-- Cleaning areas, cleaning staff, and who is assigned where — UPI Tasikmalaya.
--
-- Source: "Penempatan Lokasi Kerja PHL dan OB 2026" (the Director's assignment
-- letter, one page per staff member). Every area gets one QR code pointing at
-- /clean/<id>; the staff member scans it, picks their name, ticks the tasks
-- done and photographs each one.
--
-- Safe to re-run: areas are upserted, staff are only added when no active staff
-- member of that name exists yet, and the assignments are rebuilt from scratch.
-- An area removed from this list is deactivated, never deleted, so its history
-- stays readable.
--
-- Tasks per area, a subset of ["sweep","mop","glass","toilet"]
-- (menyapu, mengepel, mengelap kaca, membersihkan toilet).
--
-- TO CONFIRM with the campus before printing the QR codes:
--   * Gedung Administrasi, Aula, TIK, and the labs are not mapped to a building
--     letter (A–J on the campus map) because the letter does not say which one
--     they are; they use their own ids. Fill building_code when known.
--   * Gedung TIK and the labs are one area each: split them per floor if they
--     have more than one.
--   * "PKM DAN SR" is kept as written in the letter.
--   * Feri Agus Sobari's page repeats Iqbal's area header ("Halaman Gd.
--     Administrasi, Mesjid"), but the tasks listed are the canteen, the tennis
--     court, and the drawing lab / workshop; the areas follow the tasks.
--   * Romulus (technician, mower operator) works across the whole campus and
--     has no area of their own.

UPDATE cleaning_areas SET active = 0;

INSERT INTO cleaning_areas (id, name, building_code, floor, tasks, sort_order) VALUES
  -- Muhammad Iqbal Maulana
  ('ADM-HALAMAN', 'Halaman Gedung Administrasi & Pos Keamanan', NULL, NULL, '["sweep","mop","toilet"]', 10),
  ('MASJID', 'Masjid At-Tarbiyah', 'B', 1, '["sweep","mop","glass","toilet"]', 11),

  -- Joko Waluyo
  ('ADM-2', 'Gedung Administrasi - Lantai 2', NULL, 2, '["sweep","mop","glass","toilet"]', 20),
  ('ADM-3', 'Gedung Administrasi - Lantai 3', NULL, 3, '["sweep","mop","glass","toilet"]', 21),
  ('ADM-4', 'Gedung Administrasi - Lantai 4', NULL, 4, '["sweep","mop","glass","toilet"]', 22),

  -- Sri, Miranda (floors 1-3), Jajang (floors 4-5)
  ('C-1', 'Gedung C (Perkuliahan) - Lantai 1', 'C', 1, '["sweep","mop","glass","toilet"]', 30),
  ('C-2', 'Gedung C (Perkuliahan) - Lantai 2', 'C', 2, '["sweep","mop","glass","toilet"]', 31),
  ('C-3', 'Gedung C (Perkuliahan) - Lantai 3', 'C', 3, '["sweep","mop","glass","toilet"]', 32),
  ('C-4', 'Gedung C (Perkuliahan) - Lantai 4', 'C', 4, '["sweep","mop","glass","toilet"]', 33),
  ('C-5', 'Gedung C (Perkuliahan) - Lantai 5', 'C', 5, '["sweep","mop","glass","toilet"]', 34),

  -- Rusman, Riki Rukmantara
  ('AULA', 'Gedung Aula', NULL, NULL, '["sweep","mop","glass","toilet"]', 40),
  ('LAPANG-VOLI', 'Lapang Voli', NULL, NULL, '["sweep"]', 41),
  ('LAB-IPA', 'Gedung Lab IPA', NULL, NULL, '["sweep","mop","glass","toilet"]', 42),
  ('LAB-MIKRO', 'Lab Micro', NULL, NULL, '["sweep","mop","glass","toilet"]', 43),
  ('LAB-SENI', 'Lab Seni', NULL, NULL, '["sweep","mop","glass","toilet"]', 44),
  ('PKM-SR', 'PKM dan SR', NULL, NULL, '["sweep","mop","glass","toilet"]', 45),

  -- Gilang Abdul Aziz
  ('TIK', 'Gedung TIK', NULL, NULL, '["sweep","mop","glass","toilet"]', 50),

  -- Zidan Muhammad S (Gedung I has toilets on floors 1 and 2 only)
  ('I-1', 'Gedung I (Lab) - Lantai 1', 'I', 1, '["sweep","mop","glass","toilet"]', 60),
  ('I-2', 'Gedung I (Lab) - Lantai 2', 'I', 2, '["sweep","mop","glass","toilet"]', 61),
  ('I-3', 'Gedung I (Lab) - Lantai 3', 'I', 3, '["sweep","mop","glass"]', 62),

  -- Feri Agus Sobari
  ('KANTIN', 'Area Kantin & Taman Kantin', NULL, NULL, '["sweep","mop"]', 70),
  ('LAPANG-TENIS', 'Lapang Tenis', NULL, NULL, '["sweep"]', 71),
  ('LAB-GAMBAR', 'Lab Gambar & Bengkel', NULL, NULL, '["sweep","mop"]', 72)

ON CONFLICT(id) DO UPDATE SET
  name          = excluded.name,
  building_code = excluded.building_code,
  floor         = excluded.floor,
  tasks         = excluded.tasks,
  sort_order    = excluded.sort_order,
  active        = 1;

-- Staff are names only (they never sign in). Added only when missing, so a
-- name the supervisor already typed in the dashboard is reused, not doubled.
WITH n(name) AS (VALUES
  ('Muhammad Iqbal Maulana'), ('Joko Waluyo'), ('Sri'), ('Miranda'), ('Jajang'),
  ('Rusman'), ('Riki Rukmantara'), ('Gilang Abdul Aziz'), ('Zidan Muhammad S'),
  ('Romulus'), ('Feri Agus Sobari')
)
INSERT INTO users (id, name, role)
SELECT lower(hex(randomblob(16))), n.name, 'staff'
  FROM n
 WHERE NOT EXISTS (
   SELECT 1 FROM users u WHERE u.role = 'staff' AND u.active = 1 AND lower(u.name) = lower(n.name)
 );

DELETE FROM cleaning_assignments;

WITH a(area_id, name) AS (VALUES
  ('ADM-HALAMAN', 'Muhammad Iqbal Maulana'), ('MASJID', 'Muhammad Iqbal Maulana'),
  ('ADM-2', 'Joko Waluyo'), ('ADM-3', 'Joko Waluyo'), ('ADM-4', 'Joko Waluyo'),
  ('C-1', 'Sri'), ('C-2', 'Sri'), ('C-3', 'Sri'),
  ('C-1', 'Miranda'), ('C-2', 'Miranda'), ('C-3', 'Miranda'),
  ('C-4', 'Jajang'), ('C-5', 'Jajang'),
  ('AULA', 'Rusman'), ('LAPANG-VOLI', 'Rusman'), ('LAB-IPA', 'Rusman'),
  ('LAB-MIKRO', 'Rusman'), ('LAB-SENI', 'Rusman'), ('PKM-SR', 'Rusman'),
  ('AULA', 'Riki Rukmantara'), ('LAPANG-VOLI', 'Riki Rukmantara'), ('LAB-IPA', 'Riki Rukmantara'),
  ('LAB-MIKRO', 'Riki Rukmantara'), ('LAB-SENI', 'Riki Rukmantara'), ('PKM-SR', 'Riki Rukmantara'),
  ('TIK', 'Gilang Abdul Aziz'),
  ('I-1', 'Zidan Muhammad S'), ('I-2', 'Zidan Muhammad S'), ('I-3', 'Zidan Muhammad S'),
  ('KANTIN', 'Feri Agus Sobari'), ('LAPANG-TENIS', 'Feri Agus Sobari'), ('LAB-GAMBAR', 'Feri Agus Sobari')
)
INSERT INTO cleaning_assignments (area_id, staff_id)
SELECT a.area_id, u.id
  FROM a
  JOIN users u ON u.role = 'staff' AND u.active = 1 AND lower(u.name) = lower(a.name)
 -- Two active staff with the same name would otherwise double the row.
 GROUP BY a.area_id, a.name;
