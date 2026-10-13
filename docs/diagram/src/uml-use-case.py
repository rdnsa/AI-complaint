"""UML Use Case Diagram — digambar langsung sebagai SVG (Mermaid tidak punya use case diagram).

Gaya mengikuti contoh use case diagram standar: hitam-putih, batas sistem berlabel
di pojok kiri atas, aktor manusia di kiri dan kanan batas sistem, aktor sistem
digambar sebagai orang-orangan berkepala kotak.

Jalankan: python3 uml-use-case.py > ../uml-use-case.svg
"""
import math
import sys

W, H = 1700, 1100
BX0, BY0, BX1, BY1 = 290, 40, 1410, 1065          # batas sistem
CL, CM, CR = 480, 850, 1220                         # kolom use case kiri, tengah, kanan
RX, RY = 112, 25
LEFT, RIGHT = 140, 1560

# Kolom kiri: use case Pengunjung, Mahasiswa, dan Petugas (aktor di kiri).
# Kolom kanan: use case Supervisor (aktor di kanan).
# Kolom tengah: use case yang dipakai bersama atau di-include, serta yang
# melibatkan layanan AI, supaya garis dari kedua sisi bisa menjangkaunya.
uc = {  # id: (x, y, label)
    'pub':     (CL, 165, 'Lihat Papan Laporan Publik'),
    'rank':    (CL, 440, 'Lihat Papan Peringkat'),
    'reg':     (CL, 510, 'Registrasi Akun'),
    'lapor':   (CL, 650, 'Buat Laporan'),
    'lacak':   (CL, 580, 'Lacak Status Laporan'),
    'open':    (CL, 850, 'Lihat Laporan Terbuka'),
    'work':    (CL, 930, 'Catat Pekerjaan'),
    'done':    (CL, 1010, 'Selesaikan Laporan'),
    'ask':     (CM, 105, 'Tanya Data (AI)'),
    'sum':     (CM, 220, 'Buat Ringkasan Harian'),
    'login':   (CM, 300, 'Login'),
    'ai':      (CM, 540, 'Analisis Keluhan (AI)'),
    'qr_scan': (CM, 780, 'Pindai QR Lantai'),
    'vp':      (CM, 1010, 'Verifikasi Foto Bukti (AI)'),
    're':      (CR, 470, 'Analisis Ulang Laporan'),
    'dash':    (CR, 545, 'Pantau Dashboard & Grafik'),
    'logs':    (CR, 620, 'Lihat Log Aktivitas & Pekerjaan'),
    'acct':    (CR, 695, 'Kelola Akun & Petugas'),
    'del':     (CR, 770, 'Hapus Laporan'),
    'qr':      (CR, 845, 'Cetak Stiker QR'),
}
actors = {  # id: (x, y, label, aktor sistem?)
    'pgj':  (LEFT, 140, 'Pengunjung Umum', False),
    'cron': (LEFT, 270, 'Penjadwal', True),
    'mhs':  (LEFT, 440, 'Mahasiswa', False),
    'ptg':  (LEFT, 930, 'Petugas Kebersihan', False),
    'llm':  (RIGHT, 200, 'LLM Teks', True),
    'spv':  (RIGHT, 470, 'Supervisor', False),
    'vis':  (RIGHT, 1010, 'LLM Vision', True),
}
assoc = [
    ('pgj', 'pub'), ('pgj', 'ask'),
    ('cron', 'sum'),
    ('mhs', 'rank'), ('mhs', 'reg'), ('mhs', 'lapor'), ('mhs', 'lacak'), ('mhs', 'login'),
    ('ptg', 'open'), ('ptg', 'work'), ('ptg', 'done'),
    ('llm', 'ask'), ('llm', 'sum'), ('llm', 'ai'),
    ('spv', 'login'), ('spv', 'sum'), ('spv', 're'), ('spv', 'dash'), ('spv', 'logs'),
    ('spv', 'acct'), ('spv', 'del'), ('spv', 'qr'),
    ('vis', 'vp'),
]
# Stiker QR di pintu adalah titik masuk: mahasiswa memindainya untuk melapor,
# petugas untuk melihat laporan di lantai itu dan mencatat pekerjaannya.
includes = [('lapor', 'ai'), ('re', 'ai'), ('lapor', 'qr_scan'), ('open', 'qr_scan'),
            ('work', 'qr_scan'), ('work', 'vp'), ('done', 'vp')]
label_below = {('re', 'ai')}   # label di atas panah ini tertimpa garis LLM Teks

out = []
o = out.append
segments = []   # (x1, y1, x2, y2, use case di ujung) untuk pengecekan tabrakan


def ellipse_edge(cx, cy, tx, ty):
    a = math.atan2(ty - cy, tx - cx)
    k = 1 / math.sqrt((math.cos(a) / RX) ** 2 + (math.sin(a) / RY) ** 2)
    return cx + k * math.cos(a), cy + k * math.sin(a)


def actor_anchor(key, tx):
    x, y, *_ = actors[key]
    return (x + 24 if tx > x else x - 24), y - 4


def esc(s):
    return s.replace('&', '&amp;')


o(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
  f'font-family="Arial, Helvetica, sans-serif" fill="#000">')
