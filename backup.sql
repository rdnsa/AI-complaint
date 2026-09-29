PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_init.sql','2026-09-02 05:41:03');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_gedung_upi.sql','2026-09-02 07:04:43');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0003_bukti_dan_aktivitas.sql','2026-09-02 07:53:11');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0004_pengguna.sql','2026-09-02 08:00:50');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0005_verifikasi_bukti.sql','2026-09-11 09:12:52');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0006_laporan_pekerjaan.sql','2026-09-23 13:18:24');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0007_peran_spv.sql','2026-09-23 13:18:24');
CREATE TABLE toilets (
  id          TEXT PRIMARY KEY,            
  lantai      INTEGER NOT NULL,            
  jenis       TEXT NOT NULL,               
  aktif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
, gedung_kode TEXT REFERENCES gedung(kode));
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('A-1-PRIA',1,'pria',1,'2026-09-02 05:49:24','A');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('A-1-WANITA',1,'wanita',1,'2026-09-02 05:49:24','A');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('A-2-PRIA',2,'pria',1,'2026-09-02 05:49:24','A');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('A-2-WANITA',2,'wanita',1,'2026-09-02 05:49:24','A');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('A-3-PRIA',3,'pria',1,'2026-09-02 05:49:24','A');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('A-3-WANITA',3,'wanita',1,'2026-09-02 05:49:24','A');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('B-1-PRIA',1,'pria',1,'2026-09-02 05:49:24','B');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('B-1-WANITA',1,'wanita',1,'2026-09-02 05:49:24','B');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('B-1-DIFA',1,'disabilitas',0,'2026-09-02 05:49:24','B');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('B-2-PRIA',2,'pria',0,'2026-09-02 05:49:24','B');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('B-2-WANITA',2,'wanita',0,'2026-09-02 05:49:24','B');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-1-PRIA',1,'pria',1,'2026-09-02 07:05:28','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-1-WANITA',1,'wanita',1,'2026-09-02 07:05:28','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('D-1-PRIA',1,'pria',0,'2026-09-02 07:05:28','D');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('D-1-WANITA',1,'wanita',0,'2026-09-02 07:05:28','D');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('E-1-PRIA',1,'pria',0,'2026-09-02 07:05:28','E');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('E-1-WANITA',1,'wanita',0,'2026-09-02 07:05:28','E');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('F-1-PRIA',1,'pria',0,'2026-09-02 07:05:28','F');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('F-1-WANITA',1,'wanita',0,'2026-09-02 07:05:28','F');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('G-1-PRIA',1,'pria',1,'2026-09-02 07:05:28','G');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('G-1-WANITA',1,'wanita',1,'2026-09-02 07:05:28','G');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('H-1-PRIA',1,'pria',1,'2026-09-02 07:05:28','H');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('H-1-WANITA',1,'wanita',1,'2026-09-02 07:05:28','H');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('I-1-PRIA',1,'pria',1,'2026-09-02 07:05:28','I');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('I-1-WANITA',1,'wanita',1,'2026-09-02 07:05:28','I');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('J-1-PRIA',1,'pria',0,'2026-09-02 07:05:28','J');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('J-1-WANITA',1,'wanita',0,'2026-09-02 07:05:28','J');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-2-PRIA',2,'pria',1,'2026-09-02 07:13:56','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-2-WANITA',2,'wanita',1,'2026-09-02 07:13:56','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-3-PRIA',3,'pria',1,'2026-09-02 07:13:56','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-3-WANITA',3,'wanita',1,'2026-09-02 07:13:56','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-4-PRIA',4,'pria',1,'2026-09-02 07:13:56','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-4-WANITA',4,'wanita',1,'2026-09-02 07:13:56','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-5-PRIA',5,'pria',1,'2026-09-02 07:13:56','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('C-5-WANITA',5,'wanita',1,'2026-09-02 07:13:56','C');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('I-2-PRIA',2,'pria',1,'2026-09-02 07:13:56','I');
INSERT INTO "toilets" ("id","lantai","jenis","aktif","created_at","gedung_kode") VALUES('I-2-WANITA',2,'wanita',1,'2026-09-02 07:13:56','I');
CREATE TABLE reports (
  id          TEXT PRIMARY KEY,
  toilet_id   TEXT NOT NULL REFERENCES toilets(id),
  teks        TEXT NOT NULL,               
  foto_key    TEXT,                        

  
  status      TEXT NOT NULL DEFAULT 'baru' 
              CHECK (status IN ('baru', 'diproses', 'selesai')),
  petugas     TEXT,
  selesai_at  TEXT,

  
  ai_status   TEXT NOT NULL DEFAULT 'pending'
              CHECK (ai_status IN ('pending', 'ok', 'gagal')),
  kategori    TEXT,                        
  prioritas   TEXT CHECK (prioritas IS NULL OR prioritas IN ('rendah', 'sedang', 'tinggi')),
  ringkasan   TEXT,
  rekomendasi TEXT,
  ai_error    TEXT,                        
  ai_model    TEXT,
  ai_ms       INTEGER,                     

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
, foto_selesai_key TEXT, pelapor_id TEXT REFERENCES pengguna(id), bukti_ai_hasil  TEXT, bukti_ai_alasan TEXT, bukti_ai_model  TEXT, bukti_ai_ms     INTEGER);
INSERT INTO "reports" ("id","toilet_id","teks","foto_key","status","petugas","selesai_at","ai_status","kategori","prioritas","ringkasan","rekomendasi","ai_error","ai_model","ai_ms","created_at","updated_at","foto_selesai_key","pelapor_id","bukti_ai_hasil","bukti_ai_alasan","bukti_ai_model","bukti_ai_ms") VALUES('9cacc21c-0f1c-4ca5-9322-4fb2e331e9ea','A-1-PRIA','aduh bapuk ni kamar mandinya ada tikusnya dan kaca nya berembun',NULL,'selesai','Administrator','2026-09-11 09:32:15','ok','["kebersihan","kerusakan"]','sedang','Toilet kotor, ada tikus, dan kaca berembun.','Bersihkan toilet dan hilangkan sumber kotoran yang menarik tikus, lalu lap kaca hingga kering.',NULL,'deepseek-chat',1498,'2026-09-02 06:02:54','2026-09-11 09:32:15','bukti/2026-09-11/13d4bb38-bc83-4a49-9a1a-a699f1b8388e.jpg',NULL,'bersih','Foto memperlihatkan bilik toilet jongkok dan duduk yang tampak bersih, kering, serta terawat dengan baik.','gemini-3.6-flash',9287);
INSERT INTO "reports" ("id","toilet_id","teks","foto_key","status","petugas","selesai_at","ai_status","kategori","prioritas","ringkasan","rekomendasi","ai_error","ai_model","ai_ms","created_at","updated_at","foto_selesai_key","pelapor_id","bukti_ai_hasil","bukti_ai_alasan","bukti_ai_model","bukti_ai_ms") VALUES('48478f97-3df6-4e33-807e-b204d317467e','A-2-PRIA','Sabunnya abis',NULL,'selesai','admin','2026-09-02 06:23:48','ok','["perlengkapan"]','sedang','Sabun cuci tangan di toilet pria habis.','Isi ulang sabun cuci tangan pada dispenser di toilet pria.',NULL,'deepseek-chat',934,'2026-09-02 06:02:55','2026-09-02 06:23:48',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "reports" ("id","toilet_id","teks","foto_key","status","petugas","selesai_at","ai_status","kategori","prioritas","ringkasan","rekomendasi","ai_error","ai_model","ai_ms","created_at","updated_at","foto_selesai_key","pelapor_id","bukti_ai_hasil","bukti_ai_alasan","bukti_ai_model","bukti_ai_ms") VALUES('0f274115-5e15-4821-bf6f-b2cb2e342690','A-1-WANITA','sdadasdfasfvasv tes tes','laporan/2026-09-02/f003a603-5f57-456e-8232-e9c6d73f2af5.jpg','baru',NULL,NULL,'ok','["lainnya"]','rendah','Keluhan tidak jelas dan tidak terkait toilet.','Tidak ada tindakan perbaikan yang dapat dilakukan karena informasi tidak jelas.',NULL,'deepseek-chat',2022,'2026-09-02 06:06:53','2026-09-02 06:06:55',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO "reports" ("id","toilet_id","teks","foto_key","status","petugas","selesai_at","ai_status","kategori","prioritas","ringkasan","rekomendasi","ai_error","ai_model","ai_ms","created_at","updated_at","foto_selesai_key","pelapor_id","bukti_ai_hasil","bukti_ai_alasan","bukti_ai_model","bukti_ai_ms") VALUES('314b8edb-3c52-4d4e-8a0e-5b0947e016c1','B-1-PRIA','bau nih kotor juga berdebu','laporan/2026-09-02/eeda15ba-5a6d-4966-9af7-0675639afce5.png','selesai','Administrator','2026-09-11 08:54:14','ok','["bau","kebersihan"]','sedang','Toilet pria lantai 1 berbau dan kotor berdebu.','Bersihkan seluruh area toilet, termasuk lantai dan permukaan yang berdebu, lalu hilangkan sumber bau.',NULL,'deepseek-chat',1132,'2026-09-02 08:04:26','2026-09-11 08:54:14','bukti/2026-09-11/f3c04f50-306a-4101-8447-a0ca85a7271b.jpg','ad8f66b6-e132-4cc8-a731-fea4101b7568',NULL,NULL,NULL,NULL);
CREATE TABLE daily_summaries (
  tanggal       TEXT PRIMARY KEY,          
  total_laporan INTEGER NOT NULL,
  ringkasan     TEXT NOT NULL,
  sorotan       TEXT,                      
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-02',4,'Pada tanggal 2 September 2026, terdapat 4 laporan kondisi toilet kampus. Lokasi terbanyak adalah Gedung A dengan 3 laporan, sementara Gedung B memiliki 1 laporan. Masalah yang paling sering muncul adalah kebersihan toilet pria, termasuk kotor, berbau, dan berdebu. Satu laporan di WC Wanita tidak jelas dan tidak terkait toilet.','["Bersihkan toilet pria Gedung A lantai 1 dari kotoran dan tikus.","Isi ulang sabun cuci tangan di toilet pria Gedung A lantai 2.","Bersihkan toilet pria Gedung B lantai 1 dari bau dan debu.","Tindak lanjuti laporan tidak jelas di WC Wanita Gedung A."]','2026-09-02 10:01:03');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-03',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-03 10:00:19');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-04',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-04 10:00:15');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-05',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-05 10:00:11');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-06',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-06 10:00:12');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-07',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-07 10:00:10');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-08',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-08 10:00:10');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-09',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-09 10:00:18');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-10',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-10 10:00:20');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-11',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-11 10:00:58');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-12',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-12 10:00:58');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-13',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-13 10:01:03');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-14',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-14 10:01:20');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-15',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-15 10:01:10');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-16',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-16 10:00:30');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-17',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-17 10:00:14');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-18',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-18 10:00:37');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-19',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-19 10:00:36');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-20',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-20 10:00:37');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-21',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-21 10:00:37');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-22',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-22 10:00:37');
INSERT INTO "daily_summaries" ("tanggal","total_laporan","ringkasan","sorotan","created_at") VALUES('2026-09-23',0,'Tidak ada keluhan yang masuk pada hari ini.','[]','2026-09-23 13:27:41');
CREATE TABLE gedung (
  kode   TEXT PRIMARY KEY,
  nama   TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('A','Ki Hajar Dewantara',1);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('B','Masjid At-Tarbiyah',2);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('C','Dewi Sartika',3);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('D','KH. Ahmad Dahlan',4);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('E','Dr. Wahidin Sudirohusodo',5);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('F','Daoed Joesoef',6);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('G','RA. Kartini',7);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('H','Mohamad Yamin',8);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('I','Dr. Sutomo',9);
INSERT INTO "gedung" ("kode","nama","urutan") VALUES('J','KH. Moh. Hasyim Ashari',10);
CREATE TABLE aktivitas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu     TEXT NOT NULL DEFAULT (datetime('now')),
  aksi      TEXT NOT NULL,   
  report_id TEXT,            
  pelaku    TEXT NOT NULL,   
  ringkas   TEXT NOT NULL,   
  rincian   TEXT             
);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(1,'2026-09-02 08:01:30','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(2,'2026-09-02 08:04:26','lapor','314b8edb-3c52-4d4e-8a0e-5b0947e016c1','Raden Mochamad Issa Wirakusumah','Laporan baru di WC Pria - Lantai 1, Gedung B (Masjid At-Tarbiyah)','{"toilet_id":"B-1-PRIA","teks":"bau nih kotor juga berdebu"}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(3,'2026-09-02 08:04:27','analisis','314b8edb-3c52-4d4e-8a0e-5b0947e016c1','sistem','Analisis selesai: prioritas sedang (1146 ms)','{"kategori":["bau","kebersihan"],"prioritas":"sedang","model":"deepseek-chat"}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(4,'2026-09-02 08:05:52','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(5,'2026-09-02 08:08:07','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(6,'2026-09-02 08:08:28','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(7,'2026-09-02 08:09:09','pengguna',NULL,'Administrator','Menambah akun petugas agus (agus)',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(8,'2026-09-02 08:09:22','masuk',NULL,'agus','agus (petugas) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(9,'2026-09-02 08:44:50','masuk',NULL,'agus','agus (petugas) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(10,'2026-09-02 10:01:03','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-02 disusun dari 4 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(11,'2026-09-03 10:00:19','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-03 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(12,'2026-09-04 10:00:16','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-04 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(13,'2026-09-05 10:00:11','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-05 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(14,'2026-09-06 10:00:12','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-06 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(15,'2026-09-07 10:00:10','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-07 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(16,'2026-09-08 10:00:10','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-08 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(17,'2026-09-09 01:24:40','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(18,'2026-09-09 01:25:22','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(19,'2026-09-09 10:00:19','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-09 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(20,'2026-09-10 10:00:20','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-10 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(21,'2026-09-11 08:19:31','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(22,'2026-09-11 08:54:14','status','314b8edb-3c52-4d4e-8a0e-5b0947e016c1','Administrator','Status baru → selesai di WC Pria - Lantai 1, Gedung B (Masjid At-Tarbiyah)','{"dari":"baru","ke":"selesai","foto_bukti":"bukti/2026-09-11/f3c04f50-306a-4101-8447-a0ca85a7271b.jpg"}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(23,'2026-09-11 09:25:34','verifikasi_gagal','9cacc21c-0f1c-4ca5-9322-4fb2e331e9ea','Administrator','Pemeriksaan foto bukti gagal di WC Pria - Lantai 1, Gedung A (Ki Hajar Dewantara)','{"error":"LLM HTTP 404: [{\n  \"error\": {\n    \"code\": 404,\n    \"message\": \"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features and improvements. We recommend you to use the Interactions API.\",\n    \"status\": \"NOT_F","model":"gemini-2.5-flash"}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(24,'2026-09-11 09:28:56','verifikasi_gagal','9cacc21c-0f1c-4ca5-9322-4fb2e331e9ea','Administrator','Pemeriksaan foto bukti gagal di WC Pria - Lantai 1, Gedung A (Ki Hajar Dewantara)','{"error":"Respons LLM bukan JSON: {\"toilet\":true,\"bersih\":false,\"key","model":"gemini-3.6-flash"}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(25,'2026-09-11 09:31:03','bukti_ditolak','9cacc21c-0f1c-4ca5-9322-4fb2e331e9ea','Administrator','Foto bukti ditolak (kotor) di WC Pria - Lantai 1, Gedung A (Ki Hajar Dewantara): Foto memperlihatkan area dalam toilet, tetapi lantai luar dan dalam bilik terlihat sangat kotor berbercak jejak kaki kotor.','{"hasil":"kotor","alasan":"Foto memperlihatkan area dalam toilet, tetapi lantai luar dan dalam bilik terlihat sangat kotor berbercak jejak kaki kotor.","keyakinan":0.95,"model":"gemini-3.6-flash","ms":4799}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(26,'2026-09-11 09:32:15','status','9cacc21c-0f1c-4ca5-9322-4fb2e331e9ea','Administrator','Status baru → selesai di WC Pria - Lantai 1, Gedung A (Ki Hajar Dewantara)','{"dari":"baru","ke":"selesai","foto_bukti":"bukti/2026-09-11/13d4bb38-bc83-4a49-9a1a-a699f1b8388e.jpg","verifikasi":{"hasil":"bersih","alasan":"Foto memperlihatkan bilik toilet jongkok dan duduk yang tampak bersih, kering, serta terawat dengan baik.","model":"gemini-3.6-flash","ms":9287}}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(27,'2026-09-11 10:00:58','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-11 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(28,'2026-09-12 10:00:58','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-12 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(29,'2026-09-13 10:01:03','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-13 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(30,'2026-09-14 10:01:21','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-14 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(31,'2026-09-15 10:01:11','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-15 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(32,'2026-09-16 10:00:31','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-16 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(33,'2026-09-17 10:00:14','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-17 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(34,'2026-09-18 10:00:37','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-18 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(35,'2026-09-19 10:00:37','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-19 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(36,'2026-09-20 10:00:37','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-20 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(37,'2026-09-21 06:57:37','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(38,'2026-09-21 10:00:37','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-21 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(39,'2026-09-22 10:00:37','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-22 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(40,'2026-09-23 10:00:40','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-23 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(41,'2026-09-23 12:28:34','masuk',NULL,'Administrator','Administrator (admin) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(42,'2026-09-23 13:23:25','masuk',NULL,'Administrator','Administrator (SPV) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(43,'2026-09-23 13:26:35','masuk',NULL,'Administrator','Administrator (SPV) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(44,'2026-09-23 13:27:36','masuk',NULL,'Administrator','Administrator (SPV) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(45,'2026-09-23 13:27:41','ringkasan',NULL,'sistem','Ringkasan harian 2026-09-23 disusun dari 0 laporan',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(46,'2026-09-23 13:35:43','tanya',NULL,'Administrator','Tanya data: "Which building had the most reports in the last 30 days?"','{"pertanyaan":"Which building had the most reports in the last 30 days?","alat":[{"nama":"hitung_laporan","argumen":{"kelompok":"gedung","sejak":"2026-08-25","sampai":"2026-09-23"}}],"token":{"prompt":3837,"jawaban":176,"cache_hit":1792},"model":"deepseek-chat","ms":1608}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(47,'2026-09-23 13:35:54','tanya',NULL,'Administrator','Tanya data: "kamu tau shabi?"','{"pertanyaan":"kamu tau shabi?","alat":[],"token":{"prompt":1916,"jawaban":65,"cache_hit":1664},"model":"deepseek-chat","ms":814}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(48,'2026-09-23 13:36:07','tanya',NULL,'Administrator','Tanya data: "shabi itu istriku yang cantik"','{"pertanyaan":"shabi itu istriku yang cantik","alat":[],"token":{"prompt":1994,"jawaban":46,"cache_hit":1792},"model":"deepseek-chat","ms":835}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(49,'2026-09-23 13:36:17','tanya',NULL,'Administrator','Tanya data: "sekarang saya tanyakan anda, siapa shabi"','{"pertanyaan":"sekarang saya tanyakan anda, siapa shabi","alat":[],"token":{"prompt":2057,"jawaban":50,"cache_hit":1920},"model":"deepseek-chat","ms":644}');
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(50,'2026-09-23 13:48:11','masuk',NULL,'Administrator','Administrator (SPV) masuk ke dashboard',NULL);
INSERT INTO "aktivitas" ("id","waktu","aksi","report_id","pelaku","ringkas","rincian") VALUES(51,'2026-09-23 13:54:08','masuk',NULL,'Administrator','Administrator (SPV) masuk ke dashboard',NULL);
CREATE TABLE pekerjaan (
  id              TEXT PRIMARY KEY,
  toilet_id       TEXT NOT NULL REFERENCES toilets(id),
  petugas_id      TEXT NOT NULL REFERENCES pengguna(id),
  petugas         TEXT NOT NULL,           
  teks            TEXT NOT NULL,           
  foto_key        TEXT NOT NULL,           
  bukti_ai_hasil  TEXT NOT NULL,           
  bukti_ai_alasan TEXT,
  bukti_ai_model  TEXT,
  bukti_ai_ms     INTEGER,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE pengguna (
  id         TEXT PRIMARY KEY,
  username   TEXT UNIQUE COLLATE NOCASE,
  nama       TEXT NOT NULL,
  peran      TEXT NOT NULL CHECK (peran IN ('spv', 'petugas', 'pelapor')),
  sandi_hash TEXT,
  sandi_salt TEXT,
  aktif      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  CHECK (peran = 'petugas' OR (username IS NOT NULL AND sandi_hash IS NOT NULL AND sandi_salt IS NOT NULL))
);
INSERT INTO "pengguna" ("id","username","nama","peran","sandi_hash","sandi_salt","aktif","created_at") VALUES('adm-0001','admin','Administrator','spv','aa5ddc9aec19027d530e492d19af4a885f31f74b0cc7f904c42c6844d16906ae','d6a30f8de4b3950fc25e3f00c2dbd16d',1,'2026-09-02 08:00:50');
INSERT INTO "pengguna" ("id","username","nama","peran","sandi_hash","sandi_salt","aktif","created_at") VALUES('ad8f66b6-e132-4cc8-a731-fea4101b7568','Yvrtz','Raden Mochamad Issa Wirakusumah','pelapor','c098a2ad5aa6bae0b3924f561585098d661439e5e3a8bbcd686e803a7680bd02','73b1dd71cde39589dc739c6bd3a324ec',1,'2026-09-02 08:03:44');
INSERT INTO "pengguna" ("id","username","nama","peran","sandi_hash","sandi_salt","aktif","created_at") VALUES('274f99db-a9d3-49b9-bb10-18f547e1f613','agus','agus','petugas','99d92c2b746a0793325d614d10cfc6bb1fe01612e5665dc571b9f8e9e5053cda','35a2e9bf5784645a893bfb04d4893d67',1,'2026-09-02 08:09:09');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',7);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('aktivitas',51);
CREATE INDEX idx_reports_created  ON reports (created_at DESC);
CREATE INDEX idx_reports_status   ON reports (status, created_at DESC);
CREATE INDEX idx_reports_toilet   ON reports (toilet_id, created_at DESC);
CREATE INDEX idx_reports_ai       ON reports (ai_status) WHERE ai_status <> 'ok';
CREATE INDEX idx_toilets_lokasi ON toilets (gedung_kode, lantai, jenis);
CREATE INDEX idx_aktivitas_waktu  ON aktivitas (waktu DESC);
CREATE INDEX idx_aktivitas_report ON aktivitas (report_id);
CREATE INDEX idx_aktivitas_aksi   ON aktivitas (aksi, waktu DESC);
CREATE INDEX idx_reports_pelapor ON reports (pelapor_id);
CREATE INDEX idx_pekerjaan_created ON pekerjaan (created_at DESC);
CREATE INDEX idx_pekerjaan_toilet  ON pekerjaan (toilet_id, created_at DESC);
CREATE INDEX idx_pekerjaan_petugas ON pekerjaan (petugas_id, created_at DESC);
CREATE INDEX idx_pengguna_peran ON pengguna (peran, aktif);
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
