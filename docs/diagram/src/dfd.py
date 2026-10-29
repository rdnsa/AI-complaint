"""Semua DFD (Level 0, 1, 2) Kato Report dengan tata letak yang diatur tangan.

Jalankan: python3 dfd.py   -> menulis ../dfd-*.svg
Gaya dan aturan gambarnya ada di dfd_draw.py.
"""
from pathlib import Path

from dfd_draw import Diagram

OUT = Path(__file__).parent.parent
SUB = 'Notasi Yourdon/DeMarco · persegi = entitas eksternal · lingkaran = proses · kotak terbuka = data store'
STORES = {
    'D1': 'Pengguna (users)',
    'D2': 'Lokasi (cleaning_areas)',
    'D3': 'Laporan (reports)',
    'D4': 'Kebersihan (cleaning_reports)',
    'D5': 'Log Lama (work_logs)',
    'D6': 'Ringkasan Harian (daily_summaries)',
    'D7': 'Log Aktivitas (activity_log)',
    'D8': 'Foto (R2 bucket)',
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
    d = Diagram(1500, 930, 'DFD Level 0 — Diagram Konteks Kato Report', SUB)
    d.process('sys', 750, 540, '0', 'Kato Report:\nSistem Pelaporan\nKebersihan Kampus', r=118)
    d.entity('plp', 180, 290, 'Pelapor\n(siapa saja)')
    d.entity('ptg', 180, 790, 'Petugas\nKebersihan')
    d.entity('spv', 750, 140, 'Supervisor')
    d.entity('llm', 1320, 250, 'LLM Teks\n(DeepSeek)')
    d.entity('vis', 1320, 540, 'LLM Vision\n(Gemini)')
    d.entity('cron', 1320, 830, 'Penjadwal\n(Cron 17.00 WIB)')

    d.flow('plp', 'sys', 'lokasi (QR / pilihan), keluhan,\nfoto kondisi, data akun & login,\npertanyaan Kato Bot')
    d.flow('sys', 'plp', 'ID & status keluhan,\npapan publik & peringkat,\njawaban Kato Bot')
    d.flow('ptg', 'sys', 'nama petugas, klaim / ambil alih,\nfoto bukti, tugas harian\n(foto + posisi GPS)')
    d.flow('sys', 'ptg', 'keluhan terbuka, hasil\npemeriksaan foto, status\nlokasi laporan kebersihan')
    d.flow('spv', 'sys', 'kredensial, data akun\n& petugas, filter waktu,\nperintah analisis ulang /\nhapus / buat ulang ringkasan', t=0.32)
    d.flow('sys', 'spv', 'dashboard & statistik,\nlaporan keluhan &\nkebersihan, log aktivitas,\nringkasan AI, stiker QR', t=0.68)
    d.flow('sys', 'llm', 'teks keluhan, laporan harian,\npertanyaan + data agregat')
    d.flow('llm', 'sys', 'kategori, prioritas, ringkasan,\nrekomendasi, ringkasan harian,\njawaban Kato Bot')
    d.flow('sys', 'vis', 'foto bukti + lokasi\n+ keluhan')
    d.flow('vis', 'sys', 'verdict (clean / dirty /\nwrong_place) + alasan')
    d.flow('cron', 'sys', 'pemicu harian')
    return d


# ====================================================================== Level 1
@diagram('dfd-level-1')
def level1():
    d = Diagram(2480, 2080, 'DFD Level 1 — Kato Report',
                SUB + ' · garis tegak ganda / garis miring di sudut = salinan simbol yang sama')

    # --- Pita atas: keluhan masuk dan analisis AI
    d.entity('plp', 170, 300, 'Pelapor\n(siapa saja)')
    d.process('p2', 600, 300, '2.0', 'Terima &\nLacak Keluhan')
    store(d, 'd2', 600, 135, 'D2')
    store(d, 'd8a', 600, 470, 'D8', dup=True)
    store(d, 'd3', 1000, 300, 'D3')
    store(d, 'd7a', 1000, 470, 'D7', dup=True)
    d.process('p3', 1400, 300, '3.0', 'Analisis\nKeluhan (AI)')
    d.entity('spv_a', 1400, 135, 'Supervisor', dup=True)
    d.entity('llm', 1800, 300, 'LLM Teks\n(DeepSeek)')

    d.flow('plp', 'p2', 'lokasi, keluhan,\nfoto kondisi, ID keluhan')
    d.flow('p2', 'plp', 'ID & status keluhan')
    d.flow('d2', 'p2', 'lokasi aktif')
    d.flow('p2', 'd8a', 'foto kondisi')
    d.flow('p2', 'd3', 'keluhan baru')
    d.flow('d3', 'p2', 'status keluhan,\ncek keluhan kembar')
    d.flow('p2', 'p3', 'ID keluhan baru', via=[(760, 212), (1240, 212)], side=-1)
    d.flow('p2', 'd7a', 'log keluhan masuk', side=-1)
    d.flow('d3', 'p3', 'teks keluhan + lokasi')
    d.flow('p3', 'd3', 'kategori, prioritas,\nringkasan, rekomendasi')
    d.flow('p3', 'd7a', 'log analisis', side=1)
    d.flow('spv_a', 'p3', 'perintah analisis ulang', side=1)
    d.flow('p3', 'llm', 'teks keluhan + lokasi')
    d.flow('llm', 'p3', 'hasil klasifikasi (JSON)')

    # --- Pita tengah: kerja petugas
    d.entity('ptg', 170, 820, 'Petugas\nKebersihan')
    d.process('p4', 560, 820, '4.0', 'Tangani\nKeluhan')
    store(d, 'd3b', 560, 650, 'D3', dup=True)
    store(d, 'd1', 1000, 660, 'D1')
    store(d, 'd8', 1000, 820, 'D8')
    d.entity('vis', 900, 1050, 'LLM Vision\n(Gemini)')
    store(d, 'd7b', 330, 1060, 'D7', dup=True)
    store(d, 'd7e', 1440, 1040, 'D7', dup=True)
    d.process('p5', 1440, 820, '5.0', 'Laporkan\nTugas Harian')
    store(d, 'd2b', 1440, 650, 'D2', dup=True)
    store(d, 'd4', 1900, 640, 'D4')
    d.entity('ptg_b', 1900, 930, 'Petugas\nKebersihan', dup=True)

    d.flow('ptg', 'p4', 'filter lokasi, nama, klaim /\nambil alih, foto bukti')
    d.flow('p4', 'ptg', 'keluhan terbuka,\nhasil verifikasi')
    d.flow('d3b', 'p4', 'keluhan terbuka,\npemegang klaim')
    d.flow('p4', 'd3b', 'klaim, status,\ndata bukti')
    d.flow('d1', 'p4', 'daftar petugas aktif', side=1)
    d.flow('p4', 'd8', 'foto bukti /\nhapus bila ditolak')
    d.flow('d8', 'p4', 'foto untuk diperiksa')
    d.flow('p4', 'vis', 'foto bukti + lokasi\n+ keluhan', t=0.62)
    d.flow('vis', 'p4', 'verdict + alasan', t=0.38)
    d.flow('p4', 'd7b', 'log klaim / status / bukti', side=-1)
    d.flow('d1', 'p5', 'petugas aktif?', side=-1)
    d.flow('p5', 'd8', 'foto tugas /\nhapus bila terlalu lama')
    d.flow('d8', 'p5', 'waktu terima foto')
    d.flow('p5', 'd7e', 'log laporan /\ndi luar kampus', side=1)
    d.flow('d2b', 'p5', 'lokasi aktif,\ndaftar tugas')
    d.flow('p5', 'd4', 'laporan kebersihan\n+ foto per tugas', side=1)
    d.flow('d4', 'p5', 'cek foto dipakai /\nlaporan kembar', side=-1)
    d.flow('ptg_b', 'p5', 'lokasi, foto tugas,\nposisi GPS, catatan')
    d.flow('p5', 'ptg_b', 'status lokasi,\npesan penolakan')

    # --- Pita bawah kiri: akun dan pemantauan supervisor
    d.entity('plp_c', 170, 1330, 'Pelapor\n(siapa saja)', dup=True)
    d.entity('spv', 170, 1715, 'Supervisor')
    d.process('p1', 560, 1330, '1.0', 'Kelola Akun &\nAutentikasi')
    d.process('p8', 560, 1715, '8.0', 'Pantau &\nKelola Laporan')
    store(d, 'd1c', 1000, 1330, 'D1', dup=True)
    for key, y, code in [('d2c', 1475, 'D2'), ('d3c', 1560, 'D3'), ('d4c', 1645, 'D4'),
                         ('d5c', 1730, 'D5'), ('d6c', 1815, 'D6'), ('d7c', 1900, 'D7'),
                         ('d8c', 1985, 'D8')]:
        store(d, key, 0, y, code, dup=True, left=880)

    d.flow('plp_c', 'p1', 'data registrasi & login')
    d.flow('p1', 'plp_c', 'sesi')
    d.flow('spv', 'p1', 'kredensial, data akun\n& petugas, perintah hapus')
    d.flow('p1', 'spv', 'daftar akun, sesi')
    d.flow('p1', 'd1c', 'data pengguna')
    d.flow('d1c', 'p1', 'hash sandi,\njumlah riwayat')
    d.flow('p1', 'd7b', 'log akun', side=1)
    d.flow('spv', 'p8', 'filter waktu,\nperintah hapus')
    d.flow('p8', 'spv', 'dashboard, statistik,\nlaporan, log, QR')
    d.flow('d2c', 'p8', 'lokasi & penugasan', t=0.6, side=1)
    d.flow('d3c', 'p8', 'keluhan', t=0.3)
    d.flow('p8', 'd3c', 'hapus keluhan', t=0.85)
    d.flow('d4c', 'p8', 'laporan kebersihan', t=0.35, side=-1)
    d.flow('d5c', 'p8', 'log lama', t=0.35, side=-1)
    d.flow('d6c', 'p8', 'ringkasan harian', t=0.35, side=-1)
    d.flow('d7c', 'p8', 'log aktivitas', t=0.35, side=-1)
    d.flow('p8', 'd8c', 'hapus foto', t=0.65, side=-1)

    # --- Pita bawah kanan: informasi publik, Kato Bot, ringkasan harian
    d.process('p7', 1440, 1330, '7.0', 'Sajikan\nInformasi Publik')
    store(d, 'd3f', 1100, 1160, 'D3', dup=True)
    store(d, 'd4f', 1440, 1160, 'D4', dup=True)
    store(d, 'd8f', 1780, 1160, 'D8', dup=True)
    d.entity('plp_d', 1900, 1440, 'Pelapor\n(siapa saja)', dup=True)
    d.process('p9', 1440, 1620, '9.0', 'Kato Bot\n(Tanya Data)')
    store(d, 'd3h', 1330, 1880, 'D3', dup=True)
    store(d, 'd7h', 1620, 1880, 'D7', dup=True)
    store(d, 'd6h', 1960, 1880, 'D6', dup=True)
    d.entity('llm_b', 1900, 1700, 'LLM Teks\n(DeepSeek)', dup=True)
    d.entity('spv_b', 1250, 1500, 'Supervisor', dup=True)

    d.flow('d1c', 'p7', 'nama pelapor')
    d.flow('d3f', 'p7', 'keluhan (tanpa\ndata pribadi)', side=-1, t=0.4)
    d.flow('d4f', 'p7', 'laporan kebersihan\n(tanpa nama & GPS)', side=-1, t=0.5, dist=82)
    d.flow('d8f', 'p7', 'foto', side=1)
    d.flow('p7', 'plp_d', 'papan publik,\npapan peringkat', t=0.55)
    d.flow('plp_d', 'p9', 'pertanyaan', t=0.5)
    d.flow('p9', 'plp_d', 'jawaban', t=0.5)
    d.flow('d3h', 'p9', 'data agregat', t=0.3, side=-1)
    d.flow('d6h', 'p9', 'ringkasan tersimpan', t=0.3, side=1)
    d.flow('d7h', 'p9', 'kuota pertanyaan', t=0.7, side=-1)
    d.flow('p9', 'd7h', 'log pertanyaan')
    d.flow('p9', 'llm_b', 'pertanyaan +\nhasil agregat')
    d.flow('llm_b', 'p9', 'jawaban')
    d.flow('spv_b', 'p9', 'pertanyaan')
    d.flow('p9', 'spv_b', 'jawaban')

    d.process('p6', 2200, 1480, '6.0', 'Buat Ringkasan\nHarian')
    store(d, 'd3g', 2130, 1250, 'D3', dup=True)
    d.entity('cron', 2370, 1310, 'Penjadwal\n(Cron 17.00)')
    d.entity('spv_c', 2390, 1620, 'Supervisor', dup=True)
    store(d, 'd6g', 2140, 1760, 'D6', dup=True)
    store(d, 'd7g', 2330, 1850, 'D7', dup=True)

    d.flow('d3g', 'p6', 'keluhan hari ini', side=-1)
    d.flow('cron', 'p6', 'pemicu harian', side=1)
    d.flow('spv_c', 'p6', 'perintah\nbuat ulang', side=1)
    d.flow('p6', 'llm_b', 'daftar ringkasan\nkeluhan')
    d.flow('llm_b', 'p6', 'paragraf ringkasan')
    d.flow('p6', 'd6g', 'ringkasan & sorotan', side=1, t=0.6)
    d.flow('p6', 'd7g', 'log ringkasan', side=1, t=0.65)
    return d


# ====================================================================== Level 2
SUB2 = 'Notasi Yourdon/DeMarco · lingkaran putus-putus = proses lain di Level 1 · garis tegak ganda / garis miring = salinan simbol'


def title2(num, name):
    return f'DFD Level 2 — Proses {num} {name}'


@diagram('dfd-level-2-1')
def l2_1():
    d = Diagram(1560, 1040, title2('1.0', 'Kelola Akun & Autentikasi'), SUB2)
    d.entity('plp', 170, 230, 'Pelapor\n(siapa saja)')
    d.entity('spv', 170, 720, 'Supervisor')
    d.process('a', 560, 230, '1.1', 'Registrasi\nPelapor')
    d.process('c', 560, 470, '1.3', 'Buat Sesi')
    d.process('b', 960, 470, '1.2', 'Verifikasi\nLogin')
    d.process('e', 560, 780, '1.4', 'Kelola Akun\n& Petugas')
    store(d, 'd1', 960, 230, 'D1')
    store(d, 'd1b', 560, 960, 'D1', dup=True)
    store(d, 'd7', 960, 720, 'D7')
    d.entity('plp2', 1370, 390, 'Pelapor\n(siapa saja)', dup=True)
    d.entity('spv2', 1370, 560, 'Supervisor', dup=True)

    d.flow('plp', 'a', 'username, nama, sandi')
    d.flow('d1', 'a', 'cek username terpakai')
    d.flow('a', 'd1', 'akun pelapor baru\n(hash + salt sandi)')
    d.flow('a', 'c', 'identitas baru')
    d.flow('plp2', 'b', 'kredensial login', side=-1)
    d.flow('spv2', 'b', 'kredensial login', side=1)
    d.flow('d1', 'b', 'hash, salt, peran,\nstatus aktif', side=1)
    d.flow('b', 'c', 'identitas terverifikasi')
    d.flow('b', 'd7', 'log login supervisor', side=1)
    d.flow('c', 'plp', 'sesi (cookie) /\npesan gagal', side=1)
    d.flow('c', 'spv', 'sesi (cookie)', side=-1)
    d.flow('spv', 'e', 'nama petugas, akun SPV, ubah nama /\nsandi / status, perintah hapus')
    d.flow('e', 'spv', 'daftar akun & petugas,\npenolakan hapus (409)')
    d.flow('d1b', 'e', 'daftar akun,\njumlah riwayat')
    d.flow('e', 'd1b', 'akun diperbarui /\ndihapus')
    d.flow('e', 'd7', 'log perubahan akun', side=-1)
    return d


@diagram('dfd-level-2-2')
def l2_2():
    d = Diagram(1560, 1040, title2('2.0', 'Terima & Lacak Keluhan'), SUB2)
    d.entity('plp', 170, 540, 'Pelapor\n(siapa saja)')
    d.process('a', 600, 180, '2.1', 'Tampilkan\nPilihan Lokasi')
    d.process('b', 600, 420, '2.2', 'Terima\nFoto Kondisi')
    d.process('c', 600, 660, '2.3', 'Validasi &\nSimpan Keluhan')
    d.process('e', 600, 900, '2.4', 'Lacak Status\nKeluhan')
    store(d, 'd2', 1020, 180, 'D2')
    store(d, 'd8', 1020, 420, 'D8')
    store(d, 'd2b', 1020, 560, 'D2', dup=True)
    store(d, 'd3', 1020, 660, 'D3')
    store(d, 'd7', 1020, 770, 'D7')
    store(d, 'd3b', 1020, 900, 'D3', dup=True)
    d.process('r3', 1400, 440, '3.0', 'Analisis\nKeluhan (AI)', r=58, ref=True)

    d.flow('plp', 'a', 'QR lokasi / pilihan\ngedung & lantai')
    d.flow('a', 'plp', 'daftar lokasi')
    d.flow('d2', 'a', 'lokasi aktif')
    d.flow('plp', 'b', 'foto dari kamera')
    d.flow('b', 'd8', 'foto kondisi')
    d.flow('b', 'c', 'kunci foto (photo_key)', side=1)
    d.flow('plp', 'c', 'lokasi terpilih, keluhan')
    d.flow('c', 'plp', 'ID keluhan')
    d.flow('d2b', 'c', 'lokasi aktif?', side=-1)
    d.flow('d3', 'c', 'cek keluhan kembar')
    d.flow('c', 'd3', 'keluhan baru (status = new)')
    d.flow('c', 'd7', 'log keluhan masuk', side=1)
    d.flow('c', 'r3', 'ID keluhan baru', via=[(760, 500), (1250, 500)], side=-1)
    d.flow('plp', 'e', 'ID keluhan')
    d.flow('e', 'plp', 'status keluhan')
    d.flow('d3b', 'e', 'status, hasil AI, foto bukti')
    return d


@diagram('dfd-level-2-3')
def l2_3():
    d = Diagram(1560, 1060, title2('3.0', 'Analisis Keluhan (AI)'), SUB2)
    d.entity('spv', 170, 200, 'Supervisor')
    d.process('r2', 170, 430, '2.0', 'Terima &\nLacak Keluhan', r=58, ref=True)
    d.process('a', 560, 200, '3.1', 'Tandai\nAnalisis Ulang')
    d.process('b', 560, 430, '3.2', 'Siapkan\nKonteks')
    d.process('c', 560, 660, '3.3', 'Klasifikasi\ndengan LLM')
    d.process('e', 560, 890, '3.4', 'Simpan Hasil\nAnalisis')
    store(d, 'd3', 980, 300, 'D3')
    d.entity('llm', 1000, 660, 'LLM Teks\n(DeepSeek)')
    store(d, 'd3b', 1000, 810, 'D3', dup=True)
    store(d, 'd7', 1000, 990, 'D7')

    d.flow('spv', 'a', 'perintah analisis ulang')
    d.flow('a', 'd3', 'ai_status = pending\n(galat lama dihapus)', side=-1)
    d.flow('a', 'b', 'ID keluhan')
    d.flow('r2', 'b', 'ID keluhan baru')
    d.flow('d3', 'b', 'teks keluhan + lokasi', side=1)
    d.flow('b', 'c', 'teks keluhan + lokasi')
    d.flow('c', 'llm', 'prompt klasifikasi')
    d.flow('llm', 'c', 'JSON: kategori, prioritas,\nringkasan, rekomendasi')
    d.flow('c', 'e', 'hasil (divalidasi) / galat')
    d.flow('e', 'd3b', 'kategori, prioritas, ringkasan,\nrekomendasi, ai_status', side=1)
    d.flow('e', 'd7', 'log analisis / gagal', side=-1)
    return d


@diagram('dfd-level-2-4')
def l2_4():
    d = Diagram(1900, 1120, title2('4.0', 'Tangani Keluhan'), SUB2)
    d.entity('ptg', 150, 520, 'Petugas\nKebersihan')
    d.entity('ptg2', 1740, 520, 'Petugas\nKebersihan', dup=True)
    d.process('a', 520, 210, '4.1', 'Tampilkan\nKeluhan Terbuka')
    d.process('b', 520, 520, '4.2', 'Klaim /\nAmbil Alih')
    d.process('c', 520, 860, '4.3', 'Terima\nFoto Bukti')
    d.process('e', 1000, 860, '4.4', 'Verifikasi\nFoto (AI)')
    d.process('f', 1400, 520, '4.5', 'Perbarui Status\n(Selesai)')
    store(d, 'd1', 250, 105, 'D1')
    store(d, 'd3', 800, 105, 'D3')
    store(d, 'd3c', 1010, 520, 'D3', dup=True)
    store(d, 'd1b', 930, 330, 'D1', dup=True)
    store(d, 'd7a', 930, 690, 'D7', dup=True)
    store(d, 'd8', 760, 1050, 'D8')
    store(d, 'd3e', 1250, 1050, 'D3', dup=True)
    d.entity('vis', 1430, 860, 'LLM Vision\n(Gemini)')
    store(d, 'd3d', 1400, 330, 'D3', dup=True)
    store(d, 'd7b', 1400, 700, 'D7', dup=True)

    d.flow('ptg', 'a', 'filter gedung\n& lantai', t=0.7)
    d.flow('a', 'ptg', 'keluhan terbuka\n+ ringkasan AI', t=0.3)
    d.flow('d1', 'a', 'daftar petugas aktif', side=-1)
    d.flow('d3', 'a', 'keluhan belum selesai', side=1)
    d.flow('ptg', 'b', 'nama petugas,\n"saya kerjakan"', t=0.55)
    d.flow('b', 'ptg', 'konfirmasi klaim', t=0.5)
    d.flow('d1b', 'b', 'petugas aktif?', side=1)
    d.flow('d3c', 'b', 'status & pemegang\nklaim saat ini', side=-1)
    d.flow('b', 'd3c', 'klaim / pengambilalihan', side=1)
    d.flow('b', 'd7a', 'log klaim /\nambil alih', side=-1)
    d.flow('ptg', 'c', 'foto bukti dari kamera,\npermintaan selesai', t=0.4, side=-1)
    d.flow('c', 'd8', 'foto bukti', side=-1)
    d.flow('c', 'e', 'kunci foto bukti', side=-1)
    d.flow('d8', 'e', 'foto bukti', side=1)
    d.flow('e', 'd8', 'hapus foto\nyang ditolak', side=-1)
    d.flow('d3e', 'e', 'keluhan, lokasi,\nkategori', side=1)
    d.flow('e', 'vis', 'foto + lokasi + keluhan', t=0.6)
    d.flow('vis', 'e', 'verdict + alasan', t=0.5)
    d.flow('e', 'ptg', 'alasan penolakan', t=0.62, side=1)
    d.flow('e', 'd7b', 'log foto ditolak /\npemeriksaan gagal', side=-1, t=0.8)
    d.flow('e', 'f', 'bukti diterima (clean)', side=-1, t=0.75)
    d.flow('ptg2', 'f', 'konfirmasi', t=0.5)
    d.flow('f', 'ptg2', 'status selesai', t=0.5)
    d.flow('f', 'd3d', 'status, nama, waktu\nselesai, data bukti', side=1)
    d.flow('f', 'd7b', 'log perubahan status', side=1)
    return d


@diagram('dfd-level-2-5')
def l2_5():
    d = Diagram(1900, 930, title2('5.0', 'Laporkan Tugas Harian'), SUB2)
    d.entity('ptg', 150, 520, 'Petugas\nKebersihan')
    d.entity('ptg2', 1740, 210, 'Petugas\nKebersihan', dup=True)
    d.entity('ptg3', 1740, 520, 'Petugas\nKebersihan', dup=True)
    d.process('a', 520, 210, '5.1', 'Tampilkan\nLokasi & Tugas')
    d.process('b', 520, 520, '5.2', 'Terima\nFoto Tugas')
    d.process('c', 920, 520, '5.3', 'Periksa Umur &\nPemakaian Foto')
    d.process('e', 1320, 210, '5.4', 'Periksa Posisi\nGPS')
    d.process('f', 1320, 520, '5.5', 'Simpan Laporan\nKebersihan')
    store(d, 'd2', 900, 210, 'D2')
    store(d, 'd2b', 1100, 340, 'D2', dup=True)
    store(d, 'd8', 520, 840, 'D8')
    store(d, 'd4', 920, 840, 'D4')
    store(d, 'd1', 1320, 840, 'D1')
    store(d, 'd7', 1740, 840, 'D7')

    d.flow('ptg', 'a', 'QR lokasi / pilihan\ngedung & lantai', t=0.6)
    d.flow('a', 'ptg', 'lokasi + enam\ntugas harian', t=0.35)
    d.flow('d2', 'a', 'lokasi, tugas,\npenugasan')
    d.flow('ptg', 'b', 'foto per tugas\n(kamera langsung)')
    d.flow('b', 'd8', 'foto tugas', side=-1)
    d.flow('b', 'c', 'kunci foto')
    d.flow('d8', 'c', 'waktu terima foto', side=1)
    d.flow('c', 'd8', 'hapus foto\nterlalu lama', side=-1)
    d.flow('d4', 'c', 'foto yang sudah dipakai')
    d.flow('c', 'f', 'foto lolos +\nwaktu server', side=1)
    d.flow('ptg2', 'e', 'posisi GPS\n(lat, lng, akurasi)')
    d.flow('e', 'f', 'status lokasi\n(ok / far / unknown), jarak', side=-1)
    d.flow('ptg3', 'f', 'catatan, daftar\ntugas dikerjakan')
    d.flow('f', 'ptg3', 'ID laporan, status lokasi,\npesan penolakan')
    d.flow('d2b', 'f', 'lokasi aktif,\ntugas yang berlaku', side=1)
    d.flow('d1', 'f', 'petugas aktif?')
    d.flow('f', 'd4', 'laporan + tugas + foto', side=1)
    d.flow('d4', 'f', 'cek laporan kembar', side=-1)
    d.flow('f', 'd7', 'log laporan /\ndi luar kampus', side=1)
    return d


@diagram('dfd-level-2-6')
def l2_6():
    d = Diagram(1780, 940, title2('6.0', 'Buat Ringkasan Harian'), SUB2)
    d.entity('cron', 170, 330, 'Penjadwal\n(Cron 17.00 WIB)')
    d.entity('spv', 170, 600, 'Supervisor')
    d.process('a', 520, 460, '6.1', 'Tentukan\nTanggal')
    d.process('b', 880, 460, '6.2', 'Kumpulkan\nKeluhan Hari Itu')
    d.process('c', 1240, 280, '6.3', 'Susun Ringkasan\ndengan LLM')
    d.process('e', 1240, 660, '6.4', 'Simpan\nRingkasan')
    store(d, 'd3', 880, 200, 'D3')
    d.entity('llm', 1560, 280, 'LLM Teks\n(DeepSeek)')
    store(d, 'd6', 1570, 560, 'D6')
    store(d, 'd7', 1240, 860, 'D7')

    d.flow('cron', 'a', 'pemicu 17.00 WIB')
    d.flow('spv', 'a', 'perintah buat ulang', side=-1)
    d.flow('a', 'b', 'tanggal (WIB)')
    d.flow('d3', 'b', 'keluhan pada\ntanggal itu', side=-1)
    d.flow('b', 'c', 'daftar ringkasan\nkeluhan', side=-1)
    d.flow('b', 'e', 'teks default (bila\ntidak ada keluhan)', side=1)
    d.flow('c', 'llm', 'daftar ringkasan keluhan')
    d.flow('llm', 'c', 'paragraf + sorotan')
    d.flow('c', 'e', 'ringkasan & sorotan')
    d.flow('e', 'd6', 'ringkasan harian', side=-1)
    d.flow('e', 'd7', 'log ringkasan')
    return d


@diagram('dfd-level-2-7')
def l2_7():
    d = Diagram(1700, 880, title2('7.0', 'Sajikan Informasi Publik'), SUB2)
    d.entity('plp', 170, 450, 'Pelapor\n(siapa saja)')
    d.process('a', 580, 190, '7.1', 'Papan\nKeluhan Publik')
    d.process('b', 580, 450, '7.2', 'Papan Laporan\nKebersihan')
    d.process('f', 580, 710, '7.3', 'Hitung Papan\nPeringkat')
    d.process('c', 1330, 320, '7.4', 'Sajikan\nFoto')
    store(d, 'd3', 960, 190, 'D3')
    store(d, 'd4', 960, 450, 'D4')
    store(d, 'd3b', 960, 620, 'D3', dup=True)
    store(d, 'd1', 960, 800, 'D1')
    store(d, 'd8', 1520, 560, 'D8')

    d.flow('d3', 'a', 'keluhan (tanpa teks asli,\nfoto pelapor, nama petugas)', side=-1)
    d.flow('a', 'plp', 'papan keluhan publik')
    d.flow('d4', 'b', 'laporan kebersihan\n(tanpa nama & GPS)', side=1)
    d.flow('b', 'plp', 'papan laporan\nkebersihan')
    d.flow('c', 'a', 'foto bukti', side=1, t=0.55)
    d.flow('c', 'b', 'foto tugas', side=-1, t=0.4)
    d.flow('d8', 'c', 'berkas foto')
    d.flow('d3b', 'f', 'jumlah keluhan & yang\nselesai per pelapor', side=-1, t=0.3)
    d.flow('d1', 'f', 'nama pelapor', side=1, t=0.6)
    d.flow('f', 'plp', 'papan peringkat\n+ posisi saya')
    return d


@diagram('dfd-level-2-8')
def l2_8():
    d = Diagram(1500, 1330, title2('8.0', 'Pantau & Kelola Laporan'), SUB2)
    d.entity('spv1', 170, 215, 'Supervisor')
    d.entity('spv2', 170, 670, 'Supervisor', dup=True)
    d.entity('spv3', 170, 1125, 'Supervisor', dup=True)
    d.process('a', 600, 150, '8.1', 'Tampilkan\nDaftar Keluhan', r=58)
    d.process('b', 600, 350, '8.2', 'Hitung Statistik\n& Grafik', r=58)
    d.process('c', 600, 560, '8.3', 'Tampilkan Laporan\nKebersihan', r=58)
    d.process('e', 600, 780, '8.4', 'Tampilkan\nLog', r=58)
    d.process('f', 600, 1030, '8.5', 'Hapus\nKeluhan', r=58)
    d.process('g', 600, 1230, '8.6', 'Buat\nStiker QR', r=58)
    left = 900
    store(d, 'd3', 0, 150, 'D3', left=left)
    store(d, 'd3b', 0, 300, 'D3', dup=True, left=left)
    store(d, 'd6', 0, 385, 'D6', left=left)
    store(d, 'd4', 0, 520, 'D4', left=left)
    store(d, 'd2b', 0, 600, 'D2', dup=True, left=left)
    store(d, 'd7', 0, 740, 'D7', left=left)
    store(d, 'd5', 0, 820, 'D5', left=left)
    store(d, 'd3c', 0, 920, 'D3', dup=True, left=left)
    store(d, 'd7b', 0, 1040, 'D7', dup=True, left=left)
    store(d, 'd8', 0, 1160, 'D8', left=left)
    store(d, 'd2', 0, 1230, 'D2', left=left)

    d.flow('spv1', 'a', 'filter waktu,\nstatus, prioritas', t=0.5)
    d.flow('a', 'spv1', 'daftar keluhan', t=0.5)
    d.flow('d3', 'a', 'keluhan')
    d.flow('spv1', 'b', 'rentang hari\n(7 - 90)', t=0.7)
    d.flow('b', 'spv1', 'grafik, KPI,\nringkasan harian', t=0.3)
    d.flow('d3b', 'b', 'jumlah per hari, kategori,\ngedung, prioritas, umur', side=-1)
    d.flow('d6', 'b', 'ringkasan tersimpan', side=1)
    d.flow('spv2', 'c', 'filter waktu,\npetugas, area', t=0.55)
    d.flow('c', 'spv2', 'rekap per petugas,\nlaporan + peringatan GPS', t=0.45)
    d.flow('d4', 'c', 'laporan kebersihan', side=-1)
    d.flow('d2b', 'c', 'penugasan area', side=1)
    d.flow('spv2', 'e', 'jenis aksi,\nfilter waktu', t=0.55)
    d.flow('e', 'spv2', 'log aktivitas\n& log lama', t=0.45)
    d.flow('d7', 'e', 'log aktivitas', side=1)
    d.flow('d5', 'e', 'log pekerjaan lama', side=-1)
    d.flow('spv3', 'f', 'perintah hapus', t=0.55)
    d.flow('d3c', 'f', 'salinan keluhan', t=0.22, side=-1)
    d.flow('f', 'd3c', 'hapus keluhan', t=0.5)
    d.flow('f', 'd7b', 'salinan keluhan\n+ log hapus', t=0.5, side=1)
    d.flow('f', 'd8', 'hapus foto keluhan', t=0.6, side=-1)
    d.flow('d2', 'g', 'daftar lokasi')
    d.flow('g', 'spv3', 'stiker QR siap cetak', t=0.5)
    return d


@diagram('dfd-level-2-9')
def l2_9():
    d = Diagram(1760, 1000, title2('9.0', 'Kato Bot (Tanya Data)'), SUB2)
    d.entity('plp', 170, 300, 'Pelapor\n(siapa saja)')
    d.entity('spv', 170, 640, 'Supervisor')
    d.process('a', 540, 470, '9.1', 'Periksa\nKuota')
    d.process('b', 920, 470, '9.2', 'Tanya LLM\ndengan Alat')
    d.process('c', 920, 800, '9.3', 'Jalankan\nQuery Agregat')
    d.process('e', 1300, 470, '9.4', 'Catat &\nKirim Jawaban')
    store(d, 'd7', 540, 170, 'D7')
    d.entity('llm', 920, 160, 'LLM Teks\n(DeepSeek)')
    store(d, 'd3', 520, 780, 'D3')
    store(d, 'd6', 520, 900, 'D6')
    store(d, 'd7b', 1300, 780, 'D7', dup=True)
    d.entity('plp2', 1620, 380, 'Pelapor\n(siapa saja)', dup=True)
    d.entity('spv2', 1620, 560, 'Supervisor', dup=True)

    d.flow('plp', 'a', 'pertanyaan +\nriwayat obrolan')
    d.flow('a', 'plp', 'pesan batas tercapai')
    d.flow('spv', 'a', 'pertanyaan +\nriwayat obrolan', side=-1)
    d.flow('d7', 'a', 'jumlah pertanyaan hari ini')
    d.flow('a', 'b', 'pertanyaan,\nperan penanya')
    d.flow('b', 'llm', 'pertanyaan +\ndaftar alat')
    d.flow('llm', 'b', 'permintaan alat /\njawaban')
    d.flow('b', 'c', 'nama alat + filter')
    d.flow('c', 'b', 'hasil agregat')
    d.flow('d3', 'c', 'jumlah, waktu penyelesaian,\ndaftar keluhan', side=1)
    d.flow('d6', 'c', 'ringkasan tersimpan', side=-1)
    d.flow('b', 'e', 'jawaban + alat terpakai')
    d.flow('e', 'd7b', 'log pertanyaan')
    d.flow('e', 'plp2', 'jawaban +\nsisa kuota', side=-1)
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
