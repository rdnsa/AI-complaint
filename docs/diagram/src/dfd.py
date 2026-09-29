"""Semua DFD (Level 0, 1, 2) dengan tata letak yang diatur tangan.

Jalankan: python3 dfd.py   -> menulis ../dfd-*.svg
Gaya dan aturan gambarnya ada di dfd_draw.py.
"""
from pathlib import Path

from dfd_draw import Diagram

OUT = Path(__file__).parent.parent
SUB = 'Notasi Yourdon/DeMarco · persegi = entitas eksternal · lingkaran = proses · kotak terbuka = data store'
STORES = {
    'D1': 'Pengguna (users)',
    'D2': 'Lokasi (buildings, toilets)',
    'D3': 'Laporan (reports)',
    'D4': 'Log Pekerjaan (work_logs)',
    'D5': 'Ringkasan Harian (daily_summaries)',
    'D6': 'Log Aktivitas (activity_log)',
    'D7': 'Foto (R2 bucket)',
}
DIAGRAMS = {}


def diagram(name):
    def register(fn):
        DIAGRAMS[name] = fn
        return fn
    return register


def store(d, key, x, y, code, dup=False, left=None):
    d.store(key, x, y, code, STORES[code], dup=dup, left=left)


# ====================================================================== Level 0
@diagram('dfd-level-0')
def level0():
    d = Diagram(1500, 1010, 'DFD Level 0 — Diagram Konteks Sistem AI Complaint', SUB)
    d.process('sys', 750, 540, '0', 'Sistem Pelaporan\nToilet Kampus\nBerbasis AI', r=118)
    d.entity('mhs', 180, 250, 'Mahasiswa\n(Pelapor)')
    d.entity('ptg', 180, 540, 'Petugas\nKebersihan')
    d.entity('pgj', 180, 830, 'Pengunjung\nUmum')
    d.entity('spv', 750, 140, 'Supervisor')
    d.entity('llm', 1320, 250, 'LLM Teks\n(DeepSeek)')
    d.entity('vis', 1320, 540, 'LLM Vision\n(Gemini)')
    d.entity('cron', 1320, 830, 'Penjadwal\n(Cron 17:00 WIB)')

    d.flow('mhs', 'sys', 'data registrasi & login,\nkode QR lantai, keluhan,\nfoto kondisi, ID laporan')
    d.flow('sys', 'mhs', 'ID laporan, status laporan,\npapan peringkat')
    d.flow('ptg', 'sys', 'kode QR lantai, nama petugas,\nfoto bukti, status, catatan pekerjaan')
    d.flow('sys', 'ptg', 'laporan terbuka,\nhasil verifikasi foto')
    d.flow('pgj', 'sys', 'pertanyaan data')
    d.flow('sys', 'pgj', 'papan laporan publik,\njawaban pertanyaan')
    d.flow('spv', 'sys', 'kredensial, data akun & petugas,\nfilter waktu, perintah\nanalisis ulang / hapus')
    d.flow('sys', 'spv', 'dashboard & grafik, log,\nringkasan harian, stiker QR')
    d.flow('sys', 'llm', 'teks keluhan, laporan harian,\npertanyaan + data agregat')
    d.flow('llm', 'sys', 'kategori, prioritas, ringkasan,\nrekomendasi, ringkasan harian,\njawaban')
    d.flow('sys', 'vis', 'foto bukti + konteks keluhan')
    d.flow('vis', 'sys', 'verdict + alasan')
    d.flow('cron', 'sys', 'pemicu harian')
    return d