o('<defs>'
  '<marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">'
  '<path d="M0,0 L10,5 L0,10" fill="none" stroke="#000" stroke-width="1.3"/></marker>'
  '<marker id="gen" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="14" markerHeight="14" orient="auto">'
  '<path d="M0,0 L12,6 L0,12 z" fill="#fff" stroke="#000" stroke-width="1.1"/></marker>'
  '</defs>')
o(f'<rect width="{W}" height="{H}" fill="#fff"/>')

# batas sistem, dengan nama sistem di tab pojok kiri atas
title = 'Sistem Pelaporan Toilet Kampus Berbasis AI'
tab_w = len(title) * 8.2 + 20
o(f'<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" fill="#fff" stroke="#000" stroke-width="1.3"/>')
o(f'<rect x="{BX0}" y="{BY0}" width="{tab_w:.0f}" height="26" fill="#fff" stroke="#000" stroke-width="1.3"/>')
o(f'<text x="{BX0+10}" y="{BY0+18}" font-size="14">{title}</text>')

# garis asosiasi (digambar lebih dulu supaya berada di bawah elips)
for a, u in assoc:
    ux, uy, _ = uc[u]
    ax, ay = actor_anchor(a, ux)
    # berakhir di ujung kiri/kanan elips: semua ujung satu kolom segaris, jadi
    # garis yang menyebar ke beberapa use case tidak menyerempet elips lain
    ex, ey = (ux - RX if ax < ux else ux + RX), uy
    segments.append((ax, ay, ex, ey, {u}))
    o(f'<line x1="{ax:.1f}" y1="{ay:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#000" stroke-width="1.1"/>')

# <<include>>: panah putus-putus dari use case dasar ke use case yang di-include
for s, t in includes:
    sx, sy, _ = uc[s]; tx, ty, _ = uc[t]
    x1, y1 = ellipse_edge(sx, sy, tx, ty); x2, y2 = ellipse_edge(tx, ty, sx, sy)
    segments.append((x1, y1, x2, y2, {s, t}))
    o(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#000" stroke-width="1.1" '
      f'stroke-dasharray="5 4" marker-end="url(#open)"/>')
    # label di tengah panah; panah mendatar diberi label sedikit di atasnya
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    if (s, t) in label_below:
        o(f'<text x="{mx:.1f}" y="{my+22:.1f}" font-size="12" text-anchor="middle">&lt;&lt;include&gt;&gt;</text>')
    elif abs(y2 - y1) < 20:
        o(f'<text x="{mx:.1f}" y="{my-7:.1f}" font-size="12" text-anchor="middle">&lt;&lt;include&gt;&gt;</text>')
    else:
        o(f'<text x="{mx+6:.1f}" y="{my+4:.1f}" font-size="12">&lt;&lt;include&gt;&gt;</text>')

# generalisasi: Mahasiswa adalah juga Pengunjung Umum
_, y_m, *_ = actors['mhs']; _, y_p, *_ = actors['pgj']
# lajur di kiri label aktor, masuk ke badan aktor supaya tidak menabrak namanya
lane = LEFT - 85
o(f'<polyline points="{LEFT-24},{y_m-22} {lane},{y_m-22} {lane},{y_p-22} {LEFT-24},{y_p-22}" '
  f'fill="none" stroke="#000" stroke-width="1.1" marker-end="url(#gen)"/>')

for u, (x, y, label) in uc.items():
    o(f'<ellipse cx="{x}" cy="{y}" rx="{RX}" ry="{RY}" fill="#fff" stroke="#000" stroke-width="1.1"/>')
    o(f'<text x="{x}" y="{y+5}" font-size="13.5" text-anchor="middle">{esc(label)}</text>')

for k, (x, y, label, is_sys) in actors.items():
    head = (f'<rect x="{x-12}" y="{y-50}" width="24" height="20" fill="#fff"/>' if is_sys
            else f'<circle cx="{x}" cy="{y-40}" r="10" fill="#fff"/>')
    o(f'<g stroke="#000" stroke-width="1.3" fill="none">{head}'
      f'<line x1="{x}" y1="{y-30}" x2="{x}" y2="{y+6}"/>'
      f'<line x1="{x-18}" y1="{y-18}" x2="{x+18}" y2="{y-18}"/>'
      f'<line x1="{x}" y1="{y+6}" x2="{x-14}" y2="{y+28}"/>'
      f'<line x1="{x}" y1="{y+6}" x2="{x+14}" y2="{y+28}"/></g>')
    o(f'<text x="{x}" y="{y+46}" font-size="14" text-anchor="middle">{label}</text>')

o('</svg>')
print('\n'.join(out))


# --- pengecekan tata letak: tidak boleh ada garis yang menembus elips lain ----
def hits_ellipse(x1, y1, x2, y2, cx, cy, pad=4):
    for i in range(1, 200):
        t = i / 200
        px, py = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
        if ((px - cx) / (RX + pad)) ** 2 + ((py - cy) / (RY + pad)) ** 2 < 1:
            return True
    return False


for x1, y1, x2, y2, own in segments:
    for u, (cx, cy, label) in uc.items():
        if u not in own and hits_ellipse(x1, y1, x2, y2, cx, cy):
            print(f'PERINGATAN: garis ke {own} menembus "{label}"', file=sys.stderr)
