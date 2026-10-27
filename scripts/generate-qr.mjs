/**
 * Generates a QR image per location, plus one printable HTML sheet.
 *
 *   node scripts/generate-qr.mjs                          # read from the local Worker
 *   BASE_URL=https://ai-complaint.yvrtz.workers.dev npm run qr
 *
 * One QR code stands for one location — a floor of a building, a building's
 * yard, or a place like Lapang Voli: the same list every page picks from — and
 * points at <BASE_URL>/report/<location>. Stickers printed earlier point at
 * /report/<building>-<floor> or /lapor/<floor>, which the frontend still
 * resolves.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const BASE_URL = (process.env.BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = 'qr-codes';

const res = await fetch(`${BASE_URL}/api/cleaning/areas`);
if (!res.ok) {
  console.error(`Gagal mengambil daftar lokasi dari ${BASE_URL}/api/cleaning/areas (HTTP ${res.status}).`);
  console.error('Pastikan `npm run dev:api` berjalan, atau set BASE_URL ke Worker yang sudah dideploy.');
  process.exit(1);
}
const { data: areas } = await res.json();

// The folder is emptied first: codes from an older location list must go with
// it, because a code that is no longer registered will be rejected by the system
// if it has already been printed and stuck on a door.
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const cards = [];
let count = 0;

for (const area of areas) {
  const id = area.id;
  const url = `${BASE_URL}/report/${id}`;
  await QRCode.toFile(`${OUT}/${id}.png`, url, { width: 900, margin: 1 });
  const dataUrl = await QRCode.toDataURL(url, { width: 460, margin: 1 });
  count++;

  cards.push(`
    <div class="card">
      <div class="header">
        <span class="badge">${area.building_code ?? '&bull;'}</span>
        <span class="campus">Universitas Pendidikan Indonesia<br><b>Kampus Tasikmalaya</b></span>
      </div>
      <p class="prompt">Ada masalah kebersihan di sini?<span>Something wrong here?</span></p>
      <img src="${dataUrl}" alt="QR ${id}" />
      <p class="location">${area.name}</p>
      <p class="hint">Pindai, tulis keluhanmu, selesai. Tanpa login.<span>Scan, describe the problem, done. No sign-in.</span></p>
    </div>`);
}

await writeFile(
  `${OUT}/cetak.html`,
  `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>Cetak QR Lokasi - UPI Kampus Tasikmalaya</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Plus Jakarta Sans", system-ui, sans-serif; margin: 0;
         display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; color: #3E1712; }
  .card { border: 2px solid #E2D0B8; border-radius: 10px; padding: 7mm 6mm 6mm;
          text-align: center; break-inside: avoid; background: #FDFAF6; }
  .header { display: flex; align-items: center; justify-content: center; gap: 3mm; margin-bottom: 4mm; }
  .badge { width: 11mm; height: 11mm; border-radius: 50%; background: #E2571F; color: #fff;
           border: 1.5mm solid #4A1D16; font-size: 16pt; font-weight: 800;
           display: grid; place-items: center; }
  .campus { font-size: 7pt; line-height: 1.35; text-transform: uppercase;
            letter-spacing: .04em; text-align: left; color: #5D2A20; }
  .prompt { font-size: 13pt; font-weight: 800; margin: 0 0 4mm; line-height: 1.25; }
  .prompt span { display: block; font-size: 8.5pt; font-weight: 500; color: #7A3628; font-style: italic; }
  img { width: 55mm; height: 55mm; }
  .location { font-size: 12pt; font-weight: 800; margin: 4mm 0 0; }
  .hint { font-size: 8pt; color: #5D2A20; margin: 4mm 0 0; line-height: 1.4;
          border-top: 1px dashed #E2D0B8; padding-top: 3mm; }
  .hint span { display: block; font-style: italic; color: #7A3628; }
</style></head><body>${cards.join('')}</body></html>`,
);

console.log(`Selesai: ${count} QR di ./${OUT}/ (buka ${OUT}/cetak.html lalu Ctrl+P).`);
