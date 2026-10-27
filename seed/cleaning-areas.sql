-- Cleaning areas, cleaning staff, and who is assigned where — UPI Tasikmalaya.
--
-- Source: "Penempatan Lokasi Kerja PHL dan OB 2026" (the Director's assignment
-- letter, one page per staff member). These areas are the only locations the
-- staff page offers. Every area gets one QR code pointing at /clean/<id>; the
-- staff member scans it, picks their name, and photographs and sends each task
-- done.
--
-- Safe to re-run: areas are upserted, staff are only added when no active staff
-- member of that name exists yet, and the assignments are rebuilt from scratch.
-- An area removed from this list is deactivated, never deleted, so its history
-- stays readable.
--
-- Every area has the same six tasks (migration 0010): menyapu & mengepel,
-- mengelap kaca jendela, membersihkan toilet, membuang sampah, mengisi ulang
-- galon, merapikan ruangan.
--
-- Reading the letter:
--   * Gedung Ki Hajar Dewantara is Gedung A (the administration building). The
--     ADM-* ids are kept from the earlier version of this list, so QR codes
--     already printed keep working.
--   * Floors per building, from the campus (2026-10-27): A 4, B 1, C 5, D 1,
--     E 2, F 2, G 1, H 2, I 1. Every floor is an area, and so is every
--     building's yard (halaman, floor 0); the staff page lists the yard beside
--     the floors. Where the letter names a whole building (RA Kartini, KH.
--     Ahmad Dahlan, Mohamad Yamin, Sutomo), its staff take every floor and the
--     yard, whose paths, gardens, gutters and paving their pages list.
--   * Gedung E and F, and Gedung A floor 1, are on the campus list but no page
--     of the letter assigns them: they have no staff yet.
--   * Gedung G, D and H were one area each (ids 'G', 'D', 'H') before they had
--     floors; those ids are deactivated, and the frontend sends an old link to
--     one of them to the building.
--   * Locations come only from the "Area Penugasan" line of each page, never
--     from the task list: Feri Agus Sobari's tasks mention the tennis court,
--     the canteen and the drawing lab, but the page assigns them the same
--     places as Iqbal (Halaman Gedung Ki Hajar Dewantara, Mesjid).
--   * Romulus (technician, mower operator) works across the whole campus and
--     has no area of their own.

UPDATE cleaning_areas SET active = 0;

