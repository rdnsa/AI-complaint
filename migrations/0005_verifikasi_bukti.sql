-- Migration 0005: the vision model's verdict on the proof-of-completion photo.
--
-- A report can only be closed once the proof photo has been judged to show a
-- clean toilet. The verdict is stored next to the photo so that the dashboard
-- can display it and so that the acceptance rate can be measured later.
-- Rejected photos are not kept: their verdicts live in the activity log
-- (aksi = 'bukti_ditolak').
ALTER TABLE reports ADD COLUMN bukti_ai_hasil  TEXT;    -- 'bersih' | 'kotor' | 'bukan_toilet'
ALTER TABLE reports ADD COLUMN bukti_ai_alasan TEXT;    -- one sentence from the model
ALTER TABLE reports ADD COLUMN bukti_ai_model  TEXT;
ALTER TABLE reports ADD COLUMN bukti_ai_ms     INTEGER; -- latency of the check
