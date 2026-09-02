-- The list of toilets per building and floor — UPI Tasikmalaya Campus.
--
-- This file is safe to re-run at any time, including once reports exist. It
-- deactivates every toilet first, then reactivates the ones listed below. A
-- toilet removed from the list is not deleted from the database — it merely
-- stops appearing in the app, so older reports pointing at it keep their
-- location and history intact.
--
-- Ids must follow '<building>-<floor>-<TYPE>', because the QR generator and the
-- location display both rely on that format.
--
-- Status of each building:
--   A  Ki Hajar Dewantara       floors 1-3, has toilets            → registered
--   B  Masjid At-Tarbiyah       single floor                       → registered
--   C  Dewi Sartika             5 floors                           → registered
--   D  KH. Ahmad Dahlan         1 floor, toilets still unconfirmed
--   E  Dr. Wahidin Sudirohusodo 2 floors, believed to have none
--   F  Daoed Joesoef            building unused, needs confirming
--   G  RA. Kartini              single floor                       → registered
--   H  Mohamad Yamin            2 floors, toilets on floor 1 only  → registered
--   I  Dr. Sutomo               3 floors, toilets on floors 1-2    → registered
--   J  KH. Moh. Hasyim Ashari   no toilets
--
-- Buildings without toilets are intentionally left unregistered: they do not
-- appear in the picker and get no QR code. Rows for D, E, and F are prepared at
-- the bottom — just uncomment them once their condition is confirmed.
--
-- NOTE: every floor is assumed to have both a men's and a women's toilet. Where
-- a floor has only one of them, or has an accessible toilet, adjust its rows,
-- then re-run the seed and regenerate the QR codes.

UPDATE toilets SET aktif = 0;

INSERT INTO toilets (id, gedung_kode, lantai, jenis) VALUES
  -- Building A - Ki Hajar Dewantara (floors 1-3)
  ('A-1-PRIA', 'A', 1, 'pria'), ('A-1-WANITA', 'A', 1, 'wanita'),
  ('A-2-PRIA', 'A', 2, 'pria'), ('A-2-WANITA', 'A', 2, 'wanita'),
  ('A-3-PRIA', 'A', 3, 'pria'), ('A-3-WANITA', 'A', 3, 'wanita'),

  -- Building B - Masjid At-Tarbiyah (single floor)
  ('B-1-PRIA', 'B', 1, 'pria'), ('B-1-WANITA', 'B', 1, 'wanita'),

  -- Building C - Dewi Sartika (floors 1-5)
  ('C-1-PRIA', 'C', 1, 'pria'), ('C-1-WANITA', 'C', 1, 'wanita'),
  ('C-2-PRIA', 'C', 2, 'pria'), ('C-2-WANITA', 'C', 2, 'wanita'),
  ('C-3-PRIA', 'C', 3, 'pria'), ('C-3-WANITA', 'C', 3, 'wanita'),
  ('C-4-PRIA', 'C', 4, 'pria'), ('C-4-WANITA', 'C', 4, 'wanita'),
  ('C-5-PRIA', 'C', 5, 'pria'), ('C-5-WANITA', 'C', 5, 'wanita'),

  -- Building G - RA. Kartini (single floor)
  ('G-1-PRIA', 'G', 1, 'pria'), ('G-1-WANITA', 'G', 1, 'wanita'),

  -- Building H - Mohamad Yamin (2 floors, toilets on floor 1 only)
  ('H-1-PRIA', 'H', 1, 'pria'), ('H-1-WANITA', 'H', 1, 'wanita'),

  -- Building I - Dr. Sutomo (3 floors, toilets on floors 1 and 2)
  ('I-1-PRIA', 'I', 1, 'pria'), ('I-1-WANITA', 'I', 1, 'wanita'),
  ('I-2-PRIA', 'I', 2, 'pria'), ('I-2-WANITA', 'I', 2, 'wanita')

  -- Unconfirmed — uncomment once these buildings are known to have toilets:
  -- , ('D-1-PRIA', 'D', 1, 'pria'), ('D-1-WANITA', 'D', 1, 'wanita')
  -- , ('E-1-PRIA', 'E', 1, 'pria'), ('E-1-WANITA', 'E', 1, 'wanita')
  -- , ('E-2-PRIA', 'E', 2, 'pria'), ('E-2-WANITA', 'E', 2, 'wanita')
  -- , ('F-1-PRIA', 'F', 1, 'pria'), ('F-1-WANITA', 'F', 1, 'wanita')

ON CONFLICT(id) DO UPDATE SET
  gedung_kode = excluded.gedung_kode,
  lantai      = excluded.lantai,
  jenis       = excluded.jenis,
  aktif       = 1;
