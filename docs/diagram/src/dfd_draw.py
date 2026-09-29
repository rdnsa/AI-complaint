"""Mesin gambar DFD bergaya rapi: posisi setiap simbol ditentukan tangan, garis lurus.

Dipakai oleh dfd.py. Gaya meniru diagram DFD klasik: abu-abu monokrom dengan
bayangan halus, entitas berupa persegi, proses berupa lingkaran, data store berupa
kotak terbuka di sisi kanan. Aliran bolak-balik antara dua simbol yang sama
digambar sebagai garis sejajar, dengan label di sisi luar masing-masing garis.

Salinan (duplikat) data store ditandai garis tegak ganda di sisi kiri; salinan
entitas ditandai garis miring di sudut kanan bawah. Keduanya sah dalam notasi
DFD dan dipakai supaya garis tidak perlu menyeberangi seluruh diagram.
"""
import math
from html import escape

FONT = 'Arial, Helvetica, sans-serif'
INK = '#333333'
LINE = '#555555'


def text_width(s, size):
    return len(s) * size * 0.54


class Diagram:
    def __init__(self, w, h, title, subtitle=''):
        self.w, self.h, self.title, self.subtitle = w, h, title, subtitle
        self.nodes = {}
        self.flows = []

    # ------------------------------------------------------------ simbol
    def entity(self, key, x, y, label, dup=False):
        lines = label.split('\n')
        w = max(150, max(text_width(l, 15) for l in lines) + 34)
        self.nodes[key] = dict(kind='entity', x=x, y=y, w=w, h=64, label=lines, dup=dup)

    def process(self, key, x, y, num, label, r=62, ref=False):
        self.nodes[key] = dict(kind='process', x=x, y=y, r=r, num=num, label=label.split('\n'), ref=ref)

    def store(self, key, x, y, code, label, dup=False, left=None):
        """left: bila diisi, x diabaikan dan tepi kiri kotak diletakkan di sini
        (untuk kolom store yang rata kiri)."""
        w = max(190, text_width(label, 13.5) + 70)
        if left is not None:
            x = left + w / 2
        self.nodes[key] = dict(kind='store', x=x, y=y, w=w, h=44, code=code, label=label, dup=dup)

    def flow(self, a, b, label, via=None, side=None, t=0.5, dist=None):
        """Aliran data a -> b.

        via: titik belok [(x, y), ...]; side: +1/-1 memaksa sisi label;
        t: posisi label sepanjang ruas (0..1); dist: jarak label dari garis.
        """
        self.flows.append(dict(a=a, b=b, label=label.split('\n'), via=via or [], side=side, t=t, dist=dist))

    # ------------------------------------------------------------ geometri
    @staticmethod
    def inside(n, p):
        x, y = p
        if n['kind'] == 'process':
            return math.hypot(x - n['x'], y - n['y']) < n['r']
        return abs(x - n['x']) < n['w'] / 2 and abs(y - n['y']) < n['h'] / 2

    def clip(self, n, inner, outer):
        """Titik batas simbol n pada ruas dari inner (di dalam) ke outer."""
        if not self.inside(n, inner):
            return inner
        lo, hi = 0.0, 1.0
        for _ in range(40):
            mid = (lo + hi) / 2
            p = (inner[0] + (outer[0] - inner[0]) * mid, inner[1] + (outer[1] - inner[1]) * mid)
            if self.inside(n, p):
                lo = mid
            else:
                hi = mid
        return (inner[0] + (outer[0] - inner[0]) * hi, inner[1] + (outer[1] - inner[1]) * hi)

    # ------------------------------------------------------------ render
    def svg(self):
        o = []
        o.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
                 f'viewBox="0 0 {self.w} {self.h}" font-family="{FONT}" fill="{INK}">')
        o.append('<defs>'
                 '<filter id="bayang" x="-20%" y="-20%" width="150%" height="150%">'
                 '<feDropShadow dx="3" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.22"/></filter>'
                 '<radialGradient id="bola" cx="38%" cy="32%" r="75%">'
                 '<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4E4E4"/></radialGradient>'
                 '<linearGradient id="kotak" x1="0" y1="0" x2="0" y2="1">'
                 '<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9E9E9"/></linearGradient>'
                 f'<marker id="panah" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="8" markerHeight="8" orient="auto">'
                 f'<path d="M0,0 L10,5 L0,10 z" fill="{LINE}"/></marker>'
                 '</defs>')
        o.append(f'<rect width="{self.w}" height="{self.h}" fill="#FFFFFF"/>')
        o.append(f'<text x="{self.w/2}" y="44" font-size="26" font-weight="bold" text-anchor="middle">{escape(self.title)}</text>')
        if self.subtitle:
            o.append(f'<text x="{self.w/2}" y="70" font-size="14" fill="#666" text-anchor="middle">{escape(self.subtitle)}</text>')

        lines, labels = self._flows()
        o.extend(lines)
        for n in self.nodes.values():
            o.extend(self._node(n))
        o.extend(labels)
        o.append('</svg>')
        return '\n'.join(o)

    def _node(self, n):
        x, y = n['x'], n['y']
        out = []
        if n['kind'] == 'entity':
            w, h = n['w'], n['h']
            out.append(f'<rect x="{x-w/2:.1f}" y="{y-h/2:.1f}" width="{w:.1f}" height="{h}" fill="url(#kotak)" '
                       f'stroke="{INK}" stroke-width="1.5" filter="url(#bayang)"/>')
            if n['dup']:
                out.append(f'<line x1="{x+w/2-16:.1f}" y1="{y+h/2:.1f}" x2="{x+w/2:.1f}" y2="{y+h/2-16:.1f}" stroke="{INK}" stroke-width="1.5"/>')
            out.extend(self._text_block(x, y, n['label'], 15))
        elif n['kind'] == 'process':
            r = n['r']
            dash = ' stroke-dasharray="7 5"' if n['ref'] else ''
            fill = '#FFFFFF' if n['ref'] else 'url(#bola)'
            filt = '' if n['ref'] else ' filter="url(#bayang)"'
            out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{INK}" stroke-width="1.5"{dash}{filt}/>')
            size = 13.5 if r >= 60 else 12.5
            block = [n['num']] + n['label']
            ys = self._line_ys(y, len(block), size * 1.25)
            for i, (line, ly) in enumerate(zip(block, ys)):
                weight = ' font-weight="bold"' if i == 0 else ''
                out.append(f'<text x="{x}" y="{ly:.1f}" font-size="{size}" text-anchor="middle"{weight}>{escape(line)}</text>')
        else:  # store: kotak terbuka di kanan, sekat setelah kode
            w, h = n['w'], n['h']
            x0, x1, y0, y1 = x - w / 2, x + w / 2, y - h / 2, y + h / 2
            out.append(f'<g filter="url(#bayang)"><rect x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="{h}" fill="url(#kotak)"/></g>')
            out.append(f'<path d="M{x1:.1f},{y0:.1f} H{x0:.1f} V{y1:.1f} H{x1:.1f}" fill="none" stroke="{INK}" stroke-width="1.5"/>')
            out.append(f'<line x1="{x0+46:.1f}" y1="{y0:.1f}" x2="{x0+46:.1f}" y2="{y1:.1f}" stroke="{INK}" stroke-width="1.5"/>')
            if n['dup']:
                out.append(f'<line x1="{x0+7:.1f}" y1="{y0:.1f}" x2="{x0+7:.1f}" y2="{y1:.1f}" stroke="{INK}" stroke-width="1.5"/>')
            out.append(f'<text x="{x0+(27 if n["dup"] else 23):.1f}" y="{y+5:.1f}" font-size="14" font-weight="bold" text-anchor="middle">{n["code"]}</text>')
            out.append(f'<text x="{x0+56:.1f}" y="{y+5:.1f}" font-size="13.5">{escape(n["label"])}</text>')
        return out

    @staticmethod
    def _line_ys(cy, count, step):
        top = cy - step * (count - 1) / 2
        return [top + i * step + 4.5 for i in range(count)]

    def _text_block(self, x, y, lines, size, halo=False):
        out = []
        halo_attr = ' stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round" paint-order="stroke"' if halo else ''
        for line, ly in zip(lines, self._line_ys(y, len(lines), size * 1.28)):
            out.append(f'<text x="{x:.1f}" y="{ly:.1f}" font-size="{size}" text-anchor="middle"{halo_attr}>{escape(line)}</text>')
        return out

    def _flows(self):
        # Kelompokkan aliran lurus antara pasangan simbol yang sama, supaya
        # bisa digambar sejajar.
        groups = {}
        for f in self.flows:
            if not f['via']:
                groups.setdefault(frozenset((f['a'], f['b'])), []).append(f)
        gap = 22
        for members in groups.values():
            k = len(members)
            for i, f in enumerate(members):
                f['offset'] = (i - (k - 1) / 2) * gap
        lines, labels = [], []
        for f in self.flows:
            A, B = self.nodes[f['a']], self.nodes[f['b']]
            if f['via']:
                pts = [(A['x'], A['y'])] + list(f['via']) + [(B['x'], B['y'])]
                off_n = (0.0, 0.0)
            else:
                # arah normal mengikuti pasangan yang diurutkan, sehingga garis
                # sejajar dua arah tidak saling menimpa
                p, q = sorted([f['a'], f['b']])
                P, Q = self.nodes[p], self.nodes[q]
                dx, dy = Q['x'] - P['x'], Q['y'] - P['y']
                ln = math.hypot(dx, dy) or 1
                nx, ny = -dy / ln, dx / ln
                off = f.get('offset', 0.0)
                off_n = (nx * off, ny * off)
                pts = [(A['x'] + off_n[0], A['y'] + off_n[1]), (B['x'] + off_n[0], B['y'] + off_n[1])]
            pts[0] = self.clip(A, pts[0], pts[1])
            pts[-1] = self.clip(B, pts[-1], pts[-2])
            d = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
            lines.append(f'<polyline points="{d}" fill="none" stroke="{LINE}" stroke-width="1.4" marker-end="url(#panah)"/>')

            # label: pada ruas terpanjang, di sisi luar garis
            seg = max(range(len(pts) - 1), key=lambda i: math.dist(pts[i], pts[i + 1]))
            (x1, y1), (x2, y2) = pts[seg], pts[seg + 1]
            t = f['t']
            mx, my = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
            dx, dy = x2 - x1, y2 - y1
            ln = math.hypot(dx, dy) or 1
            # normal yang konsisten untuk pasangan simbol
            p, q = sorted([f['a'], f['b']])
            if not f['via'] and (f['a'], f['b']) != (p, q):
                dx, dy = -dx, -dy
            nx, ny = -dy / ln, dx / ln
            side = f['side']
            if side is None:
                off = f.get('offset', 0.0)
                side = 1 if off > 0 else -1 if off < 0 else 1
            size = 12.5
            bw = max(text_width(l, size) for l in f['label'])
            bh = len(f['label']) * size * 1.28
            extent = abs(nx) * bw / 2 + abs(ny) * bh / 2
            dist = f['dist'] if f['dist'] is not None else 6 + extent
            cx, cy = mx + nx * side * dist, my + ny * side * dist
            labels.extend(self._text_block(cx, cy, f['label'], size, halo=True))
        return lines, labels
