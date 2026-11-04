-- Migration 0012: staff no longer own areas.
--
-- On the floor, whoever is free does the work, so the fixed placement from the
-- 2026 assignment letter no longer describes anything. A cleaning report still
-- records who did what, where and when; the recap now asks "which areas and
-- tasks were reported", not "did this person finish their areas".
--
-- Apply this AFTER deploying the code that stopped reading the table: the
-- previous version queries it on every location list.

DROP INDEX IF EXISTS idx_cleaning_assignments_staff;
DROP TABLE cleaning_assignments;
