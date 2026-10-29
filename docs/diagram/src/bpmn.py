"""BPMN to-be Kato Report, digambar langsung sebagai SVG (swimlane).

Jalankan: python3 bpmn.py   -> menulis ../../bpmn/bpmn-to-be.svg
Gaya mengikuti diagram BPMN sebelumnya: lajur putih, kotak berwarna per pelaku
(biru = manusia di lapangan, ungu = sistem & AI, oranye = supervisor), peristiwa
merah, gerbang (diamond) oranye muda.
"""
from html import escape
from pathlib import Path

W, H = 2010, 1140
LANE_X = 150
LANES = [('Pelapor', 0, 170), ('Sistem\nKato Report\n(AI)', 170, 640),
         ('Petugas\nKebersihan', 640, 940), ('Supervisor', 940, 1140)]
COL = {'blue': ('#9DCBF3', '#5B9BD5'), 'purple': ('#D9C8F5', '#8E6CD1'), 'orange': ('#F9CFA8', '#E3A36B'),
       'gray': ('#555555', '#555555'), 'red': ('#C9665F', '#C9665F')}
out = []
o = out.append
markers = set()


def marker(color):
    key = color.lstrip('#')
    markers.add(color)
    return f'url(#a{key})'


def text(x, y, lines, size=12, weight='normal', anchor='middle'):
    n = len(lines)
    step = size * 1.3
    top = y - step * (n - 1) / 2
    tsp = ''.join(f'<tspan x="{x}" dy="{0 if i == 0 else step:.1f}">{escape(l)}</tspan>' for i, l in enumerate(lines))
    o(f'<text x="{x}" y="{top:.1f}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" '
      f'dominant-baseline="central">{tsp}</text>')


def box(cx, cy, label, kind, w=146, h=66):
    f, s = COL[kind]
    o(f'<rect x="{cx-w/2}" y="{cy-h/2}" width="{w}" height="{h}" rx="4" fill="{f}" stroke="{s}" stroke-width="1.5"/>')
    text(cx, cy, label.split('\n'), 11.5)


