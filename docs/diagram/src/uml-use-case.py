"""UML Use Case Diagram — digambar langsung sebagai SVG (Mermaid tidak punya use case diagram).

Jalankan: python3 uml-use-case.py > ../uml-use-case.svg
"""
import math

W, H = 1800, 1370
BX0, BY0, BX1, BY1 = 300, 70, 1400, 1320          # batas sistem
AX, BXc = 600, 1040                                 # kolom use case
RX, RY = 118, 24
LEFT, RIGHT = 150, 1600

# Kolom kiri: use case yang dipicu aktor manusia (semuanya di kiri, supaya garis
# asosiasi tidak memotong elips). Kolom kanan: use case yang melibatkan layanan AI,
# penjadwal, dan pemindaian QR yang di-include beberapa use case. Baris y=1080 di kolom kiri sengaja kosong untuk garis Supervisor
# ke "Buat Ringkasan Harian".
uc = {  # id: (x, y, label)
    'pub':   (AX, 145, 'Lihat Papan Laporan Publik'),
    'ask':   (AX, 207, 'Tanya Data (AI)'),
    'rank':  (AX, 290, 'Lihat Papan Peringkat'),
    'reg':   (AX, 352, 'Registrasi Akun'),
    'login': (AX, 414, 'Login'),
    're':    (AX, 476, 'Analisis Ulang Laporan'),
    'lapor': (AX, 538, 'Buat Laporan'),
    'lacak': (AX, 600, 'Lacak Status Laporan'),
    'open':  (AX, 700, 'Lihat Laporan Terbuka'),
    'done':  (AX, 762, 'Selesaikan Laporan'),
    'work':  (AX, 824, 'Catat Pekerjaan'),
    'dash':  (AX, 942, 'Pantau Dashboard & Grafik'),
    'logs':  (AX, 1004, 'Lihat Log Aktivitas & Pekerjaan'),
    'acct':  (AX, 1150, 'Kelola Akun & Petugas'),
    'del':   (AX, 1212, 'Hapus Laporan'),
    'qr':    (AX, 1274, 'Cetak Stiker QR'),
    'ai':    (BXc, 476, 'Analisis Keluhan (AI)'),
    'qr_scan': (BXc, 640, 'Pindai QR Lantai'),
    'vp':    (BXc, 800, 'Verifikasi Foto Bukti (AI)'),
    'sum':   (BXc, 1080, 'Buat Ringkasan Harian'),
}
people = {  # aktor manusia (stick figure)
    'pgj': (LEFT, 176, 'Pengunjung Umum'),
    'mhs': (LEFT, 414, 'Mahasiswa (Pelapor)'),
    'ptg': (LEFT, 762, 'Petugas Kebersihan'),
    'spv': (LEFT, 1080, 'Supervisor'),
}
systems = {  # aktor sistem eksternal
    'llm':  (RIGHT, 470, 'LLM Teks', '(DeepSeek)'),
    'vis':  (RIGHT, 800, 'LLM Vision', '(Gemini)'),
    'cron': (RIGHT, 1080, 'Penjadwal', '(Cron 17:00 WIB)'),
}
assoc = [
    ('pgj', 'pub'), ('pgj', 'ask'),
    ('mhs', 'rank'), ('mhs', 'reg'), ('mhs', 'lapor'), ('mhs', 'lacak'), ('mhs', 'login'),
    ('ptg', 'open'), ('ptg', 'done'), ('ptg', 'work'),
    ('spv', 'login'), ('spv', 'ask'), ('spv', 're'), ('spv', 'sum'), ('spv', 'dash'),
    ('spv', 'logs'), ('spv', 'acct'), ('spv', 'del'), ('spv', 'qr'),
    ('llm', 'ask'), ('llm', 'ai'), ('llm', 'sum'),
    ('cron', 'sum'), ('vis', 'vp'),
]
# Stiker QR di pintu adalah titik masuk: mahasiswa memindainya untuk melapor,
# petugas untuk melihat laporan di lantai itu dan mencatat pekerjaannya.
includes = [('lapor', 'ai'), ('re', 'ai'), ('done', 'vp'), ('work', 'vp'),
            ('lapor', 'qr_scan'), ('open', 'qr_scan'), ('work', 'qr_scan')]

C_ACT, C_UC, C_UCF, C_SYS, C_SYSF = '#5B9BD5', '#E3A36B', '#FFF4E5', '#8E6CD1', '#F1EAFB'
out = []
o = out.append

def ellipse_edge(cx, cy, tx, ty):
    a = math.atan2(ty - cy, tx - cx)
    k = 1 / math.sqrt((math.cos(a) / RX) ** 2 + (math.sin(a) / RY) ** 2)
    return cx + k * math.cos(a), cy + k * math.sin(a)

def actor_anchor(key, tx, ty):
    if key in people:
        x, y, _ = people[key]
        return (x + 22 if tx > x else x - 22), y
    x, y, *_ = systems[key]
    return (x - 85 if tx < x else x + 85), y