# ====================================================================== Level 1
@diagram('dfd-level-1')
def level1():
    d = Diagram(2480, 1910, 'DFD Level 1 — Sistem AI Complaint',
                SUB + ' · garis tegak ganda / garis miring di sudut = salinan simbol yang sama')

    # --- Pita atas: laporan masuk dan analisis AI
    d.entity('mhs', 170, 300, 'Mahasiswa\n(Pelapor)')
    d.process('p2', 600, 300, '2.0', 'Terima &\nLacak Laporan')
    store(d, 'd2', 600, 135, 'D2')
    store(d, 'd7a', 600, 470, 'D7', dup=True)
    store(d, 'd3', 1000, 300, 'D3')
    store(d, 'd6a', 1000, 470, 'D6', dup=True)
    d.process('p3', 1400, 300, '3.0', 'Analisis\nKeluhan (AI)')
    d.entity('spv_a', 1400, 135, 'Supervisor', dup=True)
    d.entity('llm', 1800, 300, 'LLM Teks\n(DeepSeek)')

    d.flow('mhs', 'p2', 'kode QR lantai, keluhan,\nfoto kondisi, ID laporan')
    d.flow('p2', 'mhs', 'ID & status laporan')
    d.flow('d2', 'p2', 'data toilet aktif')
    d.flow('p2', 'd7a', 'foto kondisi')
    d.flow('p2', 'd3', 'laporan baru')
    d.flow('d3', 'p2', 'status laporan,\ncek laporan kembar')
    d.flow('p2', 'p3', 'ID laporan baru', via=[(760, 212), (1240, 212)], side=-1)
    d.flow('p2', 'd6a', 'log laporan masuk', side=-1)
    d.flow('d3', 'p3', 'teks keluhan + lokasi')
    d.flow('p3', 'd3', 'kategori, prioritas,\nringkasan, rekomendasi')
    d.flow('p3', 'd6a', 'log analisis', side=1)
    d.flow('spv_a', 'p3', 'perintah analisis ulang', side=1)
    d.flow('p3', 'llm', 'teks keluhan + lokasi')
    d.flow('llm', 'p3', 'hasil klasifikasi (JSON)')

    # --- Pita tengah: kerja petugas
    d.entity('ptg', 170, 820, 'Petugas\nKebersihan')
    d.process('p4', 560, 820, '4.0', 'Selesaikan\nLaporan')
    store(d, 'd3b', 560, 650, 'D3', dup=True)
    store(d, 'd1', 1000, 660, 'D1')
    store(d, 'd7', 1000, 820, 'D7')
    d.entity('vis', 1000, 1000, 'LLM Vision\n(Gemini)')
    store(d, 'd6b', 560, 1040, 'D6', dup=True)
    store(d, 'd6e', 1440, 1040, 'D6', dup=True)
    d.process('p5', 1440, 820, '5.0', 'Catat\nPekerjaan')
    store(d, 'd2b', 1440, 650, 'D2', dup=True)
    store(d, 'd4', 1880, 650, 'D4')
    d.entity('ptg_b', 1880, 880, 'Petugas\nKebersihan', dup=True)

    d.flow('ptg', 'p4', 'kode QR lantai, nama,\nstatus, foto bukti')
    d.flow('p4', 'ptg', 'laporan terbuka,\nhasil verifikasi')
    d.flow('d3b', 'p4', 'laporan terbuka')
    d.flow('p4', 'd3b', 'status, data bukti')
    d.flow('d1', 'p4', 'daftar petugas aktif', side=1)
    d.flow('p4', 'd7', 'foto bukti /\nhapus bila ditolak')
    d.flow('d7', 'p4', 'foto untuk diperiksa')
    d.flow('p4', 'vis', 'foto bukti + keluhan', t=0.62)
    d.flow('vis', 'p4', 'verdict + alasan', t=0.38)
    d.flow('p4', 'd6b', 'log status / bukti', side=-1)
    d.flow('d1', 'p5', 'petugas aktif?', side=-1)
    d.flow('p5', 'd7', 'foto pekerjaan /\nhapus bila ditolak')
    d.flow('d7', 'p5', 'foto untuk diperiksa')
    d.flow('p5', 'vis', 'foto pekerjaan', t=0.62)
    d.flow('vis', 'p5', 'verdict + alasan', t=0.38)
    d.flow('p5', 'd6e', 'log pekerjaan', side=1)
    d.flow('d2b', 'p5', 'toilet aktif?')
    d.flow('p5', 'd4', 'log pekerjaan (bersih)', side=-1)
    d.flow('ptg_b', 'p5', 'kode QR lantai,\ncatatan, foto pekerjaan')
    d.flow('p5', 'ptg_b', 'hasil verifikasi')

    # --- Pita bawah kiri: akun dan pemantauan supervisor
    d.entity('mhs_c', 170, 1330, 'Mahasiswa\n(Pelapor)', dup=True)
    d.entity('spv', 170, 1655, 'Supervisor')
    d.process('p1', 560, 1330, '1.0', 'Kelola Akun &\nAutentikasi')
    d.process('p8', 560, 1655, '8.0', 'Pantau &\nKelola Laporan')
    store(d, 'd1c', 1000, 1330, 'D1', dup=True)
    for key, y, code in [('d2c', 1470, 'D2'), ('d3c', 1545, 'D3'), ('d4c', 1620, 'D4'),
                         ('d5c', 1695, 'D5'), ('d6c', 1770, 'D6'), ('d7c', 1845, 'D7')]:
        store(d, key, 0, y, code, dup=True, left=880)

    d.flow('mhs_c', 'p1', 'data registrasi & login')
    d.flow('p1', 'mhs_c', 'sesi')
    d.flow('spv', 'p1', 'kredensial,\ndata akun & petugas')
    d.flow('p1', 'spv', 'daftar akun, sesi')
    d.flow('p1', 'd1c', 'data pengguna')
    d.flow('d1c', 'p1', 'hash sandi')
    d.flow('p1', 'd6b', 'log akun', side=1)
    d.flow('spv', 'p8', 'filter waktu,\nperintah hapus')
    d.flow('p8', 'spv', 'dashboard, grafik,\nlog, ringkasan')
    d.flow('d2c', 'p8', 'daftar lokasi (QR)', t=0.4, side=-1)
    d.flow('d3c', 'p8', 'laporan', t=0.35)
    d.flow('p8', 'd3c', 'hapus laporan', t=0.65)
    d.flow('d4c', 'p8', 'log pekerjaan', t=0.35, side=-1)
    d.flow('d5c', 'p8', 'ringkasan harian', t=0.35, side=-1)
    d.flow('d6c', 'p8', 'log aktivitas', t=0.35, side=-1)
    d.flow('p8', 'd7c', 'hapus foto', t=0.65, side=-1)

    # --- Pita bawah kanan: informasi publik, tanya data, ringkasan harian
    d.process('p7', 1440, 1330, '7.0', 'Sajikan\nInformasi Publik')
    store(d, 'd3f', 1310, 1185, 'D3', dup=True)
    store(d, 'd7f', 1600, 1185, 'D7', dup=True)
    d.entity('mhs_d', 1860, 1250, 'Mahasiswa\n(Pelapor)', dup=True)
    d.entity('pgj', 1860, 1450, 'Pengunjung\nUmum')
    d.process('p9', 1440, 1620, '9.0', 'Tanya Data\n(AI)')
    store(d, 'd3h', 1195, 1840, 'D3', dup=True)
    store(d, 'd6h', 1450, 1840, 'D6', dup=True)
    store(d, 'd5h', 1770, 1840, 'D5', dup=True)
    d.entity('llm_b', 1860, 1650, 'LLM Teks\n(DeepSeek)', dup=True)
    d.entity('spv_b', 1190, 1410, 'Supervisor', dup=True)

    d.flow('d1c', 'p7', 'nama pelapor')
    d.flow('d3f', 'p7', 'laporan (tanpa\ndata pribadi)', side=-1, t=0.6)
    d.flow('d7f', 'p7', 'foto', side=1)
    d.flow('p7', 'mhs_d', 'papan peringkat')
    d.flow('p7', 'pgj', 'papan laporan publik')
    d.flow('pgj', 'p9', 'pertanyaan')
    d.flow('p9', 'pgj', 'jawaban')
    d.flow('d3h', 'p9', 'data agregat', t=0.4, side=1)
    d.flow('d5h', 'p9', 'ringkasan tersimpan', t=0.3, side=1)
    d.flow('d6h', 'p9', 'kuota pertanyaan')
    d.flow('p9', 'd6h', 'log pertanyaan')
    d.flow('p9', 'llm_b', 'pertanyaan +\nhasil agregat')
    d.flow('llm_b', 'p9', 'jawaban')
    d.flow('spv_b', 'p9', 'pertanyaan')
    d.flow('p9', 'spv_b', 'jawaban')

    d.process('p6', 2200, 1480, '6.0', 'Buat Ringkasan\nHarian')
    store(d, 'd3g', 2130, 1250, 'D3', dup=True)
    d.entity('cron', 2370, 1310, 'Penjadwal\n(Cron 17:00)')
    d.entity('spv_c', 2390, 1620, 'Supervisor', dup=True)
    store(d, 'd5g', 2140, 1760, 'D5', dup=True)
    store(d, 'd6g', 2330, 1850, 'D6', dup=True)

    d.flow('d3g', 'p6', 'laporan hari ini', side=-1)
    d.flow('cron', 'p6', 'pemicu harian', side=1)
    d.flow('spv_c', 'p6', 'perintah\nbuat ulang', side=1)
    d.flow('p6', 'llm_b', 'daftar ringkasan\nlaporan')
    d.flow('llm_b', 'p6', 'paragraf ringkasan')
    d.flow('p6', 'd5g', 'ringkasan & sorotan', side=1, t=0.6)
    d.flow('p6', 'd6g', 'log ringkasan', side=1, t=0.65)
    return d


