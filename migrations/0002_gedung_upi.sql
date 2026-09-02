-- Migration 0002: nama gedung UPI Kampus Tasikmalaya, dan QR yang berlaku per lantai.
--
-- Sebelumnya satu QR mewakili satu WC (mis. 'A-1-PRIA'), sehingga tiap lantai perlu
-- beberapa QR. Sekarang satu QR mewakili satu lantai ('A-1') dan pelapor memilih
-- pria/wanita/disabilitas di formulir. Nama gedung dipindah ke tabelnya sendiri
-- agar tidak diulang-ulang di setiap baris toilet.

CREATE TABLE gedung (
  kode   TEXT PRIMARY KEY,
  nama   TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0
);

-- Sumber: "Peta Lokasi Gedung" UPI Kampus Tasikmalaya, Jln. Dadaha No. 18.
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
-- Id lama berformat '<kode>-<lantai>-<jenis>', jadi kodenya ada di karakter pertama.
UPDATE toilets SET gedung_kode = substr(id, 1, 1);

ALTER TABLE toilets DROP COLUMN gedung;
ALTER TABLE toilets DROP COLUMN nama;

CREATE INDEX idx_toilets_lokasi ON toilets (gedung_kode, lantai, jenis);

-- Nama tampilan dirakit di satu tempat supaya dashboard, ringkasan harian, dan
-- konteks yang dikirim ke LLM selalu memakai sebutan lokasi yang sama.
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