o(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Arial, Helvetica, sans-serif" fill="#222">')
o('<defs>'
  '<marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0 L10,5 L0,10" fill="none" stroke="#555" stroke-width="1.4"/></marker>'
  '<marker id="gen" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="14" markerHeight="14" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#fff" stroke="#555" stroke-width="1.2"/></marker>'
  '</defs>')
o(f'<rect width="{W}" height="{H}" fill="#fff"/>')
o(f'<text x="{W/2}" y="34" font-size="22" font-weight="bold" text-anchor="middle">UML Use Case Diagram — Sistem AI Complaint</text>')
o(f'<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" rx="8" fill="#FAFAFA" stroke="#999" stroke-width="1.5"/>')
o(f'<text x="{BX0+16}" y="{BY0+26}" font-size="15" font-weight="bold" fill="#555">Sistem Pelaporan Toilet Kampus Berbasis AI</text>')

# garis asosiasi (digambar lebih dulu supaya berada di bawah elips)
# Supervisor ke use case di bagian atas: garis lurus akan menembus elips lain,
# jadi dibelokkan lewat lajur vertikal di antara aktor dan batas sistem.
detour = {('spv', 're'): 280, ('spv', 'login'): 262, ('spv', 'ask'): 244}
for a, u in assoc:
    ux, uy, _ = uc[u]
    if (a, u) in detour:
        lane = detour[(a, u)]
        ax, ay = actor_anchor(a, ux, uy)
        ex, ey = ellipse_edge(ux, uy, lane, uy - 18)
        o(f'<polyline points="{ax:.1f},{ay:.1f} {lane},{ay-30:.1f} {lane},{uy-18:.1f} {ex:.1f},{ey:.1f}" fill="none" stroke="#666" stroke-width="1.3"/>')
        continue
    ax, ay = actor_anchor(a, ux, uy)
    ex, ey = ellipse_edge(ux, uy, ax, ay)
    o(f'<line x1="{ax:.1f}" y1="{ay:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#666" stroke-width="1.3"/>')

# «include»
for s, t in includes:
    sx, sy, _ = uc[s]; tx, ty, _ = uc[t]
    x1, y1 = ellipse_edge(sx, sy, tx, ty); x2, y2 = ellipse_edge(tx, ty, sx, sy)
    o(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#555" stroke-width="1.3" stroke-dasharray="6 4" marker-end="url(#open)"/>')
    # label di 40% dari pangkal, supaya label beberapa panah yang menuju
    # use case yang sama tidak bertumpuk di dekat ujungnya
    mx, my = x1 + (x2 - x1) * 0.4, y1 + (y2 - y1) * 0.4
    dy = -8 if abs(y2 - y1) < 20 else 0
    dx = 8 if abs(y2 - y1) >= 20 else 0
    anchor = 'start' if dx else 'middle'
    o(f'<text x="{mx+dx:.1f}" y="{my+dy:.1f}" font-size="12" font-style="italic" fill="#555" text-anchor="{anchor}">«include»</text>')

# generalisasi: Mahasiswa adalah Pengunjung
_, y_m, _ = people['mhs']; _, y_p, _ = people['pgj']
o(f'<line x1="{LEFT}" y1="{y_m-40}" x2="{LEFT}" y2="{y_p+72}" stroke="#555" stroke-width="1.3" marker-end="url(#gen)"/>')

for u, (x, y, label) in uc.items():
    o(f'<ellipse cx="{x}" cy="{y}" rx="{RX}" ry="{RY}" fill="{C_UCF}" stroke="{C_UC}" stroke-width="1.6"/>')
    o(f'<text x="{x}" y="{y+5}" font-size="13.5" text-anchor="middle">{label.replace("&", "&amp;")}</text>')

for k, (x, y, label) in people.items():
    o(f'<g stroke="{C_ACT}" stroke-width="2" fill="none">'
      f'<circle cx="{x}" cy="{y-28}" r="11" fill="#E8F0FB"/>'
      f'<line x1="{x}" y1="{y-17}" x2="{x}" y2="{y+12}"/>'
      f'<line x1="{x-18}" y1="{y-6}" x2="{x+18}" y2="{y-6}"/>'
      f'<line x1="{x}" y1="{y+12}" x2="{x-14}" y2="{y+34}"/>'
      f'<line x1="{x}" y1="{y+12}" x2="{x+14}" y2="{y+34}"/></g>')
    o(f'<text x="{x}" y="{y+54}" font-size="14" font-weight="bold" text-anchor="middle">{label}</text>')

for k, (x, y, l1, l2) in systems.items():
    o(f'<rect x="{x-85}" y="{y-36}" width="170" height="72" rx="4" fill="{C_SYSF}" stroke="{C_SYS}" stroke-width="1.6"/>')
    o(f'<text x="{x}" y="{y-14}" font-size="11.5" font-style="italic" fill="#666" text-anchor="middle">«system»</text>')
    o(f'<text x="{x}" y="{y+5}" font-size="14" font-weight="bold" text-anchor="middle">{l1}</text>')
    o(f'<text x="{x}" y="{y+23}" font-size="12" text-anchor="middle">{l2}</text>')

o('</svg>')
print('\n'.join(out))
