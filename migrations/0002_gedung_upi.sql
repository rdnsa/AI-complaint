-- Migration 0002: UPI Tasikmalaya building names, and QR codes that cover a floor.
--
-- Previously one QR code stood for one toilet (e.g. 'A-1-PRIA'), so every floor
-- needed several codes. Now one code stands for a floor ('A-1') and the reporter
-- picks men/women/accessible on the form. Building names move into their own
-- table so they are not repeated on every toilet row.

CREATE TABLE gedung (
  kode   TEXT PRIMARY KEY,
  nama   TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0
);

-- Source: the "Peta Lokasi Gedung" poster, UPI Tasikmalaya, Jln. Dadaha No. 18.
INSERT INTO gedung (kode, nama, urutan) VALUES
  ('A', 'Ki Hajar Dewantara',      1),
  ('B', 'Masjid At-Tarbiyah',      2),
  ('C', 'Dewi Sartika',            3),
  ('D', 'KH. Ahmad Dahlan',        4),
  ('E', 'Dr. Wahidin Sudirohusodo', 5),
  ('F', 'Daoed Joesoef',           6),
  ('G', 'RA. Kartini',             7),
  ('H', 'Mohamad Yamin',           8),
  ('I', 'Dr. Sutomo',              9),
  ('J', 'KH. Moh. Hasyim Ashari', 10);

ALTER TABLE toilets ADD COLUMN gedung_kode TEXT REFERENCES gedung(kode);
-- Old ids are '<code>-<floor>-<type>', so the code is the first character.
UPDATE toilets SET gedung_kode = substr(id, 1, 1);

ALTER TABLE toilets DROP COLUMN gedung;
ALTER TABLE toilets DROP COLUMN nama;

CREATE INDEX idx_toilets_lokasi ON toilets (gedung_kode, lantai, jenis);

-- The display name is assembled in one place, so the dashboard, the daily
-- summary, and the context sent to the LLM all name a location the same way.
CREATE VIEW toilet_info AS
SELECT
  t.id,
  t.gedung_kode,
  g.nama   AS gedung_nama,
  g.urutan AS gedung_urutan,
  t.lantai,
  t.jenis,
  t.aktif,
  'WC ' || upper(substr(t.jenis, 1, 1)) || substr(t.jenis, 2)
        || ' - Lantai ' || t.lantai
        || ', Gedung ' || t.gedung_kode || ' (' || g.nama || ')' AS nama
FROM toilets t
JOIN gedung g ON g.kode = t.gedung_kode;
