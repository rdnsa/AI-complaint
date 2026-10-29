"""UML Use Case Diagram — digambar langsung sebagai SVG (Mermaid tidak punya use case diagram).

Gaya mengikuti contoh use case diagram standar: hitam-putih, batas sistem berlabel
di pojok kiri atas, aktor manusia di kiri dan kanan batas sistem, aktor sistem
digambar sebagai orang-orangan berkepala kotak.

Jalankan: python3 uml-use-case.py > ../uml-use-case.svg
"""
import math
import sys

W, H = 1760, 1300
BX0, BY0, BX1, BY1 = 270, 40, 1490, 1272
CL, CM, CR = 470, 880, 1290
RX, RY = 140, 25
RXC = {CL: 118, CM: 140, CR: 150}   # lebar elips per kolom


def rx_of(x):
    return RXC[x]

LEFT, RIGHT = 130, 1630

# Kolom kiri: use case Pelapor dan Petugas (aktor di kiri).
# Kolom kanan: use case Supervisor (aktor di kanan).
# Kolom tengah: use case yang dipakai bersama atau di-include, serta yang
# melibatkan layanan AI/GPS/penjadwal, supaya garis dari kedua sisi bisa menjangkaunya.
uc = {  # id: (x, y, label)
    'lapor':   (CL, 560, 'Kirim Keluhan'),
    'lacak':   (CL, 622, 'Lacak Status Keluhan'),
    'pub':     (CL, 700, 'Lihat Papan Publik'),
    'rank':    (CL, 762, 'Lihat Papan Peringkat'),
    'reg':     (CL, 824, 'Registrasi Akun'),
    'open':    (CL, 930, 'Lihat Keluhan Terbuka'),
    'claim':   (CL, 992, 'Klaim Keluhan'),
    'take':    (CL, 1054, 'Ambil Alih Keluhan'),
    'done':    (CL, 1130, 'Selesaikan dg Foto Bukti'),
    'daily':   (CL, 1215, 'Laporkan Tugas Harian'),
    'ask':     (CM, 110, 'Tanya Kato Bot'),
    'login':   (CM, 200, 'Login'),
    'sum':     (CM, 290, 'Buat / Buat Ulang Ringkasan'),
    'ai':      (CM, 400, 'Analisis Keluhan (AI)'),
    'qr_scan': (CM, 720, 'Pindai QR / Pilih Lokasi'),
    'gps':     (CM, 1215, 'Periksa Posisi GPS'),
    'vp':      (CM, 1130, 'Verifikasi Foto Bukti (AI)'),
    're':      (CR, 610, 'Analisis Ulang Keluhan'),
    'dash':    (CR, 680, 'Pantau Dashboard & Statistik'),
    'rep':     (CR, 750, 'Lihat Laporan Keluhan & Kebersihan'),
    'logs':    (CR, 820, 'Lihat Log Aktivitas'),
    'del':     (CR, 890, 'Hapus Keluhan'),
    'acct':    (CR, 960, 'Kelola Akun & Petugas'),
    'qr':      (CR, 1030, 'Cetak Stiker QR'),
}
actors = {  # id: (x, y, label, aktor sistem?)
    'plp':  (LEFT, 640, 'Pelapor\n(siapa saja)', False),
    'ptg':  (LEFT, 1050, 'Petugas Kebersihan', False),
    'cron': (RIGHT, 70, 'Penjadwal\n(Cron 17.00 WIB)', True),
    'llm':  (RIGHT, 200, 'LLM Teks\n(DeepSeek)', True),
    'spv':  (RIGHT, 640, 'Supervisor', False),
    'vis':  (RIGHT, 1130, 'LLM Vision\n(Gemini)', True),
}
assoc = [
    ('plp', 'pub'), ('plp', 'rank'), ('plp', 'reg'), ('plp', 'lapor'), ('plp', 'lacak'),
    ('plp', 'login'), ('plp', 'ask'),
    ('ptg', 'open'), ('ptg', 'claim'), ('ptg', 'take'), ('ptg', 'done'), ('ptg', 'daily'),
    ('cron', 'sum'),
    ('llm', 'ask'), ('llm', 'sum'), ('llm', 'ai'),
    ('spv', 'login'), ('spv', 'ask'), ('spv', 'sum'), ('spv', 'dash'), ('spv', 'rep'), ('spv', 're'),
    ('spv', 'logs'), ('spv', 'acct'), ('spv', 'del'), ('spv', 'qr'),
    ('vis', 'vp'),
]
# Stiker QR di lokasi adalah titik masuk: pelapor memindainya untuk melapor,
# petugas untuk melihat keluhan, dan tugas harian dimulai dari lokasi yang sama.
includes = [('lapor', 'ai'), ('re', 'ai'), 
            ('lapor', 'qr_scan'), ('open', 'qr_scan'),
            ('done', 'vp'), ('daily', 'gps')]
