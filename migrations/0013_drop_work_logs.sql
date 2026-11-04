-- Migration 0013: the old "I cleaned this toilet" work log is gone.
--
-- Nothing has written to this table since the daily tasks (cleaning_reports)
-- took its place, and it holds no rows. Its dashboard tab and read-only API were
-- removed with it, so an empty "work log" no longer looks like missing reports.
--
-- Apply this AFTER deploying the code that stopped reading the table: the
-- previous version counts it whenever an account is deleted.

DROP TABLE work_logs;
