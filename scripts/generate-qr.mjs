/**
 * Membuat berkas QR untuk setiap WC, plus satu halaman HTML siap cetak.
 *
 *   node scripts/generate-qr.mjs                         # ambil dari Worker lokal
 *   BASE_URL=https://ai-complaint.workers.dev node scripts/generate-qr.mjs
 *
 * Setiap QR mengarah ke <BASE_URL>/lapor/<id-wc>, jadi mahasiswa langsung
 * mendarat di form dengan lokasi yang sudah terisi.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const BASE_URL = (process.env.BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = 'qr-codes';

const res = await fetch(`${BASE_URL}/api/toilets`);
if (!res.ok) {
  console.error(`Gagal mengambil daftar WC dari ${BASE_URL}/api/toilets (HTTP ${res.status}).`);
  console.error('Pastikan `npm run dev:api` sedang berjalan, atau set BASE_URL ke Worker yang sudah dideploy.');
  process.exit(1);
}
const { data: toilets } = await res.json();

await mkdir(OUT, { recursive: true });

const kartu = [];
for (const t of toilets) {
  const url = `${BASE_URL}/lapor/${t.id}`;
  await QRCode.toFile(`${OUT}/${t.id}.png`, url, { width: 800, margin: 1 });
  const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 1 });
  kartu.push(`
    <div class="kartu">
      <p class="judul">Ada masalah di toilet ini?</p>
      <img src="${dataUrl}" alt="QR ${t.id}" />
      <p class="lokasi">${t.nama}</p>
      <p class="kode">${t.id}</p>
      <p class="petunjuk">Scan, tulis keluhanmu, selesai. Tanpa login.</p>
    </div>`);
}

await writeFile(
  `${OUT}/cetak.html`,
  `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>Cetak QR Toilet</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: system-ui, sans-serif; display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
  .kartu { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 8mm; text-align: center; break-inside: avoid; }
  .judul { font-size: 15pt; font-weight: 700; margin: 0 0 4mm; }
  img { width: 60mm; height: 60mm; }
  .lokasi { font-size: 12pt; font-weight: 600; margin: 4mm 0 1mm; }
  .kode { font-family: ui-monospace, monospace; color: #64748b; margin: 0; font-size: 9pt; }
  .petunjuk { font-size: 9pt; color: #475569; margin: 3mm 0 0; }
</style></head><body>${kartu.join('')}</body></html>`,
);

console.log(`Selesai: ${toilets.length} QR di ./${OUT}/ (buka ${OUT}/cetak.html lalu Ctrl+P).`);