# ====================================================================== Level 2
SUB2 = 'Notasi Yourdon/DeMarco · lingkaran putus-putus = proses lain di Level 1 · garis tegak ganda / garis miring = salinan simbol'


def title2(num, name):
    return f'DFD Level 2 — Proses {num} {name}'


@diagram('dfd-level-2-1')
def l2_1():
    d = Diagram(1560, 1040, title2('1.0', 'Kelola Akun & Autentikasi'), SUB2)
    d.entity('mhs', 170, 230, 'Mahasiswa\n(Pelapor)')
    d.entity('spv', 170, 720, 'Supervisor')
    d.process('a', 560, 230, '1.1', 'Registrasi\nPelapor')
    d.process('c', 560, 470, '1.3', 'Buat Sesi')
    d.process('b', 960, 470, '1.2', 'Verifikasi\nLogin')
    d.process('e', 560, 780, '1.4', 'Kelola Akun\n& Petugas')
    store(d, 'd1', 960, 230, 'D1')
    store(d, 'd1b', 560, 960, 'D1', dup=True)
    store(d, 'd6', 960, 720, 'D6')
    d.entity('mhs2', 1370, 390, 'Mahasiswa\n(Pelapor)', dup=True)
    d.entity('spv2', 1370, 560, 'Supervisor', dup=True)

    d.flow('mhs', 'a', 'username, nama, sandi')
    d.flow('d1', 'a', 'cek username terpakai')
    d.flow('a', 'd1', 'akun pelapor baru\n(hash + salt sandi)')
    d.flow('a', 'c', 'identitas baru')
    d.flow('mhs2', 'b', 'kredensial login', side=-1)
    d.flow('spv2', 'b', 'kredensial login', side=1)
    d.flow('d1', 'b', 'hash, salt, peran,\nstatus aktif', side=1)
    d.flow('b', 'c', 'identitas terverifikasi')
    d.flow('b', 'd6', 'log login supervisor', side=1)
    d.flow('c', 'mhs', 'sesi (cookie) /\npesan gagal', side=1)
    d.flow('c', 'spv', 'sesi (cookie)', side=-1)
    d.flow('spv', 'e', 'petugas baru, akun supervisor,\nubah nama / sandi / status')
    d.flow('e', 'spv', 'daftar akun & petugas')
    d.flow('d1b', 'e', 'daftar akun')
    d.flow('e', 'd1b', 'akun diperbarui')
    d.flow('e', 'd6', 'log perubahan akun', side=-1)
    return d


