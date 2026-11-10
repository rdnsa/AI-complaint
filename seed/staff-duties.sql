-- Duties of each staff member, from the placement letter
-- "Penempatan Lokasi Kerja PHL dan OB 2026" (UPI Kampus Tasikmalaya, revised edition naming the buildings), signed by the Director.
-- Matched by name, so the same file works on the local and the production database.
-- Re-running it replaces these people's duties; a name not in the database is skipped.
-- Apply after migrations 0014 and 0015:  npm run db:seed:duties   (or db:seed:duties:remote)

-- Muhammad Iqbal Maulana: 22 duties
UPDATE users SET job_title = 'Petugas Kebersihan', assignment = 'Halaman Gedung Ki Hajar Dewantara, Mesjid' WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan membuang isinya ke TPS' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Membawa sampah yang sudah dikumpulkan oleh petugas kebersihan gedung administrasi' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Menyapu jalan dan taman' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Membersihkan selokan dari sampah, maupun rumput liar di sekitar area penugasan' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Membersihkan Pos keamanan termasuk toilet' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan ATM' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan rumput liar di paving blok di seputaran area penugasan' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Menyapu lantai dan seluruh sudut ruangan dan selasar' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan karpet mesjid dengan vacuum cleaner' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Membersihkan meja dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Membersihkan seluruh jendela/kaca (Gd. Administrasi dan Mesjid)' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Membersihkan Toilet Pria dan Wanita' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Menyalakan lampu di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Mematikan lampu di pagi hari' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Merawat (menyiram, memotong, dan memupuk) tanaman di seputaran gedung' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Mengkoordinasikan apabila ada kerusakan atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 21, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 22, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;

-- Joko Waluyo: 20 duties
UPDATE users SET job_title = 'Petugas Kebersihan', assignment = 'Gedung Ki Hajar Dewantara Lantai 2, 3 dan 4' WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan mengumpulkan isinya ke luar gedung' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Mencuci tempat sampah diseluruh ruangan dan lorong' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Menyapu lantai dan seluruh sudut ruangan' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan meja seluruh ruangan dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan seluruh jendela/kaca dengan lap dan cairan khusus' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Mengganti galon' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan Toilet Pria dan Wanita Lt 2, 3 dan 4' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Mengecek fungsi saklar dan lampu' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Menyalakan lampu di pagi dan mematikan di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan AC disetiap ruangan sebelum pulang atau ketika ruangan tidak dipergunakan' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Mempersiapkan ruangan Auditorium bila ada kegiatan dan merapihkan kembali' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Membersihkan Dak Lt 3, 4 dan 5' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Merawat tanaman (menyiram, memupuk dan membersihkan dari rumput liar)' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE;

-- Sri: 24 duties
UPDATE users SET job_title = 'Petugas Kebersihan', assignment = 'Gedung Dewi Sartika Perkuliahan Lt. 1, 2, 3' WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan mengumpulkan isinya ke luar gedung' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Mencuci tempat sampah diseluruh ruangan, lorong dan toilet' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Menyapu lantai dan seluruh sudut ruangan' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan meja seluruh ruang kelas dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan seluruh jendela/kaca dengan lap dan cairan khusus' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Mengganti galon' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan Toilet Pria dan Wanita' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Mengecek fungsi saklar dan lampu' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Menyalakan lampu di pagi dan mematikan di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan AC disetiap ruangan sebelum pulang atau ketika ruangan tidak dipergunakan' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Mengecek fungsi AC' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Mempersiapkan ruang kelas dan Ballroom bila ada kegiatan dan merapihkan kembali' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Membersihkan Dak Lt 6' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Merawat tanaman (menyiram, memupuk dan membersihkan dari rumput liar)' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Membantu petugas keamanan mengatur atau merapikan parkiran motor di seputaran gedung' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Membersihkan selokan di seputaran area penugasan' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 21, 'Membersihkan pavingblok dari lumut dan rumput liar di area penugasan' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 22, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 23, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 24, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE;

