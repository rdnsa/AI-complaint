-- Migration 0001: skema awal AI Complaint (toilet kampus)

-- Satu baris per WC fisik. Nilai `id` inilah yang di-encode ke dalam QR.
CREATE TABLE toilets (
  id          TEXT PRIMARY KEY,            -- contoh: 'A-2-PRIA'
  gedung      TEXT NOT NULL,               -- 'Gedung A'
  lantai      INTEGER NOT NULL,            -- 2
  jenis       TEXT NOT NULL,               -- 'pria' | 'wanita' | 'disabilitas'
  nama        TEXT NOT NULL,               -- 'WC Pria Gedung A Lantai 2'
  aktif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE reports (
  id          TEXT PRIMARY KEY,
  toilet_id   TEXT NOT NULL REFERENCES toilets(id),
  teks        TEXT NOT NULL,               -- keluhan mentah dari mahasiswa
  foto_key    TEXT,                        -- object key di R2, NULL kalau tanpa foto

  -- Alur kerja petugas (dikendalikan manusia)
  status      TEXT NOT NULL DEFAULT 'baru' -- 'baru' | 'diproses' | 'selesai'
              CHECK (status IN ('baru', 'diproses', 'selesai')),
  petugas     TEXT,
  selesai_at  TEXT,

  -- Hasil analisis LLM (dikendalikan mesin, diisi asinkron)
  ai_status   TEXT NOT NULL DEFAULT 'pending'
              CHECK (ai_status IN ('pending', 'ok', 'gagal')),
  kategori    TEXT,                        -- JSON array, contoh: ["kebersihan","perlengkapan"]
  prioritas   TEXT CHECK (prioritas IS NULL OR prioritas IN ('rendah', 'sedang', 'tinggi')),
  ringkasan   TEXT,
  rekomendasi TEXT,
  ai_error    TEXT,                        -- pesan error terakhir, untuk retry & analisis
  ai_model    TEXT,
  ai_ms       INTEGER,                     -- latency panggilan LLM (bahan bab hasil skripsi)

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dashboard selalu memfilter/mengurutkan lewat kombinasi ini.
CREATE INDEX idx_reports_created  ON reports (created_at DESC);
CREATE INDEX idx_reports_status   ON reports (status, created_at DESC);
CREATE INDEX idx_reports_toilet   ON reports (toilet_id, created_at DESC);
CREATE INDEX idx_reports_ai       ON reports (ai_status) WHERE ai_status <> 'ok';

-- Fitur #3: ringkasan harian hasil cron.
CREATE TABLE daily_summaries (
  tanggal       TEXT PRIMARY KEY,          -- 'YYYY-MM-DD' waktu WIB
  total_laporan INTEGER NOT NULL,
  ringkasan     TEXT NOT NULL,
  sorotan       TEXT,                      -- JSON array of string
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