@diagram('dfd-level-2-2')
def l2_2():
    d = Diagram(1560, 1040, title2('2.0', 'Terima & Lacak Laporan'), SUB2)
    d.entity('mhs', 170, 540, 'Mahasiswa\n(Pelapor)')
    d.process('a', 600, 180, '2.1', 'Tampilkan\nPilihan Toilet')
    d.process('b', 600, 420, '2.2', 'Terima\nFoto Kondisi')
    d.process('c', 600, 660, '2.3', 'Validasi &\nSimpan Laporan')
    d.process('e', 600, 900, '2.4', 'Lacak Status\nLaporan')
    store(d, 'd2', 1020, 180, 'D2')
    store(d, 'd7', 1020, 420, 'D7')
    store(d, 'd2b', 1020, 560, 'D2', dup=True)
    store(d, 'd3', 1020, 660, 'D3')
    store(d, 'd6', 1020, 770, 'D6')
    store(d, 'd3b', 1020, 900, 'D3', dup=True)
    d.process('r3', 1400, 440, '3.0', 'Analisis\nKeluhan (AI)', r=58, ref=True)

    d.flow('mhs', 'a', 'kode QR lantai')
    d.flow('a', 'mhs', 'pilihan toilet')
    d.flow('d2', 'a', 'daftar toilet aktif')
    d.flow('mhs', 'b', 'foto dari kamera')
    d.flow('b', 'd7', 'foto kondisi')
    d.flow('b', 'c', 'kunci foto (photo_key)', side=1)
    d.flow('mhs', 'c', 'toilet terpilih, keluhan')
    d.flow('c', 'mhs', 'ID laporan')
    d.flow('d2b', 'c', 'toilet aktif?', side=-1)
    d.flow('d3', 'c', 'cek laporan kembar')
    d.flow('c', 'd3', 'laporan baru (status = baru)')
    d.flow('c', 'd6', 'log laporan masuk', side=1)
    d.flow('c', 'r3', 'ID laporan baru', via=[(760, 500), (1250, 500)], side=-1)
    d.flow('mhs', 'e', 'ID laporan')
    d.flow('e', 'mhs', 'status laporan')
    d.flow('d3b', 'e', 'status, hasil AI, foto bukti')
    return d


