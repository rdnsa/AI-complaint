-- Migration 0015: the areas each staff member is responsible for.
--
-- The placement letter names an area per person ("Gedung Administrasi Lantai
-- 2, 3 dan 4"); this ties that to the QR areas, so the daily round can say
-- "these are yours" once the person has picked their name. A hint only: anyone
-- may still report any area, and that work counts the same.
--
-- An area may belong to several people (two staff share Gedung C, floors 1–3),
-- and a person to several areas. Either side going away takes the link with it.

CREATE TABLE staff_areas (
  staff_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id  TEXT NOT NULL REFERENCES cleaning_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, area_id)
);