extends = [('take', 'claim')]   # Ambil Alih memperluas Klaim
label_below = {('re', 'ai')}

out = []
o = out.append
segments = []   # (x1, y1, x2, y2, use case di ujung) untuk pengecekan tabrakan


def ellipse_edge(cx, cy, tx, ty):
    a = math.atan2(ty - cy, tx - cx)
    k = 1 / math.sqrt((math.cos(a) / rx_of(cx)) ** 2 + (math.sin(a) / RY) ** 2)
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
title = 'Kato Report: Sistem Pelaporan Kebersihan Kampus'
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
    ex, ey = (ux - rx_of(ux) if ax < ux else ux + rx_of(ux)), uy
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

# <<extend>>: panah putus-putus dari use case tambahan ke use case yang diperluas
for s_, t_ in extends:
    sx, sy, _ = uc[s_]; tx, ty, _ = uc[t_]
    x1, y1 = ellipse_edge(sx, sy, tx, ty); x2, y2 = ellipse_edge(tx, ty, sx, sy)
    segments.append((x1, y1, x2, y2, {s_, t_}))
    o(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#000" stroke-width="1.1" '
      f'stroke-dasharray="5 4" marker-end="url(#open)"/>')
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    o(f'<text x="{mx+8:.1f}" y="{my+4:.1f}" font-size="12">&lt;&lt;extend&gt;&gt;</text>')

for u, (x, y, label) in uc.items():
    o(f'<ellipse cx="{x}" cy="{y}" rx="{rx_of(x)}" ry="{RY}" fill="#fff" stroke="#000" stroke-width="1.1"/>')
    o(f'<text x="{x}" y="{y+5}" font-size="13" text-anchor="middle">{esc(label)}</text>')

for k, (x, y, label, is_sys) in actors.items():
    head = (f'<rect x="{x-12}" y="{y-50}" width="24" height="20" fill="#fff"/>' if is_sys
            else f'<circle cx="{x}" cy="{y-40}" r="10" fill="#fff"/>')
    o(f'<g stroke="#000" stroke-width="1.3" fill="none">{head}'
      f'<line x1="{x}" y1="{y-30}" x2="{x}" y2="{y+6}"/>'
      f'<line x1="{x-18}" y1="{y-18}" x2="{x+18}" y2="{y-18}"/>'
      f'<line x1="{x}" y1="{y+6}" x2="{x-14}" y2="{y+28}"/>'
      f'<line x1="{x}" y1="{y+6}" x2="{x+14}" y2="{y+28}"/></g>')
    for n, part in enumerate(label.split('\n')):
        o(f'<text x="{x}" y="{y+46+16*n}" font-size="14" text-anchor="middle">{esc(part)}</text>')

o('</svg>')
print('\n'.join(out))


# --- pengecekan tata letak: tidak boleh ada garis yang menembus elips lain ----
def hits_ellipse(x1, y1, x2, y2, cx, cy, pad=4):
    for i in range(1, 200):
        t = i / 200
        px, py = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
        if ((px - cx) / (rx_of(cx) + pad)) ** 2 + ((py - cy) / (RY + pad)) ** 2 < 1:
            return True
    return False


for x1, y1, x2, y2, own in segments:
    for u, (cx, cy, label) in uc.items():
        if u not in own and hits_ellipse(x1, y1, x2, y2, cx, cy):
            print(f'PERINGATAN: garis ke {own} menembus "{label}"', file=sys.stderr)