@diagram('dfd-level-2-3')
def l2_3():
    d = Diagram(1560, 1060, title2('3.0', 'Analisis Keluhan (AI)'), SUB2)
    d.entity('spv', 170, 200, 'Supervisor')
    d.process('r2', 170, 430, '2.0', 'Terima &\nLacak Laporan', r=58, ref=True)
    d.process('a', 560, 200, '3.1', 'Tandai\nAnalisis Ulang')
    d.process('b', 560, 430, '3.2', 'Siapkan\nKonteks')
    d.process('c', 560, 660, '3.3', 'Klasifikasi\ndengan LLM')
    d.process('e', 560, 890, '3.4', 'Simpan Hasil\nAnalisis')
    store(d, 'd3', 980, 300, 'D3')
    d.entity('llm', 1000, 660, 'LLM Teks\n(DeepSeek)')
    store(d, 'd3b', 1000, 810, 'D3', dup=True)
    store(d, 'd6', 1000, 990, 'D6')

    d.flow('spv', 'a', 'perintah analisis ulang')
    d.flow('a', 'd3', 'ai_status = pending\n(galat lama dihapus)', side=-1)
    d.flow('a', 'b', 'ID laporan')
    d.flow('r2', 'b', 'ID laporan baru')
    d.flow('d3', 'b', 'teks keluhan + lokasi', side=1)
    d.flow('b', 'c', 'teks keluhan + lokasi')
    d.flow('c', 'llm', 'prompt klasifikasi')
    d.flow('llm', 'c', 'JSON: kategori, prioritas,\nringkasan, rekomendasi')
    d.flow('c', 'e', 'hasil analisis / galat')
    d.flow('e', 'd3b', 'kategori, prioritas, ringkasan,\nrekomendasi, ai_status', side=1)
    d.flow('e', 'd6', 'log analisis / gagal', side=-1)
    return d


def staff_layout(d, nums, names):
    """Tata letak bersama proses 4.0 dan 5.0: dua proses masukan di kiri,
    verifikasi foto di tengah, penyimpan hasil di kanan."""
    d.entity('ptg', 160, 500, 'Petugas\nKebersihan')
    d.process('a', 520, 260, nums[0], names[0])
    d.process('b', 520, 760, nums[1], names[1])
    d.process('c', 930, 500, nums[2], names[2])
    d.process('e', 1340, 500, nums[3], names[3])
    d.entity('vis', 930, 220, 'LLM Vision\n(Gemini)')
    store(d, 'd7', 930, 800, 'D7')
    store(d, 'd6', 1180, 700, 'D6')
    d.entity('ptg2', 1580, 700, 'Petugas\nKebersihan', dup=True)