INSERT INTO cleaning_areas (id, name, building_code, floor, tasks, sort_order) VALUES
  -- Gedung A: 4 lantai
  ('ADM-HALAMAN', 'Halaman Gedung Ki Hajar Dewantara', 'A', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 10),
  ('ADM-1', 'Gedung Ki Hajar Dewantara - Lantai 1', 'A', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 11),
  ('ADM-2', 'Gedung Ki Hajar Dewantara - Lantai 2', 'A', 2, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 12),
  ('ADM-3', 'Gedung Ki Hajar Dewantara - Lantai 3', 'A', 3, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 13),
  ('ADM-4', 'Gedung Ki Hajar Dewantara - Lantai 4', 'A', 4, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 14),

  -- Gedung B: 1 lantai
  ('B-HALAMAN', 'Halaman Masjid At-Tarbiyah', 'B', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 20),
  ('MASJID', 'Masjid At-Tarbiyah', 'B', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 21),

  -- Gedung C: 5 lantai
  ('C-HALAMAN', 'Halaman Gedung Dewi Sartika', 'C', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 30),
  ('C-1', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 1', 'C', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 31),
  ('C-2', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 2', 'C', 2, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 32),
  ('C-3', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 3', 'C', 3, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 33),
  ('C-4', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 4', 'C', 4, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 34),
  ('C-5', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 5', 'C', 5, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 35),

  -- Gedung D: 1 lantai
  ('D-HALAMAN', 'Halaman Gedung KH. Ahmad Dahlan', 'D', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 40),
  ('D-1', 'Gedung KH. Ahmad Dahlan - Lantai 1', 'D', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 41),

  -- Gedung E: 2 lantai
  ('E-HALAMAN', 'Halaman Gedung Dr. Wahidin Sudirohusodo', 'E', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 50),
  ('E-1', 'Gedung Dr. Wahidin Sudirohusodo - Lantai 1', 'E', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 51),
  ('E-2', 'Gedung Dr. Wahidin Sudirohusodo - Lantai 2', 'E', 2, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 52),

  -- Gedung F: 2 lantai
  ('F-HALAMAN', 'Halaman Gedung Daoed Joesoef', 'F', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 60),
  ('F-1', 'Gedung Daoed Joesoef - Lantai 1', 'F', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 61),
  ('F-2', 'Gedung Daoed Joesoef - Lantai 2', 'F', 2, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 62),

  -- Gedung G: 1 lantai
  ('G-HALAMAN', 'Halaman Gedung RA. Kartini', 'G', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 70),
  ('G-1', 'Gedung RA. Kartini - Lantai 1', 'G', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 71),

  -- Gedung H: 2 lantai
  ('H-HALAMAN', 'Halaman Gedung Mohamad Yamin', 'H', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 80),
  ('H-1', 'Gedung Mohamad Yamin - Lantai 1', 'H', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 81),
  ('H-2', 'Gedung Mohamad Yamin - Lantai 2', 'H', 2, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 82),

  -- Gedung I: 1 lantai
  ('I-HALAMAN', 'Halaman Gedung Dr. Sutomo', 'I', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 90),
  ('I-1', 'Gedung Dr. Sutomo (Lab) - Lantai 1', 'I', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 91),

  -- The one place outside a building, listed last
  ('LAPANG-VOLI', 'Lapang Voli', NULL, NULL, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 900)

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
  ('ADM-HALAMAN', 'Muhammad Iqbal Maulana'), ('MASJID', 'Muhammad Iqbal Maulana'), ('B-HALAMAN', 'Muhammad Iqbal Maulana'),
  ('ADM-HALAMAN', 'Feri Agus Sobari'), ('MASJID', 'Feri Agus Sobari'), ('B-HALAMAN', 'Feri Agus Sobari'),
  ('ADM-2', 'Joko Waluyo'), ('ADM-3', 'Joko Waluyo'), ('ADM-4', 'Joko Waluyo'),
  ('C-1', 'Sri'), ('C-2', 'Sri'), ('C-3', 'Sri'),
  ('C-1', 'Miranda'), ('C-2', 'Miranda'), ('C-3', 'Miranda'),
  ('C-4', 'Jajang'), ('C-5', 'Jajang'),
  ('C-HALAMAN', 'Sri'), ('C-HALAMAN', 'Miranda'), ('C-HALAMAN', 'Jajang'),
  ('G-1', 'Rusman'), ('G-HALAMAN', 'Rusman'), ('D-1', 'Rusman'), ('D-HALAMAN', 'Rusman'), ('LAPANG-VOLI', 'Rusman'),
  ('G-1', 'Riki Rukmantara'), ('G-HALAMAN', 'Riki Rukmantara'), ('D-1', 'Riki Rukmantara'), ('D-HALAMAN', 'Riki Rukmantara'),
  ('LAPANG-VOLI', 'Riki Rukmantara'),
  ('H-1', 'Gilang Abdul Aziz'), ('H-2', 'Gilang Abdul Aziz'), ('H-HALAMAN', 'Gilang Abdul Aziz'),
  ('I-1', 'Zidan Muhammad S'), ('I-HALAMAN', 'Zidan Muhammad S')
)
INSERT INTO cleaning_assignments (area_id, staff_id)
SELECT a.area_id, u.id
  FROM a
  JOIN users u ON u.role = 'staff' AND u.active = 1 AND lower(u.name) = lower(a.name)
 -- Two active staff with the same name would otherwise double the row.
 GROUP BY a.area_id, a.name;