-- Miranda: 24 duties
UPDATE users SET job_title = 'Petugas Kebersihan', assignment = 'Gedung Dewi Sartika Perkuliahan Lt. 1, 2, 3' WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan mengumpulkan isinya ke luar gedung' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Mencuci tempat sampah diseluruh ruangan, lorong dan toilet' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Menyapu lantai dan seluruh sudut ruangan' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan meja seluruh ruang kelas dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan seluruh jendela/kaca dengan lap dan cairan khusus' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Mengganti galon' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan Toilet Pria dan Wanita' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Mengecek fungsi saklar dan lampu' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Menyalakan lampu di pagi dan mematikan di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan AC disetiap ruangan sebelum pulang atau ketika ruangan tidak dipergunakan' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Mengecek fungsi AC' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Mempersiapkan ruang kelas dan Ballroom bila ada kegiatan dan merapihkan kembali' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Membersihkan Dak Lt 6' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Merawat tanaman (menyiram, memupuk dan membersihkan dari rumput liar)' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Membantu petugas keamanan mengatur atau merapikan parkiran motor di seputaran gedung' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Membersihkan selokan di seputaran area penugasan' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 21, 'Membersihkan pavingblok dari lumut dan rumput liar di area penugasan' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 22, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 23, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 24, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE;

-- Jajang: 24 duties
UPDATE users SET job_title = 'Petugas Kebersihan', assignment = 'Gedung Dewi Sartika Perkuliahan Lt. 4, 5' WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan mengumpulkan isinya ke luar gedung' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Mencuci tempat sampah diseluruh ruangan, lorong dan toilet' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Menyapu lantai dan seluruh sudut ruangan' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan meja seluruh ruang kelas dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan seluruh jendela/kaca dengan lap dan cairan khusus' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Mengganti galon' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan Toilet Pria dan Wanita' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Mengecek fungsi saklar dan lampu' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Menyalakan lampu di pagi dan mematikan di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan AC disetiap ruangan sebelum pulang atau ketika ruangan tidak dipergunakan' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Mengecek fungsi AC' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Mempersiapkan ruang kelas dan Ballroom bila ada kegiatan dan merapihkan kembali' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Membersihkan Dak Lt 6' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Merawat tanaman (menyiram, memupuk dan membersihkan dari rumput liar)' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Membantu petugas keamanan mengatur atau merapikan parkiran motor di seputaran gedung' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Membersihkan selokan di seputaran area penugasan' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 21, 'Membersihkan pavingblok dari lumut dan rumput liar di area penugasan' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 22, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 23, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 24, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE;

-- Rusman: 23 duties
UPDATE users SET job_title = 'Petugas Kebersihan (PHL)', assignment = 'Gedung RA Kartini, Lapang Volly, Gedung KH. Ahmad Dahlan' WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan membuang isinya ke TPS' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Menyapu lapangan, jalan dan taman di area penugasan' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Mencuci tempat sampah diseluruh area penugasan' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Menyapu lantai seluruh sudut ruangan dan selasar' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan meja seluruh ruangan dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan seluruh jendela/kaca dengan lap dan cairan khusus' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan Toilet Pria dan Wanita' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Mengecek fungsi saklar dan lampu' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Menyalakan lampu di pagi dan mematikan di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan AC sebelum pulang atau ketika ruangan tidak dipergunakan' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Mempersiapkan ruangan Aula dan LAB bila ada kegiatan dan merapihkan kembali' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Merapihkan, menata dan membersihkan kursi yang akan dipergunakan' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Merawat tanaman (menyiram, memupuk dan membersihkan dari rumput liar)' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Membersihkan pavingblok dari lumut dan rumput liar di area penugasan' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Membersihkan selokan diseputaran area penugasan' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Membantu petugas keamanan mengatur atau merapikan parkiran motor' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 21, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 22, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 23, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE;

-- Riki Rukmantara: 23 duties
UPDATE users SET job_title = 'Petugas Kebersihan (PHL)', assignment = 'Gedung RA Kartini, Lapang Volly, Gedung KH. Ahmad Dahlan' WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan membuang isinya ke TPS' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Menyapu lapangan, jalan dan taman di area penugasan' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Mencuci tempat sampah diseluruh area penugasan' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Menyapu lantai seluruh sudut ruangan dan selasar' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan meja seluruh ruangan dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan seluruh jendela/kaca dengan lap dan cairan khusus' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan Toilet Pria dan Wanita' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Mengecek fungsi saklar dan lampu' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Menyalakan lampu di pagi dan mematikan di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan AC sebelum pulang atau ketika ruangan tidak dipergunakan' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Mempersiapkan ruangan Aula dan LAB bila ada kegiatan dan merapihkan kembali' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Merapihkan, menata dan membersihkan kursi yang akan dipergunakan' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Merawat tanaman (menyiram, memupuk dan membersihkan dari rumput liar)' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Membersihkan pavingblok dari lumut dan rumput liar di area penugasan' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Membersihkan selokan diseputaran area penugasan' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Membantu petugas keamanan mengatur atau merapikan parkiran motor' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 21, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 22, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 23, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE;