@diagram('dfd-level-2-4')
def l2_4():
    d = Diagram(1760, 960, title2('4.0', 'Selesaikan Laporan'), SUB2)
    staff_layout(d, ['4.1', '4.2', '4.3', '4.4'],
                 ['Tampilkan\nLaporan Terbuka', 'Terima\nFoto Bukti', 'Verifikasi\nFoto (AI)', 'Perbarui\nStatus'])
    store(d, 'd1', 330, 125, 'D1')
    store(d, 'd3', 660, 125, 'D3')
    store(d, 'd3b', 1250, 330, 'D3', dup=True)
    store(d, 'd3c', 1600, 330, 'D3', dup=True)

    d.flow('ptg', 'a', 'kode QR lantai,\nnama petugas')
    d.flow('a', 'ptg', 'laporan terbuka\n+ ringkasan AI')
    d.flow('d1', 'a', 'daftar petugas aktif', side=-1)
    d.flow('d3', 'a', 'laporan belum selesai', side=1)
    d.flow('ptg', 'b', 'foto bukti dari kamera')
    d.flow('b', 'd7', 'foto bukti', side=-1)
    d.flow('b', 'c', 'kunci foto bukti', side=-1)
    d.flow('d7', 'c', 'foto bukti')
    d.flow('c', 'd7', 'hapus foto\nyang ditolak')
    d.flow('d3b', 'c', 'keluhan, lokasi,\nkategori', side=1)
    d.flow('c', 'vis', 'foto + konteks keluhan')
    d.flow('vis', 'c', 'verdict + alasan')
    d.flow('c', 'ptg', 'alasan penolakan', side=-1)
    d.flow('c', 'd6', 'log foto ditolak /\npemeriksaan gagal', side=-1)
    d.flow('c', 'e', 'bukti diterima (bersih)')
    d.flow('ptg2', 'e', 'status baru')
    d.flow('e', 'ptg2', 'konfirmasi status')
    d.flow('e', 'd3c', 'status, nama petugas,\nwaktu selesai, data bukti', side=-1)
    d.flow('e', 'd6', 'log perubahan status', side=1)
    return d


@diagram('dfd-level-2-5')
def l2_5():
    d = Diagram(1760, 960, title2('5.0', 'Catat Pekerjaan'), SUB2)
    staff_layout(d, ['5.1', '5.2', '5.3', '5.4'],
                 ['Terima\nCatatan Kerja', 'Terima\nFoto Pekerjaan', 'Verifikasi\nFoto (AI)', 'Simpan Log\nPekerjaan'])
    store(d, 'd1', 330, 125, 'D1')
    store(d, 'd2', 660, 125, 'D2')
    store(d, 'd4', 1400, 280, 'D4')

    d.flow('ptg', 'a', 'kode QR lantai, nama,\ntoilet, catatan')
    d.flow('d1', 'a', 'petugas aktif?', side=-1)
    d.flow('d2', 'a', 'toilet aktif?', side=1)
    d.flow('a', 'c', 'catatan + lokasi')
    d.flow('ptg', 'b', 'foto dari kamera')
    d.flow('b', 'd7', 'foto pekerjaan', side=-1)
    d.flow('b', 'c', 'kunci foto', side=-1)
    d.flow('d7', 'c', 'foto pekerjaan')
    d.flow('c', 'd7', 'hapus foto\nyang ditolak')
    d.flow('c', 'vis', 'foto + catatan petugas')
    d.flow('vis', 'c', 'verdict + alasan')
    d.flow('c', 'ptg', 'hasil verifikasi', side=-1)
    d.flow('c', 'd6', 'log foto ditolak /\npemeriksaan gagal', side=-1)
    d.flow('c', 'e', 'foto lolos (bersih)')
    d.flow('d4', 'e', 'cek catatan kembar')
    d.flow('e', 'd4', 'log pekerjaan baru')
    d.flow('e', 'd6', 'log pekerjaan', side=1)
    d.flow('e', 'ptg2', 'konfirmasi tersimpan')
    return d