def event(cx, cy, label, double=False, r=29):
    o(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#E8958F" stroke="#C9665F" stroke-width="1.5"/>')
    if double:
        o(f'<circle cx="{cx}" cy="{cy}" r="{r-6}" fill="none" stroke="#C9665F" stroke-width="1.2"/>')
    text(cx, cy, label.split('\n'), 10.5)


def gate(cx, cy, label, hw=48, hh=40):
    o(f'<polygon points="{cx},{cy-hh} {cx+hw},{cy} {cx},{cy+hh} {cx-hw},{cy}" fill="#F9CFA8" stroke="#E3A36B" stroke-width="1.5"/>')
    text(cx, cy, label.split('\n'), 10.5)


def arrow(pts, color='#555555', label=None, lpos=None, size=10.5):
    d = ' '.join(('M' if i == 0 else 'L') + f'{x},{y}' for i, (x, y) in enumerate(pts))
    o(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.8" marker-end="{marker(color)}"/>')
    if label:
        x, y = lpos
        text(x, y, label.split('\n'), size)


# ------------------------------------------------------------------ lanes
body = []
for name, y0, y1 in LANES:
    body.append((name, y0, y1))

# ------------------------------------------------------------------ elemen
BL, PU, OR = 'blue', 'purple', 'orange'
A, B, C, D, E, F, G, Hh, I = 390, 560, 730, 900, 1070, 1240, 1410, 1580, 1750
PY, RA, RB, RC = 85, 250, 400, 560        # baris pelapor, sistem A/B/C
KY, MY, TY, SY = 720, 790, 870, 1040      # petugas: atas, tengah, bawah; supervisor

elements = []
def add(fn, *a, **k):
    elements.append((fn, a, k))

# Pelapor
add(event, 240, PY, 'MULAI')
add(box, A, PY, 'Menemukan kondisi\nlokasi kotor', BL)
add(box, B, PY, 'Pindai QR lokasi\natau pilih gedung &\nlantai / halaman', BL)
add(box, C, PY, 'Tulis keluhan, foto\nkamera langsung,\nkirim', BL)
add(box, I, PY, 'Memantau status\nkeluhan: selesai\nditangani', BL)
add(event, 1930, PY, 'Selesai')
# Sistem
add(box, C, RA, 'Menyimpan keluhan\n& foto kondisi', PU)
add(box, D, RA, 'LLM teks:\nkategori, prioritas,\nringkasan, rekomendasi', PU)
add(box, E, RA, 'Keluhan tampil di\ndashboard &\npapan publik', PU)
add(box, I, RA, 'Status keluhan ->\nselesai, tercatat di\nlog aktivitas', PU)
add(event, A, RB, '17.00\nWIB', True)
add(box, B, RB, 'LLM membuat\nringkasan harian', PU)
add(box, G, RB, 'Menyimpan laporan\nkebersihan: foto <= 3 jam,\nbelum dipakai; GPS vs\nkampus (luar / tanpa GPS\nditandai)', PU, w=170, h=84)
add(event, Hh + 10, RB, 'Selesai')
add(box, Hh, RC, 'Vision AI memeriksa\nfoto bukti', PU)
add(gate, I, RC, 'Lokasi sesuai\n& bersih?')
# Petugas
add(event, D, MY, 'MULAI')
add(box, E, MY, 'Buka /staff,\npilih nama', BL)
add(gate, F, MY, 'Jenis\npekerjaan?')
add(box, G, KY, 'Pilih lokasi, foto tiap\ntugas (kamera), GPS\nponsel, kirim', BL)
add(box, G, TY, 'Klaim: "Saya kerjakan"\n(atau ambil alih dari\npetugas lain)', BL)
add(box, Hh, TY, 'Membersihkan lokasi,\nfoto bukti\n(kamera langsung)', BL)
# Supervisor
add(box, B, SY, 'Menerima ringkasan\nharian AI', OR)
add(box, C, SY, 'Memantau dashboard:\nstatistik, keluhan,\nlaporan kebersihan, log', OR)
add(box, D, SY, 'Menindaklanjuti:\nperingatan luar kampus,\nkeluhan prioritas tinggi', OR)
add(box, E, SY, 'Menugaskan petugas\nsecara langsung', OR)

# ------------------------------------------------------------------ render
o(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Arial, Helvetica, sans-serif" fill="#222">')
o('@@DEFS@@')
o(f'<rect x="1" y="1" width="{W-2}" height="{H-2}" rx="6" fill="#fff" stroke="#DADADA"/>')
for name, y0, y1 in LANES:
    text(75, (y0 + y1) / 2 if y0 else 40, name.split('\n'), 13, 'bold')
    if y0:
        o(f'<line x1="1" y1="{y0}" x2="{W-1}" y2="{y0}" stroke="#DADADA"/>')
o(f'<line x1="{LANE_X}" y1="1" x2="{LANE_X}" y2="{H-1}" stroke="#DADADA"/>')

BLUE, PURP, ORNG, GRAY, RED = '#5B9BD5', '#8E6CD1', '#E3A36B', '#555555', '#C9665F'
# alur pelapor
arrow([(269, PY), (A - 73, PY)], BLUE)
arrow([(A + 73, PY), (B - 73, PY)], BLUE)
arrow([(B + 73, PY), (C - 73, PY)], BLUE)
arrow([(C, PY + 33), (C, RA - 33)], GRAY)
arrow([(I + 73, PY), (1901, PY)], BLUE)
# sistem: analisis
arrow([(C + 73, RA), (D - 73, RA)], PURP)
arrow([(D + 73, RA), (E - 73, RA)], PURP)
arrow([(E, RA + 33), (E, MY - 33)], GRAY, 'keluhan\nterbuka', (E + 38, 470))
# ringkasan harian
arrow([(A + 29, RB), (B - 73, RB)], PURP)
arrow([(B, RB + 33), (B, SY - 33)], GRAY)
# supervisor
arrow([(B + 73, SY), (C - 73, SY)], ORNG)
arrow([(C + 73, SY), (D - 73, SY)], ORNG)
arrow([(D + 73, SY), (E - 73, SY)], ORNG)
arrow([(E, SY - 33), (E, MY + 33)], GRAY, 'tugas', (E + 24, 960))
# petugas: pilihan
arrow([(D + 29, MY), (E - 73, MY)], BLUE)
arrow([(E + 73, MY), (F - 48, MY)], BLUE)
arrow([(F, MY - 40), (F, KY), (G - 73, KY)], BLUE, 'Tugas harian', (F + 12, 700), )
arrow([(F, MY + 40), (F, TY), (G - 73, TY)], BLUE, 'Keluhan', (F + 12, 892))
# tugas harian -> sistem
arrow([(G, KY - 33), (G, RB + 42)], GRAY)
arrow([(G + 85, RB), (Hh - 29 + 10, RB)], PURP)
# keluhan: klaim -> bersihkan -> vision
arrow([(G + 73, TY), (Hh - 73, TY)], BLUE)
arrow([(Hh, TY - 33), (Hh, RC + 33)], GRAY)
arrow([(Hh + 73, RC), (I - 48, RC)], PURP)
arrow([(I, RC - 40), (I, RA + 33)], PURP, 'Ya', (I + 18, 420))
arrow([(I, RC + 40), (I, TY), (Hh + 73, TY)], RED, 'Tidak: foto ditolak,\nbersihkan & foto ulang', (I - 75, 760), )
arrow([(I, RA - 33), (I, PY + 33)], GRAY)

for fn, a, k in elements:
    fn(*a, **k)

defs = ''.join(f'<marker id="a{c.lstrip("#")}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>' for c in sorted(markers))
svg = '\n'.join(out).replace('@@DEFS@@', f'<defs>{defs}</defs>') + '\n</svg>\n'
(Path(__file__).parent.parent.parent / 'bpmn' / 'bpmn-to-be.svg').write_text(svg)
print('ok')