-- Gilang Abdul Aziz: 25 duties
UPDATE users SET job_title = 'Petugas Kebersihan (PHL)', assignment = 'Gedung Mohamad Yamin' WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan membuang isinya ke TPS' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Mencuci tempat sampah diseluruh ruangan dan lorong' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Menyapu jalan, parkiran dan taman di area penugasan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Menyapu lantai dan seluruh sudut ruangan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan meja seluruh ruangan dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan seluruh jendela/kaca dengan lap dan cairan khusus' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Mengganti galon' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Membersihkan Toilet Pria dan Wanita' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Mengganti galon' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan AC sebelum pulang atau ketika ruangan tidak digunakan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Menyalakan lampu di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Mematikan lampu di pagi hari' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Merawat (menyiram, memotong, memupuk, dan menyapu) tanaman di seputaran gedung' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Melaporkan bila ada kerusakan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Mempersiapkan LAB ketika akan digunakan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Merapikan kembali LAB ketika sudah dipergunakan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 21, 'Membantu petugas keamanan mengatur atau merapikan parkiran motor' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 22, 'Membersihkan pavingblok dari lumut dan rumput liar di area penugasan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 23, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 24, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 25, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE;

-- Zidan Muhammad S: 23 duties
UPDATE users SET job_title = 'Petugas Kebersihan Gedung Lab (PHL)', assignment = 'Gedung Sutomo' WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan membuang isinya ke TPS' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Mencuci tempat sampah diseluruh ruangan dan lorong' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Menyapu lantai dan seluruh sudut ruangan' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Membersihkan meja seluruh ruangan dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Membersihkan seluruh jendela/kaca dengan lap dan cairan khusus' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Merapihkan seluruh ruangan LAB' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan Toilet Pria dan Wanita' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Membersihkan (disapu dan dipel) pelataran/ selasar LAB' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Menyalakan lampu selasar di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan lampu selasar di pagi hari' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Merawat (menyiram, memotong, memupuk, dan menyapu) tanaman di seputaran gedung' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Mematikan AC sebelum pulang atau ketika ruangan tidak digunakan' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Menyapu taman depan gedung LAB dan kantin' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Membersihkan Padepokan dari debu dan sampah' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 19, 'Membantu petugas keamanan mengatur atau merapikan parkiran motor' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 20, 'Membersihkan pavingblok dari lumut dan rumput liar di area penugasan' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 21, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 22, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 23, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE;

-- Romulus: 14 duties
UPDATE users SET job_title = 'Petugas Teknisi dan Operator Mesin Rumput (PHL)', assignment = 'Seluruh area kampus UPI Kampus Tasikmalaya' WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Memotong rumput di seluruh area kampus' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Melakukan perawatan mesin rumput' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Melakukan pengasahan atau penggantian pisau rumput' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Memupuk tanaman' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Mencabut atau merapikan area yang tidak terjangkau oleh mesin rumput' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Memotong ranting pohon yang sudah mati atau membahayakan' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Melaporkan kebutuhan bahan bakar mesin rumput' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Melakukan perbaikan mesin atau alat perkantoran' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Melakukan pengecekan mesin dan bak penampungan air' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Melakukan perbaikan jaringan kelistrikan' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Melakukan perbaikan bangunan sesuai instruksi' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Mengkoordinasikan bila ada kerusakan, atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Romulus' COLLATE NOCASE;