@diagram('dfd-level-2-6')
def l2_6():
    d = Diagram(1780, 940, title2('6.0', 'Buat Ringkasan Harian'), SUB2)
    d.entity('cron', 170, 330, 'Penjadwal\n(Cron 17:00 WIB)')
    d.entity('spv', 170, 600, 'Supervisor')
    d.process('a', 520, 460, '6.1', 'Tentukan\nTanggal')
    d.process('b', 880, 460, '6.2', 'Kumpulkan\nLaporan Hari Itu')
    d.process('c', 1240, 280, '6.3', 'Susun Ringkasan\ndengan LLM')
    d.process('e', 1240, 660, '6.4', 'Simpan\nRingkasan')
    store(d, 'd3', 880, 200, 'D3')
    d.entity('llm', 1560, 280, 'LLM Teks\n(DeepSeek)')
    store(d, 'd5', 1570, 560, 'D5')
    store(d, 'd6', 1240, 860, 'D6')

    d.flow('cron', 'a', 'pemicu 17:00 WIB')
    d.flow('spv', 'a', 'perintah buat ulang', side=-1)
    d.flow('a', 'b', 'tanggal (WIB)')
    d.flow('d3', 'b', 'laporan pada\ntanggal itu', side=-1)
    d.flow('b', 'c', 'daftar ringkasan\nlaporan', side=-1)
    d.flow('b', 'e', 'teks default (bila\ntidak ada laporan)', side=1)
    d.flow('c', 'llm', 'daftar ringkasan laporan')
    d.flow('llm', 'c', 'paragraf + sorotan')
    d.flow('c', 'e', 'ringkasan & sorotan')
    d.flow('e', 'd5', 'ringkasan harian', side=-1)
    d.flow('e', 'd6', 'log ringkasan')
    return d


@diagram('dfd-level-2-7')
def l2_7():
    d = Diagram(1560, 860, title2('7.0', 'Sajikan Informasi Publik'), SUB2)
    d.entity('pgj', 170, 260, 'Pengunjung\nUmum')
    d.entity('mhs', 170, 660, 'Mahasiswa\n(Pelapor)')
    d.process('a', 580, 260, '7.1', 'Tampilkan Papan\nLaporan Publik')
    d.process('c', 1000, 420, '7.3', 'Sajikan\nFoto')
    d.process('b', 580, 660, '7.2', 'Hitung Papan\nPeringkat')
    store(d, 'd3', 1000, 160, 'D3')
    store(d, 'd7', 1380, 420, 'D7')
    store(d, 'd3b', 1000, 610, 'D3', dup=True)
    store(d, 'd1', 1000, 730, 'D1')

    d.flow('d3', 'a', 'laporan (tanpa teks asli,\nfoto pelapor, nama petugas)', side=-1)
    d.flow('a', 'pgj', 'papan laporan publik')
    d.flow('c', 'a', 'foto bukti', side=1)
    d.flow('d7', 'c', 'berkas foto')
    d.flow('d3b', 'b', 'jumlah laporan & yang\nselesai per pelapor', side=-1)
    d.flow('d1', 'b', 'nama pelapor', side=1)
    d.flow('b', 'mhs', 'papan peringkat\n+ posisi saya')
    return d


