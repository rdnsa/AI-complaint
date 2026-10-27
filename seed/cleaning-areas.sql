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
--   * Where the letter names a whole building (RA Kartini, KH. Ahmad Dahlan,
--     Mohamad Yamin), the building is one area, with floor NULL.
--   * Every building also has its yard (halaman) as an area of its own, with
--     floor 0; the staff page lists it beside the floors. The yard goes to the
--     staff of the building: their pages list the paths, gardens, gutters and
--     paving around it.
--   * Locations come only from the "Area Penugasan" line of each page, never
--     from the task list: Feri Agus Sobari's tasks mention the tennis court,
--     the canteen and the drawing lab, but the page assigns them the same
--     places as Iqbal (Halaman Gedung Ki Hajar Dewantara, Mesjid).
--   * Romulus (technician, mower operator) works across the whole campus and
--     has no area of their own.

UPDATE cleaning_areas SET active = 0;

INSERT INTO cleaning_areas (id, name, building_code, floor, tasks, sort_order) VALUES
  -- Muhammad Iqbal Maulana, Feri Agus Sobari
  ('ADM-HALAMAN', 'Halaman Gedung Ki Hajar Dewantara', 'A', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 10),
  ('MASJID', 'Masjid At-Tarbiyah', 'B', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 11),
  ('B-HALAMAN', 'Halaman Masjid At-Tarbiyah', 'B', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 12),

  -- Joko Waluyo
  ('ADM-2', 'Gedung Ki Hajar Dewantara - Lantai 2', 'A', 2, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 20),
  ('ADM-3', 'Gedung Ki Hajar Dewantara - Lantai 3', 'A', 3, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 21),
  ('ADM-4', 'Gedung Ki Hajar Dewantara - Lantai 4', 'A', 4, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 22),

  -- Sri, Miranda (floors 1-3), Jajang (floors 4-5)
  ('C-1', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 1', 'C', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 30),
  ('C-2', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 2', 'C', 2, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 31),
  ('C-3', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 3', 'C', 3, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 32),
  ('C-4', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 4', 'C', 4, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 33),
  ('C-5', 'Gedung Dewi Sartika (Perkuliahan) - Lantai 5', 'C', 5, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 34),
  ('C-HALAMAN', 'Halaman Gedung Dewi Sartika', 'C', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 35),

  -- Rusman, Riki Rukmantara
  ('G', 'Gedung RA. Kartini', 'G', NULL, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 40),
  ('G-HALAMAN', 'Halaman Gedung RA. Kartini', 'G', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 41),
  ('D', 'Gedung KH. Ahmad Dahlan', 'D', NULL, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 43),
  ('D-HALAMAN', 'Halaman Gedung KH. Ahmad Dahlan', 'D', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 44),

  -- Gilang Abdul Aziz
  ('H', 'Gedung Mohamad Yamin', 'H', NULL, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 50),
  ('H-HALAMAN', 'Halaman Gedung Mohamad Yamin', 'H', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 51),

  -- Zidan Muhammad S
  ('I-1', 'Gedung Dr. Sutomo (Lab) - Lantai 1', 'I', 1, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 60),
  ('I-2', 'Gedung Dr. Sutomo (Lab) - Lantai 2', 'I', 2, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 61),
  ('I-3', 'Gedung Dr. Sutomo (Lab) - Lantai 3', 'I', 3, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 62),
  ('I-HALAMAN', 'Halaman Gedung Dr. Sutomo', 'I', 0, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 63),

  -- Rusman, Riki Rukmantara: the one place outside a building, listed last
  ('LAPANG-VOLI', 'Lapang Voli', NULL, NULL, '["sweep_mop","glass","toilet","trash","gallon","tidy"]', 90)

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
  ('ADM-2', 'Joko Waluyo'), ('ADM-3', 'Joko Waluyo'), ('ADM-4', 'Joko Waluyo'),
  ('C-1', 'Sri'), ('C-2', 'Sri'), ('C-3', 'Sri'),
  ('C-1', 'Miranda'), ('C-2', 'Miranda'), ('C-3', 'Miranda'),
  ('C-4', 'Jajang'), ('C-5', 'Jajang'),
  ('C-HALAMAN', 'Sri'), ('C-HALAMAN', 'Miranda'), ('C-HALAMAN', 'Jajang'),
  ('G', 'Rusman'), ('G-HALAMAN', 'Rusman'), ('LAPANG-VOLI', 'Rusman'), ('D', 'Rusman'), ('D-HALAMAN', 'Rusman'),
  ('G', 'Riki Rukmantara'), ('G-HALAMAN', 'Riki Rukmantara'), ('LAPANG-VOLI', 'Riki Rukmantara'),
  ('D', 'Riki Rukmantara'), ('D-HALAMAN', 'Riki Rukmantara'),
  ('H', 'Gilang Abdul Aziz'), ('H-HALAMAN', 'Gilang Abdul Aziz'),
  ('I-1', 'Zidan Muhammad S'), ('I-2', 'Zidan Muhammad S'), ('I-3', 'Zidan Muhammad S'), ('I-HALAMAN', 'Zidan Muhammad S'),
  ('ADM-HALAMAN', 'Feri Agus Sobari'), ('MASJID', 'Feri Agus Sobari'), ('B-HALAMAN', 'Feri Agus Sobari')
)
INSERT INTO cleaning_assignments (area_id, staff_id)
SELECT a.area_id, u.id
  FROM a
  JOIN users u ON u.role = 'staff' AND u.active = 1 AND lower(u.name) = lower(a.name)
 -- Two active staff with the same name would otherwise double the row.
 GROUP BY a.area_id, a.name;