-- Feri Agus Sobari: 18 duties
UPDATE users SET job_title = 'Petugas Kebersihan', assignment = 'Halaman Gedung Ki Hajar Dewantara, Mesjid' WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
DELETE FROM staff_duties WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE);
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 1, 'Mengosongkan tempat sampah dengan membuang isinya ke TPS' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 2, 'Membawa sampah ke TPS' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 3, 'Menyapu Lapang Tenis dan taman kantin' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 4, 'Membersihkan selokan dari sampah, maupun rumput liar di sekitar area penugasan' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 5, 'Membersihkan rumput liar di paving blok di seputaran area penugasan' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 6, 'Menyapu lantai dan seluruh sudut ruangan dan selasar Lab Gambar dan Bengkel' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 7, 'Mengepel lantai dengan obat pel/ pewangi' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 8, 'Membersihkan noda/ kerak lantai dengan skrap, spons dan obat' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 9, 'Membersihkan area Kantin' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 10, 'Membersihkan meja dari sampah dan debu' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 11, 'Membersihkan langit-langit' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 12, 'Membersihkan keset' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 13, 'Menyalakan lampu di sore hari sebelum pulang' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 14, 'Mematikan lampu di pagi hari' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 15, 'Merawat (menyiram, memotong, dan memupuk) tanaman di seputaran gedung' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 16, 'Mengkoordinasikan apabila ada kerusakan atau membutuhkan bantuan' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 17, 'Memastikan semua kegiatan sesuai dengan peraturan dan standar yang berlaku' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;
INSERT INTO staff_duties (staff_id, position, text) SELECT id, 18, 'Melaksanakan tugas tambahan dan patuh pada instruksi pimpinan' FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE;


-- ---------------------------------------------------------------------------
-- Responsible areas (migration 0015), from the letter's "Area Penugasan":
--   Halaman Gedung Ki Hajar Dewantara + Mesjid -> ADM-HALAMAN, MASJID, B-HALAMAN
--   Ki Hajar Dewantara Lt 2-4 -> ADM-2..4; Dewi Sartika Lt 1-3 / 4-5 -> C-1..3 / C-4..5
--   RA Kartini, Lapang Volly, KH. Ahmad Dahlan -> G-*, LAPANG-VOLI, D-*
--   Mohamad Yamin -> H-*; Sutomo -> I-*
-- A whole building includes its yard; a building given by floors gets those floors only.
-- Romulus (technician, grass cutting) works campus-wide: no areas, so no task target.
-- An area id missing from the database is skipped by the JOIN.

DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Muhammad Iqbal Maulana' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('ADM-HALAMAN', 'MASJID', 'B-HALAMAN') WHERE u.role = 'staff' AND u.name = 'Muhammad Iqbal Maulana' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Feri Agus Sobari' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('ADM-HALAMAN', 'MASJID', 'B-HALAMAN') WHERE u.role = 'staff' AND u.name = 'Feri Agus Sobari' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Joko Waluyo' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('ADM-2', 'ADM-3', 'ADM-4') WHERE u.role = 'staff' AND u.name = 'Joko Waluyo' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Sri' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('C-1', 'C-2', 'C-3') WHERE u.role = 'staff' AND u.name = 'Sri' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Miranda' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('C-1', 'C-2', 'C-3') WHERE u.role = 'staff' AND u.name = 'Miranda' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Jajang' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('C-4', 'C-5') WHERE u.role = 'staff' AND u.name = 'Jajang' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Rusman' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('G-HALAMAN', 'G-1', 'LAPANG-VOLI', 'D-HALAMAN', 'D-1') WHERE u.role = 'staff' AND u.name = 'Rusman' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Riki Rukmantara' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('G-HALAMAN', 'G-1', 'LAPANG-VOLI', 'D-HALAMAN', 'D-1') WHERE u.role = 'staff' AND u.name = 'Riki Rukmantara' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Gilang Abdul Aziz' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('H-HALAMAN', 'H-1', 'H-2') WHERE u.role = 'staff' AND u.name = 'Gilang Abdul Aziz' COLLATE NOCASE;
DELETE FROM staff_areas WHERE staff_id IN (SELECT id FROM users WHERE role = 'staff' AND name = 'Zidan Muhammad S' COLLATE NOCASE);
INSERT INTO staff_areas (staff_id, area_id) SELECT u.id, a.id FROM users u JOIN cleaning_areas a ON a.id IN ('I-HALAMAN', 'I-1') WHERE u.role = 'staff' AND u.name = 'Zidan Muhammad S' COLLATE NOCASE;