@diagram('dfd-level-2-8')
def l2_8():
    d = Diagram(1500, 1100, title2('8.0', 'Pantau & Kelola Laporan'), SUB2)
    d.entity('spv', 170, 560, 'Supervisor')
    d.process('a', 600, 160, '8.1', 'Tampilkan\nDaftar Laporan', r=58)
    d.process('b', 600, 360, '8.2', 'Hitung Statistik\n& Grafik', r=58)
    d.process('c', 600, 560, '8.3', 'Tampilkan\nLog', r=58)
    d.process('e', 600, 800, '8.4', 'Hapus\nLaporan', r=58)
    d.process('f', 600, 990, '8.5', 'Buat\nStiker QR', r=58)
    left = 900
    store(d, 'd3', 0, 160, 'D3', left=left)
    store(d, 'd3b', 0, 320, 'D3', dup=True, left=left)
    store(d, 'd5', 0, 400, 'D5', left=left)
    store(d, 'd4', 0, 520, 'D4', left=left)
    store(d, 'd6', 0, 600, 'D6', left=left)
    store(d, 'd3c', 0, 690, 'D3', dup=True, left=left)
    store(d, 'd6b', 0, 800, 'D6', dup=True, left=left)
    store(d, 'd7', 0, 910, 'D7', left=left)
    store(d, 'd2', 0, 990, 'D2', left=left)

    d.flow('spv', 'a', 'filter tanggal,\njam, status', t=0.72)
    d.flow('a', 'spv', 'daftar laporan', t=0.28)
    d.flow('d3', 'a', 'laporan')
    d.flow('d3b', 'b', 'jumlah per hari, kategori,\ngedung, prioritas', side=-1)
    d.flow('d5', 'b', 'ringkasan tersimpan', side=1)
    d.flow('b', 'spv', 'grafik, KPI,\nringkasan harian', side=-1)
    d.flow('d4', 'c', 'log pekerjaan', side=-1)
    d.flow('d6', 'c', 'log aktivitas', side=1)
    d.flow('c', 'spv', 'log pekerjaan\n& aktivitas')
    d.flow('spv', 'e', 'perintah hapus', side=1)
    d.flow('d3c', 'e', 'salinan laporan', t=0.3)
    d.flow('e', 'd3c', 'hapus laporan', t=0.55)
    d.flow('e', 'd6b', 'salinan laporan\n+ log hapus', side=-1, t=0.55)
    d.flow('e', 'd7', 'hapus foto laporan', side=-1, t=0.55)
    d.flow('d2', 'f', 'daftar gedung & lantai')
    d.flow('f', 'spv', 'stiker QR siap cetak', side=1)
    return d


@diagram('dfd-level-2-9')
def l2_9():
    d = Diagram(1760, 1000, title2('9.0', 'Tanya Data (AI)'), SUB2)
    d.entity('pgj', 170, 300, 'Pengunjung\nUmum')
    d.entity('spv', 170, 640, 'Supervisor')
    d.process('a', 540, 470, '9.1', 'Periksa\nKuota')
    d.process('b', 920, 470, '9.2', 'Tanya LLM\ndengan Alat')
    d.process('c', 920, 800, '9.3', 'Jalankan\nQuery Agregat')
    d.process('e', 1300, 470, '9.4', 'Catat &\nKirim Jawaban')
    store(d, 'd6', 540, 170, 'D6')
    d.entity('llm', 920, 160, 'LLM Teks\n(DeepSeek)')
    store(d, 'd3', 520, 780, 'D3')
    store(d, 'd5', 520, 900, 'D5')
    store(d, 'd6b', 1300, 780, 'D6', dup=True)
    d.entity('pgj2', 1620, 380, 'Pengunjung\nUmum', dup=True)
    d.entity('spv2', 1620, 560, 'Supervisor', dup=True)

    d.flow('pgj', 'a', 'pertanyaan +\nriwayat obrolan')
    d.flow('a', 'pgj', 'pesan batas tercapai')
    d.flow('spv', 'a', 'pertanyaan +\nriwayat obrolan', side=-1)
    d.flow('d6', 'a', 'jumlah pertanyaan hari ini')
    d.flow('a', 'b', 'pertanyaan,\nperan penanya')
    d.flow('b', 'llm', 'pertanyaan +\ndaftar alat')
    d.flow('llm', 'b', 'permintaan alat /\njawaban')
    d.flow('b', 'c', 'nama alat + filter')
    d.flow('c', 'b', 'hasil agregat')
    d.flow('d3', 'c', 'jumlah, waktu penyelesaian,\ndaftar laporan', side=1)
    d.flow('d5', 'c', 'ringkasan tersimpan', side=-1)
    d.flow('b', 'e', 'jawaban + alat terpakai')
    d.flow('e', 'd6b', 'log pertanyaan')
    d.flow('e', 'pgj2', 'jawaban +\nsisa kuota', side=-1)
    d.flow('e', 'spv2', 'jawaban', side=1)
    return d


if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    for name, fn in DIAGRAMS.items():
        if only and name not in only:
            continue
        (OUT / f'{name}.svg').write_text(fn().svg())
        print(f'{name}.svg')
