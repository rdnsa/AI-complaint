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
-- Targets the English schema (migration 0008 onwards): table `toilets` with
-- columns building_code, floor, type ('men' / 'women' / 'accessible'), active.
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
-- a floor has only one of them, or has an accessible toilet (type 'accessible',
-- id suffix '-ACCESSIBLE'), adjust its rows, then re-run the seed and
-- regenerate the QR codes.

UPDATE toilets SET active = 0;

INSERT INTO toilets (id, building_code, floor, type) VALUES
  -- Building A - Ki Hajar Dewantara (floors 1-3)
  ('A-1-MEN', 'A', 1, 'men'), ('A-1-WOMEN', 'A', 1, 'women'),
  ('A-2-MEN', 'A', 2, 'men'), ('A-2-WOMEN', 'A', 2, 'women'),
  ('A-3-MEN', 'A', 3, 'men'), ('A-3-WOMEN', 'A', 3, 'women'),

  -- Building B - Masjid At-Tarbiyah (single floor)
  ('B-1-MEN', 'B', 1, 'men'), ('B-1-WOMEN', 'B', 1, 'women'),

  -- Building C - Dewi Sartika (floors 1-5)
  ('C-1-MEN', 'C', 1, 'men'), ('C-1-WOMEN', 'C', 1, 'women'),
  ('C-2-MEN', 'C', 2, 'men'), ('C-2-WOMEN', 'C', 2, 'women'),
  ('C-3-MEN', 'C', 3, 'men'), ('C-3-WOMEN', 'C', 3, 'women'),
  ('C-4-MEN', 'C', 4, 'men'), ('C-4-WOMEN', 'C', 4, 'women'),
  ('C-5-MEN', 'C', 5, 'men'), ('C-5-WOMEN', 'C', 5, 'women'),

  -- Building G - RA. Kartini (single floor)
  ('G-1-MEN', 'G', 1, 'men'), ('G-1-WOMEN', 'G', 1, 'women'),

  -- Building H - Mohamad Yamin (2 floors, toilets on floor 1 only)
  ('H-1-MEN', 'H', 1, 'men'), ('H-1-WOMEN', 'H', 1, 'women'),

  -- Building I - Dr. Sutomo (3 floors, toilets on floors 1 and 2)
  ('I-1-MEN', 'I', 1, 'men'), ('I-1-WOMEN', 'I', 1, 'women'),
  ('I-2-MEN', 'I', 2, 'men'), ('I-2-WOMEN', 'I', 2, 'women')

  -- Unconfirmed — uncomment once these buildings are known to have toilets:
  -- , ('D-1-MEN', 'D', 1, 'men'), ('D-1-WOMEN', 'D', 1, 'women')
  -- , ('E-1-MEN', 'E', 1, 'men'), ('E-1-WOMEN', 'E', 1, 'women')
  -- , ('E-2-MEN', 'E', 2, 'men'), ('E-2-WOMEN', 'E', 2, 'women')
  -- , ('F-1-MEN', 'F', 1, 'men'), ('F-1-WOMEN', 'F', 1, 'women')

ON CONFLICT(id) DO UPDATE SET
  building_code = excluded.building_code,
  floor         = excluded.floor,
  type          = excluded.type,
  active        = 1;
